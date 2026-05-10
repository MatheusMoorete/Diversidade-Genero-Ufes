# Frontend AGENTS.md

Last reviewed: 2026-05-10

This frontend is the researcher-facing web app for a small academic patient-management system. It handles patient names, clinical questionnaire data, exports, backups, and admin-only form-schema controls. Treat all patient-facing screens and exported files as sensitive.

## Mission

Help maintain the React app without weakening authentication, privacy, data scoping, or the backend authorization model.

The frontend may hide or show controls, but it is not the security boundary. Backend ownership checks and admin checks are authoritative.

## Stack

- Vite
- React 18
- TypeScript
- React Router
- TanStack React Query
- Axios
- Zustand in-memory auth state
- Tailwind CSS
- Vercel static deployment

## Entry Points

- `src/main.tsx`: React bootstrap.
- `src/App.tsx`: router tree, protected shell, admin route visibility, query client config.
- `src/services/api.ts`: central Axios client and API service functions.
- `src/hooks/useAuth.ts`: auth state and session refresh logic.
- `src/components/Layout/ProtectedRoute.tsx`: route-level client guard.
- `vite.config.ts`: Vite config, local dev proxy, alias setup.
- `vercel.json`: Vercel build, SPA rewrites, static asset cache headers.

## Route Map

- `/login`: login page.
- `/register`: public registration UI. The backend disables public registration by default, so keep this route aligned with backend policy before production.
- `/form`: create patient form response or return response.
- `/patients`: patient list/search.
- `/patient/:id`: patient profile and form-response history.
- `/returns`: upcoming returns.
- `/export`: Excel export/import and user backup download.
- `/backup-health`: admin-only Neon snapshot health UI.
- `/form-schema`: admin-only dynamic form-question editor.

## Auth Model

- Login calls `POST /api/auth/login`.
- The backend sets an HttpOnly auth cookie.
- Axios is configured with `withCredentials: true`.
- The frontend also receives a bearer token in the login response, but the web app does not store it.
- Zustand keeps `user` and `isAuthenticated` only in memory.
- `checkSession()` runs on app bootstrap and silently calls `/api/auth/me` with the global 401 modal suppressed.
- `checkSession()` also removes the legacy `auth-storage` localStorage key left by older builds.
- `refreshUser()` calls `/api/auth/me` for active authenticated flows.

Do not store access tokens, passwords, backup JSON, exported spreadsheets, form responses, or patient records in localStorage/sessionStorage.
Consultation drafts are the exception: `/form` may save in-progress consultation data in IndexedDB and in `/api/form-responses/drafts/consultation` so long appointments are not lost if the session expires or Render sleeps. Treat those drafts as sensitive and clear them after successful submit or explicit discard.

## API Layer

All backend calls should go through `src/services/api.ts`.

Important service groups:

- `authService`: login, register, current user, logout.
- `patientService`: patient search, detail, create, update, delete.
- `formService`: form-response create/read/update/delete and upcoming returns.
- `exportService`: Excel export/import.
- `backupService`: full backup and Neon snapshot endpoints.
- `formQuestionsService`: dynamic form schema read/write.

When adding a new backend endpoint, add a typed service method here first, then use it from pages/components.

## Data Flow

- Dynamic form definitions come from `/api/form-questions` and `/api/form-questions/additional`.
- `src/hooks/useFormQuestionsCache.ts` uses TanStack Query memory cache for form question metadata only. It must not persist patient answers or schema in browser storage.
- Form submissions are built in `src/pages/FormPage.tsx` and sent to `formService.createFormResponse`.
- Patient history is assembled in `src/pages/PatientProfilePage`.
- Labels for saved form fields are mapped from current form-question metadata.

Historical submissions may contain form-data keys that no longer exist in the current schema. Preserve graceful fallback behavior when changing the schema UI.

## Privacy Rules

- Never persist patient records, form responses, exports, backup files, or auth tokens in localStorage/sessionStorage.
- IndexedDB is allowed only for the consultation autosave draft flow described in the Auth Model section.
- Do not add analytics, session replay, third-party scripts, or external logging around patient data.
- Do not log patient data to `console`.
- Do not use `dangerouslySetInnerHTML` for form labels, patient names, imported spreadsheet errors, or backend-provided text.
- Treat downloaded Excel and backup JSON as sensitive files; avoid automatic uploads or previews.
- Client route guards are for UX only. Do not assume `user.is_form_admin` is sufficient for security.

