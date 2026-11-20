import { Router } from "express";
import pool from "../db/pool.js";

const router = Router();

router.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "ok" });
  } catch (error) {
    console.error("Health check database query failed:", error.message);
    res.status(503).json({ status: "error", database: "unavailable" });
  }
});

export default router;
