'use client';

import { useState } from 'react';
import { format, parseISO, addDays, isBefore } from 'date-fns';
import { he } from 'date-fns/locale';
import { History } from 'lucide-react';
import ShiftCard from './ShiftCard';
import { isOvernight } from '@/lib/types';
import type { ShiftWithUser, User } from '@/lib/types';

interface ListViewProps {
  shifts: ShiftWithUser[];
  currentUser: User | null;
  onUpdate: () => void;
}

function isShiftPast(shift: ShiftWithUser): boolean {
  const now = new Date();
  const endDate = isOvernight(shift)
    ? format(addDays(parseISO(shift.date), 1), 'yyyy-MM-dd')
    : shift.date;
  const shiftEnd = new Date(`${endDate}T${shift.end_time}`);
  return isBefore(shiftEnd, now);
}

export default function ListView({ shifts, currentUser, onUpdate }: ListViewProps) {
  const [showHistory, setShowHistory] = useState(false);

  const futureShifts = shifts.filter((s) => !isShiftPast(s));
  const pastShifts = shifts.filter((s) => isShiftPast(s));

  const displayShifts = showHistory ? pastShifts : futureShifts;

  const groupedByDate = displayShifts.reduce<Record<string, ShiftWithUser[]>>((acc, shift) => {
    if (!acc[shift.date]) acc[shift.date] = [];
    acc[shift.date].push(shift);

    if (isOvernight(shift)) {
      const nextDay = format(addDays(parseISO(shift.date), 1), 'yyyy-MM-dd');
      if (!acc[nextDay]) acc[nextDay] = [];
      acc[nextDay].push(shift);
    }

    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
    return showHistory ? b.localeCompare(a) : a.localeCompare(b);
  });

  return (
    <div>
      {/* Toggle history */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted">
          {showHistory
            ? `היסטוריה (${pastShifts.length})`
            : `משמרות קרובות (${futureShifts.length})`}
        </span>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition ${
            showHistory
              ? 'bg-primary text-white'
              : 'bg-card border border-border text-foreground'
          }`}
        >
          <History size={14} />
          {showHistory ? 'חזור למשמרות' : 'היסטוריה'}
        </button>
      </div>

      {sortedDates.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p className="text-lg">{showHistory ? 'אין היסטוריה' : 'אין משמרות קרובות'}</p>
          {!showHistory && <p className="text-sm mt-1">בקש מהאדמין להוסיף משמרות</p>}
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const parsed = parseISO(date);
            const dayName = format(parsed, 'EEEE', { locale: he });
            const dateStr = format(parsed, 'dd/MM/yyyy');

            return (
              <div key={date} className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                <div className="px-4 py-3 bg-background border-b border-border">
                  <h3 className="font-bold text-base">
                    {dayName} — {dateStr}
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {groupedByDate[date].map((shift) => {
                    const overnight = isOvernight(shift);
                    const isContinuation = overnight && shift.date !== date;

                    return (
                      <div key={shift.id + (isContinuation ? '-cont' : '')}>
                        <ShiftCard
                          shift={shift}
                          currentUser={currentUser}
                          onUpdate={onUpdate}
                          isPast={showHistory}
                          isContinuation={isContinuation}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
