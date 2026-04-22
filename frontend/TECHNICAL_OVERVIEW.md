# Frontend Technical Overview

## Stack
- React 18 + TypeScript
- Vite for dev/build
- React Router for navigation
- TanStack Query for server-state caching
- Axios for HTTP requests
- Tailwind CSS for styling

## Entry Points
- `src/main.tsx`: mounts the React app
- `src/App.tsx`: declares routes and shared layout behavior

## Main Pages
- `src/pages/Login.tsx`: authentication entry
- `src/pages/FormPage.tsx`: new patient form and return form flow
- `src/pages/PatientsPage.tsx`: patient search/listing
- `src/pages/PatientProfilePage/`: patient profile and longitudinal history
- `src/pages/ReturnPage.tsx`: upcoming returns agenda
- `src/pages/ExportPage.tsx`: Excel and backup actions

## Core Frontend Flows
- Authentication:
  - JWT is stored in `localStorage`
  - Axios interceptor attaches `Authorization: Bearer <token>`
  - `401` triggers logout state and login modal fallback
- Data fetching:
  - Query keys are centralized in `src/config/queryKeys.ts`
  - Lists and detail pages are cached with React Query
  - Mutations invalidate patient, form-response, and return-agenda queries
- Dynamic forms:
  - Question definitions come from backend JSON files
  - `DynamicForm.tsx` renders fields from metadata instead of hardcoded JSX
  - `src/utils/formQuestions.ts` derives the return-form structure from standard/additional question sets
- Patient history:
  - Profile renders form responses in chronological order, oldest to newest
  - The latest response is still used as the current snapshot where needed

## Important Modules
- `src/services/api.ts`: API client and service layer
- `src/hooks/useAuth.ts`: auth state management
- `src/hooks/useFormQuestionsCache.ts`: persistent cache for form metadata
- `src/components/Form/DynamicForm.tsx`: generic metadata-driven form renderer
- `src/pages/PatientProfilePage/components/`: profile sections, history cards, and full-form rendering

## Routing Model
- Protected routes require a valid token
- Patient-specific flows use URL parameters like `/patient/:id`
- Return-form flow can receive `patientId` through query string to open a follow-up form already linked to a patient

## Operational Notes
- Default API base URL is `http://localhost:8000`
- Production API endpoint can be overridden with `VITE_API_URL`
- Build command: `npm run build`
- Development command: `npm run dev`
