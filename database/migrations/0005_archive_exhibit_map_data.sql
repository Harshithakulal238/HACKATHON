ALTER TABLE public.exhibits
  ADD COLUMN archived_at TIMESTAMPTZ;

ALTER TABLE public.map_nodes
  ADD COLUMN archived_at TIMESTAMPTZ;

ALTER TABLE public.walking_paths
  ADD COLUMN archived_at TIMESTAMPTZ;

CREATE INDEX exhibits_active_museum_idx
  ON public.exhibits (museum_id)
  WHERE archived_at IS NULL;

CREATE INDEX map_nodes_active_floorplan_idx
  ON public.map_nodes (floorplan_id)
  WHERE archived_at IS NULL;

CREATE INDEX walking_paths_active_floorplan_idx
  ON public.walking_paths (floorplan_id)
  WHERE archived_at IS NULL;
