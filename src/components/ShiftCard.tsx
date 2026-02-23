'use client';

import { User as UserIcon, Clock, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { USER_COLORS, isOvernight } from '@/lib/types';
import type { ShiftWithUser, User } from '@/lib/types';

interface ShiftCardProps {
  shift: ShiftWithUser;
  currentUser: User | null;
  onUpdate: () => void;
  isPast?: boolean;
  isContinuation?: boolean;
}

function getUserColor(user: User | null | undefined) {
  if (!user) return null;
  const idx = user.color_index ?? 0;
  return USER_COLORS[idx % USER_COLORS.length];
}

export default function ShiftCard({ shift, currentUser, onUpdate, isPast = false, isContinuation = false }: ShiftCardProps) {
  const [loading, setLoading] = useState(false);

  const isClaimed = !!shift.user_id;
  const isOwnShift = currentUser && shift.user_id === currentUser.id;
  const canClaim = !isClaimed && currentUser && !isPast;
  const canCancel = isOwnShift && !isPast;

  const shiftUser = shift.user || (isOwnShift ? currentUser : null);
  const userColor = getUserColor(shiftUser);

  const handleClaim = async () => {
    if (!currentUser) return;
    setLoading(true);

    const res = await fetch('/api/shifts/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shift_id: shift.id, user_id: currentUser.id, action: 'claim' }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'המשמרת כבר נתפסה');
    }

    await onUpdate();
    setLoading(false);
  };

  const handleCancel = async () => {
    setLoading(true);

    const res = await fetch('/api/shifts/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shift_id: shift.id, action: 'release' }),
    });

    if (!res.ok) {
      alert('שגיאה בביטול המשמרת');
    }

    await onUpdate();
    setLoading(false);
  };

  const displayName = shiftUser?.name || '';

  return (
    <div
      className="rounded-xl p-4 border transition"
      style={
        isPast
          ? { background: '#f1f5f9', borderColor: '#e2e8f0', opacity: 0.7 }
          : isClaimed && userColor
          ? { background: userColor.bg, borderColor: userColor.dot + '33' }
          : isClaimed
          ? { background: '#dbeafe', borderColor: '#2563eb33' }
          : { background: '#dcfce7', borderColor: '#16a34a33' }
      }
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-muted" />
          <span className="font-medium" dir="ltr">
            {isContinuation
              ? `00:00–${shift.end_time.slice(0, 5)}`
              : `${shift.start_time.slice(0, 5)}–${shift.end_time.slice(0, 5)}`}
          </span>
          {isOvernight(shift) && !isContinuation && (
            <span className="text-xs text-muted bg-background px-1.5 py-0.5 rounded">→ למחרת</span>
          )}
          {isContinuation && (
            <span className="text-xs text-muted bg-background px-1.5 py-0.5 rounded">← מאתמול</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isClaimed ? (
            <div className="flex items-center gap-1" style={{ color: userColor?.text || '#1d4ed8' }}>
              <UserIcon size={16} />
              <span className="text-sm font-medium">{displayName}</span>
            </div>
          ) : (
            <span className="text-sm font-medium" style={{ color: '#16a34a' }}>פנוי</span>
          )}
        </div>
      </div>

      {!isPast && (canClaim || canCancel) && (
        <div className="mt-3">
          {canClaim && (
            <button
              onClick={handleClaim}
              disabled={loading}
              className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : 'קח משמרת'}
            </button>
          )}

          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={loading}
              className="w-full py-2 bg-danger text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : 'בטל משמרת'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
