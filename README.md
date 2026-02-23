# תורנויות משפחתיות — Family Shifts

אפליקציית ווב משפחתית סגורה לניהול תורנויות ביקור בבית חולים.
מחליפה סקר וואטסאפ לא נוח במערכת ויזואלית ברורה.

---

## טכנולוגיה

| רכיב | טכנולוגיה |
|------|-----------|
| Frontend | Next.js 16 + React 19 + Tailwind CSS 4 |
| Backend | Supabase (Database + Auth + RLS) |
| Auth | מספר טלפון בלבד (ללא סיסמה, ללא OTP) |
| Deploy | Vercel (חינמי) |
| שפה | TypeScript |

---

## פיצ'רים

- **מערכת סגורה** — רק מספרי טלפון מוגדרים מראש יכולים להתחבר
- **התחברות בקליק** — הכנס מספר טלפון → מחובר (Auth שקוף דרך API Route)
- **תצוגת רשימה** — משמרות עתידיות לפי ימים, עם כפתור היסטוריה
- **תצוגת לוח שבועי** — כל יום כבלוק עם משמרות, שעות ושמות
- **תצוגת לוח חודשי** — גריד חודש מלא כמו Google Calendar
- **צבע ייחודי לכל משתמש** — כל בן משפחה מופיע בצבע שלו
- **תפיסה/ביטול משמרת** — קליק אחד, עם מניעת התנגשויות
- **משמרות שעברו** — מוצגות כ-read-only, לא ניתנות לשינוי
- **פאנל ניהול** — ניהול משתמשים, משמרות, שכפול ימים/שבועות
- **תשתית התראות** — DB מוכן ל-SMS/WhatsApp/Email בעתיד

---

## מבנה הפרויקט

```
src/
├── app/                         # Next.js App Router
│   ├── layout.tsx               # Layout ראשי (RTL, עברית)
│   ├── page.tsx                 # דף ראשי (server wrapper)
│   ├── login/page.tsx           # דף התחברות (server wrapper)
│   ├── admin/page.tsx           # פאנל ניהול (server wrapper)
│   └── api/
│       └── auth/
│           ├── login/route.ts   # POST — התחברות בטלפון (server-side admin auth)
│           └── callback/route.ts
│
├── components/                  # React Client Components
│   ├── LoginPage.tsx            # דף התחברות — שדה טלפון בלבד
│   ├── HomePage.tsx             # דף ראשי — תצוגת רשימה/לוח
│   ├── AdminPage.tsx            # דף ניהול — טאבים
│   ├── Header.tsx               # הדר עם שם משתמש, ניווט, logout
│   ├── ShiftCard.tsx            # כרטיס משמרת בודדת (צבעי משתמש)
│   ├── ListView.tsx             # תצוגת רשימה + היסטוריה
│   ├── CalendarView.tsx         # תצוגת לוח (שבועי + חודשי)
│   └── admin/
│       ├── UsersManager.tsx     # CRUD משתמשים + צבע אוטומטי
│       ├── ShiftsManager.tsx    # CRUD משמרות + "3 ברירת מחדל"
│       └── DuplicateShifts.tsx  # שכפול יום/שבוע
│
├── lib/                         # Utilities
│   ├── types.ts                 # TypeScript types + מערך צבעים
│   ├── hooks.ts                 # useCurrentUser, useShifts, useUsers
│   ├── supabase-client.ts       # Supabase browser client
│   ├── supabase-server.ts       # Supabase server client (cookies)
│   ├── supabase-admin.ts        # Supabase admin client (service_role)
│   └── supabase-middleware.ts   # Auth middleware logic
│
└── middleware.ts                # Next.js middleware — הגנת auth
```

---

## מבנה Database (Supabase)

### טבלת `users`
```sql
id              uuid PRIMARY KEY
auth_id         uuid UNIQUE → auth.users(id)
name            text NOT NULL
phone           text UNIQUE NOT NULL        -- בפורמט +972...
role            text ('admin' | 'member')
color_index     integer NOT NULL DEFAULT 0  -- אינדקס צבע מ-USER_COLORS
notification_preferences  jsonb             -- שימוש עתידי
created_at      timestamptz
```

