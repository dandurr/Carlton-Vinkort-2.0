import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
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
    
    if (!authData.token) {
        return NextResponse.json({ fejl: "Kunne ikke logge ind i NemPOS", detaljer: authData });
    }

    const headers = {
        'Authorization': `Bearer ${authData.token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Company-Uuid': process.env.NEMPOS_COMPANY_UUID
    };

    // 1. Vi henter listen som POST (Præcis som du opdagede!)
    const listUrl = `https://api.nempos.dk/api/v1/orders/filtered?company_uuid=${process.env.NEMPOS_COMPANY_UUID}&VUE_APP_VERSION_KEY=cc48114c&page=1`;
    const resList = await fetch(listUrl, { 
        method: 'POST', 
        headers: headers, 
        body: JSON.stringify({}) // Et tomt objekt, for at tilfredsstille NemPOS' POST-krav
    });
    const listData = await resList.json();

    // 2. Vi henter specifikke detaljer for den ordre du fandt, MED din nye admin-parameter!
    const orderUuid = "aae27368-0152-4f7f-9be3-1491d98b5494";
    const detailUrl = `https://api.nempos.dk/api/v1/orders/${orderUuid}?company_uuid=${process.env.NEMPOS_COMPANY_UUID}&VUE_APP_VERSION_KEY=cc48114c&admin_order_details_request=1`;
    const resDetail = await fetch(detailUrl, { 
        method: 'GET', 
        headers: headers 
    });
    const detailData = await resDetail.json();

    // Udskriver det hele på skærmen
    return NextResponse.json({
      status: "Succes! Brugte POST til lister og GET+Admin-param til detaljer.",
      test_1_POST_liste: listData,
      test_2_GET_detaljer: detailData
    });

  } catch (error) {
    return NextResponse.json({ kritisk_fejl: error.message });
  }
}