import { createAdminClient } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { phone } = await request.json();

  if (!phone) {
    return NextResponse.json({ error: 'הכנס מספר טלפון' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: existingUser } = await admin
    .from('users')
    .select('id, name, role')
    .eq('phone', phone)
    .single();

  if (!existingUser) {
    return NextResponse.json({ error: 'מספר הטלפון לא רשום במערכת' }, { status: 403 });
  }

  const fakeEmail = phone.replace('+', '') + '@phone.internal';
  const autoPassword = 'family_' + phone.replace('+', '');

  const { data: signInData, error: signInError } = await admin.auth.signInWithPassword({
    email: fakeEmail,
    password: autoPassword,
  });

  if (!signInError && signInData.session) {
    const { error: updateErr } = await admin
      .from('users')
      .update({ auth_id: signInData.user.id })
      .eq('phone', phone);

    if (updateErr) {
      console.error('Failed to link auth_id:', updateErr);
    }

    return NextResponse.json({ session: signInData.session });
  }

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: fakeEmail,
    password: autoPassword,
    email_confirm: true,
  });

  if (createError) {
    if (createError.message.includes('already been registered')) {
      // Auth user exists but password wrong — delete and recreate
      const { data: { users } } = await admin.auth.admin.listUsers();
      const existing = users.find((u) => u.email === fakeEmail);
      if (existing) {
        await admin.auth.admin.deleteUser(existing.id);
      }

      const { data: retry, error: retryErr } = await admin.auth.admin.createUser({
        email: fakeEmail,
        password: autoPassword,
        email_confirm: true,
      });

      if (retryErr) {
        return NextResponse.json({ error: retryErr.message }, { status: 500 });
      }

      await admin.from('users').update({ auth_id: retry.user.id }).eq('phone', phone);

      const { data: retryLogin, error: retryLoginErr } = await admin.auth.signInWithPassword({
        email: fakeEmail,
        password: autoPassword,
      });

      if (retryLoginErr) {
        return NextResponse.json({ error: 'שגיאה בהתחברות' }, { status: 500 });
      }

      return NextResponse.json({ session: retryLogin.session });
    }

    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  const { error: linkErr } = await admin
    .from('users')
    .update({ auth_id: newUser.user.id })
    .eq('phone', phone);

  if (linkErr) {
    console.error('Failed to link auth_id:', linkErr);
  }

  const { data: loginData, error: loginError } = await admin.auth.signInWithPassword({
    email: fakeEmail,
    password: autoPassword,
  });

  if (loginError) {
    return NextResponse.json({ error: 'שגיאה בהתחברות' }, { status: 500 });
  }

  return NextResponse.json({ session: loginData.session });
}
