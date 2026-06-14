import { Router } from "express";
import { transaction, query } from "../db/index.js";
import { asyncHandler, AppError, validate } from "../lib/http.js";
import { followupSchema } from "../lib/schemas.js";
import { authorize } from "../middleware/auth.js";

export const followupsRouter = Router();

followupsRouter.post("/add", authorize("MANAGER"), validate(followupSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const followup = await transaction(async (client) => {
    const current = await client.query("SELECT status FROM leads WHERE id=$1 FOR UPDATE", [b.leadId]);
    if (!current.rows[0]) throw new AppError(404, "Lead not found");
    const { rows } = await client.query(
      `INSERT INTO lead_followups(lead_id,manager_id,date,notes,status_update)
       VALUES($1,$2,$3,$4,$5) RETURNING *`,
      [b.leadId, req.user.id, b.date || new Date(), b.notes, b.statusUpdate]
    );
    await client.query("UPDATE leads SET status=$1,updated_at=NOW() WHERE id=$2", [b.statusUpdate, b.leadId]);
    await client.query(
      `INSERT INTO lead_events(lead_id,event_type,description,from_status,to_status,actor_id,metadata)
       VALUES($1,'FOLLOWUP_ADDED',$2,$3,$4,$5,$6)`,
      [b.leadId, b.notes, current.rows[0].status, b.statusUpdate, req.user.id, JSON.stringify({ followupId: rows[0].id })]
    );
    return rows[0];
  });
  res.status(201).json(followup);
}));

followupsRouter.get("/:leadId", authorize("MANAGER", "CEO"), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT f.*,u.name manager_name FROM lead_followups f JOIN users u ON u.id=f.manager_id
     WHERE lead_id=$1 ORDER BY date DESC`, [req.params.leadId]
  );
  res.json(rows);
}));
