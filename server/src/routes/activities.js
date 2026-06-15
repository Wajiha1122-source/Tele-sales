import { Router } from "express";
import { query } from "../db/index.js";
import { asyncHandler, AppError, validate } from "../lib/http.js";
import { activitySchema } from "../lib/schemas.js";
import { authorize } from "../middleware/auth.js";

export const activitiesRouter = Router();

activitiesRouter.post("/add", authorize("EXECUTIVE"), validate(activitySchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const { rows } = await query(
    `INSERT INTO daily_activities(executive_id,date,time,company_name,contact_person,phone,activity_type,result,remarks)
     VALUES($1,CURRENT_DATE,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.user.id, b.time, b.companyName, b.contactPerson, b.phone || null, b.activityType, b.result, b.remarks]
  );
  res.status(201).json(rows[0]);
}));

activitiesRouter.put("/:id", authorize("EXECUTIVE"), validate(activitySchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const activity = await query(
    `SELECT id FROM daily_activities
     WHERE id=$1 AND executive_id=$2 AND date=CURRENT_DATE`,
    [req.params.id, req.user.id]
  );
  if (!activity.rows[0]) throw new AppError(403, "Only your activities from today can be edited");
  const { rows } = await query(
    `UPDATE daily_activities SET time=$1,company_name=$2,contact_person=$3,phone=$4,
       activity_type=$5,result=$6,remarks=$7 WHERE id=$8 RETURNING *`,
    [b.time, b.companyName, b.contactPerson, b.phone || null, b.activityType, b.result, b.remarks, req.params.id]
  );
  res.json(rows[0]);
}));

activitiesRouter.get("/my-today", authorize("EXECUTIVE"), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM daily_activities
     WHERE executive_id=$1 AND date=CURRENT_DATE
     ORDER BY time DESC, created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
}));

activitiesRouter.get("/by-report/:id", asyncHandler(async (req, res) => {
  if (!["EXECUTIVE", "CEO"].includes(req.user.role)) {
    throw new AppError(403, "Insufficient permissions");
  }
  const ownerCheck = req.user.role === "EXECUTIVE" ? "AND r.executive_id=$2" : "";
  const params = req.user.role === "EXECUTIVE" ? [req.params.id, req.user.id] : [req.params.id];
  const report = await query(`SELECT r.id,r.executive_id,r.date FROM daily_reports r WHERE r.id=$1 ${ownerCheck}`, params);
  if (!report.rows[0]) throw new AppError(404, "Report not found");
  const { rows } = await query(
    `SELECT * FROM daily_activities
     WHERE report_id=$1 OR (executive_id=$2 AND date=$3)
     ORDER BY time DESC, created_at DESC`,
    [req.params.id, report.rows[0].executive_id, report.rows[0].date]
  );
  res.json(rows);
}));
