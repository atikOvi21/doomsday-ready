import pool from "../db/pool.js";

export async function getMovieGraph() {
  const [moviesResult, edgesResult] = await Promise.all([
    pool.query(`
      SELECT
        id,
        title,
        release_year AS "releaseYear",
        runtime_minutes AS "runtimeMinutes",
        watched
      FROM movies
      ORDER BY id
    `),
    pool.query(`
      SELECT
        movie_id AS "movieId",
        prerequisite_movie_id AS "prerequisiteMovieId"
      FROM movie_prerequisites
    `),
  ]);

  return {
    movies: moviesResult.rows,
    edges: edgesResult.rows,
  };
}
