import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, increment, addDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { NextResponse } from 'next/server';

// Hjælpefunktion: Log ind i NemPOS
async function getNemposToken() {
  const loginRes = await fetch('https://api.nempos.dk/api/v1/auth/login', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Accept': 'application/json',
      'company_uuid': process.env.NEMPOS_COMPANY_UUID,
      'VUE_APP_VERSION_KEY': process.env.NEMPOS_APP_VERSION
    },
    body: JSON.stringify({
      client: process.env.NEMPOS_EMAIL,
      secret: process.env.NEMPOS_PASSWORD,
      company_uuid: process.env.NEMPOS_COMPANY_UUID
    })
  });

  const data = await loginRes.json();
  
  if (!data.status) {
    console.error("🚨 NEMPOS AFVISTE LOGIN! Detaljer:", data);
    throw new Error(`NemPOS Login fejlede. Svar fra NemPOS: ${JSON.stringify(data)}`);
  }
  
  return data.token;
}

export async function GET(req) {
  // SIKKERHED: Tjek din hemmelige Vercel CRON kode
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starter natsynkronisering af vinlager...');

    // 1. Log ind i Firebase
    await signInWithEmailAndPassword(auth, process.env.FIREBASE_ADMIN_EMAIL, process.env.FIREBASE_ADMIN_PASSWORD);
    
    // 2. Få adgang til NemPOS med de nye headers
    const activeToken = await getNemposToken();
    const nemposHeaders = {
      'Authorization': `Bearer ${activeToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'company_uuid': process.env.NEMPOS_COMPANY_UUID,
      'VUE_APP_VERSION_KEY': process.env.NEMPOS_APP_VERSION
    };

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const updatedWines = [];
    
    let page = 1;
    let keepFetching = true;

    // 3. Loop igennem siderne (PAGINERING)
    while (keepFetching) {
      const ordersRes = await fetch(`https://api.nempos.dk/api/v1/orders/filtered?page=${page}`, { headers: nemposHeaders });
      const ordersData = await ordersRes.json();

      if (!ordersData.orders || ordersData.orders.length === 0) break; 

      for (const order of ordersData.orders) {
        if (order.status !== 'completed') continue;

        const orderDate = new Date(order.created_at);
        if (orderDate < yesterday) {
          keepFetching = false;
          break; 
        }

        const detailRes = await fetch(`https://api.nempos.dk/api/v1/orders/${order.uuid}`, { headers: nemposHeaders });
        const detailData = await detailRes.json();

        if (!detailData.order || !detailData.order.order_lines) continue;

        // 4. Gennemgå bon-linjer
        for (const line of detailData.order.order_lines) {
          const extId = line.sellable?.external_id; // Varenummer (SKU)

          if (extId) {
            // Tjekker om "Glas" blev solgt
            const isGlass = line.slaves?.some(slave => 
              slave.product_name && slave.product_name.toLowerCase().includes('glas')
            );

            // Udregn mængden. 1 hel = 1. Glas = 0.2
            const deductionAmount = isGlass ? (line.quantity * 0.2) : line.quantity;

            // 5. Slå op i Firebase og opdater
            const q = query(collection(db, 'wines'), where('sku', '==', extId));
            const wineQuery = await getDocs(q);

            if (!wineQuery.empty) {
              const firebaseId = wineQuery.docs[0].id;
              
              await setDoc(doc(db, 'wines_sensitive', firebaseId), {
                stockCount: increment(-deductionAmount)
              }, { merge: true });

              await setDoc(doc(db, 'wines', firebaseId), {
                updatedAt: new Date().toISOString()
              }, { merge: true });

              updatedWines.push({ 
                name: line.product_name, 
                sku: extId, 
                deducted: deductionAmount,
                type: isGlass ? 'Glas' : 'Flaske'
              });
            }
          }
        }
      }
      page++;
    }

    // 6. Gem en log over kørslen
    await addDoc(collection(db, 'sync_logs'), {
      createdAt: new Date().toISOString(),
      status: 'success',
      processedCount: updatedWines.length,
      details: updatedWines,
    });

    console.log('Synkronisering fuldført!');
    return NextResponse.json({ success: true, processed: updatedWines.length, details: updatedWines });

  } catch (error) {
    console.error('Fejl:', error);
    
    // Gem fejl-log hvis det fejler
    try {
        await addDoc(collection(db, 'sync_logs'), {
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