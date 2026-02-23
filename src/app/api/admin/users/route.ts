import { createAdminClient } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { name, phone, role, color_index } = await request.json();
  const admin = createAdminClient();

  const { error } = await admin.from('users').insert({ name, phone, role, color_index });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  const admin = createAdminClient();

  const { error } = await admin.from('users').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
