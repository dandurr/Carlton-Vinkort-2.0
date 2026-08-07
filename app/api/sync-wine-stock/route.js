import { app, auth } from '@/lib/firebase';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, addDoc } from 'firebase/firestore/lite';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { NextResponse } from 'next/server';

const dbLite = getFirestore(app);

// Tvinger Vercel til aldrig at cache denne fil
export const dynamic = 'force-dynamic';

async function getNemposToken() {
  const loginRes = await fetch('https://api.nempos.dk/api/v1/login', {
    method: 'POST',
    headers: { 
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Company-Uuid': process.env.NEMPOS_COMPANY_UUID
    },
    body: JSON.stringify({
      client: process.env.NEMPOS_EMAIL,
      secret: process.env.NEMPOS_PASSWORD
    })
  });

  const data = await loginRes.json();
  if (!data.token) throw new Error(`NemPOS Login fejlede.`);
  return data.token;
}

export async function GET(req) {
  // 1. Sikkerhedstjek (Kun Vercel Cron må køre dette)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('--- STARTER SYNKRONISERING ---');
    
    // 2. Log ind
    await signInWithEmailAndPassword(auth, process.env.FIREBASE_ADMIN_EMAIL, process.env.FIREBASE_ADMIN_PASSWORD);
    const activeToken = await getNemposToken();
    
    const nemposHeaders = {
      'Authorization': `Bearer ${activeToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Company-Uuid': process.env.NEMPOS_COMPANY_UUID
    };

    // Kigger 72 timer tilbage for at fange alle test-køb. 
    // Når alt kører perfekt, kan du rette '72' til '26'.
    const timeLimit = new Date(Date.now() - 72 * 60 * 60 * 1000); 
    const updatedWines = [];
    const unmatchedPLUs = [];
    
    let page = 1;
    let keepFetching = true;

    // 3. Hent ordrer side for side (max 5 sider)
    while (keepFetching && page <= 5) {
      console.log(`Henter side ${page} fra NemPOS...`);
      
      // BEMÆRK: Vi bruger POST til listen!
      const listUrl = `https://api.nempos.dk/api/v1/orders/filtered?company_uuid=${process.env.NEMPOS_COMPANY_UUID}&page=${page}`;
      const ordersRes = await fetch(listUrl, { 
        method: 'POST', 
        headers: nemposHeaders,
        body: JSON.stringify({}) 
      });
      const ordersData = await ordersRes.json();

      if (!ordersData || !ordersData.orders || ordersData.orders.length === 0) {
          console.log(`Ingen ordrer fundet på side ${page}.`);
          break; 
      }

      const ordersToProcess = [];
      for (const order of ordersData.orders) {
        if (order.status !== 'completed') continue;

        const orderDate = new Date(order.created_at);
        if (orderDate < timeLimit) {
          continue; 
        }
        ordersToProcess.push(order);
      }

      console.log(`Fandt ${ordersToProcess.length} nye/gyldige ordrer på side ${page}.`);

      // 4. Hent detaljer for de gyldige ordrer
      if (ordersToProcess.length > 0) {
          const detailPromises = ordersToProcess.map(order => {
            // BEMÆRK: Vi bruger GET + admin parameteren her!
            const detailUrl = `https://api.nempos.dk/api/v1/orders/${order.uuid}?company_uuid=${process.env.NEMPOS_COMPANY_UUID}&admin_order_details_request=1`;
            return fetch(detailUrl, { method: 'GET', headers: nemposHeaders }).then(res => res.json());
          });
          
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

                // 5. Slå op i Firebase og træk fra
                const q = query(collection(dbLite, 'wines'), where('sku', '==', pluString));
                const wineQuery = await getDocs(q);

                if (!wineQuery.empty) {
                  const wineDoc = wineQuery.docs[0];
                  const firebaseId = wineDoc.id;
                  
                  const currentStock = parseFloat(wineDoc.data().stockCount) || 0;
                  const newStock = currentStock - deductionAmount;
                  const isNowSoldOut = newStock <= 0;

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
                  console.log(`✅ TRUKKET FRA LAGER: ${line.product_name} (PLU: ${pluString})`);
                } else {
                  unmatchedPLUs.push({
                    name: line.product_name,
                    plu: pluString,
                    orderDate: detailData.order.created_at
                  });
                  console.log(`🕵️ SLADRHANK: PLU ${pluString} fundet, men findes ikke i Firebase!`);
                }
              }
            }
          }
      }
      
      // Hvis vi sorterede alle ordrer fra på denne side (fordi de var for gamle), stopper vi
      if (ordersToProcess.length === 0) {
          keepFetching = false;
      } else {
          page++;
      }
    }

    console.log(`--- SYNKRONISERING FÆRDIG ---`);

    // 6. Gem log i Firebase
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
    console.error('Fejl:', error.message);
    try { await addDoc(collection(dbLite, 'sync_logs'), { createdAt: new Date().toISOString(), status: 'error', error: error.message }); } catch (e) {}
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}