import { Router } from "express";
import { query, transaction } from "../db/index.js";
import { asyncHandler, AppError, validate } from "../lib/http.js";
import { leadSchema, statusSchema } from "../lib/schemas.js";
import { authorize } from "../middleware/auth.js";

export const leadsRouter = Router();

leadsRouter.post("/create", authorize("EXECUTIVE"), validate(leadSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const lead = await transaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO leads(company_name,contact_person,phone,whatsapp,email,city,industry,lead_source,notes,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [b.companyName,b.contactPerson,b.phone||null,b.whatsapp||null,b.email||null,b.city||null,b.industry||null,b.leadSource||null,b.notes,req.user.id]
    );
    await client.query(
      `INSERT INTO lead_events(lead_id,event_type,description,to_status,actor_id)
       VALUES($1,'CREATED','Lead created','NEW',$2)`, [rows[0].id, req.user.id]
    );
    return rows[0];
  });
  res.status(201).json(lead);
}));

async function listLeads(req, res, mine = false) {
  const params = [];
  const clauses = [];
  if (mine) { params.push(req.user.id); clauses.push(`l.created_by=$${params.length}`); }
  if (req.query.status) { params.push(req.query.status); clauses.push(`l.status=$${params.length}`); }
  if (req.query.search) {
    params.push(`%${req.query.search}%`);
    clauses.push(`(l.company_name ILIKE $${params.length} OR l.contact_person ILIKE $${params.length} OR l.phone ILIKE $${params.length})`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT l.*,u.name created_by_name,
      (SELECT MAX(date) FROM lead_followups f WHERE f.lead_id=l.id) last_followup,
      (SELECT COUNT(*)::int FROM lead_followups f WHERE f.lead_id=l.id) followup_count
     FROM leads l JOIN users u ON u.id=l.created_by ${where}
     ORDER BY l.updated_at DESC LIMIT 500`, params
  );
  res.json(rows);
}

leadsRouter.get("/all", authorize("MANAGER", "CEO"), asyncHandler((req, res) => listLeads(req, res)));
leadsRouter.get("/my", authorize("EXECUTIVE"), asyncHandler((req, res) => listLeads(req, res, true)));

leadsRouter.get("/:id", asyncHandler(async (req, res) => {
  const access = req.user.role === "EXECUTIVE" ? "AND l.created_by=$2" : "";
  const params = req.user.role === "EXECUTIVE" ? [req.params.id, req.user.id] : [req.params.id];
  const { rows } = await query(
    `SELECT l.*,u.name created_by_name,
      (SELECT COUNT(*)::int FROM lead_followups f WHERE f.lead_id=l.id) followup_count
     FROM leads l JOIN users u ON u.id=l.created_by WHERE l.id=$1 ${access}`, params
  );
  if (!rows[0]) throw new AppError(404, "Lead not found");
  const [followups, remarks, events] = await Promise.all([
    query(`SELECT f.*,u.name manager_name FROM lead_followups f JOIN users u ON u.id=f.manager_id WHERE lead_id=$1 ORDER BY date DESC`, [req.params.id]),
    query(`SELECT r.*,u.name ceo_name FROM ceo_remarks r JOIN users u ON u.id=r.created_by WHERE target_type='LEAD' AND target_id=$1 ORDER BY created_at DESC`, [req.params.id]),
    query(`SELECT e.*,u.name actor_name FROM lead_events e JOIN users u ON u.id=e.actor_id WHERE lead_id=$1 ORDER BY created_at DESC`, [req.params.id])
  ]);
  res.json({ ...rows[0], followups: followups.rows, remarks: remarks.rows, timeline: events.rows });
}));

leadsRouter.put("/:id", authorize("EXECUTIVE"), validate(leadSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const updated = await transaction(async (client) => {
    const current = await client.query(
      `SELECT l.*, EXISTS(SELECT 1 FROM lead_followups f WHERE f.lead_id=l.id) has_followup
       FROM leads l WHERE l.id=$1 AND l.created_by=$2 FOR UPDATE`,
      [req.params.id, req.user.id]
    );
    if (!current.rows[0]) throw new AppError(404, "Lead not found");
    if (current.rows[0].has_followup) {
      throw new AppError(409, "This lead is locked because a Manager has already added a follow-up");
    }
    const { rows } = await client.query(
      `UPDATE leads SET company_name=$1,contact_person=$2,phone=$3,whatsapp=$4,email=$5,
       city=$6,industry=$7,lead_source=$8,notes=$9,updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [b.companyName,b.contactPerson,b.phone||null,b.whatsapp||null,b.email||null,b.city||null,b.industry||null,b.leadSource||null,b.notes,req.params.id]
    );
    await client.query(
      `INSERT INTO lead_events(lead_id,event_type,description,actor_id)
       VALUES($1,'LEAD_UPDATED','Lead details updated by Executive',$2)`,
      [req.params.id, req.user.id]
    );
    return rows[0];
  });
  res.json(updated);
}));

leadsRouter.put("/update-status/:id", authorize("MANAGER"), validate(statusSchema), asyncHandler(async (req, res) => {
  const updated = await transaction(async (client) => {
    const current = await client.query("SELECT * FROM leads WHERE id=$1 FOR UPDATE", [req.params.id]);
    if (!current.rows[0]) throw new AppError(404, "Lead not found");
    const oldStatus = current.rows[0].status;
    const { rows } = await client.query("UPDATE leads SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *", [req.body.status, req.params.id]);
    await client.query(
      `INSERT INTO lead_events(lead_id,event_type,description,from_status,to_status,actor_id)
       VALUES($1,'STATUS_CHANGED',$2,$3,$4,$5)`,
      [req.params.id, `Status changed from ${oldStatus} to ${req.body.status}`, oldStatus, req.body.status, req.user.id]
    );
    return rows[0];
  });
  res.json(updated);
}));
