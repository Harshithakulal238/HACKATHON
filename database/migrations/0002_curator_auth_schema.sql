CREATE TABLE public.users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  museum_id BIGINT NOT NULL UNIQUE
    REFERENCES public.museums (id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL CHECK (BTRIM(full_name) <> ''),
  email TEXT NOT NULL CHECK (email = LOWER(BTRIM(email))),
  password_hash TEXT NOT NULL CHECK (BTRIM(password_hash) <> ''),
  role TEXT NOT NULL DEFAULT 'curator'
    CHECK (role IN ('curator', 'worker')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX users_email_lower_unique_idx
  ON public.users (LOWER(email));
