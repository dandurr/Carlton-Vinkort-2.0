import { app, auth } from '@/lib/firebase';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, addDoc, getDoc } from 'firebase/firestore/lite';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { NextResponse } from 'next/server';

const dbLite = getFirestore(app);

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
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('--- STARTER SYNKRONISERING ---');
    await signInWithEmailAndPassword(auth, process.env.FIREBASE_ADMIN_EMAIL, process.env.FIREBASE_ADMIN_PASSWORD);
    const activeToken = await getNemposToken();
    
    const nemposHeaders = {
      'Authorization': `Bearer ${activeToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Company-Uuid': process.env.NEMPOS_COMPANY_UUID
    };

    // Vi kan nu trygt kigge 48 timer tilbage, fordi huskebogen forhindrer dobbelt-træk!
    const timeLimit = new Date(Date.now() - 48 * 60 * 60 * 1000); 
    const updatedWines = [];
    const unmatchedPLUs = [];
    
    let page = 1;
    let keepFetching = true;

    while (keepFetching && page <= 5) {
      console.log(`Henter side ${page} fra NemPOS...`);
      
      const listUrl = `https://api.nempos.dk/api/v1/orders/filtered?company_uuid=${process.env.NEMPOS_COMPANY_UUID}&page=${page}`;
      const ordersRes = await fetch(listUrl, { method: 'POST', headers: nemposHeaders, body: JSON.stringify({}) });
      const ordersData = await ordersRes.json();

      if (!ordersData || !ordersData.orders || ordersData.orders.length === 0) {
          console.log(`Ingen ordrer fundet på side ${page}.`);
          break; 
      }

      // Tjekker datoer
      const ordersInTimeframe = [];
      for (const order of ordersData.orders) {
        if (order.status !== 'completed') continue;
        const orderDate = new Date(order.created_at);
        if (orderDate >= timeLimit) {
          ordersInTimeframe.push(order);
        }
      }

      // Tjekker "Huskebogen" (Er ordren allerede behandlet før?)
      const ordersToProcess = [];
      for (const order of ordersInTimeframe) {
        const orderDocRef = doc(dbLite, 'processed_orders', order.uuid);
        const orderDocSnap = await getDoc(orderDocRef);
        
        if (!orderDocSnap.exists()) {
          ordersToProcess.push(order);
        } else {
          console.log(`⏳ Skipper ordre #${order.invoice_number || 'X'} - Allerede behandlet.`);
        }
      }

      console.log(`Fandt ${ordersToProcess.length} helt nye ordrer på side ${page}, som ikke er set før.`);

      if (ordersToProcess.length > 0) {
          const detailPromises = ordersToProcess.map(order => {
            const detailUrl = `https://api.nempos.dk/api/v1/orders/${order.uuid}?company_uuid=${process.env.NEMPOS_COMPANY_UUID}&admin_order_details_request=1`;
            return fetch(detailUrl, { method: 'GET', headers: nemposHeaders }).then(res => res.json());
          });
          
          const allDetails = await Promise.all(detailPromises);

          for (const detailData of allDetails) {
            if (!detailData.order || !detailData.order.order_lines) continue;

            let hasDeductedSomething = false;

            for (const line of detailData.order.order_lines) {
              const plu = line.sellable?.plu || line.plu;

              if (plu) {
                const isGlass = line.slaves?.some(slave => slave.product_name && slave.product_name.toLowerCase().includes('glas'));
                const rawDeduction = isGlass ? (line.quantity * 0.2) : line.quantity;
const deductionAmount = Math.round(rawDeduction * 10) / 10;
                const pluString = String(plu).trim();

                const q = query(collection(dbLite, 'wines'), where('sku', '==', pluString));
                const wineQuery = await getDocs(q);

                if (!wineQuery.empty) {
                  const wineDoc = wineQuery.docs[0];
                  const firebaseId = wineDoc.id;
                  
                  const currentStock = parseFloat(wineDoc.data().stockCount) || 0;
                  const newStock = currentStock - deductionAmount;

                  await setDoc(doc(dbLite, 'wines', firebaseId), { 
                      stockCount: newStock,
                      isSoldOut: newStock <= 0,
                      updatedAt: new Date().toISOString() 
                  }, { merge: true });

                  updatedWines.push({ 
                    name: line.product_name, 
                    plu: pluString, 
                    deducted: deductionAmount,
                    newStock: newStock,
                    type: isGlass ? 'Glas' : 'Flaske'
                  });
                  console.log(`✅ TRUKKET FRA LAGER: ${line.product_name} (PLU: ${pluString})`);
                  hasDeductedSomething = true;
                } else {
                  unmatchedPLUs.push({ name: line.product_name, plu: pluString, orderDate: detailData.order.created_at });
                  console.log(`🕵️ SLADRHANK: PLU ${pluString} fundet på ordre, men findes ikke i Firebase!`);
                }
              }
            }

            // Skriv ordren i Huskebogen, uanset om der var vin på den eller ej, 
            // så vi ikke spilder tid på at åbne den igen i morgen!
            await setDoc(doc(dbLite, 'processed_orders', detailData.order.uuid), {
              processedAt: new Date().toISOString(),
              invoice_number: detailData.order.invoice_number || 'X',
              containedWine: hasDeductedSomething
            });
          }
      }
      
      // Stop hvis der ikke var flere ordrer indenfor tidsgrænsen på siden
      if (ordersInTimeframe.length === 0) {
          keepFetching = false;
      } else {
          page++;
      }
    }

    console.log(`--- SYNKRONISERING FÆRDIG ---`);

    if (updatedWines.length > 0 || unmatchedPLUs.length > 0) {
      await addDoc(collection(dbLite, 'sync_logs'), {
        createdAt: new Date().toISOString(),
        status: 'success',
        processedCount: updatedWines.length,
        details: updatedWines,
        unmatchedCount: unmatchedPLUs.length,
        unmatchedDetails: unmatchedPLUs
      });
    }

    return NextResponse.json({ success: true, processed: updatedWines.length, unmatched: unmatchedPLUs.length });

  } catch (error) {
    console.error('Fejl:', error.message);
    try { await addDoc(collection(dbLite, 'sync_logs'), { createdAt: new Date().toISOString(), status: 'error', error: error.message }); } catch (e) {}
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}