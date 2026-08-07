import { NextResponse } from 'next/server';

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
  if (!data.token) throw new Error(`Login fejlede: ${JSON.stringify(data)}`);
  return data.token;
}

export async function GET(req) {
  try {
    console.log('--- STARTER DIAGNOSE ---');
    console.log('Tjekker miljøvariabler...');
    console.log('Company UUID findes:', !!process.env.NEMPOS_COMPANY_UUID);
    
    const activeToken = await getNemposToken();
    console.log('Fik adgangstoken fra NemPOS: JA');
    
    const nemposHeaders = {
      'Authorization': `Bearer ${activeToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Company-Uuid': process.env.NEMPOS_COMPANY_UUID,
      'Origin': 'https://app.nempos.dk',
      'User-Agent': 'Mozilla/5.0'
    };

    const listUrl = `https://api.nempos.dk/api/v1/orders/filtered?page=1&company_uuid=${process.env.NEMPOS_COMPANY_UUID}`;
    console.log(`Kalder URL: ${listUrl}`);
    
    const ordersRes = await fetch(listUrl, { headers: nemposHeaders });
    const ordersData = await ordersRes.json();

    console.log('--- RAW NEMPOS SVAR ---');
    console.log(JSON.stringify(ordersData).substring(0, 800)); 
    console.log('-----------------------');

    return NextResponse.json({ success: true, message: 'Se Vercel log for svar' });

  } catch (error) {
    console.error('Kritisk fejl:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}