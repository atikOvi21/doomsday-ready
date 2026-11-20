CREATE TABLE movies (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title text NOT NULL UNIQUE CHECK (length(btrim(title)) > 0),
    release_year integer NOT NULL CHECK (release_year >= 1),
    runtime_minutes integer NOT NULL
        CHECK (runtime_minutes BETWEEN 1 AND 300),
    watched boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE movie_prerequisites (
    movie_id integer NOT NULL
        REFERENCES movies(id) ON DELETE CASCADE,
    prerequisite_movie_id integer NOT NULL
        REFERENCES movies(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, prerequisite_movie_id),
    CHECK (movie_id <> prerequisite_movie_id)
);

CREATE TABLE cinemas (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL UNIQUE CHECK (length(btrim(name)) > 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cinema_bundles (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cinema_id integer NOT NULL
        REFERENCES cinemas(id) ON DELETE CASCADE,
    seat_count integer NOT NULL CHECK (seat_count BETWEEN 1 AND 500),
    UNIQUE (cinema_id, seat_count)
);