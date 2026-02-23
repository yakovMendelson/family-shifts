'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import type { User, ShiftWithUser } from '@/lib/types';

function extractPhoneFromEmail(email: string): string {
  const digits = email.split('@')[0];
  return '+' + digits;
}

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setLoading(false);
        return;
      }

      const phone = extractPhoneFromEmail(authUser.email || '');

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();

      if (data) {
        setUser(data);

        if (!data.auth_id || data.auth_id !== authUser.id) {
          await fetch('/api/auth/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, auth_id: authUser.id }),
          });
        }
      }

      setLoading(false);
    }

    fetchUser();
  }, []);

  return { user, loading };
}

export function useShifts(startDate: string, endDate: string) {
  const [shifts, setShifts] = useState<ShiftWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('shifts')
      .select('*, user:users(*)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    setShifts((data as ShiftWithUser[]) || []);
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  return { shifts, loading, refetch: fetchShifts };
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('name');

    setUsers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, refetch: fetchUsers };
}
