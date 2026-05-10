# AGENTS.md

Last reviewed: 2026-05-10

This repository is an academic patient-management project for a small research group. Expected production scale is low: up to about 10 users and about 500 patients. Even at this scale, patient and clinical-form data must be treated as sensitive health data.

## Mission

Help maintain and extend the system without weakening privacy, authentication, ownership checks, or data integrity.

Prefer small, explicit changes over broad refactors. Before changing behavior, read the relevant backend router, CRUD helper, schema, and frontend caller.

## Repository Map

- `backend/`: FastAPI API, SQLAlchemy models, PostgreSQL/Neon persistence, authentication, backup, Excel import/export.
- `frontend/`: Vite/React web app used by researchers and admins. See `frontend/AGENTS.md` for frontend-specific guidance.
- `mobile/`: Expo/React Native app for mobile access. It is currently untracked in Git in this workspace.

## Backend Stack

- FastAPI
- SQLAlchemy ORM
- PostgreSQL hosted on Neon
- JWT authentication with bcrypt password hashes
- SlowAPI rate limiting
- Pandas/OpenPyXL for Excel import/export
- JSON-backed dynamic form definitions

## Backend Entry Points

- `backend/app/main.py`: FastAPI app setup, middleware, routers, CORS, security headers, rate limiting, DB initialization.
- `backend/run.py`: local development launcher with Uvicorn reload.
- `backend/Procfile` and `backend/railway.json`: Railway deployment commands.

## Core Backend Files

- `backend/app/config.py`: environment variables and operational constants.
- `backend/app/database.py`: SQLAlchemy engine/session/base.
- `backend/app/models.py`: `User`, `Patient`, `FormResponse`.
- `backend/app/schemas.py`: Pydantic request/response models.
- `backend/app/auth.py`: JWT creation/validation and password hashing.
- `backend/app/crud.py`: ownership-aware DB operations.
- `backend/app/permissions.py`: admin authorization for form schema and Neon backup endpoints.
- `backend/app/routers/auth.py`: login, logout, registration, current-user endpoint.
- `backend/app/routers/patients.py`: patient CRUD.
- `backend/app/routers/forms.py`: form-response CRUD, upcoming returns, form-question schema endpoints.
- `backend/app/routers/excel.py`: Excel export/import.
- `backend/app/routers/backup.py`: user backup and Neon snapshot endpoints.
- `backend/app/form_questions.json`: standard intake form definition.
- `backend/app/form_questions_additional.json`: additional/return form definition.

## Data Model

- `users`: application users/researchers. Stores `username` and `password_hash`.
- `patients`: patient registry. Each row belongs to exactly one user through `created_by_user_id`.
- `form_responses`: clinical questionnaire submissions. Each row has `patient_id`, `created_by_user_id`, `response_date`, optional `next_return_date`, and flexible `form_data` JSON.
- Patients and form responses use soft delete through `deleted_at`.

## Security Model

- Most application data is isolated by `created_by_user_id`.
- Patient and form-response routes require `auth.get_current_user`.
- Form-schema write routes and Neon snapshot routes require `require_form_schema_admin`.
- Public registration is disabled by default through `ALLOW_PUBLIC_REGISTRATION=False`.
- JWT tokens are accepted from either bearer auth or the configured HttpOnly auth cookie.
- Default token lifetime is 720 minutes (12 hours) and can be overridden with `ACCESS_TOKEN_EXPIRE_MINUTES`.
- Login rate limit is configured in `backend/app/config.py`.

When adding any endpoint that touches patient or form data, enforce both authentication and ownership filtering. Do not rely on frontend route guards for security.

## Sensitive Data Rules

- Never print or commit `.env`, database URLs, JWT secrets, API keys, production cookies, exported spreadsheets, backup JSON, or `audit.log`.
- Treat patient names, social names, medical records, phone numbers, and all `form_data` values as sensitive.
- Do not log patient names or full form payloads.
- Consultation drafts are intentionally stored in the `form_drafts` table and in frontend IndexedDB to prevent data loss during long appointments. Treat them as sensitive and clear them after successful submit or explicit discard.
- Do not run destructive database scripts unless the user explicitly asks and confirms the target environment.
- Avoid connecting to the live Neon database during analysis unless the task specifically requires it.

