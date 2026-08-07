import { NextResponse } from 'next/server';

// Tvinger Vercel til altid at hente friske data (ingen cache!)
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    // 1. Log ind på NemPOS
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

    const authData = await loginRes.json();
    
    // Hvis vi ikke får adgang, vis det på skærmen!
    if (!authData.token) {
        return NextResponse.json({ fejl: "Kunne ikke logge ind i NemPOS", detaljer: authData });
    }

    // 2. Hent ordrer fra NemPOS med det rigtige URL-format
    const listUrl = `https://api.nempos.dk/api/v1/orders/filtered?page=1&company_uuid=${process.env.NEMPOS_COMPANY_UUID}`;
    
    const ordersRes = await fetch(listUrl, {
      headers: {
        'Authorization': `Bearer ${authData.token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Company-Uuid': process.env.NEMPOS_COMPANY_UUID
      }
    });

    const ordersData = await ordersRes.json();

    // 3. Spyt hele svineriet ud på skærmen i din browser
    return NextResponse.json({
      status: "Succes! Har hul igennem til NemPOS.",
      antal_ordrer_fundet: ordersData.orders ? ordersData.orders.length : 0,
      rå_data_fra_nempos: ordersData
    });

  } catch (error) {
    return NextResponse.json({ kritisk_fejl: error.message });
  }
}