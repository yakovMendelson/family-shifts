'use client';

import { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isToday,
  isSameMonth,
  parseISO,
  isBefore,
} from 'date-fns';
import { he } from 'date-fns/locale';
import { ChevronRight, ChevronLeft, X, CalendarCheck } from 'lucide-react';
import ShiftCard from './ShiftCard';
import { USER_COLORS, isOvernight } from '@/lib/types';
import type { ShiftWithUser, User } from '@/lib/types';

interface CalendarViewProps {
  shifts: ShiftWithUser[];
  currentUser: User | null;
  onUpdate: () => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

function isShiftPast(shift: ShiftWithUser): boolean {
  const now = new Date();
  const endDate = isOvernight(shift)
    ? format(addDays(parseISO(shift.date), 1), 'yyyy-MM-dd')
    : shift.date;
  const shiftEnd = new Date(`${endDate}T${shift.end_time}`);
  return isBefore(shiftEnd, now);
}

type CalMode = 'week' | 'month';

export default function CalendarView({
  shifts,
  currentUser,
  onUpdate,
  currentMonth,
  onMonthChange,
}: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calMode, setCalMode] = useState<CalMode>('month');

  const shiftsByDate = shifts.reduce<Record<string, ShiftWithUser[]>>((acc, shift) => {
    if (!acc[shift.date]) acc[shift.date] = [];
    acc[shift.date].push(shift);

    if (isOvernight(shift)) {
      const nextDay = format(addDays(parseISO(shift.date), 1), 'yyyy-MM-dd');
      if (!acc[nextDay]) acc[nextDay] = [];
      acc[nextDay].push(shift);
    }

    return acc;
  }, {});

  const selectedShifts = selectedDate ? shiftsByDate[selectedDate] || [] : [];
  const uniqueSelectedShifts = selectedShifts.filter(
    (shift, idx, arr) => arr.findIndex((s) => s.id === shift.id) === idx
  );

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex items-center justify-center mb-3">
        <div className="flex bg-card rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => setCalMode('week')}
            className={`px-4 py-1.5 text-sm font-medium transition ${
              calMode === 'week' ? 'bg-primary text-white' : ''
            }`}
          >
            שבועי
          </button>
          <button
            onClick={() => setCalMode('month')}
            className={`px-4 py-1.5 text-sm font-medium transition ${
              calMode === 'month' ? 'bg-primary text-white' : ''
            }`}
          >
            חודשי
          </button>
        </div>
      </div>

