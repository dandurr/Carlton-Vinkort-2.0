import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, increment, addDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { NextResponse } from 'next/server';

// Hjælpefunktion: Log ind i NemPOS (Forklædt som en rigtig browser)
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
  
  // Tjekker om login gik igennem (succes giver en token)
  if (!data.token) {
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
    
    // 2. Få adgang til NemPOS med de nye "browser"-headers
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

        // Sikkerhedstjek hvis bonen er tom
        if (!detailData.order || !detailData.order.order_lines) continue;

        // 4. Gennemgå bon-linjer
        for (const line of detailData.order.order_lines) {
          const extId = line.sellable?.external_id; // Varenummer (SKU)

          if (extId) {
            // Tjekker om "Glas" blev solgt (via slaverne på produktet)
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
    
    // Gem fejl-log, hvis noget krakelerer
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