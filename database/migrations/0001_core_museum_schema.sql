CREATE TABLE public.museums (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL CHECK (BTRIM(name) <> ''),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.galleries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  museum_id BIGINT NOT NULL REFERENCES public.museums (id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (BTRIM(name) <> ''),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (museum_id, name),
  UNIQUE (id, museum_id)
);

CREATE TABLE public.categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  museum_id BIGINT NOT NULL REFERENCES public.museums (id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (BTRIM(name) <> ''),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (museum_id, name),
  UNIQUE (id, museum_id)
);

CREATE TABLE public.exhibits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  museum_id BIGINT NOT NULL REFERENCES public.museums (id) ON DELETE RESTRICT,
  gallery_id BIGINT NOT NULL,
  category_id BIGINT NOT NULL,
  name TEXT NOT NULL CHECK (BTRIM(name) <> ''),
  description_en TEXT,
  description_kn TEXT,
  estimated_visit_minutes INTEGER NOT NULL
    CHECK (estimated_visit_minutes > 0),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (gallery_id, museum_id)
    REFERENCES public.galleries (id, museum_id) ON DELETE RESTRICT,
  FOREIGN KEY (category_id, museum_id)
    REFERENCES public.categories (id, museum_id) ON DELETE RESTRICT,
  UNIQUE (id, museum_id)
);

CREATE TABLE public.floorplans (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  museum_id BIGINT NOT NULL REFERENCES public.museums (id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (BTRIM(name) <> ''),
  floor_label TEXT,
  svg_asset_path TEXT NOT NULL CHECK (BTRIM(svg_asset_path) <> ''),
  svg_viewbox_width NUMERIC(12, 4) NOT NULL CHECK (svg_viewbox_width > 0),
  svg_viewbox_height NUMERIC(12, 4) NOT NULL CHECK (svg_viewbox_height > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (museum_id, name),
  UNIQUE (id, museum_id)
);

CREATE TABLE public.map_nodes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  museum_id BIGINT NOT NULL,
  floorplan_id BIGINT NOT NULL,
  exhibit_id BIGINT,
  node_type TEXT NOT NULL
    CHECK (node_type IN ('entrance', 'exit', 'exhibit', 'waypoint')),
  label TEXT,
  x_coordinate NUMERIC(12, 4) NOT NULL CHECK (x_coordinate >= 0),
  y_coordinate NUMERIC(12, 4) NOT NULL CHECK (y_coordinate >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (floorplan_id, museum_id)
    REFERENCES public.floorplans (id, museum_id) ON DELETE RESTRICT,
  FOREIGN KEY (exhibit_id, museum_id)
    REFERENCES public.exhibits (id, museum_id) ON DELETE RESTRICT,
  CHECK (
    (node_type = 'exhibit' AND exhibit_id IS NOT NULL)
    OR (node_type <> 'exhibit' AND exhibit_id IS NULL)
  ),
  UNIQUE (id, floorplan_id)
);

CREATE UNIQUE INDEX map_nodes_one_location_per_exhibit
  ON public.map_nodes (exhibit_id)
  WHERE exhibit_id IS NOT NULL;

CREATE TABLE public.walking_paths (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  floorplan_id BIGINT NOT NULL,
  from_node_id BIGINT NOT NULL,
  to_node_id BIGINT NOT NULL,
  estimated_walking_seconds INTEGER NOT NULL
    CHECK (estimated_walking_seconds > 0),
  is_bidirectional BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_node_id, floorplan_id)
    REFERENCES public.map_nodes (id, floorplan_id) ON DELETE RESTRICT,
  FOREIGN KEY (to_node_id, floorplan_id)
    REFERENCES public.map_nodes (id, floorplan_id) ON DELETE RESTRICT,
  CHECK (from_node_id <> to_node_id),
  UNIQUE (floorplan_id, from_node_id, to_node_id)
);

CREATE INDEX exhibits_gallery_id_idx ON public.exhibits (gallery_id);
CREATE INDEX exhibits_category_id_idx ON public.exhibits (category_id);
CREATE INDEX floorplans_museum_id_idx ON public.floorplans (museum_id);
CREATE INDEX map_nodes_floorplan_id_idx ON public.map_nodes (floorplan_id);
CREATE INDEX walking_paths_from_node_idx ON public.walking_paths (from_node_id);
CREATE INDEX walking_paths_to_node_idx ON public.walking_paths (to_node_id);
