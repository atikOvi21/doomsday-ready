import { Router } from "express";
import pool from "../db/pool.js";
import {
  findMovieById,
  listMovies,
  setPrerequisites,
} from "../repositories/movie.repository.js";

const router = Router();

function validateMovieInput(body, { partial = false } = {}) {
  const errors = [];

  if (!partial || body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim() === "") {
      errors.push("title must be a non-empty string");
    }
  }

  if (!partial || body.releaseYear !== undefined) {
    if (!Number.isInteger(body.releaseYear) || body.releaseYear < 1) {
      errors.push("releaseYear must be a positive integer");
    }
  }

  if (!partial || body.runtimeMinutes !== undefined) {
    if (
      !Number.isInteger(body.runtimeMinutes) ||
      body.runtimeMinutes < 1 ||
      body.runtimeMinutes > 300
    ) {
      errors.push("runtimeMinutes must be an integer from 1 to 300");
    }
  }

  if (body.watched !== undefined && typeof body.watched !== "boolean") {
    errors.push("watched must be true or false");
  }

  if (
    body.prerequisites !== undefined &&
    (!Array.isArray(body.prerequisites) ||
      body.prerequisites.some((id) => !Number.isInteger(id) || id < 1))
  ) {
    errors.push("prerequisites must be an array of positive integer movie IDs");
  }

  return errors;
}

function parseId(value) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

router.get("/movies", async (req, res, next) => {
  try {
    res.json(await listMovies());
  } catch (error) {
    next(error);
  }
});

router.post("/movies", async (req, res, next) => {
  const errors = validateMovieInput(req.body);

  if (errors.length) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: errors });
  }

  const title = req.body.title.trim();
  const prerequisiteIds = [...new Set(req.body.prerequisites ?? [])];

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO movies (title, release_year, runtime_minutes, watched)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, release_year AS "releaseYear",
                 runtime_minutes AS "runtimeMinutes", watched`,
      [
        title,
        req.body.releaseYear,
        req.body.runtimeMinutes,
        req.body.watched ?? false,
      ],
    );

    const movie = result.rows[0];

    const existingIds = new Set(
      (
        await client.query("SELECT id FROM movies WHERE id = ANY($1::int[])", [
          prerequisiteIds,
        ])
      ).rows.map((row) => row.id),
    );

    const missingIds = prerequisiteIds.filter((id) => !existingIds.has(id));

    if (missingIds.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "INVALID_PREREQUISITE_IDS",
        missingIds,
      });
    }

    await setPrerequisites(movie.id, prerequisiteIds, client);
    await client.query("COMMIT");

    return res.status(201).json({
      ...movie,
      prerequisites: prerequisiteIds,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({ error: "TITLE_ALREADY_EXISTS" });
    }

    next(error);
  } finally {
    client.release();
  }
});

async function createsCircularDependency(movieId, prerequisiteIds, client) {
  const result = await client.query(
    `
    WITH RECURSIVE dependency_tree(movie_id) AS (
      SELECT unnest($1::int[])

      UNION

      SELECT mp.prerequisite_movie_id
      FROM movie_prerequisites mp
      INNER JOIN dependency_tree dt
        ON mp.movie_id = dt.movie_id
    )

    SELECT EXISTS (
      SELECT 1
      FROM dependency_tree
      WHERE movie_id = $2
    ) AS creates_cycle;
    `,
    [prerequisiteIds, movieId],
  );

  return result.rows[0].creates_cycle;
}

router.patch("/movies/:id", async (req, res, next) => {
  const id = parseId(req.params.id);

  if (!id) {
    return res.status(400).json({ error: "INVALID_MOVIE_ID" });
  }

  const errors = validateMovieInput(req.body, { partial: true });

  if (errors.length) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: errors });
  }

  const prerequisiteIds =
    req.body.prerequisites === undefined
      ? null
      : [...new Set(req.body.prerequisites)];

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const current = await findMovieById(id, client);

    if (!current) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "MOVIE_NOT_FOUND" });
    }

    const nextMovie = {
      title: req.body.title?.trim() ?? current.title,
      releaseYear: req.body.releaseYear ?? current.releaseYear,
      runtimeMinutes: req.body.runtimeMinutes ?? current.runtimeMinutes,
      watched: req.body.watched ?? current.watched,
    };

    if (prerequisiteIds) {
      const existingIds = new Set(
        (
          await client.query(
            "SELECT id FROM movies WHERE id = ANY($1::int[])",
            [prerequisiteIds],
          )
        ).rows.map((row) => row.id),
      );

      const missingIds = prerequisiteIds.filter(
        (item) => !existingIds.has(item),
      );

      if (missingIds.length) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          error: "INVALID_PREREQUISITE_IDS",
          missingIds,
        });
      }

      // Check for direct or indirect circular dependencies
      const createsCycle = await createsCircularDependency(
        id,
        prerequisiteIds,
        client,
      );

      if (createsCycle) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          error: "CIRCULAR_DEPENDENCY",
        });
      }
    }

    const updated = await client.query(
      `UPDATE movies
       SET title = $1, release_year = $2, runtime_minutes = $3, watched = $4
       WHERE id = $5
       RETURNING id, title, release_year AS "releaseYear",
                 runtime_minutes AS "runtimeMinutes", watched`,
      [
        nextMovie.title,
        nextMovie.releaseYear,
        nextMovie.runtimeMinutes,
        nextMovie.watched,
        id,
      ],
    );

    if (prerequisiteIds) {
      await setPrerequisites(id, prerequisiteIds, client);
    }

    await client.query("COMMIT");

    return res.json({
      ...updated.rows[0],
      prerequisites: prerequisiteIds,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({ error: "TITLE_ALREADY_EXISTS" });
    }

    next(error);
  } finally {
    client.release();
  }
});

export default router;
