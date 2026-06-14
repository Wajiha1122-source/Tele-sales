import { Router } from "express";
import { query } from "../db/index.js";
import { asyncHandler } from "../lib/http.js";
import { authorize } from "../middleware/auth.js";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", authorize("MANAGER", "CEO"), asyncHandler(async (_req, res) => {
  const [leadStats, reportsToday, performance] = await Promise.all([
    query(`SELECT COUNT(*)::int total,
      COUNT(*) FILTER(WHERE status='NEW')::int new,
      COUNT(*) FILTER(WHERE status='CONVERTED')::int converted,
      COUNT(*) FILTER(WHERE status='LOST')::int lost FROM leads`),
    query(`SELECT COUNT(*)::int reports,
      COALESCE(SUM(total_calls),0)::int calls,
      COALESCE(SUM(contacts_reached),0)::int contacts,
      COALESCE(SUM(meetings_scheduled),0)::int meetings FROM daily_reports WHERE date=CURRENT_DATE`),
    query(`SELECT u.id,u.name,
      COUNT(DISTINCT r.id)::int reports,
      COALESCE(SUM(r.total_calls),0)::int calls,
      COALESCE(SUM(r.contacts_reached),0)::int contacts,
      COUNT(DISTINCT l.id)::int leads
     FROM users u LEFT JOIN daily_reports r ON r.executive_id=u.id AND r.date>=CURRENT_DATE-INTERVAL '30 days'
     LEFT JOIN leads l ON l.created_by=u.id AND l.created_at>=CURRENT_DATE-INTERVAL '30 days'
     WHERE u.role='EXECUTIVE' GROUP BY u.id,u.name ORDER BY calls DESC`)
  ]);
  res.json({ leads: leadStats.rows[0], today: reportsToday.rows[0], performance: performance.rows });
}));
