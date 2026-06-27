import { Router } from "express";
import { query, transaction } from "../db/index.js";
import { asyncHandler, AppError, validate } from "../lib/http.js";
import { updateSchema } from "../lib/schemas.js";
import { authorize } from "../middleware/auth.js";

export const updatesRouter = Router();

updatesRouter.get("/", asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT i.*,u.name created_by_name
     FROM important_updates i
     JOIN users u ON u.id=i.created_by
     WHERE i.audience='ALL' OR i.audience=$1
     ORDER BY i.pinned DESC,i.created_at DESC
     LIMIT 200`,
    [req.user.role]
  );
  res.json(rows);
}));

updatesRouter.post("/", authorize("MANAGER", "CEO"), validate(updateSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const saved = await transaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO important_updates(title,body,priority,audience,pinned,created_by)
       VALUES($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [b.title, b.body, b.priority, b.audience, b.pinned, req.user.id]
    );
    await client.query(
      `INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata)
       VALUES($1,'IMPORTANT_UPDATE_CREATED','IMPORTANT_UPDATE',$2,$3)`,
      [req.user.id, rows[0].id, JSON.stringify({ priority: b.priority, audience: b.audience, pinned: b.pinned })]
    );
    return rows[0];
  });
  res.status(201).json(saved);
}));

updatesRouter.put("/:id", authorize("MANAGER", "CEO"), validate(updateSchema), asyncHandler(async (req, res) => {
  const b = req.body;
  const { rows } = await query(
    `UPDATE important_updates
     SET title=$1,body=$2,priority=$3,audience=$4,pinned=$5,updated_at=NOW()
     WHERE id=$6
     RETURNING *`,
    [b.title, b.body, b.priority, b.audience, b.pinned, req.params.id]
  );
  if (!rows[0]) throw new AppError(404, "Important update not found");
  res.json(rows[0]);
}));
