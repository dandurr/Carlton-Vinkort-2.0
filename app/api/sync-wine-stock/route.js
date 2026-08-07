import { NextResponse } from 'next/server';

// Tvinger Vercel til ALDRIG at cache denne side!
export const dynamic = 'force-dynamic';

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
    const activeToken = await getNemposToken();
    
    const nemposHeaders = {
      'Authorization': `Bearer ${activeToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Company-Uuid': process.env.NEMPOS_COMPANY_UUID,
      'Origin': 'https://app.nempos.dk',
      'User-Agent': 'Mozilla/5.0'
    };

    const listUrl = `https://api.nempos.dk/api/v1/orders/filtered?page=1&company_uuid=${process.env.NEMPOS_COMPANY_UUID}`;
    
    const ordersRes = await fetch(listUrl, { headers: nemposHeaders });
    const ordersData = await ordersRes.json();

    // Vi returnerer NemPOS' svar DIREKTE på skærmen, så du ikke skal lede i logs!
    return NextResponse.json({ 
      success: true, 
      message: "Her er hvad NemPOS rent faktisk svarer scriptet:",
      nempos_svar: ordersData 
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}