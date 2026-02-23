import { createAdminClient } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { phone, code } = await request.json();

  if (!phone || !code) {
    return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: otpRecord } = await admin
    .from('otp_codes')
    .select('*')
    .eq('phone', phone)
    .eq('code', code)
    .single();

  if (!otpRecord) {
    return NextResponse.json({ error: 'קוד שגוי' }, { status: 401 });
  }

  if (new Date(otpRecord.expires_at) < new Date()) {
    return NextResponse.json({ error: 'הקוד פג תוקף. שלח קוד חדש.' }, { status: 401 });
  }

  await admin.from('otp_codes').delete().eq('phone', phone);

  const { data: existingUser } = await admin
    .from('users')
    .select('id, name, role')
    .eq('phone', phone)
    .single();

  if (!existingUser) {
    return NextResponse.json({ error: 'מספר לא מורשה' }, { status: 403 });
  }

  const fakeEmail = phone.replace('+', '') + '@phone.internal';
  const autoPassword = 'family_' + phone.replace('+', '');

  const { data: signInData, error: signInError } = await admin.auth.signInWithPassword({
    email: fakeEmail,
    password: autoPassword,
  });

  if (!signInError && signInData.session) {
    await admin.from('users').update({ auth_id: signInData.user.id }).eq('phone', phone);
    return NextResponse.json({ session: signInData.session });
  }

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: fakeEmail,
    password: autoPassword,
    email_confirm: true,
  });

  if (createError) {
    if (createError.message.includes('already been registered')) {
      return NextResponse.json({ error: 'שגיאה בהתחברות. נסה שוב.' }, { status: 500 });
    }
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  await admin.from('users').update({ auth_id: newUser.user.id }).eq('phone', phone);

  const { data: loginData, error: loginError } = await admin.auth.signInWithPassword({
    email: fakeEmail,
    password: autoPassword,
  });

  if (loginError) {
    return NextResponse.json({ error: 'שגיאה בהתחברות' }, { status: 500 });
  }

  return NextResponse.json({ session: loginData.session });
}
