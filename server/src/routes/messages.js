import { Router } from "express";
import { query, transaction } from "../db/index.js";
import { asyncHandler, AppError, validate } from "../lib/http.js";
import { directMessageSchema } from "../lib/schemas.js";

export const messagesRouter = Router();

async function getRecipientForUser(recipientId, user) {
  if (recipientId === user.id) throw new AppError(400, "Choose another user to message");
  const { rows } = await query(
    "SELECT id,name,email,role FROM users WHERE id=$1",
    [recipientId]
  );
  const recipient = rows[0];
  if (!recipient) throw new AppError(404, "Recipient not found");
  if (user.role === "EXECUTIVE" && !["MANAGER", "CEO"].includes(recipient.role)) {
    throw new AppError(403, "Executives can message managers or the CEO directly");
  }
  return recipient;
}

messagesRouter.get("/recipients", asyncHandler(async (req, res) => {
  const roleFilter = req.user.role === "EXECUTIVE"
    ? "AND role IN ('MANAGER','CEO')"
    : "";
  const { rows } = await query(
    `SELECT id,name,email,role
     FROM users
     WHERE id<>$1 ${roleFilter}
     ORDER BY
       CASE role WHEN 'CEO' THEN 1 WHEN 'MANAGER' THEN 2 ELSE 3 END,
       name ASC`,
    [req.user.id]
  );
  res.json(rows);
}));

messagesRouter.get("/threads", asyncHandler(async (req, res) => {
  const { rows } = await query(
    `WITH visible_messages AS (
       SELECT *,
         CASE WHEN sender_id=$1 THEN recipient_id ELSE sender_id END AS other_user_id
       FROM direct_messages
       WHERE sender_id=$1 OR recipient_id=$1
     ),
     latest AS (
       SELECT DISTINCT ON (other_user_id)
         other_user_id,id,body,created_at,sender_id,recipient_id,read_at
       FROM visible_messages
       ORDER BY other_user_id,created_at DESC
     ),
     unread AS (
       SELECT sender_id AS other_user_id,COUNT(*)::int unread_count
       FROM direct_messages
       WHERE recipient_id=$1 AND read_at IS NULL
       GROUP BY sender_id
     )
     SELECT u.id,u.name,u.email,u.role,l.body last_body,l.created_at last_created_at,
       l.sender_id last_sender_id,COALESCE(unread.unread_count,0) unread_count
     FROM latest l
     JOIN users u ON u.id=l.other_user_id
     LEFT JOIN unread ON unread.other_user_id=l.other_user_id
     ORDER BY l.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
}));

messagesRouter.get("/:recipientId", asyncHandler(async (req, res) => {
  const recipient = await getRecipientForUser(req.params.recipientId, req.user);
  await query(
    "UPDATE direct_messages SET read_at=NOW() WHERE sender_id=$1 AND recipient_id=$2 AND read_at IS NULL",
    [recipient.id, req.user.id]
  );
  const { rows } = await query(
    `SELECT m.*,sender.name sender_name,recipient.name recipient_name
     FROM direct_messages m
     JOIN users sender ON sender.id=m.sender_id
     JOIN users recipient ON recipient.id=m.recipient_id
     WHERE (m.sender_id=$1 AND m.recipient_id=$2)
        OR (m.sender_id=$2 AND m.recipient_id=$1)
     ORDER BY m.created_at ASC
     LIMIT 500`,
    [req.user.id, recipient.id]
  );
  res.json({ recipient, messages: rows });
}));

messagesRouter.post("/", validate(directMessageSchema), asyncHandler(async (req, res) => {
  const saved = await transaction(async (client) => {
    const recipient = await getRecipientForUser(req.body.recipientId, req.user);
    const { rows } = await client.query(
      `INSERT INTO direct_messages(sender_id,recipient_id,body)
       VALUES($1,$2,$3)
       RETURNING *`,
      [req.user.id, recipient.id, req.body.body]
    );
    await client.query(
      `INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,metadata)
       VALUES($1,'DIRECT_MESSAGE_SENT','DIRECT_MESSAGE',$2,$3)`,
      [req.user.id, rows[0].id, JSON.stringify({ recipientId: recipient.id, recipientRole: recipient.role })]
    );
    return rows[0];
  });
  res.status(201).json(saved);
}));
