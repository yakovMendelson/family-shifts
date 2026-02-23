# Architecture — Family Shifts

## High-Level Overview

```
┌──────────────────────────────────────────────┐
│                   Browser                     │
│                                               │
│  LoginPage ──→ /api/auth/login ──→ Supabase  │
│                   (Admin API)      Auth       │
│                                               │
│  HomePage ───→ Supabase Client ──→ Supabase  │
│  ListView      (Browser SDK)       Database  │
│  CalendarView                                 │
│  ShiftCard                                    │
│                                               │
│  AdminPage ──→ Supabase Client ──→ Supabase  │
│  UsersManager  (Browser SDK)       Database  │
│  ShiftsManager                     (with RLS) │
│  DuplicateShifts                              │
└──────────────────────────────────────────────┘
```

## Data Flow

### Authentication Flow
```
User enters phone
       │
       ▼
POST /api/auth/login { phone }
       │
       ▼
API Route (server-side, service_role key):
  1. Check phone exists in public.users
  2. Convert to fake email: 972...@phone.internal
  3. Try signInWithPassword
  4. If no auth user → admin.createUser (auto-confirmed)
  5. Link auth_id → users table
  6. Return { session }
       │
       ▼
Frontend: supabase.auth.setSession(session)
       │
       ▼
Redirect to / (middleware allows access)
```

### Shift Claim Flow
```
User clicks "קח משמרת"
       │
       ▼
supabase.from('shifts')
  .update({ user_id: currentUser.id })
  .eq('id', shiftId)
  .is('user_id', null)    ← prevents race conditions
       │
       ▼
RLS checks: user_id IS NULL → allowed
       │
       ▼
UI refreshes via refetch()
```

### Shift Duplication Flow
```
Admin selects source date/week + target date/week
       │
       ▼
Fetch all shifts from source period
       │
       ▼
For each shift:
  - Calculate day offset (for week mode)
  - Create new shift with same times at target date
  - user_id = NULL (all new shifts are empty)
       │
       ▼
Batch insert into shifts table
```

## Component Hierarchy

```
RootLayout (server, RTL)
 └── Middleware (auth check)
      │
      ├── LoginPage
      │    └── POST /api/auth/login
      │
      ├── HomePage
      │    ├── Header
      │    ├── ListView
      │    │    └── ShiftCard (×N, with isPast flag)
      │    └── CalendarView
      │         ├── WeekView
      │         │    └── DayRow → ShiftCard (via modal)
      │         └── MonthView → ShiftCard (via modal)
      │
      └── AdminPage
           ├── Header
           ├── UsersManager (CRUD + auto color_index)
           ├── ShiftsManager (CRUD + "3 defaults" button)
           └── DuplicateShifts (day/week copy)
```

## Key Design Decisions

### 1. Phone-only login (no password, no OTP)
- Users only enter their phone number
- Server creates/finds Supabase Auth user behind the scenes
- Uses fake email + auto-password, transparent to user
- Requires `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

### 2. Server page wrappers for dynamic rendering
- Client components (HomePage, AdminPage, LoginPage) live in `src/components/`
- Thin server wrappers in `src/app/*/page.tsx` export `dynamic = 'force-dynamic'`
- Prevents build-time prerendering errors (Supabase needs env vars at runtime)

### 3. Per-user colors
- 10 predefined color palettes in `USER_COLORS` array
- Each user gets `color_index` on creation (auto-incrementing modulo 10)
- Colors applied via inline styles (not Tailwind classes) for dynamic values

### 4. Past shift handling
- `isShiftPast()` checks if `date + end_time < now`
- ListView: past shifts hidden by default, visible via "היסטוריה" toggle
- ShiftCard: `isPast` prop disables claim/cancel buttons, grays out card
- CalendarView: past shifts shown in gray

### 5. Race condition prevention
- Shift claiming uses `.is('user_id', null)` filter
- If two users click simultaneously, only the first succeeds
- The second gets an alert message

## Supabase Configuration Checklist

- [ ] Run `supabase-schema.sql` in SQL Editor
- [ ] Run `ALTER TABLE public.users ADD COLUMN color_index integer NOT NULL DEFAULT 0`
- [ ] Insert admin user with phone in +972 format
- [ ] Email provider: enabled (used internally)
- [ ] Phone provider: not needed
- [ ] Email confirmation: disabled (fake emails)
- [ ] Site URL: set to deployment URL
- [ ] Redirect URLs: add deployment URL
