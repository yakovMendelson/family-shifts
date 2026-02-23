'use client';

import { useState } from 'react';
import { useCurrentUser } from '@/lib/hooks';
import Header from '@/components/Header';
import UsersManager from '@/components/admin/UsersManager';
import ShiftsManager from '@/components/admin/ShiftsManager';
import DuplicateShifts from '@/components/admin/DuplicateShifts';
import { Users, CalendarPlus, Copy, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

type Tab = 'users' | 'shifts' | 'duplicate';

export default function AdminPage() {
  const { user, loading } = useCurrentUser();
  const [tab, setTab] = useState<Tab>('shifts');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold mb-2">אין הרשאת גישה</p>
          <Link href="/" className="text-primary">חזרה לדף הראשי</Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'shifts' as Tab, label: 'משמרות', icon: CalendarPlus },
    { id: 'users' as Tab, label: 'משתמשים', icon: Users },
    { id: 'duplicate' as Tab, label: 'שכפול', icon: Copy },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <main className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/" className="p-2 rounded-lg hover:bg-card transition">
            <ArrowRight size={20} />
          </Link>
          <h2 className="text-xl font-bold">ניהול</h2>
        </div>

        {/* Tabs */}
        <div className="flex bg-card rounded-xl border border-border overflow-hidden mb-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1 px-3 py-3 text-sm font-medium transition ${
                tab === id ? 'bg-primary text-white' : 'text-foreground'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {tab === 'users' && <UsersManager />}
        {tab === 'shifts' && <ShiftsManager />}
        {tab === 'duplicate' && <DuplicateShifts />}
      </main>
    </div>
  );
}