## Production Configuration

- Set `VITE_API_URL` to the production backend URL in the Vercel environment.
- Keep backend `CORS_ORIGINS` aligned with the deployed frontend origin.
- Verify cookies work across origins: backend must use secure cookie settings for HTTPS cross-origin deployment.
- If public registration remains disabled on the backend, consider hiding or removing the `/register` route/link for production UX.
- Consider adding security headers in `vercel.json` for non-asset routes, especially `X-Content-Type-Options`, `Referrer-Policy`, and a carefully tested CSP.

## Verification Commands

Run from `frontend/`.

```powershell
npm install
npm audit --omit=dev
npm run build
npm run lint
```

The production build command already runs TypeScript first:

```powershell
npm run build
```

## 2026-05-10 Frontend Review Notes

Positive findings:

- The app does not store the auth token in localStorage.
- Axios uses `withCredentials: true` for HttpOnly cookie auth.
- No `dangerouslySetInnerHTML` usage was found.
- React rendering escapes backend-provided labels and values by default.
- Production build passed.
- Lint passed after replacing explicit `any` usages with narrower `unknown`/domain types.

Resolved in this pass:

- `npm audit --omit=dev` originally found production vulnerabilities in `axios`, `react-router-dom`, `react-router`, `@remix-run/router`, and `follow-redirects`.
- `npm audit fix --omit=dev --package-lock-only` updated the lockfile to safe patch/minor versions without changing the declared `package.json` ranges.
- Shared API error handling now lives in `src/services/api.ts` through `getApiErrorMessage`.
- Explicit `any` usages were removed from frontend source files.
- `auth-storage` persistence was removed. The app now validates the HttpOnly cookie before rendering protected routes, clears the legacy localStorage key on bootstrap, and does not keep user/admin state in localStorage.
- Persistent `localStorage` caching for `form_questions_cache` was removed. Form question metadata now relies on TanStack Query `staleTime`/`gcTime`.
- Effective resolved versions after the fix:
  - `axios`: `1.16.0`
  - `react-router-dom`: `6.30.3`
  - `react-router`: `6.30.3`
  - `@remix-run/router`: `1.23.2`
  - `follow-redirects`: `1.16.0`

Remaining production considerations:

- The `/register` UI is still visible, although backend registration is disabled by default.
- Google Fonts are loaded from an external URL in `src/index.css`; decide whether this is acceptable for the deployment/privacy context.
- `vercel.json` currently only defines asset cache headers, not broader security headers.

## Common Change Patterns

When adding a page:

1. Add the page component under `src/pages`.
2. Add route wiring in `src/App.tsx`.
3. If protected, place it inside the existing protected shell.
4. If admin-only, gate the UI with `user?.is_form_admin`, but also require backend admin authorization.
5. Add service methods and types before wiring API calls into UI components.

When adding API data:

1. Update `src/types`.
2. Update `src/services/api.ts`.
3. Use React Query query keys from `src/config/queryKeys.ts`.
4. Invalidate related queries after mutations.
5. Keep patient data out of persistent browser storage unless it is the explicit IndexedDB consultation draft flow.

When changing dynamic forms:

1. Prefer backend schema changes through form-question APIs.
2. Preserve current question IDs when data continuity matters.
3. Use the question order-save endpoint for order-only moves instead of rewriting question payloads.
4. Check `DynamicForm`, `FormPage`, `PatientProfilePage`, and export behavior.
5. Verify conditional questions and calculated fields still work.

## Known UX/Quality Notes

- Several files contain mojibake in comments/text literals due to encoding history. Avoid broad encoding-only rewrites unless explicitly requested.
- The UI uses a blue/slate palette and many custom inline SVG icons. Keep changes consistent with existing style unless doing a deliberate redesign.
- There are no frontend test files in this workspace as of this review. Add focused tests before large changes to auth, exports, dynamic forms, or patient profile logic.