### טבלת `shifts`
```sql
id              uuid PRIMARY KEY
date            date NOT NULL
start_time      time NOT NULL
end_time        time NOT NULL
user_id         uuid NULLABLE → users(id)   -- NULL = פנוי
created_at      timestamptz
```

### טבלת `notification_log` (עתידי)
```sql
id, user_id, shift_id, channel, status, sent_at, created_at
```

---

## מנגנון Auth — איך זה עובד

המשתמש מכניס רק **מספר טלפון**. אין סיסמה, אין OTP, אין אימייל.

### הזרימה:
1. Frontend שולח POST ל-`/api/auth/login` עם `{ phone: "+972..." }`
2. API Route (server-side) משתמש ב-`SUPABASE_SERVICE_ROLE_KEY`:
   - בודק שהטלפון קיים בטבלת `users`
   - ממיר לאימייל פנימי: `972...@phone.internal`
   - מנסה `signInWithPassword` עם סיסמה אוטומטית
   - אם אין חשבון Auth — יוצר עם `admin.createUser` (auto-confirm)
   - מחזיר `session` (access_token + refresh_token)
3. Frontend קורא `supabase.auth.setSession(...)` ומפנה לדף הראשי
4. Middleware מגן על כל הנתיבים — מפנה ל-`/login` אם אין session

### למה ככה?
- Supabase דורש email או phone+Twilio לאימות
- הפתרון: אימייל מזויף שקוף למשתמש, סיסמה אוטומטית
- Admin API עם service_role יכול ליצור חשבונות ללא אימות

---

## RLS Policies

| טבלה | פעולה | מי יכול |
|------|-------|---------|
| users | SELECT | כולם (כולל anon, בשביל בדיקת טלפון בלוגין) |
| users | INSERT/UPDATE/DELETE | אדמין בלבד |
| users | UPDATE | anon (בשביל קישור auth_id בלוגין) |
| shifts | SELECT | כל authenticated |
| shifts | INSERT/DELETE | אדמין בלבד |
| shifts | UPDATE | אדמין, או בעל המשמרת, או משמרת ריקה |

---

## משתני סביבה

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co    # ציבורי
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...    # ציבורי
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...             # סודי! רק בצד שרת
```

---

## הרצה מקומית

```bash
cd family-shifts
npm install
npm run dev
# http://localhost:3000
```

---

## Deploy ל-Vercel

```bash
# אפשרות 1: Vercel CLI
npm i -g vercel
vercel login
vercel --prod

# אפשרות 2: חבר GitHub repo ל-vercel.com
```

הוסף את 3 משתני הסביבה ב-Vercel Dashboard → Settings → Environment Variables.

אחרי deploy, עדכן ב-Supabase:
- **Authentication → URL Configuration → Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app/**`

---

## שכפול משמרות — איך עובד

### שכפול יום
מעתיק את כל המשמרות מיום מקור ליום יעד. רק מבנה שעות — ללא שיוך משתמשים.

### שכפול שבוע
1. בוחרים יום מהשבוע המקור → מחשב ראשון–שבת
2. בוחרים יום מהשבוע היעד
3. לכל משמרת מקור: מחשב offset מתחילת השבוע, יוצר באותו offset בשבוע היעד
4. כל המשמרות החדשות ריקות

---

## צבעי משתמשים

מוגדרים ב-`src/lib/types.ts` → מערך `USER_COLORS` (10 צבעים).
כל משתמש מקבל `color_index` אוטומטי בעת יצירה.
הצבע מופיע ב-ShiftCard, CalendarView (שבועי+חודשי), ו-UsersManager.

---

## פיצ'רים עתידיים (תשתית מוכנה)

- שליחת SMS (Twilio)
- שליחת WhatsApp (Twilio / Meta API)
- שליחת Email (Resend / SendGrid)
- טבלת `notification_log` קיימת ב-DB
