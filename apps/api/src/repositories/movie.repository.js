import pool from "../db/pool.js";

export async function listMovies() {
  const result = await pool.query(
    `SELECT
       m.id,
       m.title,
       m.release_year AS "releaseYear",
       m.runtime_minutes AS "runtimeMinutes",
       m.watched,
       COALESCE(
         json_agg(mp.prerequisite_movie_id)
           FILTER (WHERE mp.prerequisite_movie_id IS NOT NULL),
         '[]'
       ) AS prerequisites
     FROM movies m
     LEFT JOIN movie_prerequisites mp ON mp.movie_id = m.id
     GROUP BY m.id
     ORDER BY m.title`,
  );

  return result.rows;
}

export async function findMovieById(id, client = pool) {
  const result = await client.query(
    `SELECT id, title, release_year AS "releaseYear",
            runtime_minutes AS "runtimeMinutes", watched
     FROM movies
     WHERE id = $1`,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function createMovie(movie, client) {
  const result = await client.query(
    `INSERT INTO movies (title, release_year, runtime_minutes, watched)
     VALUES ($1, $2, $3, $4)
     RETURNING id, title, release_year AS "releaseYear",
               runtime_minutes AS "runtimeMinutes", watched`,
    [movie.title, movie.releaseYear, movie.runtimeMinutes, movie.watched],
  );

  return result.rows[0];
}

export async function setPrerequisites(movieId, prerequisiteIds, client) {
  await client.query("DELETE FROM movie_prerequisites WHERE movie_id = $1", [
    movieId,
  ]);

  for (const prerequisiteId of prerequisiteIds) {
    await client.query(
      `INSERT INTO movie_prerequisites (movie_id, prerequisite_movie_id)
       VALUES ($1, $2)`,
      [movieId, prerequisiteId],
    );
  }
}