      {calMode === 'week' ? (
        <WeekView
          currentDate={currentMonth}
          shiftsByDate={shiftsByDate}
          onDateChange={onMonthChange}
          onSelectDate={setSelectedDate}
        />
      ) : (
        <MonthView
          currentDate={currentMonth}
          shiftsByDate={shiftsByDate}
          onDateChange={onMonthChange}
          onSelectDate={setSelectedDate}
        />
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span>פנוי</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-muted" />
          <span>עבר</span>
        </div>
      </div>

      {/* Day detail modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card rounded-t-2xl">
              <h3 className="font-bold">
                {format(parseISO(selectedDate), 'EEEE dd/MM', { locale: he })}
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-1 rounded-lg hover:bg-background transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {uniqueSelectedShifts.length === 0 ? (
                <p className="text-center text-muted py-4">אין משמרות ביום זה</p>
              ) : (
                uniqueSelectedShifts.map((shift) => {
                  const overnight = isOvernight(shift);
                  const isCont = overnight && shift.date !== selectedDate;
                  return (
                    <ShiftCard
                      key={shift.id + (isCont ? '-cont' : '')}
                      shift={shift}
                      currentUser={currentUser}
                      onUpdate={onUpdate}
                      isPast={isShiftPast(shift)}
                      isContinuation={isCont}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== WEEK VIEW ==================== */

function WeekView({
  currentDate,
  shiftsByDate,
  onDateChange,
  onSelectDate,
}: {
  currentDate: Date;
  shiftsByDate: Record<string, ShiftWithUser[]>;
  onDateChange: (d: Date) => void;
  onSelectDate: (d: string) => void;
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) weekDays.push(addDays(weekStart, i));

  const now = new Date();
  const nowWeekStart = startOfWeek(now, { weekStartsOn: 0 });
  const isCurrentWeek = format(weekStart, 'yyyy-MM-dd') === format(nowWeekStart, 'yyyy-MM-dd');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onDateChange(addWeeks(currentDate, 1))} className="p-2 rounded-lg hover:bg-card transition">
          <ChevronRight size={24} />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold">
            {format(weekStart, 'dd/MM')} – {format(weekEnd, 'dd/MM')}
          </h2>
          {!isCurrentWeek && (
            <button
              onClick={() => onDateChange(new Date())}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-white rounded-lg"
            >
              <CalendarCheck size={12} />
              היום
            </button>
          )}
        </div>
        <button onClick={() => onDateChange(subWeeks(currentDate, 1))} className="p-2 rounded-lg hover:bg-card transition">
          <ChevronLeft size={24} />
        </button>
      </div>

      <div className="space-y-2">
        {weekDays.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayShifts = shiftsByDate[dateStr] || [];
          const today = isToday(day);

          return (
            <DayRow
              key={dateStr}
              day={day}
              dayShifts={dayShifts}
              today={today}
              onSelect={() => onSelectDate(dateStr)}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ==================== MONTH VIEW ==================== */

function MonthView({
  currentDate,
  shiftsByDate,
  onDateChange,
  onSelectDate,
}: {
  currentDate: Date;
  shiftsByDate: Record<string, ShiftWithUser[]>;
  onDateChange: (d: Date) => void;
  onSelectDate: (d: string) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const allDays: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    allDays.push(d);
    d = addDays(d, 1);
  }

  const dayNames = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  const isCurrentMonth = isSameMonth(currentDate, new Date());

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onDateChange(addMonths(currentDate, 1))} className="p-2 rounded-lg hover:bg-card transition">
          <ChevronRight size={24} />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold">
            {format(currentDate, 'MMMM yyyy', { locale: he })}
          </h2>
          {!isCurrentMonth && (
            <button
              onClick={() => onDateChange(new Date())}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-white rounded-lg"
            >
              <CalendarCheck size={12} />
              היום
            </button>
          )}
        </div>
        <button onClick={() => onDateChange(subMonths(currentDate, 1))} className="p-2 rounded-lg hover:bg-card transition">
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map((name) => (
          <div key={name} className="text-center text-xs font-medium text-muted py-1">
            {name}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {allDays.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayShifts = shiftsByDate[dateStr] || [];
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);

          return (
            <button
              key={dateStr}
              onClick={() => dayShifts.length > 0 && onSelectDate(dateStr)}
              className={`min-h-[70px] rounded-xl p-1 flex flex-col items-stretch text-xs transition border ${
                !inMonth
                  ? 'opacity-25 border-transparent'
                  : today
                  ? 'border-primary bg-primary-light'
                  : 'border-border bg-card hover:border-primary/40'
              } ${dayShifts.length > 0 ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span className={`text-center font-medium mb-0.5 ${today ? 'text-primary' : ''}`}>
                {format(day, 'd')}
              </span>

              {inMonth && dayShifts.length > 0 && (
                <div className="flex flex-col gap-0.5 flex-1">
                  {dayShifts.map((shift) => {
                    const claimed = !!shift.user_id;
                    const past = isShiftPast(shift);
                    const overnight = isOvernight(shift);
                    const isContinuation = overnight && shift.date !== dateStr;
                    const color = shift.user
                      ? USER_COLORS[shift.user.color_index % USER_COLORS.length]
                      : null;

                    return (
                      <div
                        key={shift.id + (isContinuation ? '-cont' : '')}
                        className="rounded px-0.5 py-px truncate leading-tight"
                        style={
                          past
                            ? { background: '#f1f5f9', color: '#94a3b8' }
                            : claimed && color
                            ? { background: color.bg, color: color.text }
                            : { background: '#dcfce7', color: '#16a34a' }
                        }
                      >
                        <span className="font-medium" dir="ltr" style={{ fontSize: '9px' }}>
                          {isContinuation ? '←' + shift.end_time.slice(0, 5) : shift.start_time.slice(0, 5)}
                          {overnight && !isContinuation ? '→' : ''}
                        </span>
                        {' '}
                        <span style={{ fontSize: '9px' }}>
                          {claimed ? shift.user?.name?.split(' ')[0] : '✓'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ==================== DAY ROW (for week view) ==================== */

function DayRow({
  day,
  dayShifts,
  today,
  onSelect,
}: {
  day: Date;
  dayShifts: ShiftWithUser[];
  today: boolean;
  onSelect: () => void;
}) {
  const dayName = format(day, 'EEEE', { locale: he });
  const dateLabel = format(day, 'dd/MM');
  const dateStr = format(day, 'yyyy-MM-dd');

  return (
    <div
      className={`bg-card rounded-2xl border overflow-hidden ${
        today ? 'border-primary ring-1 ring-primary/30' : 'border-border'
      }`}
    >
      <div
        className={`px-4 py-2 flex items-center justify-between ${
          today ? 'bg-primary-light' : 'bg-background'
        } border-b border-border`}
      >
        <span className={`font-bold text-sm ${today ? 'text-primary' : ''}`}>
          {dayName} {dateLabel}
        </span>
        {today && (
          <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">היום</span>
        )}
      </div>

      <div className="p-2 space-y-1.5">
        {dayShifts.length === 0 ? (
          <p className="text-xs text-muted text-center py-2">אין משמרות</p>
        ) : (
          dayShifts.map((shift) => {
            const past = isShiftPast(shift);
            const claimed = !!shift.user_id;
            const overnight = isOvernight(shift);
            const isContinuation = overnight && shift.date !== dateStr;
            const color = shift.user
              ? USER_COLORS[shift.user.color_index % USER_COLORS.length]
              : null;

            return (
              <button
                key={shift.id + (isContinuation ? '-cont' : '')}
                onClick={onSelect}
                className="w-full text-right rounded-lg px-3 py-2 flex items-center justify-between transition"
                style={
                  past
                    ? { background: '#f1f5f9', color: '#94a3b8' }
                    : claimed && color
                    ? { background: color.bg }
                    : { background: '#dcfce7' }
                }
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      background: past ? '#94a3b8' : claimed && color ? color.dot : '#16a34a',
                    }}
                  />
                  <span className="text-sm font-medium" dir="ltr">
                    {isContinuation
                      ? `00:00–${shift.end_time.slice(0, 5)}`
                      : `${shift.start_time.slice(0, 5)}–${shift.end_time.slice(0, 5)}`}
                  </span>
                  {overnight && !isContinuation && (
                    <span className="text-xs opacity-60">→ למחרת</span>
                  )}
                  {isContinuation && (
                    <span className="text-xs opacity-60">← מאתמול</span>
                  )}
                </div>
                <span
                  className="text-sm font-medium"
                  style={{
                    color: past ? '#94a3b8' : claimed && color ? color.text : '#16a34a',
                  }}
                >
                  {claimed ? shift.user?.name : 'פנוי'}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
