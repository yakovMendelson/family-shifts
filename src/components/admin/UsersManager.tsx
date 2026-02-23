'use client';

import { useState } from 'react';
import { useUsers } from '@/lib/hooks';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { USER_COLORS } from '@/lib/types';
import type { UserRole } from '@/lib/types';

export default function UsersManager() {
  const { users, loading, refetch } = useUsers();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [saving, setSaving] = useState(false);

  const formatPhone = (p: string) => {
    const cleaned = p.replace(/\D/g, '');
    if (cleaned.startsWith('0')) return '+972' + cleaned.slice(1);
    if (cleaned.startsWith('972')) return '+' + cleaned;
    return '+' + cleaned;
  };

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) return;
    setSaving(true);

    const nextColorIndex = users.length % USER_COLORS.length;

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        phone: formatPhone(phone),
        role,
        color_index: nextColorIndex,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert('שגיאה בהוספת משתמש: ' + data.error);
    } else {
      setName('');
      setPhone('');
      setRole('member');
      setShowForm(false);
      refetch();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, userName: string) => {
    if (!confirm(`למחוק את ${userName}?`)) return;

    await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    refetch();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">משתמשים ({users.length})</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium"
        >
          <Plus size={16} />
          הוסף
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl border border-border p-4 mb-4 space-y-3">
          <input
            type="text"
            placeholder="שם"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="tel"
            placeholder="מספר טלפון"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            dir="ltr"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="member">חבר משפחה</option>
            <option value="admin">אדמין</option>
          </select>
          <button
            onClick={handleAdd}
            disabled={saving || !name.trim() || !phone.trim()}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : 'שמור'}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="bg-card rounded-xl border border-border p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ background: USER_COLORS[(u.color_index ?? 0) % USER_COLORS.length].dot }}
              />
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-sm text-muted" dir="ltr">{u.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded-lg ${
                u.role === 'admin' ? 'bg-primary-light text-primary' : 'bg-background text-muted'
              }`}>
                {u.role === 'admin' ? 'אדמין' : 'חבר'}
              </span>
              <button
                onClick={() => handleDelete(u.id, u.name)}
                className="p-2 text-danger hover:bg-danger-light rounded-lg transition"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
