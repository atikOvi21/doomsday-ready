import pool from "../db/pool.js";

export async function createCinema(name, bundleSizes, client) {
  const cinemaResult = await client.query(
    `INSERT INTO cinemas (name)
     VALUES ($1)
     RETURNING id, name`,
    [name],
  );

  const cinema = cinemaResult.rows[0];

  for (const seatCount of bundleSizes) {
    await client.query(
      `INSERT INTO cinema_bundles (cinema_id, seat_count)
       VALUES ($1, $2)`,
      [cinema.id, seatCount],
    );
  }

  return { ...cinema, bundleSizes };
}

export async function listCinemas() {
  const result = await pool.query(`
    SELECT
      c.id,
      c.name,
      COALESCE(
        json_agg(cb.seat_count ORDER BY cb.seat_count)
          FILTER (WHERE cb.seat_count IS NOT NULL),
        '[]'::json
      ) AS "bundleSizes"
    FROM cinemas c
    LEFT JOIN cinema_bundles cb ON cb.cinema_id = c.id
    GROUP BY c.id
    ORDER BY c.name
  `);

  return result.rows;
}

export async function findCinemaById(id) {
  const result = await pool.query(
    `SELECT
       c.id,
       c.name,
       COALESCE(
         json_agg(cb.seat_count ORDER BY cb.seat_count)
           FILTER (WHERE cb.seat_count IS NOT NULL),
         '[]'::json
       ) AS "bundleSizes"
     FROM cinemas c
     LEFT JOIN cinema_bundles cb ON cb.cinema_id = c.id
     WHERE c.id = $1
     GROUP BY c.id`,
    [id],
  );

  return result.rows[0] ?? null;
}
