# Backend Technical Overview

## Stack
- FastAPI
- SQLAlchemy ORM
- PostgreSQL
- JWT authentication
- SlowAPI rate limiting
- Pandas + OpenPyXL for spreadsheet import/export

## Entry Points
- `run.py`: local development launcher using Uvicorn with reload
- `app/main.py`: FastAPI app bootstrap, middleware, routers, CORS, limiter setup, and startup tasks

## Data Model
- `users`:
  - system users/researchers
  - stores `username` and `password_hash`
- `patients`:
  - patient registry
  - linked to a single owning user through `created_by_user_id`
  - soft delete via `deleted_at`
- `form_responses`:
  - one row per questionnaire submission/return
  - stores longitudinal clinical data in `form_data` JSON
  - linked to `patient_id` and `created_by_user_id`
  - soft delete via `deleted_at`

## Security Model
- Authentication is JWT-based and implemented in `app/auth.py`
- Passwords are hashed before persistence
- Every patient and form-response query is filtered by `created_by_user_id`
- Rate limiting is applied to critical routes through `app/rate_limit.py`
- Internal exceptions are logged server-side and normalized before client responses

## Main Modules
- `app/config.py`: environment configuration and constants
- `app/database.py`: SQLAlchemy engine/session/base
- `app/models.py`: ORM models
- `app/schemas.py`: request/response validation models
- `app/crud.py`: database access layer and business persistence helpers
- `app/return_schedule.py`: next-return date calculation rules
- `app/excel_service.py`: import/export mapping and spreadsheet generation
- `app/backup_service.py`: backup generation

## Routers
- `app/routers/auth.py`:
  - login
  - user registration
- `app/routers/patients.py`:
  - patient CRUD
- `app/routers/forms.py`:
  - form-response CRUD
  - patient history
  - upcoming returns
  - form-question metadata endpoints
- `app/routers/excel.py`:
  - spreadsheet export/import endpoints
- `app/routers/backup.py`:
  - full backup endpoints

## Form Architecture
- `app/form_questions.json` defines the standard intake form
- `app/form_questions_additional.json` defines return/additional questions
- The frontend consumes these JSON definitions directly to render forms dynamically
- Longitudinal answers are stored in `form_data` instead of column-per-question tables

## Return Logic
- Each submission can generate `next_return_date`
- Current rule:
  - less than one year of hormone therapy: return in 3 months
  - one year or more: return in 6 months
- Upcoming returns are computed from the latest form-response of each patient

## Spreadsheet and Migration Utilities
- `app/excel_service.py` exports research data in the same column layout as the current Google Forms spreadsheet standard
- `import_google_forms.py` imports legacy/current spreadsheet data into the application model
- `backfill_next_return_dates.py` synchronizes missing next-return dates from the latest patient responses
- `reset_research_data.py` clears research data while preserving users

## Operational Notes
- Local API URL: `http://localhost:8000`
- Interactive docs: `/docs`
- Startup creates/ensures database indexes
- Main local install command: `python -m pip install -r requirements.txt`
