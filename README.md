# Nexora Placement Portal

A university placement operating system for a single institution. There are two portals only:

- **Student portal** — profile, academics, resumes, published drives, applications, interviews, attendance, documents, results, calendar, notifications, preparation, and grievances.
- **Placement Center** — companies, drives, applications, interviews, attendance, documents, results, TPO command center, communication, analytics, and preparation resources.

There is no recruiter portal.

Eligibility is **deterministic and backend-only**. Gemini AI provides coaching and explanations only. It does not calculate eligibility, change application status, or make official placement decisions. The Gemini API key is **server-side only**.

This repository is application code. It has not been deployed from this phase of work.

## Architecture

```text
frontend/     React + TypeScript + Vite student and Placement Center UI
backend/      Express + TypeScript API, MongoDB, Firebase Admin, Gemini
```

Firebase Authentication identifies the user. The local `User` document is the source of application role and active-account state. Frontend navigation is not a security boundary.

Roles: `STUDENT`, `PLACEMENT_OFFICER`, `PLACEMENT_STAFF`, `SUPER_ADMIN`.

## What the product covers

| Area | Behavior |
| --- | --- |
| Authentication / RBAC | Firebase ID tokens, verified on the API, role checks on every protected route |
| Companies and drives | Placement Center CRUD, drive lifecycle `DRAFT → PUBLISHED → CLOSED → ARCHIVED` |
| Eligibility | Central engine in `backend/src/services/eligibilityService.ts` (CGPA, department, course, batch, graduation year, 10th/12th, backlogs, skills ALL/ANY). Rule-by-rule reasons. No AI. |
| Applications | Student apply/withdraw; staff review and status transitions |
| Interviews | Staff schedule/update; students see only their own interviews |
| Attendance | Staff mark attendance; students see their own records |
| Documents | Student upload; staff review. Resume PDFs are stored privately; content is not parsed for AI |
| TPO command center | Live operational counts and recent activity |
| Communication | Staff notices to students; student grievances |
| Analytics | Counts and breakdowns from stored records only |
| Preparation resources | Staff create/edit/publish/unpublish/delete. Students see **published** resources only |
| Preparation tracking | Students mark their own completion; progress is student-scoped |
| Calendar | Authenticated student's interview date/time, company/drive, round, status, mode |
| Preparation brief | Guidance from existing eligibility, missing skills, required skills, rounds, and the student's interviews. Does not change eligibility |
| Gemini AI | Resume coach, interview practice, eligibility explanation for the authenticated student |

## AI security model

- Provider: Google Gemini (`@google/generative-ai`) on the backend only
- Routes: `POST /api/v1/student/ai/*`, `STUDENT` role, authentication required
- 10 AI requests per minute per authenticated user, in addition to the global API rate limit
- 20s timeout, 1200 max output tokens, bounded prompt size
- Missing `AI_API_KEY` returns HTTP 503 `AI_NOT_CONFIGURED` (no fake coaching)
- Provider errors are sanitized; keys and stack traces are not returned to clients
- Students cannot request another student's interview
- AI receives only the caller's profile/drive/interview facts; it cannot write eligibility or application status

## Local setup

Prerequisites: Node.js 20+, npm, MongoDB, and a Firebase project.

1. Copy `backend/.env.example` to `backend/.env` and fill in real values locally. Never commit `.env`.
2. Copy `frontend/.env.example` to `frontend/.env` for the public Firebase web config and API URL.
3. Install: `npm --prefix frontend install` and `npm --prefix backend install`.
4. Frontend: `npm --prefix frontend run dev`
5. API: `npm --prefix backend run dev`

Health check: `GET http://localhost:4000/health`  
Response includes `aiConfigured: true|false` and never includes the API key.

## Environment variables

### Backend (`backend/.env`)

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | API port (default `4000`) |
| `MONGODB_URI` | MongoDB connection string |
| `FRONTEND_ORIGIN` | Allowed CORS origin (exact frontend URL) |
| `FIREBASE_PROJECT_ID` | Firebase Admin project |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin client email |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin private key |
| `CLOUDINARY_CLOUD_NAME` | Optional private file storage |
| `CLOUDINARY_API_KEY` | Optional, server-side only |
| `CLOUDINARY_API_SECRET` | Optional, server-side only |
| `AI_PROVIDER` | `GEMINI` |
| `AI_API_KEY` | Gemini key, **backend only** |
| `AI_MODEL` | e.g. `gemini-2.0-flash` |

Do not prefix `AI_API_KEY` with `VITE_`. Do not put Admin, Cloudinary, or Gemini secrets in frontend env files.

### Frontend (`frontend/.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Backend API base, e.g. `http://localhost:4000/api/v1` |
| `VITE_FIREBASE_API_KEY` | Firebase **web** API key (public client config) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project id |
| `VITE_FIREBASE_APP_ID` | Firebase app id |

## Build and test commands

From the repository root:

```text
npm test                         # backend Vitest suite
npm run build                    # frontend production build, then backend tsc
npm run lint                     # frontend oxlint, then backend typecheck
```

From packages:

```text
npm --prefix frontend run build
npm --prefix frontend run lint
npm --prefix frontend run dev
npm --prefix backend run build
npm --prefix backend run lint
npm --prefix backend test
npm --prefix backend run dev
```

## Production notes

The API uses Helmet, explicit CORS (`FRONTEND_ORIGIN` only), global rate limiting, Zod validation, mongo sanitization, authenticated RBAC, and safe JSON errors (no stack traces or secrets). Put real secrets in the hosting environment, not in the repo. This phase does not deploy the application.
