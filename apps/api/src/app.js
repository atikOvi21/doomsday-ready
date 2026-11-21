import express from "express";
import cors from "cors";
import healthRouter from "./routes/health.routes.js";
import moviesRouter from "./routes/movies.routes.js";
import rewatchRouter from "./routes/rewatch.routes.js";
import cinemasRouter from "./routes/cinemas.routes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  }),
);
app.use(express.json());

app.use("/api", healthRouter);
app.use("/api", moviesRouter);
app.use("/api", rewatchRouter);
app.use("/api", cinemasRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
});

export default app;
