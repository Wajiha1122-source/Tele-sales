import { Router } from "express";
import { query, transaction } from "../db/index.js";
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
    `SELECT a.*,r.ceo_viewed_at AS report_ceo_viewed_at,
       (a.ceo_viewed_at IS NULL AND r.ceo_viewed_at IS NULL) AS can_delete
     FROM daily_activities a
     LEFT JOIN daily_reports r ON r.executive_id=a.executive_id AND r.date=a.date
     WHERE a.executive_id=$1 AND a.date=CURRENT_DATE
     ORDER BY time DESC, created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
}));

activitiesRouter.get("/all", authorize("CEO"), asyncHandler(async (req, res) => {
  const rows = await transaction(async (client) => {
    const recent = await client.query(
      `SELECT a.id
       FROM daily_activities a
       ORDER BY a.date DESC,a.time DESC,a.created_at DESC
       LIMIT 100`
    );
    const ids = recent.rows.map((row) => row.id);
    if (!ids.length) return [];

    await client.query(
      `UPDATE daily_activities
       SET ceo_viewed_at=COALESCE(ceo_viewed_at,NOW()),
           ceo_viewed_by=COALESCE(ceo_viewed_by,$1)
       WHERE id=ANY($2::uuid[])`,
      [req.user.id, ids]
    );
    const result = await client.query(
      `SELECT a.*,u.name executive_name,r.id AS report_id,
         (r.id IS NOT NULL) AS report_submitted
       FROM daily_activities a
       JOIN users u ON u.id=a.executive_id
       LEFT JOIN daily_reports r ON r.executive_id=a.executive_id AND r.date=a.date
       WHERE a.id=ANY($1::uuid[])
       ORDER BY a.date DESC,a.time DESC,a.created_at DESC`,
      [ids]
    );
    return result.rows;
  });
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
  if (req.user.role === "CEO") {
    await query(
      `UPDATE daily_reports
       SET ceo_viewed_at=COALESCE(ceo_viewed_at,NOW()),ceo_viewed_by=COALESCE(ceo_viewed_by,$2)
       WHERE id=$1`,
      [req.params.id, req.user.id]
    );
  }
  const { rows } = await query(
    `SELECT * FROM daily_activities
     WHERE report_id=$1 OR (executive_id=$2 AND date=$3)
     ORDER BY time DESC, created_at DESC`,
    [req.params.id, report.rows[0].executive_id, report.rows[0].date]
  );
  res.json(rows);
}));

activitiesRouter.delete("/:id", authorize("EXECUTIVE"), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `DELETE FROM daily_activities a
     WHERE a.id=$1 AND a.executive_id=$2 AND a.date=CURRENT_DATE
       AND NOT EXISTS (
         SELECT 1 FROM daily_reports r
         WHERE r.executive_id=a.executive_id AND r.date=a.date AND r.ceo_viewed_at IS NOT NULL
       )
       AND a.ceo_viewed_at IS NULL
     RETURNING a.id`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) {
    const existing = await query(
      `SELECT a.date,a.ceo_viewed_at AS activity_ceo_viewed_at,r.ceo_viewed_at AS report_ceo_viewed_at
       FROM daily_activities a
       LEFT JOIN daily_reports r ON r.executive_id=a.executive_id AND r.date=a.date
       WHERE a.id=$1 AND a.executive_id=$2`,
      [req.params.id, req.user.id]
    );
    if (!existing.rows[0]) throw new AppError(404, "Activity not found");
    if (existing.rows[0].activity_ceo_viewed_at || existing.rows[0].report_ceo_viewed_at) {
      throw new AppError(409, "This activity is locked because the CEO has viewed it");
    }
    throw new AppError(403, "Only today's activities can be deleted");
  }
  res.json({ message: "Activity deleted" });
}));
