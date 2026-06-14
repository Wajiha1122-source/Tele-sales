import { Router } from "express";
import { query } from "../db/index.js";
import { asyncHandler, AppError, validate } from "../lib/http.js";
import { reportSchema } from "../lib/schemas.js";
import { authorize } from "../middleware/auth.js";

export const reportsRouter = Router();

reportsRouter.post("/create", authorize("EXECUTIVE"), validate(reportSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const { rows } = await query(
    `INSERT INTO daily_reports(executive_id,total_calls,contacts_reached,interested_count,meetings_scheduled,remarks)
     VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT(executive_id,date) DO UPDATE SET total_calls=$2,contacts_reached=$3,interested_count=$4,
       meetings_scheduled=$5,remarks=$6,updated_at=NOW()
     WHERE daily_reports.date = CURRENT_DATE
     RETURNING *`,
    [req.user.id, b.totalCalls, b.contactsReached, b.interestedCount, b.meetingsScheduled, b.remarks]
  );
  if (!rows[0]) throw new AppError(403, "Only today's report can be edited");
  res.status(201).json(rows[0]);
}));

reportsRouter.get("/my", authorize("EXECUTIVE"), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT r.*, COUNT(a.id)::int activity_count FROM daily_reports r
     LEFT JOIN daily_activities a ON a.report_id=r.id WHERE r.executive_id=$1
     GROUP BY r.id ORDER BY r.date DESC LIMIT 90`, [req.user.id]
  );
  res.json(rows);
}));

reportsRouter.get("/all", authorize("CEO"), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT r.*,u.name executive_name,COUNT(a.id)::int activity_count FROM daily_reports r
     JOIN users u ON u.id=r.executive_id LEFT JOIN daily_activities a ON a.report_id=r.id
     GROUP BY r.id,u.name ORDER BY r.date DESC,u.name LIMIT 500`
  );
  res.json(rows);
}));
