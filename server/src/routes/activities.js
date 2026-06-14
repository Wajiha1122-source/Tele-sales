import { Router } from "express";
import { query } from "../db/index.js";
import { asyncHandler, AppError, validate } from "../lib/http.js";
import { activitySchema } from "../lib/schemas.js";
import { authorize } from "../middleware/auth.js";

export const activitiesRouter = Router();

activitiesRouter.post("/add", authorize("EXECUTIVE"), validate(activitySchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const report = await query(
    "SELECT *, date = CURRENT_DATE AS is_today FROM daily_reports WHERE id=$1 AND executive_id=$2",
    [b.reportId, req.user.id]
  );
  if (!report.rows[0]) throw new AppError(404, "Report not found");
  if (!report.rows[0].is_today) {
    throw new AppError(403, "Activities can only be added to today's report");
  }
  const { rows } = await query(
    `INSERT INTO daily_activities(report_id,time,company_name,contact_person,phone,activity_type,result,remarks)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [b.reportId, b.time, b.companyName, b.contactPerson, b.phone || null, b.activityType, b.result, b.remarks]
  );
  res.status(201).json(rows[0]);
}));

activitiesRouter.put("/:id", authorize("EXECUTIVE"), validate(activitySchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const activity = await query(
    `SELECT a.id FROM daily_activities a
     JOIN daily_reports r ON r.id=a.report_id
     WHERE a.id=$1 AND a.report_id=$2 AND r.executive_id=$3 AND r.date=CURRENT_DATE`,
    [req.params.id, b.reportId, req.user.id]
  );
  if (!activity.rows[0]) throw new AppError(403, "Only your activities from today's report can be edited");
  const { rows } = await query(
    `UPDATE daily_activities SET time=$1,company_name=$2,contact_person=$3,phone=$4,
       activity_type=$5,result=$6,remarks=$7 WHERE id=$8 RETURNING *`,
    [b.time, b.companyName, b.contactPerson, b.phone || null, b.activityType, b.result, b.remarks, req.params.id]
  );
  res.json(rows[0]);
}));

activitiesRouter.get("/by-report/:id", asyncHandler(async (req, res) => {
  if (!["EXECUTIVE", "CEO"].includes(req.user.role)) {
    throw new AppError(403, "Insufficient permissions");
  }
  const ownerCheck = req.user.role === "EXECUTIVE" ? "AND r.executive_id=$2" : "";
  const params = req.user.role === "EXECUTIVE" ? [req.params.id, req.user.id] : [req.params.id];
  const report = await query(`SELECT r.id FROM daily_reports r WHERE r.id=$1 ${ownerCheck}`, params);
  if (!report.rows[0]) throw new AppError(404, "Report not found");
  const { rows } = await query("SELECT * FROM daily_activities WHERE report_id=$1 ORDER BY time DESC", [req.params.id]);
  res.json(rows);
}));
