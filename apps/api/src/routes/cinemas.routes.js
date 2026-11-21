import { Router } from "express";
import pool from "../db/pool.js";
import {
  createCinema,
  findCinemaById,
  listCinemas,
} from "../repositories/cinema.repository.js";
import { calculateBookingQuote } from "../services/booking.service.js";

const router = Router();

function validateCinemaInput(body) {
  const errors = [];

  if (typeof body.name !== "string" || body.name.trim() === "") {
    errors.push("name must be a non-empty string");
  }

  const sizes = body.bundleSizes;

  if (!Array.isArray(sizes) || sizes.length < 1 || sizes.length > 10) {
    errors.push("bundleSizes must contain between 1 and 10 sizes");
  } else {
    if (
      sizes.some((size) => !Number.isInteger(size) || size < 1 || size > 500)
    ) {
      errors.push("each bundle size must be an integer from 1 to 500");
    }

    if (new Set(sizes).size !== sizes.length) {
      errors.push("bundleSizes must not contain duplicates");
    }
  }

  return errors;
}

function parseId(value) {
  if (!/^[1-9]\d*$/.test(value)) return null;

  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

router.post("/cinemas", async (req, res, next) => {
  const errors = validateCinemaInput(req.body ?? {});

  if (errors.length) {
    return res.status(400).json({ error: "VALIDATION_ERROR", details: errors });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const cinema = await createCinema(
      req.body.name.trim(),
      req.body.bundleSizes,
      client,
    );

    await client.query("COMMIT");
    return res.status(201).json(cinema);
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({ error: "CINEMA_NAME_ALREADY_EXISTS" });
    }

    return next(error);
  } finally {
    client.release();
  }
});

router.get("/cinemas", async (req, res, next) => {
  try {
    return res.json(await listCinemas());
  } catch (error) {
    return next(error);
  }
});

router.get("/cinemas/:id/booking", async (req, res, next) => {
  const id = parseId(req.params.id);
  const groupSizeText = req.query.groupSize;

  if (!id) {
    return res.status(400).json({ error: "INVALID_CINEMA_ID" });
  }

  if (typeof groupSizeText !== "string" || !/^[1-9]\d*$/.test(groupSizeText)) {
    return res.status(400).json({ error: "INVALID_GROUP_SIZE" });
  }

  const groupSize = Number(groupSizeText);

  if (!Number.isSafeInteger(groupSize) || groupSize > 10000) {
    return res.status(400).json({ error: "INVALID_GROUP_SIZE" });
  }

  try {
    const cinema = await findCinemaById(id);

    if (!cinema) {
      return res.status(404).json({ error: "CINEMA_NOT_FOUND" });
    }
    const quote = calculateBookingQuote(cinema.bundleSizes, groupSize);

    if (quote === null) {
      return res.json({
        cinema: { id: cinema.id, name: cinema.name },
        groupSize,
        possible: false,
        bundleCount: null,
        bundles: [],
      });
    }

    return res.json({
      cinema: { id: cinema.id, name: cinema.name },
      groupSize,
      possible: true,
      ...quote,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
