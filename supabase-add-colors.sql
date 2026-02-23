-- הוספת צבע למשתמשים
ALTER TABLE public.users ADD COLUMN color_index integer NOT NULL DEFAULT 0;

-- כל משתמש חדש יקבל אוטומטית צבע לפי מספר סידורי
