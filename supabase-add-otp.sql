-- טבלת OTP codes
CREATE TABLE public.otp_codes (
  phone text PRIMARY KEY,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON public.otp_codes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
