import { app, auth } from '@/lib/firebase';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, addDoc } from 'firebase/firestore/lite';
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
      'User-Agent': 'Mozilla/5.0'
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
    await signInWithEmailAndPassword(auth, process.env.FIREBASE_ADMIN_EMAIL, process.env.FIREBASE_ADMIN_PASSWORD);
    const activeToken = await getNemposToken();
    
    const nemposHeaders = {
      'Authorization': `Bearer ${activeToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Company-Uuid': process.env.NEMPOS_COMPANY_UUID,
      'Origin': 'https://app.nempos.dk',
      'User-Agent': 'Mozilla/5.0'
    };

    // Kigger hele 7 dage tilbage for at fange din test-champagne!
    const timeLimit = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); 
    const updatedWines = [];
    const unmatchedPLUs = [];
    
    let page = 1;
    let keepFetching = true;

    while (keepFetching && page <= 5) {
      // Tilføjet company_uuid direkte i URL'en, ligesom i din Postman
      const ordersRes = await fetch(`https://api.nempos.dk/api/v1/orders/filtered?page=${page}&company_uuid=${process.env.NEMPOS_COMPANY_UUID}`, { headers: nemposHeaders });
      const ordersData = await ordersRes.json();

      if (!ordersData || !ordersData.orders || ordersData.orders.length === 0) break; 

      const ordersToProcess = [];
      for (const order of ordersData.orders) {
        if (order.status !== 'completed') continue;

        const orderDate = new Date(order.created_at);
        if (orderDate < timeLimit) {
          continue; 
        }
        ordersToProcess.push(order);
      }

      const detailPromises = ordersToProcess.map(order => 
        fetch(`https://api.nempos.dk/api/v1/orders/${order.uuid}?company_uuid=${process.env.NEMPOS_COMPANY_UUID}`, { headers: nemposHeaders })
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
            const pluString = String(plu).trim();

            const q = query(collection(dbLite, 'wines'), where('sku', '==', pluString));
            const wineQuery = await getDocs(q);

            if (!wineQuery.empty) {
              const wineDoc = wineQuery.docs[0];
              const firebaseId = wineDoc.id;
              
              // Hent nuværende lager direkte fra hoved-vinen
              const currentStock = parseFloat(wineDoc.data().stockCount) || 0;
              const newStock = currentStock - deductionAmount;
              const isNowSoldOut = newStock <= 0;

              // Gemmer kun i "wines"
              const publicWineUpdate = { 
                  stockCount: newStock,
                  updatedAt: new Date().toISOString() 
              };
              if (isNowSoldOut) publicWineUpdate.isSoldOut = true;

              await setDoc(doc(dbLite, 'wines', firebaseId), publicWineUpdate, { merge: true });

              updatedWines.push({ 
                name: line.product_name, 
                plu: pluString, 
                deducted: deductionAmount,
                newStock: newStock,
                type: isGlass ? 'Glas' : 'Flaske'
              });
            } else {
              unmatchedPLUs.push({
                name: line.product_name,
                plu: pluString,
                orderDate: detailData.order.created_at
              });
            }
          }
        }
      }
      
      if (ordersToProcess.length === 0) {
          keepFetching = false;
      } else {
          page++;
      }
    }

    await addDoc(collection(dbLite, 'sync_logs'), {
      createdAt: new Date().toISOString(),
      status: 'success',
      processedCount: updatedWines.length,
      details: updatedWines,
      unmatchedCount: unmatchedPLUs.length,
      unmatchedDetails: unmatchedPLUs
    });

    return NextResponse.json({ success: true, processed: updatedWines.length, unmatched: unmatchedPLUs.length });

  } catch (error) {
    try { await addDoc(collection(dbLite, 'sync_logs'), { createdAt: new Date().toISOString(), status: 'error', error: error.message }); } catch (e) {}
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}