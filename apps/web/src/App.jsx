import { useEffect, useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const data = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    const details = Array.isArray(data?.details)
      ? `: ${data.details.join(", ")}`
      : "";
    throw new Error(`${data?.error || "REQUEST_FAILED"}${details}`);
  }

  return data;
}

function formatRuntime(minutes = 0) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

function App() {
  const [view, setView] = useState("movies");
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [movieForm, setMovieForm] = useState({
    title: "",
    releaseYear: "",
    runtimeMinutes: "",
    prerequisites: [],
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [targetId, setTargetId] = useState("");
  const [rewatchPlan, setRewatchPlan] = useState(null);
  const [planRefresh, setPlanRefresh] = useState(0);

  const [cinemaId, setCinemaId] = useState("");
  const [groupSize, setGroupSize] = useState("44");
  const [quote, setQuote] = useState(null);

  async function loadMovies() {
    const data = await apiRequest("/movies");
    setMovies(data);
    return data;
  }

  async function loadCinemas() {
    const data = await apiRequest("/cinemas");
    setCinemas(data);
    return data;
  }

  useEffect(() => {
    let active = true;

    Promise.all([apiRequest("/movies"), apiRequest("/cinemas")])
      .then(([movieData, cinemaData]) => {
        if (!active) return;
        setMovies(movieData);
        setCinemas(cinemaData);
        setTargetId((current) => current || String(movieData[0]?.id ?? ""));
        setCinemaId((current) => current || String(cinemaData[0]?.id ?? ""));
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (view !== "rewatch" || !targetId) return undefined;

    let active = true;

    apiRequest(`/movies/${targetId}/rewatch-order`)
      .then((data) => {
        if (active) setRewatchPlan(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });

    return () => {
      active = false;
    };
  }, [view, targetId, planRefresh]);

  async function handleCreateMovie(event) {
    event.preventDefault();
    setError("");

    try {
      const created = await apiRequest("/movies", {
        method: "POST",
        body: JSON.stringify({
          title: movieForm.title.trim(),
          releaseYear: Number(movieForm.releaseYear),
          runtimeMinutes: Number(movieForm.runtimeMinutes),
          prerequisites: movieForm.prerequisites,
        }),
      });

      setMovies((current) =>
        [...current, created].sort((a, b) => a.title.localeCompare(b.title)),
      );
      setMovieForm({
        title: "",
        releaseYear: "",
        runtimeMinutes: "",
        prerequisites: [],
      });
      setTargetId((current) => current || String(created.id));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function updateMovie(movie, changes) {
    setError("");

    try {
      const updated = await apiRequest(`/movies/${movie.id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });

      setMovies((current) =>
        current.map((item) =>
          item.id === movie.id
            ? {
                ...item,
                ...updated,
                prerequisites:
                  updated.prerequisites ??
                  changes.prerequisites ??
                  item.prerequisites ??
                  [],
              }
            : item,
        ),
      );

      setPlanRefresh((current) => current + 1);
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    }
  }

  function startEditing(movie) {
    setEditingId(movie.id);
    setEditForm({
      title: movie.title,
      releaseYear: movie.releaseYear,
      runtimeMinutes: movie.runtimeMinutes,
      prerequisites: (movie.prerequisites ?? []).map(Number),
    });
  }

  async function saveMovieEdit(event, movie) {
    event.preventDefault();
    const saved = await updateMovie(movie, {
      title: editForm.title.trim(),
      releaseYear: Number(editForm.releaseYear),
      runtimeMinutes: Number(editForm.runtimeMinutes),
      prerequisites: editForm.prerequisites,
    });

    if (saved) setEditingId(null);
  }

  async function getBookingQuote(event) {
    event.preventDefault();
    setError("");
    setQuote(null);

    try {
      const data = await apiRequest(
        `/cinemas/${cinemaId}/booking?groupSize=${encodeURIComponent(groupSize)}`,
      );
      setQuote(data);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const selectedCinema = cinemas.find(
    (cinema) => String(cinema.id) === String(cinemaId),
  );

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#" onClick={() => setView("movies")}>
          <span className="brand-mark" aria-hidden="true">
            ✓
          </span>
          <span>Doomsday Ready</span>
        </a>

        <nav className="tabs" aria-label="Main navigation">
          {[
            ["movies", "Movies"],
            ["rewatch", "Rewatch plan"],
            ["booking", "Booking"],
          ].map(([key, label]) => (
            <button
              className={`tab ${view === key ? "active" : ""}`}
              key={key}
              onClick={() => {
                setError("");
                setView(key);
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="content">
        {error && (
          <div className="error-banner" role="alert">
            <strong>Something went wrong.</strong> {error}
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {view === "movies" && (
          <>
            <PageHeading
              title="Movies"
              description="Add movies, set what to watch first, and tick off what you have seen."
            />

            <div className="movies-layout">
              <section className="card">
                <h2>Add a movie</h2>
                <form className="movie-form" onSubmit={handleCreateMovie}>
                  <label className="field">
                    <span>Title (unique)</span>
                    <input
                      value={movieForm.title}
                      onChange={(event) =>
                        setMovieForm({
                          ...movieForm,
                          title: event.target.value,
                        })
                      }
                      placeholder="e.g. Thor: Ragnarok"
                      required
                    />
                  </label>

                  <div className="two-fields">
                    <label className="field">
                      <span>Release year</span>
                      <input
                        type="number"
                        min="1"
                        value={movieForm.releaseYear}
                        onChange={(event) =>
                          setMovieForm({
                            ...movieForm,
                            releaseYear: event.target.value,
                          })
                        }
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Runtime (1–300 min)</span>
                      <input
                        type="number"
                        min="1"
                        max="300"
                        value={movieForm.runtimeMinutes}
                        onChange={(event) =>
                          setMovieForm({
                            ...movieForm,
                            runtimeMinutes: event.target.value,
                          })
                        }
                        required
                      />
                    </label>
                  </div>

                  <label className="field">
                    <span>Prerequisites (optional)</span>
                    <select
                      multiple
                      size="5"
                      value={movieForm.prerequisites.map(String)}
                      onChange={(event) =>
                        setMovieForm({
                          ...movieForm,
                          prerequisites: Array.from(
                            event.target.selectedOptions,
                            (option) => Number(option.value),
                          ),
                        })
                      }
                    >
                      {movies.map((movie) => (
                        <option key={movie.id} value={movie.id}>
                          {movie.title}
                        </option>
                      ))}
                    </select>
                    <small>
                      Use Ctrl-click on Windows to select multiple movies.
                    </small>
                  </label>

                  <button className="primary-button full-button" type="submit">
                    Add movie
                  </button>
                </form>
              </section>

              <section className="card table-card">
                <div className="table-title">
                  <h2>Your movies</h2>
                  <button
                    className="quiet-button"
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      Promise.all([loadMovies(), loadCinemas()])
                        .catch((requestError) => setError(requestError.message))
                        .finally(() => setLoading(false));
                    }}
                  >
                    Refresh
                  </button>
                </div>

                {loading ? (
                  <p className="empty-state">Loading movies…</p>
                ) : movies.length === 0 ? (
                  <p className="empty-state">
                    No movies yet. Add one using the form.
                  </p>
                ) : (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Seen</th>
                          <th>Title</th>
                          <th>Year</th>
                          <th>Runtime</th>
                          <th>Watch first</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {movies.map((movie) => {
                          const prerequisites = movie.prerequisites ?? [];
                          const candidates = movies.filter(
                            (candidate) => candidate.id !== movie.id,
                          );

                          return (
                            <tr key={movie.id}>
                              <td>
                                <input
                                  className="check"
                                  type="checkbox"
                                  aria-label={`Watched: ${movie.title}`}
                                  checked={Boolean(movie.watched)}
                                  onChange={(event) =>
                                    updateMovie(movie, {
                                      watched: event.target.checked,
                                    })
                                  }
                                />
                              </td>

                              {editingId === movie.id ? (
                                <>
                                  <td colSpan="4">
                                    <form
                                      className="edit-form"
                                      onSubmit={(event) =>
                                        saveMovieEdit(event, movie)
                                      }
                                    >
                                      <input
                                        aria-label="Movie title"
                                        value={editForm.title}
                                        onChange={(event) =>
                                          setEditForm({
                                            ...editForm,
                                            title: event.target.value,
                                          })
                                        }
                                        required
                                      />
                                      <input
                                        aria-label="Release year"
                                        type="number"
                                        min="1"
                                        value={editForm.releaseYear}
                                        onChange={(event) =>
                                          setEditForm({
                                            ...editForm,
                                            releaseYear: event.target.value,
                                          })
                                        }
                                        required
                                      />
                                      <input
                                        aria-label="Runtime minutes"
                                        type="number"
                                        min="1"
                                        max="300"
                                        value={editForm.runtimeMinutes}
                                        onChange={(event) =>
                                          setEditForm({
                                            ...editForm,
                                            runtimeMinutes: event.target.value,
                                          })
                                        }
                                        required
                                      />
                                      <select
                                        aria-label="Prerequisite movies"
                                        multiple
                                        size="3"
                                        value={editForm.prerequisites.map(
                                          String,
                                        )}
                                        onChange={(event) =>
                                          setEditForm({
                                            ...editForm,
                                            prerequisites: Array.from(
                                              event.target.selectedOptions,
                                              (option) => Number(option.value),
                                            ),
                                          })
                                        }
                                      >
                                        {candidates.map((candidate) => (
                                          <option
                                            key={candidate.id}
                                            value={candidate.id}
                                          >
                                            {candidate.title}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        className="small-button"
                                        type="submit"
                                      >
                                        Save
                                      </button>
                                      <button
                                        className="small-button secondary"
                                        type="button"
                                        onClick={() => setEditingId(null)}
                                      >
                                        Cancel
                                      </button>
                                    </form>
                                  </td>
                                  <td></td>
                                </>
                              ) : (
                                <>
                                  <td>
                                    <strong>{movie.title}</strong>
                                  </td>
                                  <td className="muted">{movie.releaseYear}</td>
                                  <td className="muted">
                                    {movie.runtimeMinutes} min
                                  </td>
                                  <td>
                                    {prerequisites.length ? (
                                      prerequisites.map((id) => {
                                        const prerequisite = movies.find(
                                          (item) =>
                                            Number(item.id) === Number(id),
                                        );
                                        return prerequisite ? (
                                          <span className="chip" key={id}>
                                            {prerequisite.title}
                                          </span>
                                        ) : null;
                                      })
                                    ) : (
                                      <span className="muted">None</span>
                                    )}
                                  </td>
                                  <td>
                                    <button
                                      className="quiet-button"
                                      type="button"
                                      onClick={() => startEditing(movie)}
                                    >
                                      Edit
                                    </button>
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        {view === "rewatch" && (
          <>
            <PageHeading
              title="Rewatch plan"
              description="Everything to watch before your target movie, in the right order."
            />

            <div className="two-column-layout">
              <aside className="side-stack">
                <section className="card">
                  <label className="field">
                    <span>Target movie</span>
                    <select
                      value={targetId}
                      onChange={(event) => setTargetId(event.target.value)}
                    >
                      {movies.map((movie) => (
                        <option key={movie.id} value={movie.id}>
                          {movie.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </section>

                {rewatchPlan && (
                  <section className="card progress-card">
                    <div className="progress-heading">
                      <strong>
                        {rewatchPlan.watchedCount} of{" "}
                        {rewatchPlan.requiredCount} watched
                      </strong>
                      <span className="muted">
                        {rewatchPlan.requiredCount
                          ? Math.round(
                              (rewatchPlan.watchedCount /
                                rewatchPlan.requiredCount) *
                                100,
                            )
                          : 100}
                        %
                      </span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-value"
                        style={{
                          width: `${
                            rewatchPlan.requiredCount
                              ? (rewatchPlan.watchedCount /
                                  rewatchPlan.requiredCount) *
                                100
                              : 100
                          }%`,
                        }}
                      />
                    </div>
                    <span className="muted">Remaining watch time</span>
                    <strong className="runtime-total">
                      {formatRuntime(rewatchPlan.unwatchedRuntimeMinutes)}
                    </strong>
                    <span className="muted">
                      {rewatchPlan.requiredCount - rewatchPlan.watchedCount}{" "}
                      unwatched movies · {rewatchPlan.unwatchedRuntimeMinutes}{" "}
                      min
                    </span>
                  </section>
                )}
              </aside>

              <section className="card table-card">
                {!movies.length ? (
                  <p className="empty-state">
                    Add movies first to create a rewatch plan.
                  </p>
                ) : !rewatchPlan ||
                  String(rewatchPlan.target.id) !== String(targetId) ? (
                  <p className="empty-state">Loading rewatch plan…</p>
                ) : rewatchPlan.movies.length === 0 ? (
                  <p className="empty-state">
                    No prerequisites to watch before {rewatchPlan.target.title}.
                  </p>
                ) : (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Seen</th>
                          <th>Movie</th>
                          <th>Runtime</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rewatchPlan.movies.map((movie, index) => (
                          <tr key={movie.id}>
                            <td className="muted">{index + 1}</td>
                            <td>
                              <input
                                className="check"
                                type="checkbox"
                                aria-label={`Watched: ${movie.title}`}
                                checked={Boolean(movie.watched)}
                                onChange={async (event) => {
                                  const saved = await updateMovie(movie, {
                                    watched: event.target.checked,
                                  });
                                  if (saved)
                                    setPlanRefresh((current) => current + 1);
                                }}
                              />
                            </td>
                            <td>
                              <strong>{movie.title}</strong>
                            </td>
                            <td className="muted">
                              {movie.runtimeMinutes} min
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        {view === "booking" && (
          <>
            <PageHeading
              title="Watch-party booking"
              description="Find the fewest bundles that fill your group exactly, with no empty seats."
            />

            <div className="two-column-layout booking-layout">
              <section className="card">
                <form onSubmit={getBookingQuote}>
                  <label className="field">
                    <span>Cinema</span>
                    <select
                      value={cinemaId}
                      onChange={(event) => {
                        setCinemaId(event.target.value);
                        setQuote(null);
                      }}
                      required
                    >
                      {cinemas.map((cinema) => (
                        <option key={cinema.id} value={cinema.id}>
                          {cinema.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedCinema && (
                    <div className="bundle-chips">
                      <span className="muted">Bundles sold:</span>
                      {selectedCinema.bundleSizes.map((size) => (
                        <span className="chip" key={size}>
                          {size} seats
                        </span>
                      ))}
                    </div>
                  )}

                  <label className="field spaced-field">
                    <span>Group size (1–10,000)</span>
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={groupSize}
                      onChange={(event) => setGroupSize(event.target.value)}
                      required
                    />
                  </label>

                  <button
                    className="primary-button full-button"
                    type="submit"
                    disabled={!cinemas.length}
                  >
                    Get quote
                  </button>

                  {!cinemas.length && (
                    <p className="form-note">
                      Add a cinema through the API before requesting a quote.
                    </p>
                  )}
                </form>
              </section>

              <div className="side-stack">
                {quote ? (
                  <section className="card quote-card">
                    <span className="muted">
                      Best quote for {quote.groupSize} seats
                    </span>
                    {quote.possible ? (
                      <>
                        <strong className="quote-total">
                          {quote.bundleCount} bundles
                        </strong>
                        <div
                          className="bundle-bars"
                          aria-label="Selected bundle breakdown"
                        >
                          {quote.bundles.map((bundle) => (
                            <div className="bundle-line" key={bundle.size}>
                              <strong className="chip">{bundle.size}</strong>
                              <span>Bundle of {bundle.size}</span>
                              <strong>× {bundle.count}</strong>
                              <span className="muted">
                                {bundle.size * bundle.count} seats
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="not-possible">
                        <strong>Exact match not possible</strong>
                        <p>
                          No mix of this cinema’s bundles adds up to{" "}
                          {quote.groupSize}. Try a different group size.
                        </p>
                      </div>
                    )}
                  </section>
                ) : (
                  <section className="card placeholder-card">
                    <h2>Your quote will appear here</h2>
                    <p className="muted">
                      Choose a cinema and group size to get started.
                    </p>
                  </section>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}

function PageHeading({ title, description }) {
  return (
    <div className="page-heading">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

export default App;
