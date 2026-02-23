'use client';

import { useState, useMemo } from 'react';
import { format, parseISO, addDays, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { isOvernight } from '@/lib/types';
import { he } from 'date-fns/locale';
import { useShifts } from '@/lib/hooks';
import { Plus, Trash2, Loader2, ChevronRight, ChevronLeft, CheckSquare, Square } from 'lucide-react';

function toIsoDate(displayDate: string): string {
  const [d, m, y] = displayDate.split('/');
  return `${y}-${m}-${d}`;
}

function isValidDisplayDate(val: string): boolean {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(val);
}

function formatDateInput(val: string): string {
  const digits = val.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4, 8);
}

function shiftsOverlap(
  aStart: string, aEnd: string,
  bStart: string, bEnd: string
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export default function ShiftsManager() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const [newDateDisplay, setNewDateDisplay] = useState(format(new Date(), 'dd/MM/yyyy'));
  const [newStart, setNewStart] = useState('08:00');
  const [newEnd, setNewEnd] = useState('13:00');

  const newDate = isValidDisplayDate(newDateDisplay) ? toIsoDate(newDateDisplay) : '';

  const dateRange = useMemo(() => ({
    start: format(startOfMonth(currentMonth), 'yyyy-MM-dd'),
    end: format(endOfMonth(currentMonth), 'yyyy-MM-dd'),
  }), [currentMonth]);

  const { shifts, loading, refetch } = useShifts(dateRange.start, dateRange.end);

  const checkOverlap = (date: string, startTime: string, endTime: string): boolean => {
    const dayShifts = shifts.filter((s) => s.date === date);
    return dayShifts.some((s) =>
      shiftsOverlap(startTime, endTime, s.start_time.slice(0, 5), s.end_time.slice(0, 5))
    );
  };

  const handleAdd = async () => {
    if (!newDate || !newStart || !newEnd) return;

    if (checkOverlap(newDate, newStart, newEnd)) {
      alert('יש חפיפה עם משמרת קיימת באותו יום!');
      return;
    }

    setSaving(true);
    const res = await fetch('/api/admin/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shifts: [{ date: newDate, start_time: newStart, end_time: newEnd }] }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert('שגיאה: ' + data.error);
    } else {
      refetch();
    }
    setSaving(false);
  };

  const handleAddMultiple = async () => {
    if (!newDate) return;
    setSaving(true);

    const templates = [
      { date: newDate, start_time: '08:00', end_time: '13:00' },
      { date: newDate, start_time: '13:00', end_time: '18:00' },
      { date: newDate, start_time: '18:00', end_time: '23:00' },
      { date: newDate, start_time: '23:00', end_time: '08:00' },
    ];

    const existingDay = shifts.filter((s) => s.date === newDate);

    const hasOverlap = templates.some((t) =>
      existingDay.some((s) =>
        shiftsOverlap(t.start_time, t.end_time, s.start_time.slice(0, 5), s.end_time.slice(0, 5))
      )
    );

    if (hasOverlap) {
      alert('יש חפיפה עם משמרות קיימות! מחק אותן קודם.');
      setSaving(false);
      return;
    }

    const res = await fetch('/api/admin/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shifts: templates }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert('שגיאה: ' + data.error);
    } else {
      refetch();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await fetch('/api/admin/shifts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: id }),
    });
    refetch();
  };

  const handleReleaseUser = async (id: string) => {
    await fetch('/api/admin/shifts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, user_id: null }),
    });
    refetch();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllForDate = (date: string) => {
    const ids = groupedByDate[date].map((s) => s.id);
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`למחוק ${selected.size} משמרות?`)) return;

    setDeleting(true);
    const ids = Array.from(selected);
    const res = await fetch('/api/admin/shifts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert('שגיאה במחיקה: ' + data.error);
    } else {
      setSelected(new Set());
      refetch();
    }
    setDeleting(false);
  };

  const groupedByDate = shifts.reduce<Record<string, typeof shifts>>((acc, shift) => {
    if (!acc[shift.date]) acc[shift.date] = [];
    acc[shift.date].push(shift);

    if (isOvernight(shift)) {
      const nextDay = format(addDays(parseISO(shift.date), 1), 'yyyy-MM-dd');
      if (!acc[nextDay]) acc[nextDay] = [];
      acc[nextDay].push(shift);
    }

    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2">
          <ChevronRight size={20} />
        </button>
        <h3 className="font-bold text-lg">
          {format(currentMonth, 'MMMM yyyy', { locale: he })}
        </h3>
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2">
          <ChevronLeft size={20} />
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium">הוסף משמרות</h4>
          <button onClick={() => setShowForm(!showForm)} className="text-primary text-sm">
            {showForm ? 'סגור' : 'פתח'}
          </button>
        </div>

        {showForm && (
          <div className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              placeholder="dd/mm/yyyy"
              value={newDateDisplay}
              onChange={(e) => setNewDateDisplay(formatDateInput(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-center text-lg tracking-wider"
              dir="ltr"
              maxLength={10}
            />

            <div className="flex gap-2">
              <input
                type="time"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                dir="ltr"
              />
              <input
                type="time"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                dir="ltr"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving || !newDate}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <><Plus size={16} /> הוסף משמרת</>}
              </button>
              <button
                onClick={handleAddMultiple}
                disabled={saving || !newDate}
                className="flex-1 py-3 bg-success text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-1 text-sm"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : '4 משמרות + לילה'}
              </button>
            </div>

            <p className="text-xs text-muted text-center">
              ברירת מחדל: 08–13, 13–18, 18–23, 23–08
            </p>
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <div className="bg-danger-light border border-danger/20 rounded-xl p-3 mb-4 flex items-center justify-between">
          <span className="text-sm font-medium">{selected.size} משמרות נבחרו</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 text-sm bg-card border border-border rounded-lg"
            >
              בטל בחירה
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="px-3 py-1.5 text-sm bg-danger text-white rounded-lg flex items-center gap-1"
            >
              {deleting ? <Loader2 className="animate-spin" size={14} /> : <><Trash2 size={14} /> מחק הכל</>}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-primary" size={24} />
        </div>
      ) : sortedDates.length === 0 ? (
        <p className="text-center text-muted py-8">אין משמרות בחודש זה</p>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => {
            const dayShifts = groupedByDate[date];
            const allSelected = dayShifts.every((s) => selected.has(s.id));

            return (
              <div key={date} className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="px-4 py-2 bg-background border-b border-border flex items-center justify-between">
                  <span className="font-bold text-sm">
                    {format(parseISO(date), 'EEEE dd/MM/yyyy', { locale: he })}
                  </span>
                  <button
                    onClick={() => selectAllForDate(date)}
                    className="text-xs text-muted flex items-center gap-1 hover:text-foreground transition"
                  >
                    {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                    בחר יום
                  </button>
                </div>
                <div className="p-3 space-y-2">
                  {dayShifts.map((shift) => {
                    const overnight = isOvernight(shift);
                    const isContinuation = overnight && shift.date !== date;

                    return (
                      <div
                        key={shift.id + (isContinuation ? '-cont' : '')}
                        className={`flex items-center gap-2 rounded-xl p-3 border ${
                          selected.has(shift.id)
                            ? 'bg-danger-light border-danger/30'
                            : shift.user_id
                            ? 'bg-primary-light border-primary/20'
                            : 'bg-success-light border-success/20'
                        }`}
                      >
                        {!isContinuation && (
                          <button
                            onClick={() => toggleSelect(shift.id)}
                            className="flex-shrink-0 text-muted hover:text-foreground"
                          >
                            {selected.has(shift.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                          </button>
                        )}

                        <div className="flex-1 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {isContinuation ? (
                              <>
                                <span className="text-xs text-muted">← מאתמול</span>
                                <span className="font-medium text-sm" dir="ltr">
                                  00:00–{shift.end_time.slice(0, 5)}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="font-medium text-sm" dir="ltr">
                                  {shift.start_time.slice(0, 5)}–{shift.end_time.slice(0, 5)}
                                </span>
                                {overnight && (
                                  <span className="text-xs text-muted">→ למחרת</span>
                                )}
                              </>
                            )}
                            {shift.user && (
                              <span className="text-sm text-primary mr-2">— {shift.user.name}</span>
                            )}
                          </div>
                          {!isContinuation && (
                            <div className="flex gap-1">
                              {shift.user_id && (
                                <button
                                  onClick={() => handleReleaseUser(shift.id)}
                                  className="px-2 py-1 text-xs bg-card border border-border rounded-lg"
                                >
                                  שחרר
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(shift.id)}
                                className="p-1 text-danger hover:bg-danger-light rounded-lg transition"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
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
