import { Router } from "express";
import { query, transaction } from "../db/index.js";
import { asyncHandler, AppError, validate } from "../lib/http.js";
import { purchaserCategorySchema, purchaserSchema } from "../lib/schemas.js";
import { authorize } from "../middleware/auth.js";

export const purchasersRouter = Router();

function purchaserValues(body, userId) {
  return [
    body.categoryId,
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

purchasersRouter.get("/categories", asyncHandler(async (req, res) => {
  if (req.user.role === "MANAGER") throw new AppError(403, "Purchaser categories are available to executives and the CEO");
  const { rows } = await query(
    `SELECT c.*,
      creator.name created_by_name,
      COUNT(p.id)::int purchaser_count,
      COALESCE(SUM(p.expected_value),0)::numeric expected_value
     FROM purchaser_categories c
     JOIN users creator ON creator.id=c.created_by
     LEFT JOIN purchasers p ON p.category_id=c.id
     GROUP BY c.id,creator.name
     ORDER BY c.name ASC`
  );
  res.json(rows);
}));

purchasersRouter.post("/categories", authorize("EXECUTIVE"), validate(purchaserCategorySchema), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `INSERT INTO purchaser_categories(name,description,created_by)
     VALUES($1,$2,$3)
     ON CONFLICT(name) DO UPDATE SET description=COALESCE(NULLIF(EXCLUDED.description,''),purchaser_categories.description)
     RETURNING *`,
    [req.body.name, req.body.description || null, req.user.id]
  );
  res.status(201).json(rows[0]);
}));

purchasersRouter.get("/", asyncHandler(async (req, res) => {
  if (req.user.role === "MANAGER") throw new AppError(403, "Purchasers are available to executives and the CEO");
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
  if (req.query.categoryId) {
    params.push(req.query.categoryId);
    clauses.push(`p.category_id=$${params.length}`);
  }
  if (req.query.search) {
    params.push(`%${req.query.search}%`);
    clauses.push(`(p.company_name ILIKE $${params.length} OR p.contact_person ILIKE $${params.length} OR p.phone ILIKE $${params.length} OR p.product_interest ILIKE $${params.length})`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT p.*,c.name category_name,u.name created_by_name,updater.name updated_by_name,
       COUNT(r.id)::int ceo_comment_count,
       MAX(r.created_at) latest_ceo_comment_at
     FROM purchasers p
     LEFT JOIN purchaser_categories c ON c.id=p.category_id
     JOIN users u ON u.id=p.created_by
     LEFT JOIN users updater ON updater.id=p.updated_by
     LEFT JOIN ceo_remarks r ON r.target_type='PURCHASER' AND r.target_id=p.id
     ${where}
     GROUP BY p.id,c.name,u.name,updater.name
     ORDER BY c.name ASC,p.updated_at DESC
     LIMIT 500`,
    params
  );
  res.json(rows);
}));

purchasersRouter.post("/", authorize("EXECUTIVE"), validate(purchaserSchema), asyncHandler(async (req, res) => {
  const saved = await transaction(async (client) => {
    const category = await client.query("SELECT id FROM purchaser_categories WHERE id=$1", [req.body.categoryId]);
    if (!category.rows[0]) throw new AppError(404, "Purchaser category not found");
    const { rows } = await client.query(
      `INSERT INTO purchasers(category_id,company_name,contact_person,phone,whatsapp,email,city,product_interest,purchase_stage,expected_value,next_followup_date,notes,created_by,updated_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
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

purchasersRouter.put("/:id", authorize("EXECUTIVE"), validate(purchaserSchema), asyncHandler(async (req, res) => {
  const updated = await transaction(async (client) => {
    const category = await client.query("SELECT id FROM purchaser_categories WHERE id=$1", [req.body.categoryId]);
    if (!category.rows[0]) throw new AppError(404, "Purchaser category not found");
    const current = await client.query("SELECT purchase_stage FROM purchasers WHERE id=$1 AND created_by=$2 FOR UPDATE", [req.params.id, req.user.id]);
    if (!current.rows[0]) throw new AppError(404, "Purchaser not found");
    const values = purchaserValues(req.body, req.user.id);
    const { rows } = await client.query(
      `UPDATE purchasers SET category_id=$1,company_name=$2,contact_person=$3,phone=$4,whatsapp=$5,email=$6,city=$7,
         product_interest=$8,purchase_stage=$9,expected_value=$10,next_followup_date=$11,notes=$12,
         updated_by=$13,updated_at=NOW()
       WHERE id=$14 AND created_by=$13
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
  if (req.user.role === "MANAGER") throw new AppError(403, "Purchasers are available to executives and the CEO");
  const params = [req.params.id];
  const ownerCheck = req.user.role === "EXECUTIVE" ? "AND p.created_by=$2" : "";
  if (req.user.role === "EXECUTIVE") params.push(req.user.id);
  const { rows } = await query(
    `SELECT p.*,c.name category_name,u.name created_by_name,updater.name updated_by_name
     FROM purchasers p
     LEFT JOIN purchaser_categories c ON c.id=p.category_id
     JOIN users u ON u.id=p.created_by
     LEFT JOIN users updater ON updater.id=p.updated_by
      WHERE p.id=$1 ${ownerCheck}`,
    params
  );
  if (!rows[0]) throw new AppError(404, "Purchaser not found");
  res.json(rows[0]);
}));
