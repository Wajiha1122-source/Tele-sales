import { z } from "zod";

export const roles = ["EXECUTIVE", "MANAGER", "CEO"];
export const statuses = ["NEW", "CONTACTED", "IN_PROGRESS", "PROPOSAL_SENT", "NEGOTIATION", "CONVERTED", "LOST", "NO_RESPONSE"];
const optionalText = (max) => z.preprocess(
  (value) => typeof value === "string" ? value.trim() : value,
  z.string().max(max).optional().default("")
);
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(roles),
  bootstrapKey: z.string().optional()
});
export const reportSchema = z.object({
  totalCalls: z.coerce.number().int().min(0),
  contactsReached: z.coerce.number().int().min(0),
  interestedCount: z.coerce.number().int().min(0),
  meetingsScheduled: z.coerce.number().int().min(0),
  remarks: z.string().max(4000).optional().default("")
});
export const activitySchema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  companyName: z.string().trim().min(1).max(180),
  contactPerson: z.string().trim().min(1).max(150),
  phone: z.string().max(40).optional().default(""),
  activityType: z.enum(["COLD_CALL", "FOLLOW_UP_CALL", "WHATSAPP_MESSAGE", "EMAIL_SENT", "MEETING"]),
  result: z.enum(["ANSWER", "NO_ANSWER", "BUSY", "INTERESTED", "NOT_INTERESTED", "CALL_BACK_LATER"]),
  remarks: z.string().max(2000).optional().default("")
});
export const leadSchema = z.object({
  companyName: z.string().trim().min(1).max(180),
  contactPerson: z.string().trim().min(1).max(150),
  phone: optionalText(40),
  whatsapp: optionalText(40),
  email: optionalText(255),
  city: optionalText(100),
  industry: optionalText(120),
  leadSource: optionalText(120),
  notes: optionalText(4000)
});
export const followupSchema = z.object({
  leadId: z.string().uuid(),
  date: z.coerce.date().optional(),
  notes: z.string().trim().min(1).max(4000),
  statusUpdate: z.enum(statuses)
});
export const statusSchema = z.object({ status: z.enum(statuses) });
export const remarkSchema = z.object({
  targetType: z.enum(["LEAD", "REPORT"]),
  targetId: z.string().uuid(),
  text: z.string().trim().min(1).max(4000)
});
