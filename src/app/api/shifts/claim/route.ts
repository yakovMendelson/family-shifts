import { createAdminClient } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { shift_id, user_id, action } = await request.json();
  const admin = createAdminClient();

  if (action === 'claim') {
    const { data: shift } = await admin
      .from('shifts')
      .select('user_id')
      .eq('id', shift_id)
      .single();

    if (shift?.user_id) {
      return NextResponse.json({ error: 'המשמרת כבר נתפסה' }, { status: 409 });
    }

    const { error } = await admin
      .from('shifts')
      .update({ user_id })
      .eq('id', shift_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else if (action === 'release') {
    const { error } = await admin
      .from('shifts')
      .update({ user_id: null })
      .eq('id', shift_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
