export function buildRewatchPlan(targetId, { movies, edges }) {
  const moviesById = new Map(movies.map((movie) => [movie.id, movie]));
  const target = moviesById.get(targetId);

  if (!target) {
    return null;
  }

  const prerequisitesByMovie = new Map(movies.map((movie) => [movie.id, []]));

  for (const edge of edges) {
    prerequisitesByMovie.get(edge.movieId)?.push(edge.prerequisiteMovieId);
  }

  const visited = new Set([targetId]);
  const orderedMovies = [];

  function dfs(movieId) {
    if (visited.has(movieId)) {
      return;
    }

    visited.add(movieId);

    const prerequisites = prerequisitesByMovie.get(movieId) ?? [];

    for (const prerequisiteId of prerequisites) {
      dfs(prerequisiteId);
    }
    const movie = moviesById.get(movieId);

    if (movie) {
      orderedMovies.push(movie);
    }
  }
  for (const prerequisiteId of prerequisitesByMovie.get(targetId) ?? []) {
    dfs(prerequisiteId);
  }

  let watchedCount = 0;
  let unwatchedRuntimeMinutes = 0;

  for (const movie of orderedMovies) {
    watchedCount += movie.watched ? 1 : 0;
    unwatchedRuntimeMinutes += movie.watched ? 0 : movie.runtimeMinutes;
  }

  return {
    target: { id: target.id, title: target.title },
    movies: orderedMovies,
    watchedCount,
    requiredCount: orderedMovies.length,
    unwatchedRuntimeMinutes,
  };
}
