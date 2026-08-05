import { app, auth } from '@/lib/firebase';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, getDoc, addDoc } from 'firebase/firestore/lite';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { NextResponse } from 'next/server';

const dbLite = getFirestore(app);

async function getNemposToken() {
  const loginRes = await fetch('https://api.nempos.dk/api/v1/login', {
    method: 'POST',
    headers: { 
      'Accept': 'application/json',
      'Content-Type': 'application/json;charset=UTF-8',
      'Company-Uuid': process.env.NEMPOS_COMPANY_UUID,
      'Origin': 'https://app.nempos.dk',
      'Referer': 'https://app.nempos.dk/',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'
    },
    body: JSON.stringify({
      client: process.env.NEMPOS_EMAIL,
      secret: process.env.NEMPOS_PASSWORD
    })
  });

  const data = await loginRes.json();
  if (!data.token) throw new Error(`NemPOS Login fejlede. Svar: ${JSON.stringify(data)}`);
  return data.token;
}

export async function GET(req) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starter natsynkronisering af vinlager...');

    await signInWithEmailAndPassword(auth, process.env.FIREBASE_ADMIN_EMAIL, process.env.FIREBASE_ADMIN_PASSWORD);
    
    const activeToken = await getNemposToken();
    const nemposHeaders = {
      'Authorization': `Bearer ${activeToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Company-Uuid': process.env.NEMPOS_COMPANY_UUID,
      'Origin': 'https://app.nempos.dk',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'
    };

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const updatedWines = [];
    
    let page = 1;
    let keepFetching = true;

    while (keepFetching) {
      const ordersRes = await fetch(`https://api.nempos.dk/api/v1/orders/filtered?page=${page}`, { headers: nemposHeaders });
      const ordersData = await ordersRes.json();

      if (!ordersData.orders || ordersData.orders.length === 0) break; 

      const ordersToProcess = [];
      for (const order of ordersData.orders) {
        if (order.status !== 'completed') continue;

        const orderDate = new Date(order.created_at);
        if (orderDate < yesterday) {
          keepFetching = false;
          break; 
        }
        ordersToProcess.push(order);
      }

      const detailPromises = ordersToProcess.map(order => 
        fetch(`https://api.nempos.dk/api/v1/orders/${order.uuid}`, { headers: nemposHeaders })
          .then(res => res.json())
      );
      
      const allDetails = await Promise.all(detailPromises);

      for (const detailData of allDetails) {
        if (!detailData.order || !detailData.order.order_lines) continue;

        for (const line of detailData.order.order_lines) {
          const plu = line.sellable?.plu || line.plu;

          if (plu) {
            const isGlass = line.slaves?.some(slave => 
              slave.product_name && slave.product_name.toLowerCase().includes('glas')
            );

            const deductionAmount = isGlass ? (line.quantity * 0.2) : line.quantity;
            const pluString = String(plu);

            const q = query(collection(dbLite, 'wines'), where('sku', '==', pluString));
            const wineQuery = await getDocs(q);

            if (!wineQuery.empty) {
              const firebaseId = wineQuery.docs[0].id;
              const sensitiveRef = doc(dbLite, 'wines_sensitive', firebaseId);
              
              // 1. Hent nuværende lagerbeholdning
              const sensitiveSnap = await getDoc(sensitiveRef);
              const currentStock = sensitiveSnap.exists() ? (sensitiveSnap.data().stockCount || 0) : 0;
              const newStock = currentStock - deductionAmount;
              
              // 2. Tjek om vinen skal meldes automatisk udsolgt
              const isNowSoldOut = newStock <= 0;

              // 3. Opdater følsom lagerdata
              await setDoc(sensitiveRef, {
                stockCount: newStock
              }, { merge: true });

              // 4. Opdater den offentlige vin (Sætter isSoldOut hvis newStock <= 0)
              const publicWineUpdate = {
                updatedAt: new Date().toISOString()
              };

              if (isNowSoldOut) {
                publicWineUpdate.isSoldOut = true;
              }

              await setDoc(doc(dbLite, 'wines', firebaseId), publicWineUpdate, { merge: true });

              updatedWines.push({ 
                name: line.product_name, 
                plu: pluString, 
                deducted: deductionAmount,
                newStock: newStock,
                autoSoldOut: isNowSoldOut,
                type: isGlass ? 'Glas' : 'Flaske'
              });
            }
          }
        }
      }
      if (keepFetching) page++;
    }

    await addDoc(collection(dbLite, 'sync_logs'), {
      createdAt: new Date().toISOString(),
      status: 'success',
      processedCount: updatedWines.length,
      details: updatedWines,
    });

    return NextResponse.json({ success: true, processed: updatedWines.length, details: updatedWines });

  } catch (error) {
    console.error('Fejl under synkronisering:', error);
    
    try {
        await addDoc(collection(dbLite, 'sync_logs'), {
          createdAt: new Date().toISOString(),
          status: 'error',
          error: error.message
        });
    } catch (logError) {
        console.error('Kunne ikke skrive fejl-log:', logError);
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}