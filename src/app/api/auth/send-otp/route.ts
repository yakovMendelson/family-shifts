import { createAdminClient } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import twilio from 'twilio';

const twilioClient = process.env.TWILIO_ACCOUNT_SID
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  const { phone } = await request.json();

  if (!phone) {
    return NextResponse.json({ error: 'הכנס מספר טלפון' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: existingUser } = await admin
    .from('users')
    .select('id, name')
    .eq('phone', phone)
    .single();

  if (!existingUser) {
    return NextResponse.json({ error: 'מספר הטלפון לא רשום במערכת' }, { status: 403 });
  }

  const otp = generateOtp();

  const { error: upsertError } = await admin
    .from('otp_codes')
    .upsert(
      { phone, code: otp, expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() },
      { onConflict: 'phone' }
    );

  if (upsertError) {
    return NextResponse.json({ error: 'שגיאה בשמירת קוד' }, { status: 500 });
  }

  if (!twilioClient) {
    console.log(`[DEV] OTP for ${phone}: ${otp}`);
    return NextResponse.json({ success: true, dev_otp: otp });
  }

  try {
    await twilioClient.messages.create({
      body: `קוד הכניסה שלך לתורנויות: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
  } catch (e: unknown) {
    console.error('Twilio error:', e);
    return NextResponse.json({ error: 'שגיאה בשליחת SMS' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
