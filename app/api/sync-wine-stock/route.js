import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const loginRes = await fetch('https://api.nempos.dk/api/v1/login', {
      method: 'POST',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        // Sætter UUID direkte ind her
        'Company-Uuid': 'd9409960-52c0-4645-bf91-fa6054021f24'
      },
      body: JSON.stringify({
        client: process.env.NEMPOS_EMAIL,
        secret: process.env.NEMPOS_PASSWORD
      })
    });

    const authData = await loginRes.json();
    
    if (!authData.token) {
        return NextResponse.json({ fejl: "Kunne ikke logge ind i NemPOS", detaljer: authData });
    }

    // Vi hardcoder PRÆCIS det link, du brugte i din egen test!
    const listUrl = 'https://api.nempos.dk/api/v1/orders/filtered?company_uuid=d9409960-52c0-4645-bf91-fa6054021f24&VUE_APP_VERSION_KEY=7542e5c6&page=1';
    
    const ordersRes = await fetch(listUrl, {
      headers: {
        'Authorization': `Bearer ${authData.token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Company-Uuid': 'd9409960-52c0-4645-bf91-fa6054021f24'
      }
    });

    const ordersData = await ordersRes.json();

    return NextResponse.json({
      status: "Test med hardcoded URL",
      brugt_url: listUrl,
      antal_ordrer: ordersData.orders ? ordersData.orders.length : 0,
      rå_data_fra_nempos: ordersData
    });

  } catch (error) {
    return NextResponse.json({ kritisk_fejl: error.message });
  }
}