import { Router } from "express";
import { query, transaction } from "../db/index.js";
import { asyncHandler, AppError, validate } from "../lib/http.js";
import { remarkSchema } from "../lib/schemas.js";
import { authorize } from "../middleware/auth.js";

export const remarksRouter = Router();

remarksRouter.post("/add", authorize("CEO"), validate(remarkSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const remark = await transaction(async (client) => {
    const tables = {
      LEAD: "leads",
      REPORT: "daily_reports",
      PURCHASER: "purchasers"
    };
    const table = tables[b.targetType];
    const exists = await client.query(`SELECT id FROM ${table} WHERE id=$1`, [b.targetId]);
    if (!exists.rows[0]) throw new AppError(404, `${b.targetType.toLowerCase()} not found`);
    const { rows } = await client.query(
      `INSERT INTO ceo_remarks(target_type,target_id,remark_text,created_by) VALUES($1,$2,$3,$4) RETURNING *`,
      [b.targetType, b.targetId, b.text, req.user.id]
    );
    if (b.targetType === "LEAD") {
      await client.query(
        `INSERT INTO lead_events(lead_id,event_type,description,actor_id,metadata)
         VALUES($1,'CEO_REMARK',$2,$3,$4)`,
        [b.targetId, b.text, req.user.id, JSON.stringify({ remarkId: rows[0].id })]
      );
    }
    return rows[0];
  });
  res.status(201).json(remark);
}));

remarksRouter.get("/:targetId", asyncHandler(async (req, res) => {
  const params = [req.params.targetId];
  const targetFilter = req.query.targetType ? "AND r.target_type=$2::remark_target" : "";
  if (req.query.targetType) params.push(req.query.targetType);
  const { rows } = await query(
    `SELECT r.*,u.name ceo_name FROM ceo_remarks r JOIN users u ON u.id=r.created_by
     WHERE target_id=$1 ${targetFilter} ORDER BY created_at DESC`, params
  );
  res.json(rows);
}));
