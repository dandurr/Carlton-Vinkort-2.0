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
    console.log('--- STARTER SYNKRONISERING ---');
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

    // Vi sætter den til 48 timer for at være 100% sikre på at fange test-køb.
    const timeLimit = new Date(Date.now() - 48 * 60 * 60 * 1000); 
    const updatedWines = [];
    const unmatchedPLUs = [];
    
    let page = 1;

    // Vi tvinger den til at kigge 5 sider igennem, uanset hvad!
    while (page <= 5) {
      console.log(`Henter side ${page} fra NemPOS...`);
      // BEMÆRK: Vi har fjernet "/filtered" og bruger det rene "/orders"
      const listUrl = `https://api.nempos.dk/api/v1/orders?page=${page}&company_uuid=${process.env.NEMPOS_COMPANY_UUID}`;
      
      const ordersRes = await fetch(listUrl, { headers: nemposHeaders });
      const ordersData = await ordersRes.json();

      if (!ordersData || !ordersData.orders || ordersData.orders.length === 0) {
          console.log(`Ingen ordrer fundet på side ${page}. Afbryder søgning.`);
          break; 
      }

      console.log(`Succes! Fandt ${ordersData.orders.length} ordrer på side ${page}. Nyeste ordre er fra: ${ordersData.orders[0].created_at}`);

      const ordersToProcess = [];
      for (const order of ordersData.orders) {
        if (order.status !== 'completed') continue;

        const orderDate = new Date(order.created_at);
        if (orderDate < timeLimit) {
          continue; // Ordren er for gammel, gå til næste.
        }
        ordersToProcess.push(order);
      }

      console.log(`Fandt ${ordersToProcess.length} gyldige/nye ordrer på side ${page}, som vi nu klikker ind på.`);

      // Hvis der ER nye ordrer, så henter vi detaljerne (dette var det API kald, du manglede at se!)
      if (ordersToProcess.length > 0) {
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
                  console.log(`TRUKKET FRA LAGER: ${line.product_name} (PLU: ${pluString}) - Nyt lager: ${newStock}`);
                } else {
                  unmatchedPLUs.push({
                    name: line.product_name,
                    plu: pluString,
                    orderDate: detailData.order.created_at
                  });
                  console.log(`SLADRHANK: Fandt PLU ${pluString} på bon, men den findes ikke i Firebase!`);
                }
              }
            }
          }
      }
      
      page++;
    }

    console.log(`--- SYNKRONISERING FÆRDIG ---`);
    console.log(`Opdaterede varer: ${updatedWines.length}. Unmatched PLU'er: ${unmatchedPLUs.length}.`);

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
    console.error('Kritisk fejl:', error.message);
    try { await addDoc(collection(dbLite, 'sync_logs'), { createdAt: new Date().toISOString(), status: 'error', error: error.message }); } catch (e) {}
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}