CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('EXECUTIVE', 'MANAGER', 'CEO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('NEW', 'CONTACTED', 'IN_PROGRESS', 'PROPOSAL_SENT', 'NEGOTIATION', 'CONVERTED', 'LOST', 'NO_RESPONSE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM ('COLD_CALL', 'FOLLOW_UP_CALL', 'WHATSAPP_MESSAGE', 'EMAIL_SENT', 'MEETING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE activity_result AS ENUM ('ANSWER', 'NO_ANSWER', 'BUSY', 'INTERESTED', 'NOT_INTERESTED', 'CALL_BACK_LATER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TYPE activity_result ADD VALUE IF NOT EXISTS 'ANSWER' BEFORE 'NO_ANSWER';
DO $$ BEGIN
  CREATE TYPE remark_target AS ENUM ('LEAD', 'REPORT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE purchaser_stage AS ENUM ('NEW', 'CONTACTED', 'QUOTED', 'NEGOTIATION', 'PURCHASED', 'ON_HOLD', 'LOST');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE update_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE update_audience AS ENUM ('ALL', 'EXECUTIVE', 'MANAGER', 'CEO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executive_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_calls INTEGER NOT NULL DEFAULT 0 CHECK (total_calls >= 0),
  contacts_reached INTEGER NOT NULL DEFAULT 0 CHECK (contacts_reached >= 0),
  interested_count INTEGER NOT NULL DEFAULT 0 CHECK (interested_count >= 0),
  meetings_scheduled INTEGER NOT NULL DEFAULT 0 CHECK (meetings_scheduled >= 0),
  remarks TEXT,
  ceo_viewed_at TIMESTAMPTZ,
  ceo_viewed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (executive_id, date)
);

ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS ceo_viewed_at TIMESTAMPTZ;
ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS ceo_viewed_by UUID REFERENCES users(id);

CREATE TABLE IF NOT EXISTS daily_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES daily_reports(id) ON DELETE SET NULL,
  executive_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME NOT NULL,
  company_name VARCHAR(180) NOT NULL,
  contact_person VARCHAR(150) NOT NULL,
  phone VARCHAR(40),
  activity_type activity_type NOT NULL,
  result activity_result NOT NULL,
  remarks TEXT,
  ceo_viewed_at TIMESTAMPTZ,
  ceo_viewed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE daily_activities ADD COLUMN IF NOT EXISTS executive_id UUID REFERENCES users(id);
ALTER TABLE daily_activities ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE daily_activities ADD COLUMN IF NOT EXISTS ceo_viewed_at TIMESTAMPTZ;
ALTER TABLE daily_activities ADD COLUMN IF NOT EXISTS ceo_viewed_by UUID REFERENCES users(id);
UPDATE daily_activities a
SET executive_id = r.executive_id, date = r.date
FROM daily_reports r
WHERE a.report_id = r.id AND (a.executive_id IS NULL OR a.date IS NULL);
ALTER TABLE daily_activities ALTER COLUMN executive_id SET NOT NULL;
ALTER TABLE daily_activities ALTER COLUMN date SET DEFAULT CURRENT_DATE;
ALTER TABLE daily_activities ALTER COLUMN date SET NOT NULL;
ALTER TABLE daily_activities ALTER COLUMN report_id DROP NOT NULL;
ALTER TABLE daily_activities DROP CONSTRAINT IF EXISTS daily_activities_report_id_fkey;
ALTER TABLE daily_activities
  ADD CONSTRAINT daily_activities_report_id_fkey
  FOREIGN KEY (report_id) REFERENCES daily_reports(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(180) NOT NULL,
  contact_person VARCHAR(150) NOT NULL,
  phone VARCHAR(40),
  whatsapp VARCHAR(40),
  email VARCHAR(255),
  city VARCHAR(100),
  industry VARCHAR(120),
  lead_source VARCHAR(120),
  notes TEXT,
  status lead_status NOT NULL DEFAULT 'NEW',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id),
  manager_id UUID NOT NULL REFERENCES users(id),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT NOT NULL,
  status_update lead_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ceo_remarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type remark_target NOT NULL,
  target_id UUID NOT NULL,
  remark_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id),
  event_type VARCHAR(40) NOT NULL,
  description TEXT NOT NULL,
  from_status lead_status,
  to_status lead_status,
  actor_id UUID NOT NULL REFERENCES users(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES users(id),
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchasers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(180) NOT NULL,
  contact_person VARCHAR(150) NOT NULL,
  phone VARCHAR(40),
  whatsapp VARCHAR(40),
  email VARCHAR(255),
  city VARCHAR(100),
  product_interest VARCHAR(180),
  purchase_stage purchaser_stage NOT NULL DEFAULT 'NEW',
  expected_value NUMERIC(12,2),
  next_followup_date DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS important_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  priority update_priority NOT NULL DEFAULT 'NORMAL',
  audience update_audience NOT NULL DEFAULT 'ALL',
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id),
  recipient_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_date ON daily_reports(date DESC);
CREATE INDEX IF NOT EXISTS idx_activities_report ON daily_activities(report_id);
CREATE INDEX IF NOT EXISTS idx_activities_executive_date ON daily_activities(executive_id, date DESC, time DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status_created ON leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);
CREATE INDEX IF NOT EXISTS idx_followups_lead ON lead_followups(lead_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_remarks_target ON ceo_remarks(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_events_lead ON lead_events(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchasers_stage_updated ON purchasers(purchase_stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchasers_created_by ON purchasers(created_by);
CREATE INDEX IF NOT EXISTS idx_important_updates_feed ON important_updates(pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_important_updates_audience ON important_updates(audience);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_recipient ON direct_messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_unread ON direct_messages(recipient_id, read_at) WHERE read_at IS NULL;

CREATE OR REPLACE FUNCTION reject_ceo_remark_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'CEO remarks are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ceo_remarks_immutable_update ON ceo_remarks;
CREATE TRIGGER ceo_remarks_immutable_update
BEFORE UPDATE OR DELETE ON ceo_remarks
FOR EACH ROW EXECUTE FUNCTION reject_ceo_remark_mutation();
