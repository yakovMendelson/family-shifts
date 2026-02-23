'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import {
  format,
  parseISO,
  addDays,
  startOfWeek,
  endOfWeek,
  differenceInCalendarDays,
} from 'date-fns';
import { Copy, Loader2, CheckCircle } from 'lucide-react';

type DuplicateMode = 'day' | 'week';

function toIsoDate(display: string): string {
  const [d, m, y] = display.split('/');
  return `${y}-${m}-${d}`;
}

function isValidDisplay(val: string): boolean {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(val);
}

function formatDateInput(val: string): string {
  const digits = val.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4, 8);
}

export default function DuplicateShifts() {
  const supabase = createClient();

  const [mode, setMode] = useState<DuplicateMode>('week');
  const [sourceDisplay, setSourceDisplay] = useState(format(new Date(), 'dd/MM/yyyy'));
  const [targetDisplay, setTargetDisplay] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const sourceDate = isValidDisplay(sourceDisplay) ? toIsoDate(sourceDisplay) : '';
  const targetDate = isValidDisplay(targetDisplay) ? toIsoDate(targetDisplay) : '';

  const handleDuplicate = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'day') {
        await duplicateDay(sourceDate, targetDate);
      } else {
        await duplicateWeek(sourceDate, targetDate);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בשכפול');
    }

    setLoading(false);
  };

  const duplicateDay = async (srcDate: string, tgtDate: string) => {
    if (!tgtDate) { setError('בחר תאריך יעד'); return; }

    const { data: sourceShifts, error: fetchErr } = await supabase
      .from('shifts')
      .select('start_time, end_time')
      .eq('date', srcDate);

    if (fetchErr) throw new Error(fetchErr.message);
    if (!sourceShifts || sourceShifts.length === 0) { setError('אין משמרות בתאריך המקור'); return; }

    const newShifts = sourceShifts.map((s) => ({
      date: tgtDate,
      start_time: s.start_time,
      end_time: s.end_time,
    }));

    const res = await fetch('/api/admin/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shifts: newShifts }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }

    setSuccess(`שוכפלו ${newShifts.length} משמרות ליום ${format(parseISO(tgtDate), 'dd/MM/yyyy')}`);
  };

  const duplicateWeek = async (srcDateStr: string, tgtDateStr: string) => {
    if (!tgtDateStr) { setError('בחר תאריך תחילת שבוע יעד'); return; }

    const srcDate = parseISO(srcDateStr);
    const tgtDate = parseISO(tgtDateStr);
    const srcWeekStart = startOfWeek(srcDate, { weekStartsOn: 0 });
    const srcWeekEnd = endOfWeek(srcDate, { weekStartsOn: 0 });

    const { data: sourceShifts, error: fetchErr } = await supabase
      .from('shifts')
      .select('date, start_time, end_time')
      .gte('date', format(srcWeekStart, 'yyyy-MM-dd'))
      .lte('date', format(srcWeekEnd, 'yyyy-MM-dd'))
      .order('date')
      .order('start_time');

    if (fetchErr) throw new Error(fetchErr.message);
    if (!sourceShifts || sourceShifts.length === 0) { setError('אין משמרות בשבוע המקור'); return; }

    const tgtWeekStart = startOfWeek(tgtDate, { weekStartsOn: 0 });

    const newShifts = sourceShifts.map((s) => {
      const dayOffset = differenceInCalendarDays(parseISO(s.date), srcWeekStart);
      const newDate = addDays(tgtWeekStart, dayOffset);
      return {
        date: format(newDate, 'yyyy-MM-dd'),
        start_time: s.start_time,
        end_time: s.end_time,
      };
    });

    const res = await fetch('/api/admin/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shifts: newShifts }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }

    setSuccess(`שוכפלו ${newShifts.length} משמרות לשבוע של ${format(tgtWeekStart, 'dd/MM/yyyy')}`);
  };

  const modes = [
    { id: 'day' as DuplicateMode, label: 'יום' },
    { id: 'week' as DuplicateMode, label: 'שבוע' },
  ];

  const dateInputClass = "w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-center text-lg tracking-wider";

  return (
    <div>
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <Copy size={20} />
        שכפול משמרות
      </h3>

      <div className="flex bg-card rounded-xl border border-border overflow-hidden mb-4">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setSuccess(''); setError(''); }}
            className={`flex-1 py-3 text-sm font-medium transition ${
              mode === m.id ? 'bg-primary text-white' : ''
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {mode === 'day' ? 'תאריך מקור' : 'בחר יום מהשבוע המקור'}
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="dd/mm/yyyy"
            value={sourceDisplay}
            onChange={(e) => setSourceDisplay(formatDateInput(e.target.value))}
            className={dateInputClass}
            dir="ltr"
            maxLength={10}
          />
          {mode === 'week' && sourceDate && (
            <p className="text-xs text-muted mt-1">
              שבוע: {format(startOfWeek(parseISO(sourceDate), { weekStartsOn: 0 }), 'dd/MM')} – {format(endOfWeek(parseISO(sourceDate), { weekStartsOn: 0 }), 'dd/MM')}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {mode === 'day' ? 'תאריך יעד' : 'בחר יום מהשבוע היעד'}
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="dd/mm/yyyy"
            value={targetDisplay}
            onChange={(e) => setTargetDisplay(formatDateInput(e.target.value))}
            className={dateInputClass}
            dir="ltr"
            maxLength={10}
          />
          {mode === 'week' && targetDate && (
            <p className="text-xs text-muted mt-1">
              שבוע: {format(startOfWeek(parseISO(targetDate), { weekStartsOn: 0 }), 'dd/MM')} – {format(endOfWeek(parseISO(targetDate), { weekStartsOn: 0 }), 'dd/MM')}
            </p>
          )}
        </div>

        <button
          onClick={handleDuplicate}
          disabled={loading || !targetDate || !sourceDate}
          className="w-full py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <>
              <Copy size={16} />
              שכפל {mode === 'day' ? 'יום' : 'שבוע'}
            </>
          )}
        </button>

        {success && (
          <div className="flex items-center gap-2 text-success bg-success-light rounded-xl p-3 text-sm">
            <CheckCircle size={16} />
            {success}
          </div>
        )}

        {error && (
          <div className="text-danger bg-danger-light rounded-xl p-3 text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="mt-6 bg-card rounded-2xl border border-border p-4">
        <h4 className="font-medium mb-2">איך זה עובד?</h4>
        <ul className="text-sm text-muted space-y-1">
          <li>• <strong>שכפול יום:</strong> מעתיק את כל המשמרות מתאריך מקור ליום חדש</li>
          <li>• <strong>שכפול שבוע:</strong> מעתיק שבוע שלם (ראשון–שבת) לשבוע אחר</li>
          <li>• כל המשמרות המשוכפלות נוצרות <strong>ריקות</strong> (ללא שיוך)</li>
          <li>• מבנה השעות נשמר בדיוק כמו המקור</li>
        </ul>
      </div>
    </div>
  );
}
