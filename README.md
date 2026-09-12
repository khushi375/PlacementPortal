# Nexora Placement Portal

A production-oriented university placement operating system for one university, with exactly two portals: Student and Placement Center.

## Phase 1 status

Phase 1 establishes the technical foundation only:

- React + TypeScript + Vite frontend shell
- Express + TypeScript backend API
- Firebase Authentication token verification boundary
- MongoDB/Mongoose domain model foundation
- Role-based authorization for `STUDENT`, `PLACEMENT_OFFICER`, `PLACEMENT_STAFF`, and `SUPER_ADMIN`
- Helmet, secure CORS, rate limiting, Mongo query sanitization, request IDs, safe errors, and centralized Zod validation
- Audit log service
- Responsive Student and Placement Center navigation shells
- Real-data-safe zero and empty states; no fabricated operational metrics

Phase 2 student features and Phase 3 company, drive, and deterministic eligibility foundations are implemented. Application, interview, attendance, analytics, communication, and AI lifecycle features remain intentionally unimplemented.

## Phase 3

Placement Center managers can manage companies and placement drives through the protected `/api/v1/placement` API. Drives reference companies, define structured salary and ordered selection rounds, and have controlled `DRAFT -> PUBLISHED -> CLOSED -> ARCHIVED` transitions. Students can read only future published drives through `/api/v1/student/drives`.

Eligibility is calculated only by `backend/src/services/eligibilityService.ts`. It supports CGPA, department, course, batch, graduation year, 10th and 12th percentages, total and active backlogs, and normalized required skills with `ALL` or `ANY` matching. Every result includes a status and rule-by-rule reasons. No AI or frontend rule evaluation is used.

## Architecture

```text
frontend/src
  App.tsx                 Two-portal shell and navigation
  App.css                 Responsive product styling

backend/src
  config/                 Validated environment configuration
  lib/                    Firebase, MongoDB, validation, audit, errors
  middleware/             Authentication, RBAC, request context, errors
  models/                 Mongoose domain schemas and indexes
  routes/                 Versioned API route modules
  services/               Reserved for feature services
  types/                  Express auth context and shared backend types
```

The backend is the authority for authentication and authorization. Frontend route protection must never be treated as a security boundary. Firebase provides identity; the local `User` document provides the application role and active-account state.

## Setup

Prerequisites: Node.js 20+, npm, MongoDB, and a Firebase project.

1. Copy `backend/.env.example` to `backend/.env` and set Firebase and MongoDB values.
2. Install packages with `npm.cmd install` in the root, `npm.cmd --prefix frontend install`, and `npm.cmd --prefix backend install`.
3. Start the frontend with `npm.cmd --prefix frontend run dev`.
4. Start the API with `npm.cmd --prefix backend run dev`.

The API health check is available at `http://localhost:4000/health`.

## Validation

```text
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run lint
npm.cmd --prefix backend run build
npm.cmd --prefix backend run lint
```

No recruiter portal or recruiter account model is part of this product.
