-- הוספת עמודת email לטבלת users
ALTER TABLE public.users ADD COLUMN email text unique;

-- הוספת policy שמאפשרת לקרוא users לפי email גם בלי להיות מחובר
-- (נצטרך את זה בדף הלוגין כדי לבדוק אם האימייל מורשה)
CREATE POLICY "Allow checking email for login"
  ON public.users FOR SELECT
  TO anon
  USING (true);

-- הוספת policy שמאפשרת עדכון auth_id בזמן login
CREATE POLICY "Allow linking auth_id on login"
  ON public.users FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- עכשיו הוסף את עצמך כאדמין (שנה את האימייל לשלך!):
-- INSERT INTO public.users (name, phone, email, role)
-- VALUES ('יעקב', '+972501234567', 'your-email@gmail.com', 'admin');
