import { Router } from "express";
import { getMovieGraph } from "../repositories/rewatch.repository.js";
import { buildRewatchPlan } from "../services/rewatch.service.js";

const router = Router();

router.get("/movies/:id/rewatch-order", async (req, res, next) => {
  const idText = req.params.id;

  if (!/^[1-9]\d*$/.test(idText)) {
    return res.status(400).json({ error: "INVALID_MOVIE_ID" });
  }

  const id = Number(idText);

  if (!Number.isSafeInteger(id)) {
    return res.status(400).json({ error: "INVALID_MOVIE_ID" });
  }

  try {
    const graph = await getMovieGraph();
    const plan = buildRewatchPlan(id, graph);

    if (!plan) {
      return res.status(404).json({ error: "MOVIE_NOT_FOUND" });
    }

    return res.json(plan);
  } catch (error) {
    return next(error);
  }
});

export default router;
