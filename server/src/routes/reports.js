import { Router } from "express";
import { query, transaction } from "../db/index.js";
import { asyncHandler, AppError, validate } from "../lib/http.js";
import { reportRangeSchema, reportSchema } from "../lib/schemas.js";
import { authorize } from "../middleware/auth.js";

export const reportsRouter = Router();

reportsRouter.get("/generate", authorize("MANAGER", "CEO"), validate(reportRangeSchema, "query"), asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.validatedQuery;
  const params = [startDate, endDate];
  const [summary, reports, activities, leads, executives] = await Promise.all([
    query(
      `SELECT
         (SELECT COUNT(*)::int FROM daily_reports WHERE date BETWEEN $1::date AND $2::date) reports,
         (SELECT COUNT(*)::int FROM daily_activities WHERE date BETWEEN $1::date AND $2::date) activities,
         (SELECT COUNT(*)::int FROM leads WHERE created_at::date BETWEEN $1::date AND $2::date) leads,
         (SELECT COALESCE(SUM(total_calls),0)::int FROM daily_reports WHERE date BETWEEN $1::date AND $2::date) calls,
         (SELECT COALESCE(SUM(contacts_reached),0)::int FROM daily_reports WHERE date BETWEEN $1::date AND $2::date) contacts,
         (SELECT COALESCE(SUM(interested_count),0)::int FROM daily_reports WHERE date BETWEEN $1::date AND $2::date) interested,
         (SELECT COALESCE(SUM(meetings_scheduled),0)::int FROM daily_reports WHERE date BETWEEN $1::date AND $2::date) meetings,
         (SELECT COUNT(*)::int FROM leads WHERE status='CONVERTED' AND created_at::date BETWEEN $1::date AND $2::date) converted`,
      params
    ),
    query(
      `SELECT r.id,r.date,u.name executive_name,r.total_calls,r.contacts_reached,
         r.interested_count,r.meetings_scheduled,r.remarks,
         COUNT(a.id)::int activity_count
       FROM daily_reports r
       JOIN users u ON u.id=r.executive_id
       LEFT JOIN daily_activities a ON a.executive_id=r.executive_id AND a.date=r.date
       WHERE r.date BETWEEN $1::date AND $2::date
       GROUP BY r.id,u.name
       ORDER BY r.date DESC,u.name`,
      params
    ),
    query(
      `SELECT a.id,a.date,a.time,u.name executive_name,a.company_name,a.contact_person,
         a.phone,a.activity_type,a.result,a.remarks
       FROM daily_activities a
       JOIN users u ON u.id=a.executive_id
       WHERE a.date BETWEEN $1::date AND $2::date
       ORDER BY a.date DESC,a.time DESC,a.created_at DESC`,
      params
    ),
    query(
      `SELECT l.id,l.created_at,u.name executive_name,l.company_name,l.contact_person,
         l.phone,l.whatsapp,l.email,l.city,l.industry,l.lead_source,l.status,l.notes
       FROM leads l
       JOIN users u ON u.id=l.created_by
       WHERE l.created_at::date BETWEEN $1::date AND $2::date
       ORDER BY l.created_at DESC`,
      params
    ),
    query(
      `SELECT u.name,
         (SELECT COUNT(*)::int FROM daily_reports r WHERE r.executive_id=u.id AND r.date BETWEEN $1::date AND $2::date) reports,
         (SELECT COUNT(*)::int FROM daily_activities a WHERE a.executive_id=u.id AND a.date BETWEEN $1::date AND $2::date) activities,
         (SELECT COUNT(*)::int FROM leads l WHERE l.created_by=u.id AND l.created_at::date BETWEEN $1::date AND $2::date) leads,
         (SELECT COALESCE(SUM(r.total_calls),0)::int FROM daily_reports r WHERE r.executive_id=u.id AND r.date BETWEEN $1::date AND $2::date) calls
       FROM users u
       WHERE u.role='EXECUTIVE'
       ORDER BY activities DESC,leads DESC`,
      params
    )
  ]);

  res.json({
    company: "Irshad & Company",
    range: { startDate, endDate },
    generatedAt: new Date().toISOString(),
    generatedBy: { id: req.user.id, name: req.user.name, role: req.user.role },
    summary: summary.rows[0],
    executiveSummary: executives.rows,
    dailyReports: reports.rows,
    activities: activities.rows,
    leads: leads.rows
  });
}));

reportsRouter.post("/create", authorize("EXECUTIVE"), validate(reportSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const saved = await transaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO daily_reports(executive_id,total_calls,contacts_reached,interested_count,meetings_scheduled,remarks)
       VALUES($1,$2,$3,$4,$5,$6)
       ON CONFLICT(executive_id,date) DO UPDATE SET total_calls=$2,contacts_reached=$3,interested_count=$4,
         meetings_scheduled=$5,remarks=$6,updated_at=NOW()
       WHERE daily_reports.date = CURRENT_DATE
       RETURNING *`,
      [req.user.id, b.totalCalls, b.contactsReached, b.interestedCount, b.meetingsScheduled, b.remarks]
    );
    if (!rows[0]) throw new AppError(403, "Only today's report can be edited");
    await client.query(
      `UPDATE daily_activities SET report_id=$1
       WHERE executive_id=$2 AND date=CURRENT_DATE`,
      [rows[0].id, req.user.id]
    );
    return rows[0];
  });
  res.status(201).json(saved);
}));

reportsRouter.get("/my", authorize("EXECUTIVE"), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT r.*, COUNT(a.id)::int activity_count FROM daily_reports r
     LEFT JOIN daily_activities a ON a.executive_id=r.executive_id AND a.date=r.date WHERE r.executive_id=$1
     GROUP BY r.id ORDER BY r.date DESC LIMIT 90`, [req.user.id]
  );
  res.json(rows);
}));

reportsRouter.get("/all", authorize("CEO"), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT r.*,u.name executive_name,COUNT(a.id)::int activity_count FROM daily_reports r
     JOIN users u ON u.id=r.executive_id
     LEFT JOIN daily_activities a ON a.executive_id=r.executive_id AND a.date=r.date
     GROUP BY r.id,u.name ORDER BY r.date DESC,u.name LIMIT 500`
  );
  res.json(rows);
}));

reportsRouter.delete("/:id", authorize("EXECUTIVE"), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `DELETE FROM daily_reports
     WHERE id=$1 AND executive_id=$2 AND date=CURRENT_DATE AND ceo_viewed_at IS NULL
     RETURNING id`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) {
    const existing = await query(
      "SELECT date,ceo_viewed_at FROM daily_reports WHERE id=$1 AND executive_id=$2",
      [req.params.id, req.user.id]
    );
    if (!existing.rows[0]) throw new AppError(404, "Report not found");
    if (existing.rows[0].ceo_viewed_at) throw new AppError(409, "This report is locked because the CEO has viewed it");
    throw new AppError(403, "Only today's report can be deleted");
  }
  res.json({ message: "Today's report deleted" });
}));