## Local/Verification Commands

Run from the repository root unless noted.

```powershell
python -m compileall -q backend\app
python -m pip_audit -r backend\requirements.txt
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Frontend:

```powershell
cd frontend
npm install
npm run build
```

Mobile:

```powershell
cd mobile
npm install
npm start
```

## Production Readiness Notes From 2026-05-10 Review

Remaining high priority before production:

- Rotate the Neon database password and JWT `SECRET_KEY` if the local `backend/.env` was ever shared outside the deployment environment. The file is Git-ignored, but it exists locally with real credentials.
- Delete local `backend/audit.log` and any export/backup files before sharing the project directory.

Medium priority:

- Restrict CORS in production to the real frontend domain only. The current config always includes localhost origins and allows all methods/headers.
- Add tests for authentication, ownership isolation, Excel import limits, backup scoping, and form-schema admin permissions.
- Add environment validation for production, especially `AUTH_COOKIE_SECURE=True`, expected CORS origins, and explicit admin users.
- Consider limiting `skip`, `limit`, and `days` query parameters to bounded ranges.

Resolved in the 2026-05-10 hardening pass:

- Updated vulnerable dependency pins for `python-jose`, `python-multipart`, and `cryptography`.
- Removed the implicit `sistema` form-schema admin; admins must now be configured explicitly through `FORM_SCHEMA_ADMIN_USERS`.
- Removed patient full names from patient-creation logs.
- Changed CORS so explicitly configured origins are respected exactly instead of always unioning localhost origins into production.

Positive findings:

- Backend startup fails if `DATABASE_URL` or `SECRET_KEY` is missing.
- Patient and form-response CRUD paths consistently check authenticated user ownership.
- Public registration is disabled by default.
- Excel upload has a size limit and temporary-file cleanup.
- Excel export normalizes formula-like string values to reduce spreadsheet formula injection risk.
- Backup endpoints export only the authenticated user's data.

## Common Change Patterns

When adding a backend field:

1. Update the Pydantic schema in `backend/app/schemas.py`.
2. Update the ORM model in `backend/app/models.py` if the field is relational/structured.
3. Update CRUD logic in `backend/app/crud.py`.
4. Update affected router response models and frontend/mobile API types.
5. Add or update migration/backfill scripts if the database schema changes.

When adding a protected endpoint:

1. Require `current_user: models.User = Depends(auth.get_current_user)`.
2. Filter by `created_by_user_id == current_user.id`.
3. Return `404` for resources not owned by the user to avoid leaking existence.
4. Do not include password hashes, secrets, or unrelated users' IDs in responses.

When changing form questions:

1. Use `backend/app/form_questions_service.py` helpers when possible.
2. Preserve protected question IDs used by calculations and carry-forward logic.
3. Use `save_question_order()` for order-only changes so labels/types/options are not rewritten unnecessarily.
4. Check frontend dynamic form rendering before renaming IDs.
5. Remember historical submissions keep old keys inside `form_data`.

## Deployment Checklist

- `DATABASE_URL` points to the intended Neon production database.
- `SECRET_KEY` is unique, high entropy, and not reused from local development.
- `AUTH_COOKIE_SECURE=True` in production.
- `CORS_ORIGINS` contains only the production frontend origin unless actively debugging.
- `ALLOW_PUBLIC_REGISTRATION=False` unless a controlled onboarding flow is needed.
- `FORM_SCHEMA_ADMIN_USERS` is explicit and contains only trusted usernames.
- `SQL_ECHO=False`.
- Neon snapshots or another backup strategy are configured and tested.
- No `.env`, `audit.log`, `exports/`, or backup files are included in shared archives.

## Current Test Gap

There are no backend test files in this workspace as of this review. Any future production-hardening change should add focused tests, especially around authorization boundaries and import/export behavior.
