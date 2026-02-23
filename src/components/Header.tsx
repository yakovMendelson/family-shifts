'use client';

import { createClient } from '@/lib/supabase-client';
import { LogOut, Settings } from 'lucide-react';
import Link from 'next/link';
import type { User } from '@/lib/types';

interface HeaderProps {
  user: User | null;
}

export default function Header({ user }: HeaderProps) {
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">תורנויות</h1>

        <div className="flex items-center gap-3">
          {user && (
            <span className="text-sm text-muted">{user.name}</span>
          )}

          {user?.role === 'admin' && (
            <Link
              href="/admin"
              className="p-2 rounded-lg hover:bg-background transition"
              title="ניהול"
            >
              <Settings size={20} />
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-background transition text-muted"
            title="התנתק"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
