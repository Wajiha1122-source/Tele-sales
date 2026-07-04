import { Router } from "express";
import { query, transaction } from "../db/index.js";
import { asyncHandler, AppError, validate } from "../lib/http.js";
import { supplierCategorySchema, supplierSchema } from "../lib/schemas.js";
import { authorize } from "../middleware/auth.js";

export const suppliersRouter = Router();

function supplierValues(body, userId) {
  return [
    body.categoryId,
    body.companyName,
    body.contactPerson,
    body.phone || null,
    body.whatsapp || null,
    body.email || null,
    body.city || null,
    body.productInterest || null,
    body.supplyStage,
    body.expectedValue ?? null,
    body.nextFollowupDate || null,
    body.notes || null,
    userId
  ];
}

suppliersRouter.get("/categories", asyncHandler(async (req, res) => {
  if (req.user.role === "MANAGER") throw new AppError(403, "Supplier categories are available to executives and the CEO");
  const { rows } = await query(
    `SELECT c.*,
      creator.name created_by_name,
      COUNT(s.id)::int supplier_count,
      COALESCE(SUM(s.expected_value),0)::numeric expected_value
     FROM supplier_categories c
     JOIN users creator ON creator.id=c.created_by
     LEFT JOIN suppliers s ON s.category_id=c.id
     GROUP BY c.id,creator.name
     ORDER BY c.name ASC`
  );
  res.json(rows);
}));

suppliersRouter.post("/categories", authorize("EXECUTIVE"), validate(supplierCategorySchema), asyncHandler(async (req, res) => {
  const { rows } = await query(
    `INSERT INTO supplier_categories(name,description,created_by)
     VALUES($1,$2,$3)
     ON CONFLICT(name) DO UPDATE SET description=COALESCE(NULLIF(EXCLUDED.description,''),supplier_categories.description)
     RETURNING *`,
    [req.body.name, req.body.description || null, req.user.id]
  );
  res.status(201).json(rows[0]);
}));

suppliersRouter.get("/", asyncHandler(async (req, res) => {
  if (req.user.role === "MANAGER") throw new AppError(403, "Suppliers are available to executives and the CEO");
  const params = [];
  const clauses = [];
  if (req.user.role === "EXECUTIVE") {
    params.push(req.user.id);
    clauses.push(`s.created_by=$${params.length}`);
  }
  if (req.query.stage) {
    params.push(req.query.stage);
    clauses.push(`s.supply_stage=$${params.length}`);
  }
  if (req.query.categoryId) {
    params.push(req.query.categoryId);
    clauses.push(`s.category_id=$${params.length}`);
  }
  if (req.query.search) {
    params.push(`%${req.query.search}%`);
    clauses.push(`(s.company_name ILIKE $${params.length} OR s.contact_person ILIKE $${params.length} OR s.phone ILIKE $${params.length} OR s.product_interest ILIKE $${params.length})`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT s.*,c.name category_name,u.name created_by_name,updater.name updated_by_name,
       COUNT(r.id)::int ceo_comment_count,
       MAX(r.created_at) latest_ceo_comment_at
     FROM suppliers s
     LEFT JOIN supplier_categories c ON c.id=s.category_id
     JOIN users u ON u.id=s.created_by
     LEFT JOIN users updater ON updater.id=s.updated_by
     LEFT JOIN ceo_remarks r ON r.target_type='SUPPLIER' AND r.target_id=s.id
     ${where}
     GROUP BY s.id,c.name,u.name,updater.name
     ORDER BY c.name ASC,s.updated_at DESC
     LIMIT 500`,
    params
  );
  res.json(rows);
}));

suppliersRouter.post("/", authorize("EXECUTIVE"), validate(supplierSchema), asyncHandler(async (req, res) => {
  const saved = await transaction(async (client) => {
    const category = await client.query("SELECT id FROM supplier_categories WHERE id=$1", [req.body.categoryId]);
    if (!category.rows[0]) throw new AppError(404, "Supplier category not found");
    const { rows } = await client.query(
      `INSERT INTO suppliers(category_id,company_name,contact_person,phone,whatsapp,email,city,product_interest,supply_stage,expected_value,next_followup_date,notes,created_by,updated_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
       RETURNING *`,
      supplierValues(req.body, req.user.id)
    );
    await client.query(
      `INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata)
       VALUES($1,'SUPPLIER_CREATED','SUPPLIER',$2,$3)`,
      [req.user.id, rows[0].id, JSON.stringify({ stage: rows[0].supply_stage })]
    );
    return rows[0];
  });
  res.status(201).json(saved);
}));

suppliersRouter.put("/:id", authorize("EXECUTIVE"), validate(supplierSchema), asyncHandler(async (req, res) => {
  const updated = await transaction(async (client) => {
    const category = await client.query("SELECT id FROM supplier_categories WHERE id=$1", [req.body.categoryId]);
    if (!category.rows[0]) throw new AppError(404, "Supplier category not found");
    const current = await client.query("SELECT supply_stage FROM suppliers WHERE id=$1 AND created_by=$2 FOR UPDATE", [req.params.id, req.user.id]);
    if (!current.rows[0]) throw new AppError(404, "Supplier not found");
    const values = supplierValues(req.body, req.user.id);
    const { rows } = await client.query(
      `UPDATE suppliers SET category_id=$1,company_name=$2,contact_person=$3,phone=$4,whatsapp=$5,email=$6,city=$7,
         product_interest=$8,supply_stage=$9,expected_value=$10,next_followup_date=$11,notes=$12,
         updated_by=$13,updated_at=NOW()
       WHERE id=$14 AND created_by=$13
       RETURNING *`,
      [...values, req.params.id]
    );
    await client.query(
      `INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata)
       VALUES($1,'SUPPLIER_UPDATED','SUPPLIER',$2,$3)`,
      [req.user.id, req.params.id, JSON.stringify({ from: current.rows[0].supply_stage, to: rows[0].supply_stage })]
    );
    return rows[0];
  });
  res.json(updated);
}));

suppliersRouter.get("/:id", asyncHandler(async (req, res) => {
  if (req.user.role === "MANAGER") throw new AppError(403, "Suppliers are available to executives and the CEO");
  const params = [req.params.id];
  const ownerCheck = req.user.role === "EXECUTIVE" ? "AND s.created_by=$2" : "";
  if (req.user.role === "EXECUTIVE") params.push(req.user.id);
  const { rows } = await query(
    `SELECT s.*,c.name category_name,u.name created_by_name,updater.name updated_by_name
     FROM suppliers s
     LEFT JOIN supplier_categories c ON c.id=s.category_id
     JOIN users u ON u.id=s.created_by
     LEFT JOIN users updater ON updater.id=s.updated_by
      WHERE s.id=$1 ${ownerCheck}`,
    params
  );
  if (!rows[0]) throw new AppError(404, "Supplier not found");
  res.json(rows[0]);
}));
