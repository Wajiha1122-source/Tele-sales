# Pulse CRM

A production-oriented lead management and daily activity reporting system for Executives, Managers, and the CEO.

## Included

- Next.js 15 and Tailwind responsive admin interface
- Express 5 REST API
- PostgreSQL/Neon schema and migration command
- JWT authentication and role-based authorization
- One daily report per executive with same-day editing only
- Lead follow-ups, status changes, CEO remarks, and immutable timeline events
- CEO performance dashboard and report overview
- Searchable lead pipeline
- Vercel serverless configuration for both apps

## Structure

```text
client/   Next.js frontend
server/   Express API, schema, and migrations
```

## Local setup

1. Create a Neon PostgreSQL database.
2. Copy `.env.example` to `.env` at the repository root and provide real values.
3. Also make the variables available to each workspace:

```powershell
Copy-Item .env server/.env
Copy-Item .env client/.env.local
```

4. Install, migrate, and run:

```powershell
npm install
npm run db:migrate -w server
npm run dev
```

The frontend runs at `http://localhost:3000`; the API runs at `http://localhost:5000`.

## First CEO user

With an empty `users` table, call `POST /auth/register` with the configured bootstrap key:

```json
{
  "name": "CEO Name",
  "email": "ceo@company.com",
  "password": "a-strong-password",
  "role": "CEO",
  "bootstrapKey": "your-BOOTSTRAP_ADMIN_KEY"
}
```

After bootstrap, only an authenticated CEO can register additional users.

## Vercel + Neon deployment

Create two Vercel projects from this repository.

### API project

- Root directory: `server`
- Environment variables: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, `BOOTSTRAP_ADMIN_KEY`, `SSO_SECRET`, `SSO_APP_NAME`, `SSO_LOCAL_CEO_USERNAME`, `SSO_REDIRECT_PATH`
- Run the schema once against Neon with `npm run db:migrate -w server` locally or in a protected CI job.

### Frontend project

- Root directory: `client`
- Environment variable: `NEXT_PUBLIC_API_URL=https://your-api-project.vercel.app`

Set API `CLIENT_URL` to the frontend Vercel URL, for example `https://your-frontend.vercel.app`. SSO uses the first URL in `CLIENT_URL` as the browser redirect target, so do not leave it as `http://localhost:3000` in Render production.

## API

The requested routes are implemented under:

- `/auth`
- `/reports`
- `/activities`
- `/leads`
- `/followups`
- `/remarks`

An additional `/dashboard/summary` endpoint provides aggregated leadership metrics.

## Security notes

- Passwords use bcrypt with cost 12.
- JWT lifetime defaults to 8 hours.
- SQL is parameterized.
- CEO remarks are immutable via a PostgreSQL trigger.
- Leads expose no delete endpoint.
- Follow-ups and status changes write timeline events in the same transaction.
- Production secrets must never be committed.
