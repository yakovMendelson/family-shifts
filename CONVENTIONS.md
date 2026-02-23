# Coding Conventions — Family Shifts

## Language & Direction
- UI language: Hebrew (עברית)
- Page direction: RTL (`dir="rtl"`, `lang="he"`)
- Phone numbers and times: displayed LTR (`dir="ltr"`)
- Code/comments: English

## File Structure
- **Server components** (pages): `src/app/*/page.tsx` — thin wrappers with `dynamic = 'force-dynamic'`
- **Client components**: `src/components/*.tsx` — all marked `'use client'`
- **Admin components**: `src/components/admin/*.tsx`
- **Shared logic**: `src/lib/*.ts`

## Naming
- Components: PascalCase (`ShiftCard.tsx`)
- Hooks: camelCase with `use` prefix (`useCurrentUser`)
- Types: PascalCase (`ShiftWithUser`)
- DB columns: snake_case (`user_id`, `start_time`, `color_index`)

## Styling
- Tailwind CSS 4 with custom CSS variables (defined in `globals.css`)
- Color palette: `--primary`, `--success`, `--danger`, `--muted`, `--border`, `--card`, `--background`
- Dynamic colors (user colors): inline `style={}` — not Tailwind classes
- Mobile-first: all layouts work on small screens
- Rounded corners: `rounded-xl` (small), `rounded-2xl` (cards)

## Supabase Patterns
- Browser client: `createClient()` from `@/lib/supabase-client`
- Server client: `createServerSupabaseClient()` from `@/lib/supabase-server`
- Admin client: `createAdminClient()` from `@/lib/supabase-admin` (service_role, server-only!)
- Queries always use `.select('*, user:users(*)')` to join shifts with users

## Phone Number Format
- Stored in DB as `+972XXXXXXXXX`
- User input accepted as `05XXXXXXXX` or `972XXXXXXXX`
- Conversion done by `formatPhone()` in components

## State Management
- React hooks only (useState, useMemo, useCallback)
- Custom hooks in `src/lib/hooks.ts`
- No external state library
- Data refetching via `refetch()` callback passed to children

## Error Handling
- User-facing errors in Hebrew
- `alert()` for critical errors (shift race conditions)
- Inline error messages for form validation
- No error boundaries (simple app)

## Important: What NOT to Change
- Auth flow in `/api/auth/login/route.ts` — carefully designed workaround
- RLS policies — tested and balanced for security
- `USER_COLORS` array order — existing users reference by index
- Phone format (`+972...`) — must match DB entries exactly
