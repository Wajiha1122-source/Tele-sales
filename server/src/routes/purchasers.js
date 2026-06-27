import { Router } from "express";
import { query, transaction } from "../db/index.js";
import { asyncHandler, AppError, validate } from "../lib/http.js";
import { purchaserSchema } from "../lib/schemas.js";

export const purchasersRouter = Router();

function purchaserValues(body, userId) {
  return [
    body.companyName,
    body.contactPerson,
    body.phone || null,
    body.whatsapp || null,
    body.email || null,
    body.city || null,
    body.productInterest || null,
    body.purchaseStage,
    body.expectedValue ?? null,
    body.nextFollowupDate || null,
    body.notes || null,
    userId
  ];
}

purchasersRouter.get("/", asyncHandler(async (req, res) => {
  const params = [];
  const clauses = [];
  if (req.user.role === "EXECUTIVE") {
    params.push(req.user.id);
    clauses.push(`p.created_by=$${params.length}`);
  }
  if (req.query.stage) {
    params.push(req.query.stage);
    clauses.push(`p.purchase_stage=$${params.length}`);
  }
  if (req.query.search) {
    params.push(`%${req.query.search}%`);
    clauses.push(`(p.company_name ILIKE $${params.length} OR p.contact_person ILIKE $${params.length} OR p.phone ILIKE $${params.length} OR p.product_interest ILIKE $${params.length})`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT p.*,u.name created_by_name,updater.name updated_by_name
     FROM purchasers p
     JOIN users u ON u.id=p.created_by
     LEFT JOIN users updater ON updater.id=p.updated_by
     ${where}
     ORDER BY p.updated_at DESC
     LIMIT 500`,
    params
  );
  res.json(rows);
}));

purchasersRouter.post("/", validate(purchaserSchema), asyncHandler(async (req, res) => {
  const saved = await transaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO purchasers(company_name,contact_person,phone,whatsapp,email,city,product_interest,purchase_stage,expected_value,next_followup_date,notes,created_by,updated_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)
       RETURNING *`,
      purchaserValues(req.body, req.user.id)
    );
    await client.query(
      `INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata)
       VALUES($1,'PURCHASER_CREATED','PURCHASER',$2,$3)`,
      [req.user.id, rows[0].id, JSON.stringify({ stage: rows[0].purchase_stage })]
    );
    return rows[0];
  });
  res.status(201).json(saved);
}));

purchasersRouter.put("/:id", validate(purchaserSchema), asyncHandler(async (req, res) => {
  const updated = await transaction(async (client) => {
    const ownerCheck = req.user.role === "EXECUTIVE" ? "AND created_by=$2" : "";
    const params = req.user.role === "EXECUTIVE" ? [req.params.id, req.user.id] : [req.params.id];
    const current = await client.query(`SELECT purchase_stage FROM purchasers WHERE id=$1 ${ownerCheck} FOR UPDATE`, params);
    if (!current.rows[0]) throw new AppError(404, "Purchaser not found");
    const values = purchaserValues(req.body, req.user.id);
    const { rows } = await client.query(
      `UPDATE purchasers SET company_name=$1,contact_person=$2,phone=$3,whatsapp=$4,email=$5,city=$6,
         product_interest=$7,purchase_stage=$8,expected_value=$9,next_followup_date=$10,notes=$11,
         updated_by=$12,updated_at=NOW()
       WHERE id=$13
       RETURNING *`,
      [...values, req.params.id]
    );
    await client.query(
      `INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata)
       VALUES($1,'PURCHASER_UPDATED','PURCHASER',$2,$3)`,
      [req.user.id, req.params.id, JSON.stringify({ from: current.rows[0].purchase_stage, to: rows[0].purchase_stage })]
    );
    return rows[0];
  });
  res.json(updated);
}));

purchasersRouter.get("/:id", asyncHandler(async (req, res) => {
  const params = [req.params.id];
  const ownerCheck = req.user.role === "EXECUTIVE" ? "AND p.created_by=$2" : "";
  if (req.user.role === "EXECUTIVE") params.push(req.user.id);
  const { rows } = await query(
    `SELECT p.*,u.name created_by_name,updater.name updated_by_name
     FROM purchasers p
     JOIN users u ON u.id=p.created_by
     LEFT JOIN users updater ON updater.id=p.updated_by
      WHERE p.id=$1 ${ownerCheck}`,
    params
  );
  if (!rows[0]) throw new AppError(404, "Purchaser not found");
  res.json(rows[0]);
}));
