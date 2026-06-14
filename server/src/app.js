import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config.js";
import { pool } from "./db/index.js";
import { authenticate } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { reportsRouter } from "./routes/reports.js";
import { activitiesRouter } from "./routes/activities.js";
import { leadsRouter } from "./routes/leads.js";
import { followupsRouter } from "./routes/followups.js";
import { remarksRouter } from "./routes/remarks.js";
import { dashboardRouter } from "./routes/dashboard.js";

export const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.clientUrls.includes(origin)) return callback(null, true);

    try {
      const url = new URL(origin);
      const isLocalFrontend = ["localhost", "127.0.0.1"].includes(url.hostname)
        && ["3000", "3001"].includes(url.port);
      return callback(null, isLocalFrontend);
    } catch {
      return callback(null, false);
    }
  },
  credentials: false
}));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));

app.get("/health", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok", time: new Date().toISOString() });
});
app.use("/auth", authRouter);
app.use(authenticate);
app.use("/reports", reportsRouter);
app.use("/activities", activitiesRouter);
app.use("/leads", leadsRouter);
app.use("/followups", followupsRouter);
app.use("/remarks", remarksRouter);
app.use("/dashboard", dashboardRouter);

app.use((_req, res) => res.status(404).json({ message: "Route not found" }));
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.status ? error.message : "Internal server error",
    details: error.details
  });
});
