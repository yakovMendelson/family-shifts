'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { Phone, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  const formatPhone = (p: string) => {
    const cleaned = p.replace(/\D/g, '');
    if (cleaned.startsWith('0')) return '+972' + cleaned.slice(1);
    if (cleaned.startsWith('972')) return '+' + cleaned;
    return '+' + cleaned;
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const formatted = formatPhone(phone);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formatted }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      window.location.href = '/';
    } catch {
      setError('שגיאה בלתי צפויה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-2">תורנויות משפחתיות</h1>
        <p className="text-muted text-center mb-8 text-sm">התחברות למערכת</p>

        <div className="space-y-4">
          <div className="relative">
            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={20} />
            <input
              type="tel"
              placeholder="הכנס מספר טלפון"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full pr-11 pl-4 py-3 rounded-xl border border-border bg-background text-lg focus:outline-none focus:ring-2 focus:ring-primary"
              dir="ltr"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading || phone.replace(/\D/g, '').length < 9}
            className="w-full py-3 bg-primary text-white rounded-xl text-lg font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'התחבר'}
          </button>
        </div>

        {error && (
          <p className="mt-4 text-danger text-center text-sm bg-danger-light rounded-lg p-2">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
