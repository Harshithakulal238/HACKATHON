ALTER TABLE public.route_stops
  ADD COLUMN path_node_ids JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(path_node_ids) = 'array');
