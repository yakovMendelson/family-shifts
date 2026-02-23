import { createAdminClient } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { shifts } = await request.json();
  const admin = createAdminClient();

  const { error } = await admin.from('shifts').insert(shifts);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { ids } = await request.json();
  const admin = createAdminClient();

  if (Array.isArray(ids)) {
    const { error } = await admin.from('shifts').delete().in('id', ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await admin.from('shifts').delete().eq('id', ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  const { id, user_id } = await request.json();
  const admin = createAdminClient();

  const { error } = await admin.from('shifts').update({ user_id }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
