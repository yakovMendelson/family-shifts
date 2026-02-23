'use client';

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth } from 'date-fns';
import { List, CalendarDays, Loader2, CalendarCheck } from 'lucide-react';
import Header from '@/components/Header';
import ListView from '@/components/ListView';
import CalendarView from '@/components/CalendarView';
import { useCurrentUser, useShifts } from '@/lib/hooks';

type ViewMode = 'list' | 'calendar';

export default function HomePage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [view, setView] = useState<ViewMode>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const dateRange = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return {
      start: format(calStart, 'yyyy-MM-dd'),
      end: format(calEnd, 'yyyy-MM-dd'),
    };
  }, [currentMonth]);

  const { shifts, loading: shiftsLoading, refetch } = useShifts(dateRange.start, dateRange.end);

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <main className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          {view === 'list' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="text-sm text-primary"
              >
                ← הקודם
              </button>
              <span className="text-sm font-medium">
                {format(currentMonth, 'MM/yyyy')}
              </span>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="text-sm text-primary"
              >
                הבא →
              </button>
              {!isSameMonth(currentMonth, new Date()) && (
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-white rounded-lg mr-1"
                >
                  <CalendarCheck size={12} />
                  היום
                </button>
              )}
            </div>
          )}

          {view === 'calendar' && <div />}

          <div className="flex bg-card rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1 px-4 py-2 text-sm font-medium transition ${
                view === 'list' ? 'bg-primary text-white' : 'text-foreground'
              }`}
            >
              <List size={16} />
              רשימה
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`flex items-center gap-1 px-4 py-2 text-sm font-medium transition ${
                view === 'calendar' ? 'bg-primary text-white' : 'text-foreground'
              }`}
            >
              <CalendarDays size={16} />
              לוח
            </button>
          </div>
        </div>

        {shiftsLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : view === 'list' ? (
          <ListView shifts={shifts} currentUser={user} onUpdate={refetch} />
        ) : (
          <CalendarView
            shifts={shifts}
            currentUser={user}
            onUpdate={refetch}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
          />
        )}
      </main>
    </div>
  );
}
