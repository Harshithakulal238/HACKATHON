ALTER TABLE public.users
  DROP CONSTRAINT users_museum_id_key;

CREATE INDEX users_museum_id_idx ON public.users (museum_id);

ALTER TABLE public.exhibits
  ADD COLUMN image_path TEXT,
  ADD COLUMN audio_en_path TEXT,
  ADD COLUMN audio_kn_path TEXT,
  ADD COLUMN short_code TEXT;

UPDATE public.exhibits
SET short_code = 'EX-' || id::text
WHERE short_code IS NULL;

ALTER TABLE public.exhibits
  ALTER COLUMN short_code SET NOT NULL;

CREATE UNIQUE INDEX exhibits_short_code_unique_idx
  ON public.exhibits (short_code);

CREATE TABLE public.visitor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  museum_id BIGINT NOT NULL REFERENCES public.museums (id) ON DELETE RESTRICT,
  worker_user_id BIGINT NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  floorplan_id BIGINT NOT NULL,
  route_token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ready'
    CHECK (status IN ('ready', 'active', 'completed', 'expired')),
  allocated_minutes INTEGER NOT NULL CHECK (allocated_minutes > 0),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  current_node_id BIGINT,
  route_version INTEGER NOT NULL DEFAULT 1 CHECK (route_version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (floorplan_id, museum_id)
    REFERENCES public.floorplans (id, museum_id) ON DELETE RESTRICT,
  FOREIGN KEY (current_node_id, floorplan_id)
    REFERENCES public.map_nodes (id, floorplan_id) ON DELETE RESTRICT
);

CREATE TABLE public.visitor_session_interests (
  session_id UUID NOT NULL
    REFERENCES public.visitor_sessions (id) ON DELETE RESTRICT,
  category_id BIGINT NOT NULL
    REFERENCES public.categories (id) ON DELETE RESTRICT,
  PRIMARY KEY (session_id, category_id)
);

CREATE TABLE public.visitor_routes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id UUID NOT NULL
    REFERENCES public.visitor_sessions (id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK (version > 0),
  reason TEXT NOT NULL
    CHECK (reason IN ('initial', 'completed', 'skipped', 'extended', 'unavailable')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (session_id, version),
  UNIQUE (id, session_id)
);

CREATE TABLE public.route_stops (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  route_id BIGINT NOT NULL,
  session_id UUID NOT NULL,
  sequence_number INTEGER NOT NULL CHECK (sequence_number > 0),
  floorplan_id BIGINT NOT NULL,
  node_id BIGINT NOT NULL,
  exhibit_id BIGINT REFERENCES public.exhibits (id) ON DELETE RESTRICT,
  stop_type TEXT NOT NULL CHECK (stop_type IN ('exhibit', 'exit')),
  walking_seconds INTEGER NOT NULL CHECK (walking_seconds >= 0),
  visit_minutes INTEGER NOT NULL DEFAULT 0 CHECK (visit_minutes >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'arrived', 'completed', 'skipped')),
  arrival_time TIMESTAMPTZ,
  completion_time TIMESTAMPTZ,
  FOREIGN KEY (route_id, session_id)
    REFERENCES public.visitor_routes (id, session_id) ON DELETE RESTRICT,
  FOREIGN KEY (node_id, floorplan_id)
    REFERENCES public.map_nodes (id, floorplan_id) ON DELETE RESTRICT,
  CHECK (
    (stop_type = 'exhibit' AND exhibit_id IS NOT NULL AND visit_minutes > 0)
    OR (stop_type = 'exit' AND exhibit_id IS NULL AND visit_minutes = 0)
  ),
  UNIQUE (route_id, sequence_number)
);

CREATE TABLE public.visitor_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id UUID NOT NULL
    REFERENCES public.visitor_sessions (id) ON DELETE RESTRICT,
  exhibit_id BIGINT REFERENCES public.exhibits (id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'TOUR_STARTED',
      'EXHIBIT_SCANNED',
      'STORY_OPENED',
      'AUDIO_STARTED',
      'AUDIO_COMPLETED',
      'EXHIBIT_COMPLETED',
      'EXHIBIT_SKIPPED',
      'EXHIBIT_LIKED',
      'NOT_UNDERSTOOD',
      'SESSION_EXTENDED',
      'TOUR_COMPLETED',
      'FEEDBACK_SUBMITTED',
      'ROUTE_UPDATED',
      'LANGUAGE_SELECTED'
    )
  ),
  language TEXT CHECK (language IN ('en', 'kn')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.visitor_feedback (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id UUID NOT NULL
    REFERENCES public.visitor_sessions (id) ON DELETE RESTRICT,
  exhibit_id BIGINT NOT NULL
    REFERENCES public.exhibits (id) ON DELETE RESTRICT,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (session_id, exhibit_id)
);

CREATE INDEX visitor_sessions_museum_status_idx
  ON public.visitor_sessions (museum_id, status);
CREATE INDEX visitor_routes_session_version_idx
  ON public.visitor_routes (session_id, version DESC);
CREATE INDEX route_stops_route_status_idx
  ON public.route_stops (route_id, status, sequence_number);
CREATE INDEX visitor_events_museum_type_created_idx
  ON public.visitor_events (session_id, event_type, created_at);
CREATE INDEX visitor_feedback_exhibit_idx
  ON public.visitor_feedback (exhibit_id, created_at);
