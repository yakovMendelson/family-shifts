import { createAdminClient } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { phone, auth_id } = await request.json();
  if (!phone || !auth_id) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from('users')
    .update({ auth_id })
    .eq('phone', phone);

  if (error) {
    console.error('Failed to link auth_id:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
