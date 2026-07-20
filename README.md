[![CI/CD - Build and Publish Docker Image](https://github.com/ecotaxa/ecopart_front/actions/workflows/ci.yml/badge.svg)](https://github.com/ecotaxa/ecopart_front/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/ecotaxa/ecopart_front/graph/badge.svg?token=A5RXX8GAU2&branch=main)](https://codecov.io/github/ecotaxa/ecopart_front)

# Ecopart Frontend

Modern React frontend for the Ecopart platform.

This project is intentionally **strict**, **predictable**, and **scalable**.
All architectural choices are made to avoid long-term technical debt.

---

## 🧱 Technology Stack

### Core

* **React 18** — UI library
* **TypeScript** — type safety, refactoring confidence
* **Vite** — fast dev server and build tool

### UI

* **MUI (Material UI)** — component library
* **Emotion** — styling engine used by MUI
* **Centralized theme** — no inline chaos

### State & Data

* **TanStack Query** — server state (API data, caching)
* **Zustand** — client state (auth, UI state)
* **Fetch API** — simple, explicit HTTP (Axios ready if needed)

### Routing & Auth

* **React Router v6**
* **JWT authentication**
* **Protected routes**

### Tooling

* **ESLint** — code quality
* **Prettier** — formatting
* **Absolute imports (`@/...`)** — no relative path hell

---

## 🏗️ Architecture Overview

The project uses a **feature-based (vertical slice) architecture**.

### Why this architecture?

* High cohesion, low coupling
* Features are easy to add, remove, or refactor
* Scales to large codebases and teams
* Avoids “global folder spaghetti”

> **Rule of thumb**
> If you delete a feature, you should delete **one folder**.

---

## 📁 Project Structure

```txt
src/
├─ app/                # Application infrastructure
├─ features/           # Business features (vertical slices)
├─ shared/             # Truly reusable code
├─ theme/              # Design system & MUI theme
├─ main.tsx            # Application entry point
```

---

## 🧠 Dependency Direction (IMPORTANT)

```
app → features → shared
```

Forbidden:

```
features → app
shared → features
```

This prevents circular dependencies and architectural decay.

---

## 🔧 `app/` — Application Infrastructure

Contains **global wiring**, nothing business-specific.

```txt
app/
├─ App.tsx              # Router root
├─ router.tsx           # All routes
├─ providers.tsx        # MUI, React Query, etc.
├─ ProtectedRoute.tsx   # Auth guard
└─ layouts/
   └─ MainLayout.tsx    # App shell (AppBar, Drawer, etc.)
```

### Example: Protected Route

```tsx
<ProtectedRoute>
  <DashboardPage />
</ProtectedRoute>
```

Why:

* Centralized auth enforcement
* Features don’t care about auth logic

---

## 🧩 `features/` — Business Logic (Vertical Slices)

Each feature is a **self-contained vertical slice** of the application.

A feature may include **any code required to implement that business domain**, as long as it remains internal to the feature.

Typical structure:

### Example: `auth` feature

```txt
features/auth/
├─ pages/          # Route-level components
├─ components/     # Feature-specific UI components
├─ hooks/          # Feature-specific hooks
├─ api/            # API calls related to the feature
├─ store/          # Feature state (Zustand, local state)
├─ types/          # Feature-specific TypeScript types
└─ index.ts        # Public feature API
```

### What belongs in a feature

A feature **may contain**:

* Route-level pages
* Feature-specific components
* Feature-specific hooks
* API access related to the feature
* Local or global state related to the feature
* Feature-specific types and utilities

### What does **not** belong in a feature

* Cross-feature shared components
* Global layout or routing logic
* Generic utilities usable outside the feature
* Application-wide providers or configuration

Those belong in `shared/` or `app/`.

---

## Rule of ownership

> **If a component or hook is only used by one feature, it belongs to that feature.**

Only promote code to `shared/` when:

* It is reused by **multiple features**
* It is not tied to a specific business domain

This rule prevents premature abstraction and keeps features cohesive.

---

### Example: Login API

```ts
export async function loginRequest(email: string, password: string) {
  return fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then((r) => r.json());
}
```

### Example: Feature export

```ts
// features/auth/index.ts
export { default as LoginPage } from "./pages/LoginPage";
export { useAuthStore } from "./store/auth.store";
```

**Router imports only feature entry points**, never deep paths.

---

## ♻️ `shared/` — Reusable Utilities

Only put code here if it’s used by **multiple features**.

```txt
shared/
├─ api/
│  ├─ http.ts          # Fetch wrapper with JWT
│  └─ queryClient.ts
├─ hooks/
├─ utils/
└─ types/
```

### Example: Auth-aware HTTP helper

```ts
export async function http<T>(url: string, init: RequestInit = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  return res.json();
}
```

Why:

* One place to manage headers, errors, auth
* Easy to replace with Axios later

---

## 🎨 `theme/` — Design System

```txt
theme/
├─ index.ts        # createTheme()
├─ palette.ts
├─ typography.ts
└─ components.ts   # MUI component overrides
```

Why:

* Consistent UI
* Easy dark/light mode
* No duplicated styles

---

## 🧭 Routing Strategy

All routing lives in **one file**:

```ts
// app/router.tsx
export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
]);
```

Why:

* One source of truth
* Easy to reason about navigation
* No hidden routes inside features

---

## 📦 Absolute Imports (`@/...`)

Configured via Vite + TypeScript:

```ts
import MainLayout from "@/app/layouts/MainLayout";
import { LoginPage } from "@/features/auth";
```

Why:

* No `../../../../` paths
* Easy refactors
* Cleaner imports

---

## 🔐 Authentication Strategy

* JWT stored in memory + `localStorage`
* Zustand for auth state
* Route protection at router level

### Why Zustand?

* Minimal API
* No boilerplate
* Perfect for auth + UI state

---

## 🚫 What This Project Avoids (On Purpose)

* Redux (unnecessary here)
* CRA (deprecated)
* Atomic Design everywhere (overkill)
* Mixing CSS frameworks with MUI
* Global “components” dumping ground

---

## 🚀 How to Add a New Feature

1. Create a folder under `features/`
2. Add `pages/`, `api/`, `store/` as needed
3. Export public API via `index.ts`
4. Register route in `app/router.tsx`

Example:

```txt
features/reports/
├─ pages/ReportsPage.tsx
├─ api/reports.api.ts
└─ index.ts
```

---

## 🚢 Deployment (CI/CD)

Pushing a `v*.*.*` git tag triggers [`.github/workflows/ci.yml`](.github/workflows/ci.yml), which runs three jobs in sequence:

1. **`test`** — runs the Vitest suite with coverage.
2. **`build-and-push`** — builds the production Docker image and pushes it to Docker Hub as `ecotaxa/ecopart_front:<version>` and `ecotaxa/ecopart_front:latest` (login via the `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` repository secrets).
3. **`deploy-test`** — deploys that `:latest` image to the test server.

### Test-server deploy

The test server is behind a firewall, so the deploy step does not run on a GitHub-hosted runner. It runs on a **self-hosted runner registered at the GitHub organization level** with the label **`ecopart-test`**. This is the **same runner used by the backend repo (`ecopart_back`)** — it is already installed on the server and shared, so this repo reuses it with no new installation needed (`runs-on: [self-hosted, ecopart-test]`).

The server runs both the frontend and backend from a **single, hand-maintained `docker-compose.yml`** (alongside its `.env`) at:

```
DEPLOY_DIR = /ecotaxadev2/ecopart/new_ecopart
```

That compose file declares two services: `api` (backend — `ecotaxa/ecopart_back:latest`) and `web` (this frontend — `ecotaxa/ecopart_front:latest`).

The `deploy-test` job is **strictly scoped to the `web` service**:

* It does **not** check out the repo into `$DEPLOY_DIR` and never copies or modifies the server's compose file (it is maintained by hand on the server).
* It restarts the frontend only:

  ```bash
  cd "$DEPLOY_DIR"
  docker compose pull web && docker compose up -d web
  ```

  The backend `api` service keeps running and is left completely untouched.
* For cleanup it removes **only the previous frontend image**: it captures the `web` image id (`docker compose images -q web`) before the pull and, afterwards, `docker image rm`s the old id only if it changed and is now unused. There is **no** host-wide `docker image prune`.

## 🔮 Future Improvements (Planned)
* techno/architecture :
  * Axios + interceptors
  * Token refresh & 401 handling
  * Role-based access control
  * Nested routes with layouts
  * E2E tests (Playwright)
  * dockerize
  * CI/CD integrated pipeline with github actions
* features to come: 
  * about
  * explore
  * export
  * login
  * register
  * reset password
  * user settings ecopart account
  * user settings ecotaxa accounts
  * projects
  * create project
  * project stats
  * project metadata
  * project data
  * project import
  * project update
  * project security
  * project tasks
  * sample context
  * sample metadata
  * sample instrument
  * sample QC
  * tasks
  * task general
  * task log file
  * admin quick acces
  * admin users
  * admin projects
  * admin tasks
  * admin updates

---

## ✅ Bottom Line

This frontend is:

* Maintainable
* Scalable
* Strict by design
* Easy to reason about

The structure forces good decisions and prevents common React project decay.

---

# 🧪 Test Scenarios & Strategy

This section documents the testing architecture, tooling, and the full catalogue of
test cases that guard the application.

> **Suite at a glance:** **298 tests** across **52 files** (Vitest).
> Every functional test embeds its `TC-…` id in the test title, so a scenario in this
> table maps 1:1 to a runnable test (`vitest -t "TC-A3"`).

## 🛠 Testing Tech Stack

| Tool | Purpose | Why? |
| --- | --- | --- |
| **Vitest** | Test runner | Ultra-fast runner with a Jest-compatible API for unit and integration testing. |
| **Vitest UI** | Visual interface | Web UI to run, filter, and inspect tests live via `vitest --ui`. |
| **Testing Library** | UI testing | Encourages testing from the user's perspective (roles, labels, visible text) rather than implementation details. |
| **MSW** | API mocking | Mock Service Worker intercepts HTTP at the network level, returning simulated success / error / latency responses that can be overridden per test. |
| **React Router** | Navigation | Uses `MemoryRouter` via a custom `renderWithRouter` helper to simulate URLs, navigation, and redirects. |
| **Zustand** | State management | The auth store is reset before each test to prevent "Zombie User" cross-test contamination. |

## ▶️ Running the tests

```bash
npm test              # watch mode (vitest)
npm run test:ui       # web UI (vitest --ui)
npm run test:coverage # single run with coverage report
npx vitest run -t "TC-A3"   # run one scenario by its id
```

## 🏗 Testing Architecture

We follow a modular strategy to keep the suite DRY (*Don't Repeat Yourself*) and maintainable:

* **Feature / page tests** (`src/features/*/pages/*.test.tsx`, `*/components/*.test.tsx`) — business logic, user flows, and error handling.
* **Hook unit tests** (`src/features/*/hooks/*.test.ts`) — logic isolated from the DOM via `renderHook`.
* **API-helper unit tests** (`src/features/*/api/*.test.ts`, `src/shared/api/*.test.ts`) — request shapes, response normalization, and error mapping (backed by MSW).
* **Accessibility tests** (`src/test/accessibility/*.a11y.test.tsx`) — technical compliance (tab order, ARIA labels, focus management).
* **Routing tests** (`src/test/routing/*.test.tsx`) — guard behaviour for protected / public-only routes.
* **Test helpers** (`src/test/helpers/*.ts`) — reusable user-action simulators (e.g. `fillAuthForm`, `submitAuthForm`).
* **Shared assertions** (`src/test/assertions/*.ts`) — reusable expectations (e.g. `expectSubmitDisabled`) for cross-app consistency.

> **Convention:** every `it(...)` embeds a globally-unique `TC-…` id; accessibility rows are
> tagged **♿**. Section letters run `A → Z`, then `AA`, `AB`, … The HTTP utility uses `TC-AC*`,
> routing guards use `TC-AD*`, and the Admin tabs use `TC-AE*` (Tasks) / `TC-AF*` (Users) /
> `TC-AG*` (Projects) / `TC-AH*` (Quick Access) / `TC-AU*` (Updates — tab, hook, store & banner).

---

## 📋 Test Scenarios

Each table uses the columns **ID · Title · Preconditions · Steps · Expected Result**, with
every field described explicitly. Multi-point expectations are listed as bullets inside the
cell. Accessibility scenarios are tagged **♿** in the ID column.

### A. Login Page

*`features/auth/pages/LoginPage.test.tsx` · `test/accessibility/LoginPage.a11y.test.tsx`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-A1** | Initial rendering & state | User is not authenticated. | Navigate to `/login`. | • The login form is displayed.<br>• The login button is disabled (this implicitly verifies that empty fields prevent submission).<br>• No error message is visible. |
| **TC-A2** | Validation logic (email) | User is on the Login page. | • Enter an invalid email format.<br>• Move focus away from the field (blur). | • The email validation error message is displayed.<br>• The login button remains disabled. |
| **TC-A3** | Successful login (happy path) | The backend login API is available. | • Enter a valid email and password.<br>• Click **LOG IN**. | • The login API is called with the correct credentials.<br>• The user is redirected to `/dashboard`. |
| **TC-A4** | API error handling (401 & 500) | The backend returns an error (401 Unauthorized or 500 Server Error). | • Enter valid credential formats.<br>• Click **LOG IN**. | • The app handles the error gracefully (no crash).<br>• A generic error message ("Invalid email or password") is displayed.<br>• The user remains on the login page. |
| **TC-A5** | Redirect authenticated user | The user is already authenticated (a session exists). | Navigate to `/login`. | The user is immediately redirected to `/dashboard`. |
| ♿ **TC-A6** | Keyboard navigation & labels | User is on the Login page. | • Fill the form (to enable the button).<br>• Navigate through the form using only the Tab key. | • All inputs have an associated `<label>`.<br>• Focus moves logically: Email → Password → Visibility toggle → Remember me → Login button. |

### B. Register Page

*`features/auth/pages/RegisterPage.test.tsx` · `test/accessibility/RegisterPage.a11y.test.tsx`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-B1** | Register page initial state | User is not authenticated. | Navigate to `/register`. | • The registration form is displayed.<br>• The submit button is disabled (this implicitly verifies the required-fields check). |
| **TC-B2** | Password validation (strength & match) | User is on the Register page. | • Enter a weak password, OR<br>• Enter a confirmation password that does not match. | • A specific error message (strength or mismatch) is displayed.<br>• The submit button remains disabled. |
| **TC-B3** | Successful registration | All form fields are valid. | • Complete the registration form.<br>• Click **Sign up**. | • The registration API is called with the correct payload.<br>• A success message is displayed.<br>• The registration form is hidden. |
| **TC-B4** | API error handling (conflict or 500) | The backend returns a 409 with `EXIST_EMAIL` (email already exists). | Submit valid registration data. | • The backend error message is displayed.<br>• The registration form remains visible (the submit button is still present, so the user is not thrown off the form). |
| ♿ **TC-B5** | Keyboard navigation & autocomplete | User is on the Register page. | Navigate the form using Tab. | • Focus order is logical top-to-bottom.<br>• Autocomplete fields (Organisation, Country) are accessible via keyboard (arrows to select options).<br>• The Terms checkbox is checkable via Spacebar. |

### C. Reset Password — Request

*`features/auth/pages/ResetPasswordPage.test.tsx` · `test/accessibility/ResetPasswordPage.a11y.test.tsx`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-C1** | Initial rendering & validation | User is not authenticated. | Navigate to `/reset-password`. | • The email input is displayed.<br>• The submit button is disabled if the email is empty or invalid. |
| **TC-C2** | Request submission (success) | The backend is available. | • Enter a valid email.<br>• Click **Send password reset email**. | • The password-reset API is called.<br>• A generic success message is displayed (anti-enumeration policy: the message shows even if the email does not exist). |
| **TC-C3** | Server error handling (HTTP 500) | The reset endpoint returns a 500. | Submit the email form. | • Anti-enumeration: the component swallows the error and shows the **same success message** (`RESET_LINK_SENT`) — no white screen.<br>• No generic error message leaks. |
| ♿ **TC-C4** | Keyboard navigation | User is on the Reset Password page. | Tab through the page. | • The input has a proper label.<br>• Focus moves logically from the input to the button. |

### D. Reset Password — Confirmation

*`features/auth/pages/ResetPasswordConfirmPage.test.tsx` · `test/accessibility/ResetPasswordConfirmPage.a11y.test.tsx`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-D1 & D2** | Initial rendering (valid / present token) | A reset token is present in the URL. | Navigate to `/reset-password/:token`. | • The new-password and confirmation fields are displayed.<br>• The submit button is disabled. |
| **TC-D3** | Validation (strength & match) | User is on the page. | Enter weak passwords or a mismatching confirmation. | • A validation error is displayed.<br>• The submit button remains disabled. |
| **TC-D4** | Successful password reset | The token is valid and the passwords are valid. | Click **Reset password**. | • The reset-password API is called with the token.<br>• The user is redirected to `/login`.<br>• A success message is displayed on the Login page. |
| **TC-D5** | Invalid token / API error handling | The backend returns an error (e.g. token expired during the process) or the token is invalid. | Submit a valid form. | • An error message is displayed.<br>• The user remains on the page.<br>• Form submission is blocked for an invalid/missing token. |
| ♿ **TC-D6** | Keyboard navigation | User is on the page. | Verify labels and Tab navigation. | • Both password inputs have associated labels.<br>• Navigation is logical. |

### E. User Profile (Settings) — EcoPart Account

*`features/userProfile/pages/ProfilePage.test.tsx` · `test/accessibility/ProfilePage.a11y.test.tsx`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-E1** | Initial loading & display | User is authenticated. | Navigate to `/settings`. | • The profile page renders.<br>• Fields are populated with user data.<br>• *Planned usage* is editable.<br>• *Email* is disabled. |
| **TC-E2** | Update profile (Cancel) | User is on the settings page. | Modify fields and click **CANCEL**. | Form inputs revert to their original database values. |
| **TC-E3** | Update profile (validation) | User is on the settings page. | Clear required fields (e.g. First name, Country). | • Specific error messages are displayed (e.g. "Please select a country").<br>• The **SAVE** button is disabled. |
| **TC-E4** | Update profile (success) | User is on the settings page. | Modify fields and click **SAVE**. | • The API is called.<br>• A success message is displayed.<br>• The data persists. |
| **TC-E5** | Update profile (API error) | The backend returns HTTP 500. | Attempt to save valid changes. | • A specific error message is displayed.<br>• The data is not permanently saved. |
| **TC-E6** | Change password (validation) | User is on the settings page. | Enter weak passwords or a mismatching confirmation. | The **CHANGE** button remains disabled. |
| **TC-E7** | Change password (success) | User is on the settings page. | • Enter a valid current password.<br>• Enter a valid new password.<br>• Enter a matching confirmation.<br>• Click **CHANGE**. | • The API is called.<br>• A success message is displayed.<br>• The form is cleared. |
| **TC-E8** | Delete account (API error) | The backend returns HTTP 500. | Click **DELETE**, then confirm within the dialog. | • The dialog closes.<br>• An error message is displayed on the page.<br>• No redirection occurs. |
| **TC-E9** | Delete account (success) | User is authenticated. | Click **DELETE**, then confirm within the dialog. | • The API is called.<br>• The local session is cleared.<br>• The user is redirected to `/login`. |
| **TC-E10** | Admin navigation | User is authenticated and `is_admin` is `true`. | Click the **ADMIN DASHBOARD** button. | The user is successfully routed to `/admin`. |
| **TC-E11** | Transfer-access note before delete | User is on the settings page. | Open the delete-account flow. | The note to transfer project access before deleting the account is shown. |
| ♿ **TC-E12** | Keyboard navigation | User is on the settings page. | Navigate completely through the form using Tab. | • Focus jumps sequentially through tabs, inputs and interactive buttons.<br>• It avoids naturally-disabled items (like the CHANGE password button before input). |

### F. User Profile (Settings) — EcoTaxa Link

*`features/userProfile/pages/ProfilePage.test.tsx` · `test/accessibility/ProfilePage.a11y.test.tsx`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-F1** | Initial loading & display (list view) | User is authenticated and has existing linked accounts. | Navigate to `/settings` with state `{ activeTab: 1 }`. | • The list of linked accounts is displayed.<br>• The *Connect to another account* button is visible. |
| **TC-F2** | Initial loading & display (form view) | User is authenticated but has NO linked accounts. | Navigate to `/settings` with state `{ activeTab: 1 }`. | • The EcoTaxa login form is displayed directly.<br>• The *Cancel* button is NOT visible. |
| **TC-F3** | Form validation & disabled state | User is on the EcoTaxa login form. | Leave email or password empty, or leave the consent checkbox unchecked. | The **LOG IN** button remains disabled. |
| **TC-F4** | Link account (success) | User is on the EcoTaxa login form. | Fill valid credentials, check consent, click **LOG IN**. | • The API (POST) is called.<br>• A success message appears.<br>• The view switches back to the list, displaying the new account. |
| **TC-F5** | Unlink account (API error) | User has a linked EcoTaxa account; the backend returns 500/4xx on unlink. | Click the disconnect icon on an account and confirm in the dialog. | • The app handles the error (no crash).<br>• An error message is displayed.<br>• The dialog closes or shows feedback.<br>• The account remains in the list. |
| **TC-F6** | Unlink account (success) | User is viewing the list of linked accounts. | Click the logout icon, then **Disconnect** in the dialog. | • The API (DELETE) is called.<br>• The account disappears from the list. |
| **TC-F7** | EcoTaxa form cancel behaviour | User is on the EcoTaxa form view (no account linked, or "Connect another"). | Type credentials and click **Cancel and go back to list**. | • The user returns to the list view.<br>• No API call is sent.<br>• The form state is reset upon reopening. |
| ♿ **TC-F8** | Keyboard navigation — accounts list | User is authenticated with linked accounts. | Navigate the linked-accounts list using Tab. | The linked-accounts list is fully navigable by keyboard. |
| ♿ **TC-F9** | Keyboard navigation — login form | User is on the EcoTaxa login form. | Navigate the form using Tab. | The EcoTaxa login form is fully navigable by keyboard. |

### G. Projects List (Projects Page)

*`features/projects/pages/ProjectsPage.test.tsx` · `test/accessibility/ProjectsPage.a11y.test.tsx`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-G1** | Initial data loading | User is authenticated; the API returns a list of projects. | Navigate to `/projects`. | • The DataGrid renders the mocked projects (e.g. "Test Project 1").<br>• The total row count is visible. |
| **TC-G2** | Error handling (API failure) | The API returns HTTP 500 for `POST /projects/searches`. | Navigate to `/projects`. | An error Alert is displayed above the empty table. |
| **TC-G3** | Filtering & searching (UI state) | User is on the projects page. | Type in the search box, change the search attribute, select a filter from the menu. | The UI updates to reflect the active filters (e.g. the filter button changes label). *(Payload validation is done in the hook/backend unit tests; here we focus on UI responsiveness.)* |
| **TC-G4** | Row selection & Explore navigation | The table contains at least one project. | Check the checkbox for a project, then click **EXPLORE SELECTION**. | • The selection bar appears showing "1 items selected".<br>• The user navigates to `/explore?projects=ID`. |
| **TC-G5** | Row-click navigation | The table contains at least one project. | Click a project row (not the checkbox). | The user navigates to `/projects/ID`. |
| **TC-G6** | Pagination & query sync | The backend has more than one page of projects. | Click next page in the DataGrid pagination. | • A new search request is sent with the updated page parameter.<br>• New rows are rendered.<br>• Selection/filter state remains consistent. |
| ♿ **TC-G7** | Keyboard navigation (basic structure) | The page is loaded. | Use the Tab key. | Focus moves logically through the Search input, Attribute select, Filter button, **NEW PROJECT** button, and into the DataGrid. |

### H. Project Creation (New Project Page)

*`features/projects/pages/NewProjectPage.test.tsx` · `test/accessibility/NewProjectPage.a11y.test.tsx`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-H1** | Initial render & auto-fill | User is authenticated; `/users` and `/users/:id/ecotaxa_account` return data. | Navigate to `/new-project`. | • The page renders.<br>• The Privileges section automatically adds a row with the current user as Manager and Contact. |
| **TC-H1b** | EcoTaxa permissions note | User is on `/new-project`. | Inspect the Privileges section. | The EcoTaxa annotation & export permissions note is shown in Privileges. |
| **TC-H2** | Validation (empty submit) | User is on `/new-project`. | Click **CREATE** immediately without filling fields. | • The form does not submit.<br>• A warning snackbar appears (e.g. "Root folder path is required"). |
| **TC-H3** | Creation workflow & redirection | Valid data on the New Project page; the create API is mocked to succeed (MSW). | Submit the creation form and wait for the automatic redirect. | The app redirects to the details page; the target UI is validated by the presence of the IMPORT tab (ARIA `tab` role), keeping the test robust against dynamic titles. |
| **TC-H4** | Error handling (API failure) | The backend returns HTTP 500 for `POST /projects`. | Fill all mandatory fields, then click **CREATE**. | • The API fails.<br>• An error snackbar appears.<br>• The user remains on the page. |
| **TC-H5** | Complex sections interaction (coverage booster) | The backend returns a valid user list (John Doe, Jane Smith) and EcoTaxa instances. | Render the page, click **Add user** in Privileges, and select Jane Smith from the new dropdown. | • The initial manager John Doe is displayed.<br>• After the interaction, a second row correctly shows Jane Smith as selected. |
| **TC-H6** | Load-metadata failure resilience | Invalid `rootFolderPath` or a backend error. | Enter an invalid path and click **Load metadata**. | • An error snackbar is shown.<br>• Existing form values in `useNewProjectForm` are preserved.<br>• No app crash. |
| **TC-H7** | Metadata people deduplication in Privileges | The current user is present in Privileges; the metadata contains duplicate IDs and the current-user ID. | Click **Load metadata**. | • No duplicates are created.<br>• New valid IDs are added as Member.<br>• The current user remains unique. |
| **TC-H8** | Wait for active users | The active-users list is still loading when metadata is loaded. | Trigger **Load metadata** before the active users resolve. | Metadata privileges are appended only after the active-users list has loaded. |
| **TC-H8b** | Submission loading state | Valid data; the create API request is in flight. | Submit the creation form. | The **CREATE** button shows a loader and is disabled during submission. |
| ♿ **TC-H9** | Root-folder modal keyboard accessibility | The New Project page is loaded. | Navigate the tree and confirm a folder using only Tab, Enter and Escape. | • Focus is trapped in the modal.<br>• Escape closes it.<br>• The selection is applied to `rootFolderPath`.<br>• The focus order is logical. |
| ♿ **TC-H10** | Keyboard navigation (form) | User is on `/new-project`. | Use the Tab key. | Focus moves logically through the input fields of the different sections. |

### I. Project Details Page (`/projects/:id`)

*`features/projects/pages/ProjectDetailsPage.test.tsx` · `test/accessibility/ProjectDetailsPage.a11y.test.tsx`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-I1** | Invalid ID handling | None. | Navigate to `/projects/not-a-number`. | The page renders the "Invalid Project ID" error message instead of the main layout. |
| **TC-I2** | Initial render (default tab) | User is authenticated; the API returns valid data for ID 101 (title "Test Project"). | Navigate to `/projects/101`. | • The header renders the project title ("Test Project").<br>• The METADATA tab is selected by default (`aria-selected=true`) and its content is visible (the *Project acronym* field). |
| **TC-I3** | Tab switching | User is on `/projects/101`. | Click the SECURITY tab. | • The METADATA content unmounts.<br>• The SECURITY content mounts (verified by "Data privacy delays"). |
| **TC-I3b** | Deep-link a tab via URL | The URL includes a tab name. | Navigate to the details URL with the Backup tab name. | The Backup tab opens directly. |
| **TC-I4** | Explore navigation | User is on `/projects/101`. | Click the **EXPLORE** button. | The app navigates to `/explore?projects=101`. |
| **TC-I5** | API error handling | A valid project ID is in the URL; the backend returns 404/500. | Navigate to the page and wait for load. | • A clear error state is displayed.<br>• No broken data is rendered.<br>• No crash; navigation remains possible. |
| **TC-I6** | Open tab via navigation state | `activeTab` is provided in the navigation state. | Navigate to the details page with that state. | The Import tab opens. |
| ♿ **TC-I7** | Keyboard navigation (tabs) | User is on `/projects/101`. | Use Tab and Arrow keys to navigate the MUI `<Tabs>` component. | Focus moves logically through the tabs, demonstrating proper ARIA roles and keyboard support. |

### J. Project Metadata Tab (`ProjectMetadataTab`)

*`features/projects/hooks/ProjectMetadataTab.test.tsx`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-J1** | Initial data loading | The backend returns valid project data. | Render the component with `projectId=101`. | Form inputs are pre-filled with data from the API (e.g. Title, Acronym). |
| **TC-J2** | Update success (PATCH) | The form is loaded. | Change a value (e.g. Title) and click **SAVE**. | • `PATCH /projects/101` is called.<br>• A success snackbar appears. |
| **TC-J3** | Update error (PATCH) | The backend returns 500. | Click **SAVE**. | An error snackbar appears. |
| **TC-J4** | Linked EcoTaxa summary | The project is linked to an EcoTaxa project. | View the tab, then unlink. | • The linked EcoTaxa summary is shown.<br>• The fields switch back to editable after unlinking. |
| **TC-J5** | Loaded project title is locked | The component is connected to the API handlers. | Wait for the loaded title to display, then try to erase the field via a user action. | • The lock helper text is present.<br>• The original value stays intact in the input after the deletion attempt. |

### K. Project Security Tab (`ProjectSecurityTab`)

*`features/projects/hooks/ProjectSecurityTab.test.tsx`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-K1** | Initial data loading (privileges & privacy) | The backend returns privacy settings and privileges arrays. | Render the component. | • Privacy inputs show the correct months.<br>• The privileges list shows existing managers/members. |
| **TC-K2** | Validation (no contact) | The form is loaded. | Remove the Contact radio selection (or ensure none is selected) and click **SAVE**. | • Submission is blocked.<br>• A warning snackbar appears ("A contact is required before saving."). |
| **TC-K3** | Update success (PATCH) | Valid security data; `PATCH /projects/101` mocked OK. | Change a privacy delay (6 → 12) and click **SAVE**. | • `PATCH /projects/101` is called.<br>• The "Security settings updated successfully!" snackbar appears. |

### L. `useNewProjectForm` Hook (unit)

*`features/projects/hooks/useNewProjectForm.test.ts`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-L1** | Initial state | The hook is initialized without parameters. | Render the hook via `renderHook`. | The default privacy values are `private: 2`, `visible: 24`, `public: 36` and the duration check is enabled. |
| **TC-L2** | `updateField` logic | The hook is initialized with empty default metadata values. | Update `metadata.title` via `updateField`. | The title is updated, but other nested fields (like the acronym) keep their initial value without being overwritten. |
| **TC-L3** | `handleLoadMetadata` (success) | The root folder path is set in the form state. | Call `handleLoadMetadata` with a valid path (`/UVP5_sn123…`). | The model (UVP5HD), the SN and the acronym are extracted automatically. |
| **TC-L3.0** | Normalize relative server paths | The hook is initialized. | Update `rootFolderPath` with a relative server path, then trigger `handleLoadMetadata`. | Relative server paths are normalized before loading metadata. |
| **TC-L3.1** | Invalid folder-path format error | The hook is initialized. | Update `rootFolderPath` with an invalid format and trigger `handleLoadMetadata`. | • An error snackbar is displayed.<br>• The instrument model remains empty (no data loaded). |
| **TC-L3.2** | Preserve values on metadata failure | The form fields (instrument and metadata) are already populated with valid data. | Enter an invalid `rootFolderPath` and trigger `handleLoadMetadata`. | • An error snackbar is displayed.<br>• All existing form values are preserved and not reset by the failure. |
| **TC-L4** | Validation logic (frontend) | An empty form, or one containing invalid numeric values (e.g. months < 1). | Call `handleSubmit`. | The internal `errors` object is populated with messages: "Root folder path is required", "At least one user must be a manager", etc. |
| **TC-L4.1** | Delay minimum (≥ 1 month) | Delay fields below 1 month. | Call `handleSubmit`. | Validation rejects delays under 1 month. |
| **TC-L5** | API error mapping | The backend (MSW) is simulated to return a 400 with the message "Invalid manager assigned". | Fill the form to pass frontend validation and call `handleSubmit`. | The backend error is intercepted and mapped specifically onto `errors.privilegesManager`. |
| **TC-L6** | `handleLoadMetadata` locks the loaded title | The hook is initialized with a valid root folder path. | Call `handleLoadMetadata()`. | The `lockedTitlePrefix` property and the title value automatically take the extracted folder name. |

### M. Project Metadata Section (`ProjectMetadataSection`)

*`features/projects/components/ProjectMetadataSection.test.tsx`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-M1** | Locked prefix prevents clearing the loaded title | Component rendered with an initial title and an identical `lockedTitlePrefix`. | Simulate deleting a character, or typing a value that does not contain the prefix. | The `onChange` callback is never triggered because the modification is rejected. |
| **TC-M2** | Locked prefix allows appending text after the title | Same locked-prefix configuration as TC-M1. | Type extra text after the initial title. | The `onChange` callback is called with the title augmented by the new input. |
| **TC-M3** | Locked prefix displays helper text | Component rendered with an active locked prefix. | Examine the helper area below the text field. | An explanatory message stating that the loaded title cannot be deleted is visible. |
| **TC-M4** | Title is freely editable without a prefix | Component rendered without any locked prefix defined. | Freely change the value of the text input. | The `onChange` callback returns the new value and no warning message is displayed. |

### N. Import Tab (`ProjectImportTab` & `useProjectImportTab`)

*`features/projects/components/ProjectImportTab.test.tsx` · `features/projects/hooks/useProjectImportTab.test.ts`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-N1** | Raw import (pending) success + cleanup | Hook APIs are mocked; the project and raw samples are loaded; the selection contains `raw-1`. | Open the hook, set the raw selection, run `handlePreImportRawSamples(false)`, then confirm via `confirmAndExecuteRawImport`. | • `importRawSamples` is called with `samples=["raw-1"]`.<br>• Then `selectedRawSamples` resets to `[]` and `isImporting` returns to false. |
| **TC-N1b** | IMPORT & VALIDATE | Reviewed samples are ready in the working set. | Trigger the IMPORT & VALIDATE flow. | Every reviewed sample is sent as validated. |
| **TC-N1c** | REMOVE FROM IMPORT (hook) | A working set of previewed samples exists. | Remove one sample from the working set. | The sample is dropped from the working set. |
| **TC-N1d** | Partial importability (hook) | Some samples are importable and one is not. | Preview the batch. | • The good samples are previewed.<br>• The bad one stays removable. |
| **TC-N2** | Select all UVP samples | `getImportableRawSamples` returns 3 samples; the table is displayed. | Check the "Select All" box in the "New UVP samples" DataGrid header. | • The selection bar shows "3 items selected".<br>• The **IMPORT SELECTION** button switches from disabled to enabled.<br>• The local `selectedRawSamples` state contains the 3 IDs. |
| **TC-N3a** | QC modal cards | Previewed samples exist. | Open the QC modal. | The QC modal renders one card per previewed sample, each with remove + footer actions. |
| **TC-N3b** | Partial importability (UI) | One sample is not importable. | Open the QC modal. | A removable error card is shown and import is blocked. |
| **TC-N3** | EcoTaxa empty-state rendering | `getImportableEcoTaxaSamples` returns an empty array `[]`. | Navigate to the "New EcoTaxa samples" section of the Import tab. | • The DataGrid is not rendered.<br>• Instead, the fallback div shows "0 samples found." with a dashed border. |
| **TC-N6** | Imports selected raw samples & clears state on success (hook) | Hook APIs mocked; the project is loaded; `getImportableRawSamples` contains at least `raw-1`. | Init the hook, `setSelectedRawSamples` to include `raw-1`, `handlePreImportRawSamples(false)` (opens the QC modal), then `confirmAndExecuteRawImport()`. | • `importRawSamples(77, { samples: ['raw-1'], validated_samples: [], backup_project: false, backup_project_skip_already_imported: true })` is called.<br>• `selectedRawSamples.ids` resets to 0.<br>• `isImporting` returns to false. |
| **TC-N7** | Maps EcoTaxa `sample_id` to `sample_name` & clears importing on error (hook) | `getImportableEcoTaxaSamples` returns samples with `sample_id` and `sample_name`; `importEcoTaxaSamples` is mocked to reject. | Init the hook, `setSelectedEcoTaxaSamples` to include ID 2, then call `handleImportEcoTaxaSamples(false)`. | • `importEcoTaxaSamples` is called with the mapped names (e.g. `samples: ['eco-2']`).<br>• After the failure `isImporting` is false, the selection stays (`ids size = 1`) and the snackbar is open with `severity: 'error'`. |
| **TC-N8** | Empty raw import guarded (hook) | `getImportableRawSamples` returns `[]`. | Init the hook and call `handlePreImportRawSamples(false)`. | • The QC modal is not opened (`isQcModalOpen = false`).<br>• A warning snackbar is shown (`severity = 'warning'`).<br>• The selection is unchanged. |
| **TC-N9** | Imports EcoTaxa samples in exclude mode (hook) | `getImportableEcoTaxaSamples` returns ≥ 2 samples (eco-1, eco-2); `importEcoTaxaSamples` succeeds. | Mount `useProjectImportTab(77)`, set `selectedEcoTaxaSamples` with `type: "exclude"` and `ids: {2}`, then call `handleImportEcoTaxaSamples(false)`. | • `importEcoTaxaSamples` is called with `samples: ["eco-1"]`.<br>• Default backup options are respected.<br>• The EcoTaxa selection resets and a success snackbar is shown. |
| **TC-N10** | Imports all raw samples with backup options (hook) | `getImportableRawSamples` returns raw-1 and raw-2; `importRawSamples` succeeds. | Mount `useProjectImportTab(77)`, enable `enableAutoBackup`, set `skipAlreadyImported=false`, run `handlePreImportRawSamples(true)`, confirm via `confirmAndExecuteRawImport()`, then `closeSnackbar()`. | • `importRawSamples` is called with `samples: ["raw-1","raw-2"]`, `validated_samples: []`, `backup_project: true`, `backup_project_skip_already_imported: false`.<br>• The snackbar shows, then closes correctly after `closeSnackbar()`. |
| **TC-N11** | Fallback root path when project loading fails (hook) | `getProjectById` is mocked to reject. | Mount `useProjectImportTab(77)` and wait for init to settle. | • `rootFolderPath` becomes "Error loading data".<br>• `loadingRaw`, `loadingEcoTaxa` and `hasEcoTaxaProject` all reset to false. |
| **TC-N12** | Empty EcoTaxa "import all" guarded (hook) | The EcoTaxa importable list is empty. | Import all EcoTaxa samples. | • A warning is shown.<br>• The API call is skipped. |
| **TC-N13** | Imports selected CTD samples (hook) | CTD samples are importable; import succeeds. | Select a CTD sample and import. | • The selected CTD samples are imported.<br>• The selection clears on success. |
| ♿ **TC-N4** | Keyboard navigation (DataGrid) | The user is navigating by keyboard on the Import tab. | Use Tab to enter the "New UVP samples" table, then arrow keys to move between cells. | • Focus moves logically cell to cell.<br>• Non-interactive cells do not trap focus.<br>• A row can be checked/unchecked with Space. |
| ♿ **TC-N5** | Screen-reader announcement for empty states | A screen reader (NVDA/VoiceOver) is active; the EcoTaxa section has no data. | Navigate to the "New EcoTaxa samples" area. | The screen reader reads "0 samples found." and does not try to read a non-existent table structure. |

### O. Backup Tab (`ProjectBackupTab` & `useProjectBackupTab`)

*`features/projects/components/ProjectBackupTab.test.tsx` · `features/projects/hooks/useProjectBackupTab.test.tsx`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-O1** | Dynamic last-backup date formatter | `getLastBackupDate` returns a valid date matching "30 days ago". | Open the Backup tab. | • "Backup of the raw project" shows "Last backup done on [formatted date] at [formatted time]".<br>• If the date is null, the default text "The project has never been backed up." is shown. |
| **TC-O2** | Export task launch & UI feedback | The project is loaded; the *Export to FTP* switch is on. | Click **START** in the Export section. | • The button switches to "STARTING…" and disables.<br>• `exportProjectBackup` is called.<br>• On return, a success snackbar shows the task number (e.g. "Export task #22 started successfully!").<br>• The button returns to **START**. |
| **TC-O3** | Backup task retry logic | The user clicks **START** in Backup; the backend is very slow to update the date. | Follow the console logs during `handleStartBackup`. | • The system checks the date 3 times with growing delays (2s, 5s, 10s).<br>• If still not updated, a visual fallback uses `setLastBackupDate(currentDate)` and an info notice tells the user "Date updated to current time (may differ if task is still processing)". |
| **TC-O6** | Initializes with project path & last backup date (hook) | `getProjectById` and `getLastBackupDate` mocked; `getLastBackupDate` returns an ISO date. | Mount `useProjectBackupTab(projectId)` and wait for init. | • `backupFolderPath` holds the project path.<br>• `lastBackupDate` holds the value returned by the API. |
| **TC-O7** | `handleStartExport` calls API & clears `isExporting` (hook) | The project is loaded; `exportProjectBackup` mocked and resolved. | Call `handleStartExport()` from the hook. | • `exportProjectBackup(77, …)` is called.<br>• `isExporting` returns to false after resolution. |
| **TC-O8** | `handleStartBackup` updates `lastBackupDate` after retries (hook) | `getLastBackupDate` is initially null then becomes a date after a few attempts; `runProjectBackup` mocked (fake timers). | Call `handleStartBackup()`. | • `runProjectBackup` is called.<br>• The hook re-checks `getLastBackupDate` several times and finally updates `lastBackupDate`.<br>• `isBackingUp` is false at the end. |
| ♿ **TC-O4** | Switch toggles (a11y) | The user navigates the Backup tab by keyboard. | Tab to the "Export also on FTP" and "Skip already imported" switches, then press Space. | • The switch state toggles correctly.<br>• The screen reader explicitly reads the "Checked"/"Not checked" state, correctly associating the `<label>` with the `<input type="checkbox">`. |
| ♿ **TC-O5** | Disabled read-only field contrast | The user views the "Backup of the raw project" section. | Inspect the disabled "Backup from root folder path" TextField. | Although disabled, the text stays legible thanks to the CSS override (`WebkitTextFillColor: 'rgba(0,0,0,0.6) !important'`), meeting the minimum WCAG AA contrast to prevent grey data from becoming invisible. |

### P. Data Tab (`ProjectDataTab` & `useProjectDataTab`)

*`features/projects/components/ProjectDataTab.test.tsx` · `features/projects/hooks/useProjectDataTab.test.tsx`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-P1** | Server-side pagination (UVP samples) | The API returns a total of 45 rows for UVP samples (`totalUvpRows = 45`). | Click the "Next page" button in the UVP DataGrid footer. | • `uvpPaginationModel` moves to page 1 (index 1).<br>• A new `searchProjectSamples` call fires with `{ page: 2, limit: 10 }`.<br>• A loading spinner appears briefly, then the new data displays. |
| **TC-P2** | Delete UVP samples flow | The user has selected 2 UVP samples in the table. | Click **DELETE** in the UVP action bar, then confirm the `window.confirm` dialog. | • `deleteProjectSample` is called for each ID via `Promise.all`.<br>• On success, `selectedUvpSamples` resets, `fetchUvpSamples` re-fires to refresh the table, and a success snackbar is shown. |
| **TC-P3** | QC status icons mapping | The returned sample row has `visual_qc_status_label: "VALIDATED"` or `"TO_BE_CHECKED"`. | Inspect the "QC state" column. | • The success icon shows for "VALIDATED" (`<CheckCircleIcon color="success"/>`).<br>• The warning icon shows for any other value (`<WarningAmberIcon color="warning"/>`). |
| **TC-P3b** | EcoTaxa fetch error state | The EcoTaxa fetch fails. | Load the Data tab. | An error state is shown (not "No rows"). |
| **TC-P7** | Deep-link EcoTaxa row click when project is linked | `getProjectById` returns a linked project (`ecotaxa_project_id: 20092`, `ecotaxa_instance_id: 1`); `getEcoTaxaInstances` returns the URL `https://ecotaxa.example.fr`; `searchProjectEcoTaxaSamples` returns sample ETX-1 (`ecotaxa_sample_id: 5001`). | Render the component, wait for instance resolution, and click the ETX-1 sample cell. | `window.open` is called with `('https://ecotaxa.example.fr/prj/20092?samples=5001', '_blank', 'noopener,noreferrer')`. |
| **TC-P8** | EcoTaxa row click is inert when project is not linked | The returned project has its EcoTaxa identifiers set to null. | Render the component, wait for the ETX-1 row and click it. | The action stays inert and `window.open` is never called. |
| **TC-P9** | Fetches UVP samples & exposes pagination info (hook) | `searchProjectSamples` and `searchProjectEcoTaxaSamples` are mocked to return data and `search_info` (total/page/limit). | Mount `useProjectDataTab(projectId)` and wait for the initial load. | • `uvpSamples` is filled.<br>• `totalUvpRows` reflects `search_info.total`.<br>• The exposed pagination is correctly initialized. |
| **TC-P10** | Selected UVP samples deletion & refetch (hook) | `searchProjectSamples` returns rows then `[]`; `deleteProjectSample` resolves; `window.confirm` returns true. | Select IDs `{1,2}` and call `handleDeleteUvpSamples()`. | • `deleteProjectSample` is called twice, with `(77,1)` and `(77,2)`.<br>• `uvpSelectionCount` returns to 0. |
| **TC-P11** | Exclude-selection mode counting (hook) | `searchProjectSamples` returns a global total of 2 samples. | Set the selection with `{ type: 'exclude', ids: ∅ }`. | `uvpSelectionCount === 2` (all rows of the project). |
| **TC-P12** | Selected CTD samples deletion & refetch (hook) | `searchProjectCtdSamples` returns a sample then `[]`; `deleteProjectCtdSamples` resolves. | Select sample `ctd-1` and call `handleDeleteCtdSamples()`. | • The API is called with `deleteProjectCtdSamples(77, ['ctd-1'])`.<br>• `ctdSelectionCount` resets. |
| **TC-P13** | EcoTaxa deletion message & refetch (hook) | `searchProjectEcoTaxaSamples` returns a sample then `[]`; `deleteProjectEcoTaxaSamples` resolves; `window.confirm` active. | Select sample `etx-1` and call `handleDeleteEcoTaxaSamples()`. | • The confirm box mentions "delete 1 samples" and "from EcoTaxa".<br>• The API is called with `(77, ['etx-1'])`.<br>• The snackbar shows success and the selection clears. |
| **TC-P14** | `buildEcoTaxaSampleUrl` returns null when unlinked (hook) | `getProjectById` returns an unlinked project (`ecotaxa_instance_id: null`). | Mount the hook and call `buildEcoTaxaSampleUrl(sample)`. | The method returns `null` and the call to `getEcoTaxaInstances` is short-circuited. |
| **TC-P15** | `buildEcoTaxaSampleUrl` constructs the URL when linked (hook) | `getProjectById` resolves with a linked project (20092/1); `getEcoTaxaInstances` returns `https://ecotaxa.example.fr/`. | Mount the hook, wait for resolution and run `buildEcoTaxaSampleUrl({ ecotaxa_sample_id: 42 })`. | The method deterministically returns `https://ecotaxa.example.fr/prj/20092?samples=42` (trailing slash cleaned). |
| **TC-P16** | Instance-resolution failure is non-blocking (hook) | `getProjectById` rejects with `Error('boom')`; the UVP/CTD data is valid. | Mount the hook and wait for the initial load. | • The hook loads the UVP/CTD lists normally (`uvpSamples.length === 1`) without crashing.<br>• `buildEcoTaxaSampleUrl` transparently returns `null`. |
| ♿ **TC-P4** | Tooltips a11y on icons | The user uses a screen reader. | Navigate the "QC state" column icons or the Actions column (`<OpenInNewIcon/>`). | Thanks to `<Tooltip title="…">`, an `aria-label` is generated on the element; the reader reads the description (e.g. "Data valid"/"Data invalid") instead of ignoring the SVG or reading raw code. |
| ♿ **TC-P5** | Action-bar focus management | Elements are selected in the tables (e.g. EcoTaxa). | Use Tab to reach the "OPEN IN ECOTAXA" and "DELETE" buttons. | • The buttons are correctly highlighted on keyboard focus (visible outline).<br>• Disabled buttons (when `ecoTaxaSelectionCount === 0`) are correctly skipped — the expected native a11y behaviour. |
| ♿ **TC-P6** | Select-all activates UVP actions | The UVP grid is loaded. | Select all rows. | The UVP action buttons become enabled. |

### Q. Tasks Page (`TasksPage` — `/tasks`)

*`features/projects/pages/TasksPage.test.tsx` · `test/accessibility/TasksPage.a11y.test.tsx`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-Q1** | Initial render & data loading | User authenticated; `POST /tasks/searches` returns 2 tasks + `search_info.total`. | Render `<TasksPage />` at `/tasks`. | • The "Tasks" and "Your tasks" headings render.<br>• Both task rows appear in the grid.<br>• The search request was issued. |
| **TC-Q2** | Empty state | `POST /tasks/searches` returns `{ tasks: [], search_info: { total: 0 } }`. | Render the page. | • The grid shows the "No rows" overlay.<br>• No row is rendered and the page does not crash. |
| **TC-Q3** | Server-side pagination | `search_info.total = 45`, page size 10. | Click the DataGrid "Next page" button. | • A new `POST /tasks/searches` fires with `page=2` (1-indexed) and `limit=10`.<br>• New page data renders. |
| **TC-Q4** | Search by status (debounced) | Page loaded, attribute = "Status". | Type "error" into Search and wait past the 500 ms debounce. | • The request body contains `{ field: "task_status", operator: "LIKE", value: "%error%" }`.<br>• Pagination resets to page 1. |
| **TC-Q5** | Search by Task id (exact / numeric guard) | Page loaded. | Switch attribute to "Task id", type "42". | • The request contains `{ field: "task_id", operator: "=", value: 42 }`.<br>• Non-numeric input prevents the `task_id` filter from being sent. |
| **TC-Q6** | Status icons mapping | Rows with statuses DONE, ERROR, RUNNING. | Inspect the Status column. | • DONE → success Check icon.<br>• ERROR → error PriorityHigh icon.<br>• Any other → warning MoreHoriz icon.<br>• The status label text is shown uppercased. |
| **TC-Q7** | Owner formatting | One row's `task_owner` is an object `{first_name, last_name, email}`, one is null. | Inspect the Owner column. | • Object → "First Last (email)".<br>• null → "System". |
| **TC-Q8** | Row action navigation | Row with `task_project_id = 7`, `task_id = 3`, plus a row with `task_project_id = null`. | Click a task row. | • Navigates to `/projects/7/tasks/3`.<br>• The action is disabled for the null-project row. |
| **TC-Q9** | Delete flow (confirm) | 2 tasks loaded; `DELETE /tasks/:id/` mocked OK; `window.confirm` stubbed to true. | Select 2 rows via checkboxes, click **DELETE**, and confirm. | • DELETE is called once per ID.<br>• A success snackbar "Selected tasks removed successfully." is shown.<br>• The selection is cleared and the list is refetched. |
| **TC-Q10** | API error handling | `POST /tasks/searches` returns 500. | Render the page and wait for load. | • An error Alert "Failed to load tasks…" is shown.<br>• The grid is empty and the page does not crash. |
| **TC-Q11** | No OpenInNew nav button | Rows are loaded. | Inspect the action cell. | The action cell no longer renders an OpenInNew navigation button. |
| ♿ **TC-Q12** | Action bar focus / disabled buttons | No selection (DELETE & STOP actions disabled). | Tab toward the action bar. | • Disabled buttons are skipped by keyboard focus (native a11y).<br>• Once a row is selected, DELETE becomes focusable and enabled. |
| ♿ **TC-Q13** | Keyboard navigation (filters & DataGrid) | Page loaded with rows. | Tab through Search field → Attribute select → into the grid; toggle a row checkbox with Space. | • Focus moves logically through the controls.<br>• Row selection toggles on Space and the selection count updates. |

### R. `useTasksTable` Hook (unit)

*`features/projects/hooks/useTasksTable.test.ts`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-R1** | Initial fetch & pagination info | `searchProjectTasks` mocked to return tasks + `search_info`. | Mount the hook and wait for `loading=false`. | • `tasks` filled and `totalRows = search_info.total`.<br>• `searchProjectTasks` is called without a `projectId` and with `sort_by: "desc(task_id)"`. |
| **TC-R2** | Default state | Hook mounted. | Inspect the defaults. | • `searchAttribute === "task_status"`.<br>• `selectedTasks` is an empty include model.<br>• `paginationModel = {page:0, pageSize:10}`. |
| **TC-R3** | Debounced status search resets page | Hook mounted. | Call `setSearchText("done")` and advance the 500 ms debounce. | • Page resets to 0.<br>• The next API call carries `{field:"task_status", operator:"LIKE", value:"%done%"}`. |
| **TC-R4** | `task_id` exact match & numeric guard | Hook mounted. | Call `setSearchAttribute("task_id")`, then `setSearchText("42")` and later `"abc"`. | • "42" → `{field:"task_id", operator:"=", value:42}`.<br>• "abc" → no `task_id` filter is included in the request. |
| **TC-R5** | Pagination 1-indexed to backend | Hook mounted. | Call `setPaginationModel({page:2, pageSize:5})`. | `searchProjectTasks` is called with `page:3` and `limit:5`. |
| **TC-R6** | Delete success (batch + cleanup) | `window.confirm` → true; `deleteProjectTask` mocked OK. | Set `selectedTasks` with IDs `{1,2}` and `await handleDeleteTasks()`. | • `deleteProjectTask(1)` and `(2)` are called.<br>• A success snackbar is triggered.<br>• Selection resets to size 0, `searchProjectTasks` is re-called, and `isActionRunning` resets to false. |
| **TC-R7** | Delete cancelled | `window.confirm` → false; selection non-empty. | Call `await handleDeleteTasks()`. | • `deleteProjectTask` is never called.<br>• The selection is preserved. |
| **TC-R8** | Delete error handling | `window.confirm` → true; `deleteProjectTask` rejects. | Call `await handleDeleteTasks()`. | • An error snackbar "Failed to clean up some server tasks." is shown.<br>• `isActionRunning` becomes false and the selection is preserved for retry. |
| **TC-R9** | Fetch error handling | `searchProjectTasks` rejects. | Mount the hook. | • The `error` state is set to the error message.<br>• `tasks = []`, `totalRows = 0`, and `loading = false`. |
| **TC-R10** | External refresh event | After the initial load. | Trigger `window.dispatchEvent(new Event("ecopart:tasks:refresh"))`. | `searchProjectTasks` is called again (the listener is correctly wired/unwired on mount/unmount). |

### S. Task Details Page (`TaskDetailsPage` — `/projects/:id/tasks/:taskId`)

*`features/projects/pages/TaskDetailsPage.test.tsx` · `test/accessibility/TaskDetailsPage.a11y.test.tsx`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-S1** | Malformed route handling | None. | Navigate to `/projects/abc/tasks/xyz` (non-numeric identifiers). | • The "Malformed route identifiers." alert is displayed.<br>• `getOneTask` is never called. |
| **TC-S2** | Initial render (General tab) | `getOneTask` returns a valid task (ID 42, type IMPORT, status DONE, project 77). | Render the page at `/projects/77/tasks/42`. | • The "IMPORT task [42]" header shows.<br>• The GENERAL tab is selected (`aria-selected=true`).<br>• Read-only fields are pre-filled (ID 42, Status DONE, Type IMPORT, Project ID 77). |
| **TC-S3** | Tab switch loads log | `getTaskLog` returns "streaming log output". | Click the "LOG FILE" tab. | • `getTaskLog(42)` is called (it was not on the initial load).<br>• The log text is displayed in the console. |
| **TC-S4** | Empty-log fallback | `getTaskLog` returns an empty string `""`. | Click the "LOG FILE" tab. | The fallback message "No log messages captured yet by the kernel stream handler." is displayed. |
| **TC-S5** | Delete success + navigation | `window.confirm` → true; `deleteProjectTask` succeeds. | Click the **DELETE** button. | • `deleteProjectTask(42)` is called.<br>• The app navigates to `/projects/77/tasks` (the list page renders). |
| **TC-S6** | Delete error keeps user on page | `window.confirm` → true; `deleteProjectTask` rejects. | Click **DELETE**. | • No navigation.<br>• The "IMPORT task [42]" header stays displayed.<br>• The DELETE button becomes active again (retry possible). |
| **TC-S7** | Initial load error | `getOneTask` rejects on the first load. | Render the page. | The "Failed to synchronize task metrics from server." alert is displayed (the task staying null). |
| **TC-S8** | Adaptive polling while RUNNING | `getOneTask` returns a task with status RUNNING (fake timers). | Mount the page, let the initial load settle, advance time by 2500 ms. | `getOneTask` is re-called (goes from 1 to 2 calls) — polling runs while the task is in progress. |
| **TC-S8b** | No polling once DONE | `getOneTask` returns a task with status DONE (fake timers). | Mount the page, advance time by 8000 ms. | `getOneTask` stays at 1 call — no "non-active" task is re-polled. |
| ♿ **TC-S9** | Tabs keyboard navigation | The page is loaded with a task. | Verify `role="tablist"`, focus the GENERAL tab, press ArrowRight then Enter. | • ArrowRight moves focus to the LOG FILE tab (roving tabindex).<br>• Enter activates it (`aria-selected=true`) — manual activation per MUI Tabs. |

### T. Project Tasks Tab (`ProjectTasksTab` — project tab)

*`features/projects/components/ProjectTasksTab.test.tsx` · `test/accessibility/ProjectTasksTab.a11y.test.tsx`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-T1** | Project-scoped fetch | `searchProjectTasks` mocked to return 2 tasks. | Render `<ProjectTasksTab projectId={77} />`. | • `searchProjectTasks` is called with `{ projectId: 77, sort_by: "desc(task_id)" }`.<br>• The rows display. |
| **TC-T2** | Search attribute options | The tab is loaded. | Open the "Attribute" select. | The options are Label / Owner / Status / Task id. |
| **TC-T2b** | Task id exact match & guard | Attribute = Task id. | Type a numeric then a non-numeric value. | • Numeric → `task_id = N`.<br>• Non-numeric input sends no `task_id` filter. |
| **TC-T3** | Search builds LIKE filter | Attribute = Label (`task_type`). | Type "backup" in the Search field (wait the 500 ms debounce). | The call carries the filter `{ field: "task_type", operator: "LIKE", value: "%backup%" }`. |
| **TC-T4** | Row action navigation | A row with `task_id = 3`. | Click the row (`findByText('3')`). | Navigation to `/projects/77/tasks/3` (the detail route renders). |
| **TC-T5** | Delete flow | 2 tasks; `window.confirm` → true; `deleteProjectTask` succeeds. | Check 2 rows, click **DELETE**. | • `deleteProjectTask` is called for each ID.<br>• A snackbar "Selected tasks removed successfully." shows.<br>• The selection resets to "0 items selected". |
| **TC-T6** | Status icons mapping | Rows with statuses DONE / ERROR / RUNNING. | Inspect the Status column. | • DONE → CheckIcon.<br>• ERROR → PriorityHighIcon.<br>• RUNNING → MoreHorizIcon. |
| **TC-T7** | No OpenInNew nav button | The tab is loaded. | Inspect the action cell. | The action cell no longer renders an OpenInNew navigation button. |
| ♿ **TC-T8** | Action buttons disabled until selection | The tab is loaded, no selection. | Check DELETE/STOP/RESTART, then select a row via keyboard. | The buttons stay disabled until a row is selected, then become focusable. |

### U. `useProjectTasksTab` Hook (unit)

*`features/projects/hooks/useProjectTasksTab.test.ts`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-U1** | Initial fetch with `projectId` | `searchProjectTasks` mocked to return 2 tasks + `search_info`. | Mount `useProjectTasksTab(77)` and wait for `loading=false`. | • `tasks` has length 2; `totalRows = 2`.<br>• The call args match `{ projectId: 77, sort_by: 'desc(task_id)', page: 1, limit: 10, filters: [] }`. |
| **TC-U2** | Default state | Hook mounted. | Inspect the defaults. | • `searchAttribute === "task_type"`.<br>• `selectedTasks = { type: 'include', ids: ∅ }`, `selectionCount = 0`.<br>• `paginationModel = { page: 0, pageSize: 10 }`. |
| **TC-U3** | Debounced LIKE filter on the selected attribute | Hook mounted. | Call `setSearchText("IMPORT")` and advance the debounce. | • The last call's filters equal `[{ field: 'task_type', operator: 'LIKE', value: '%IMPORT%' }]`.<br>• `paginationModel.page` stays 0. |
| **TC-U3b** | `task_id` exact match & numeric guard | Hook mounted. | Call `setSearchAttribute("task_id")` + `setSearchText("42")`, then `"abc"`. | • "42" → `[{ field: 'task_id', operator: '=', value: 42 }]`.<br>• "abc" → filters `[]` (no `task_id` filter). |
| **TC-U4** | Pagination 1-indexed to backend | Hook mounted. | Call `setPaginationModel({ page: 2, pageSize: 5 })`. | The last call matches `{ page: 3, limit: 5, projectId: 77 }`. |
| **TC-U5** | Delete success (batch + cleanup) | `window.confirm` → true; `deleteProjectTask` resolves. | Set selection `{1,2}` and `await handleDeleteTasks()`. | • `deleteProjectTask(1)` and `(2)` are called.<br>• Selection resets to size 0; snackbar is success "Selected tasks removed successfully."; `isActionRunning` false.<br>• `searchProjectTasks` is re-called. |
| **TC-U6** | Delete cancelled | `window.confirm` → false; selection = `{1,2}`. | Call `await handleDeleteTasks()`. | • `deleteProjectTask` is never called.<br>• `selectionCount` stays 2. |
| **TC-U7** | Delete error handling | `window.confirm` → true; the first delete (task 1) rejects, task 2 succeeds. | Set selection `{1,2}` and `await handleDeleteTasks()`. | • Both deletions are attempted (a single failure does not abort the batch).<br>• Snackbar is error "Failed to clean up some server tasks."; `isActionRunning` false.<br>• Only the failed task (1) stays selected (`selectionCount = 1`).<br>• The grid is refreshed. |
| **TC-U8** | Fetch error handling | `searchProjectTasks` rejects. | Mount the hook and wait for `loading=false`. | • `tasks = []`.<br>• `totalRows = 0`. *(This hook exposes no `error` field.)* |
| **TC-U9** | External refresh event | After the initial load. | `window.dispatchEvent(new Event("ecopart:tasks:refresh"))`. | `searchProjectTasks` is called again (listener wired/unwired on mount/unmount). |

### V. Task API Helpers (unit)

*`features/projects/api/projects.api.test.ts` — MSW intercepts `POST /tasks/searches`.*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-V1** | `projectId` injection | MSW captures the search body and URL. | Call `searchProjectTasks({ projectId: 77, page: 2, limit: 25, sort_by: 'desc(task_id)', filters: [userFilter] })`. | • The body equals `[{ field: 'task_project_id', operator: '=', value: 77 }, userFilter]`.<br>• The query carries `page=2`, `limit=25`, `sort_by=desc(task_id)`. |
| **TC-V2** | No project filter when `projectId` omitted | MSW captures the search body. | Call `searchProjectTasks({ page: 1, limit: 10, filters: [userFilter] })`. | The body equals `[userFilter]` only. |
| **TC-V3** | Delete + log endpoints | MSW mocks the delete and log endpoints. | Call `deleteProjectTask(42)` and `getTaskLog(42)`. | • `deleteProjectTask` hits `DELETE /tasks/42/` and resolves `{ message: 'removed' }`.<br>• `getTaskLog(42)` returns the raw text `"line 1\nimport done successfully"`. |

### W. Projects API Helpers (unit)

*`features/projects/api/projects.api.test.ts` — MSW backs every request.*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-W1** | Backup / export bodies | MSW captures the export & backup POST bodies. | Call `exportProjectBackup(77, { ftp_export: true })` and `runProjectBackup(77, { skip_already_imported: false })`. | • The POST hits `/projects/77/backup/export` with body `{ ftp_export: true }`.<br>• The POST hits `/projects/77/backup` with body `{ skip_already_imported: false }`. |
| **TC-W2** | Import folders & metadata | MSW captures the `folder_path` query param. | Call `getImportFolders()`, then `getImportFolders('  /srv/a b  ')`, then `getImportFolderMetadata('/srv/x')`. | • No arg → no `folder_path` query.<br>• A padded arg is trimmed + url-decoded to `/srv/a b`.<br>• The metadata returns `{ instrument_model: 'UVP5HD', serial_number: 'sn1' }`. |
| **TC-W3** | Last backup date | MSW returns a date, then null. | Call `getLastBackupDate(77)` twice. | Returns `{ last_backup_date: '2026-01-01T…' }`, then passes `{ last_backup_date: null }` through. |
| **TC-W4** | Raw samples (GET / POST) | MSW captures the import path & body. | Call `getImportableRawSamples(77)` then `importRawSamples(77, { samples: ['raw-1'], backup_project: true, backup_project_skip_already_imported: false })`. | • The GET resolves `[{ sample_name: 'raw-1' }]`.<br>• The POST hits `/projects/77/samples/import` with the exact body. |
| **TC-W5** | EcoTaxa samples | MSW captures the import body. | Call `getImportableEcoTaxaSamples(77)` then `importEcoTaxaSamples(77, { samples: ['eco-1'], ecotaxa_user: 'bob' })`. | • The GET resolves 1 sample.<br>• The import forwards the body `{ samples: ['eco-1'], ecotaxa_user: 'bob' }`. |
| **TC-W6** | Sample search & delete + EcoTaxa normalization | MSW returns object then bare-array EcoTaxa shapes. | Call `searchProjectSamples` with page/limit/sort/filter, `searchProjectEcoTaxaSamples` (both shapes), then `deleteProjectSample(77, 9)` and `deleteProjectEcoTaxaSamples(77, ['a','b'])`. | • The search hits `/projects/77/samples/searches` with the right query and filter body.<br>• An object EcoTaxa list passes through; a bare array is normalized to `{ total: 2, page: 1, limit: 2 }`.<br>• The delete hits `/projects/77/samples/9`; the EcoTaxa delete sends `{ samples: ['a','b'] }`. |
| **TC-W7** | CTD search / import / delete + normalization | MSW returns object, array, string-array, and empty CTD shapes. | Call `searchProjectCtdSamples` (both shapes), `getImportableCtdSamples` (string array, object, empty), then `importProjectCtdSamples` and `deleteProjectCtdSamples`. | • Object shape passes through; a bare array normalizes to `{ total: 2, page: 1, limit: 2 }`.<br>• A string array becomes objects with `file_extension: 'ctd'`; an object shape passes through; empty → `[]`.<br>• Import sends `{ samples: ['ctd-1'] }`; delete sends `{ samples: ['c1'] }`. |
| **TC-W8** | Project search & fetch + error mapping | MSW returns a `results + total` shape, then empty, then a 400. | Call `searchProjects`, `getProjectById(77)` (found), `getProjectById(77)` (empty), `searchProjects` (400). | • `searchProjects` normalizes to `projects` + `search_info.total`.<br>• `getProjectById` finds project 77.<br>• On empty it throws "Project with ID 77 not found.".<br>• A 400 with a message is mapped to `Error('Bad thing')`. |
| **TC-W9** | Update project | MSW captures the PATCH. | Call `updateProject(77, { project_title: 'Updated' })`. | • The method is PATCH, path `/projects/77`, body `{ project_title: 'Updated' }`.<br>• The updated project is returned. |
| **TC-W10** | Get one task | MSW mocks `GET /tasks/:id/`. | Call `getOneTask(5)`. | • It GETs `/tasks/5/`.<br>• It returns `{ task_id: 5, task_status: 'DONE', … }`. |

### X. Validate Email Page (`ValidateEmailPage`)

*`features/auth/pages/ValidateEmailPage.test.tsx`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-X1** | Validate & redirect | `GET /users/:id/welcome/:token` returns `{ ok: true }`. | Render at `/validate/1/tok`. | The token is validated and the user is redirected to the Login page. |
| **TC-X2** | Error layout + register again | The welcome endpoint returns a 400 `{ message: 'invalid token' }`. | Render at `/validate/1/badtok`, then click **Register again**. | • The error layout shows a **Register again** button.<br>• Clicking it navigates to the Register page. |
| **TC-X3** | Missing params (no API call) | The route has no `:id`/`:token` params. | Render at `/validate`. | • The error state (**Register again**) shows.<br>• The welcome API is never called. |

### Y. Register API (unit)

*`features/auth/api/register.api.test.ts`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-Y1** | `registerUser` success | `POST /users` returns 201 `{ user_id: 1 }`. | Call `registerUser(payload)`. | • It resolves to `{ user_id: 1 }`.<br>• The request hits `/users`. |
| **TC-Y1b** | Empty success body | `POST /users` returns 201 with an empty (non-JSON) body. | Call `registerUser(payload)`. | It resolves to `null`. |
| **TC-Y2** | Error mapping + fallback | `POST /users` returns a 400 `{ errors: [{ msg: 'Email taken' }] }`, then a bodiless 500. | Call `registerUser(payload)` for each case. | • The 400 rejects with "Email taken".<br>• The bodiless 500 rejects with "Registration failed (HTTP 500)". |
| **TC-Y3** | `validateEmail` success + error mapping | `GET /users/:id/welcome/:token` returns success, empty body, bodiless 404, then a 400 with a message. | Call `validateEmail('1', 'tok')` for each case. | • Success resolves `{ ok: true }` and hits `/users/1/welcome/tok`.<br>• An empty body resolves to `null`.<br>• A bodiless 404 rejects with "Email validation failed (HTTP 404)".<br>• A 400 rejects with the backend message "bad". |

### Z. Top Bar (`TopBar`)

*`shared/components/TopBar.test.tsx`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-Z1** | Authenticated nav + user menu | The user is logged in (`loginAsUser`). | Render the TopBar and click the "John Doe" avatar. | • The "Projects" and "Tasks" nav links and the user name are shown.<br>• The menu opens with the **Settings**, **EcoTaxa account** and **Log out** items. |
| **TC-Z2** | Menu navigation | The user is logged in. | Open the avatar menu and click **Settings**. | The app navigates to `/settings` (the "Settings Page" heading renders). |
| **TC-Z3** | Logout clears the store & returns home | The user is logged in; `POST /auth/logout` is mocked. | Open the menu and click **Log out**. | • The app navigates to the Home page.<br>• The logout endpoint was called.<br>• `useAuthStore.isAuthenticated` becomes `false`. |
| **TC-Z4** | Logged-out state shows auth buttons | The user is not authenticated. | Render the TopBar and click **Log in**. | • The "Projects" link is absent.<br>• **Log in** and **Register** buttons are shown.<br>• Clicking **Log in** navigates to the Login page. |

### AA. Auth Store (unit)

*`features/auth/store/auth.store.test.ts`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-AA1** | `setUser` / `clearUser` | The store is reset (`user: null`, unauthenticated, loading). | Call `setUser(user)`, then `clearUser()`. | • After `setUser`: `user` set, `isAuthenticated = true`, `isAuthLoading = false`.<br>• After `clearUser`: `user = null`, `isAuthenticated = false`, `isAuthLoading = false`. |
| **TC-AA2** | Loading toggles only `isAuthLoading` | The store is reset. | Call `finishAuthLoading()`, then `setLoading(true)`. | • `finishAuthLoading` sets `isAuthLoading = false` and leaves `isAuthenticated` untouched.<br>• `setLoading(true)` sets `isAuthLoading = true`. |

### AB. QC Charts (`QcProfileChart` & `QcSampleCard`)

*`features/projects/components/QcProfileChart.test.tsx` · `features/projects/components/QcSampleCard.test.tsx`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-AB1** | Always renders the title caption | Empty series. | Render `<QcProfileChart title="Vertical profile of the pressure" … />`. | The title caption is rendered. |
| **TC-AB2** | "No data" fallback | A single series with no points. | Render the chart. | • The "No data" text is shown.<br>• The ScatterChart `<svg>` is not mounted at all. |
| **TC-AB3** | Renders the chart (svg) | A series with points `[1, 2, 3]`. | Render the chart. | • "No data" is absent.<br>• An `<svg>` is present. |
| **TC-AB4** | Log scale drops an all-zero series | One positive series `[2,4,8]` and one all-zero series `[0,0,0]`, `xScale="log"`. | Render the chart. | • "No data" is absent and the `<svg>` renders.<br>• The all-zero series is dropped without crashing (regression guard for "Unexpected numItems value: 0"). |
| **TC-AB5** | Log falls back to linear when nothing is positive | A single all-zero series `[0,0]`, `xScale="log"`. | Render the chart. | • The component keeps a linear scale (plots the zeros).<br>• "No data" is absent and the `<svg>` renders. |
| **TC-AB6** | Sample header & every graph title | A sample built by `makeSample()`. | Render `<QcSampleCard>`. | The "Sample : omer2_5" header and every graph title (pressure, imaged volume, black, particle LPM) render. |
| **TC-AB7** | REMOVE FROM IMPORT calls `onRemove` | A sample card with an `onRemove` spy. | Click **REMOVE FROM IMPORT**. | `onRemove` is called once with the sample name `'omer2_5'`. |
| **TC-AB8** | `removeDisabled` disables the button | The card is rendered with `removeDisabled`. | Inspect the remove button. | The **REMOVE FROM IMPORT** button is disabled. |
| **TC-AB9** | Image-filtering metadata (rounded %) | `image_filtering` with `removed_images: { count: 3, percent: 12.6 }`. | Render the card. | The metadata shows First `10`, Last `99999`, Last used `11`, and Removed `3 / 13%` (12.6 → 13). |
| **TC-AB10** | "No dark frames" placeholder | `black_profile` is null. | Render the card. | The "No dark frames for this instrument" placeholder is shown. |
| **TC-AB11** | Black profile chart present | `black_profile` is a binned profile. | Render the card. | • The "No dark frames" placeholder is absent.<br>• The "Vertical profile of black" title renders. |
| ♿ **TC-AB12** | Readable label & empty state as text | Empty series, then a populated series. | Render, then rerender with points. | • The title caption is the readable description and "No data" is the accessible empty state.<br>• The description persists once the chart is populated. |
| ♿ **TC-AB13** | Metadata fields label-associated & read-only | A sample card is rendered. | Inspect First image / Last image / Last used / Removed images. | Each input is label-associated, not disabled, and carries a `readonly` attribute (legible + reachable). |
| ♿ **TC-AB14** | REMOVE FROM IMPORT keyboard-operable | A card with an `onRemove` spy. | Focus the remove button and press Enter. | • The button receives focus.<br>• `onRemove` is called with `'omer2_5'`. |

### AC. Core HTTP Utility (`http.ts`)

*`shared/api/http.test.ts`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-AC1** | Standard success | The target endpoint returns 200 `{ message: 'success data' }`. | Call `http(TEST_URL)`. | The parsed JSON is returned (`response.message === 'success data'`). |
| **TC-AC2** | Standard API error | The target returns 400 `{ message: 'Invalid data' }`. | Call `http(TEST_URL)`. | The promise rejects/throws for the component to catch. |
| **TC-AC2.1** | Error-array extraction | The target returns 500 with `{ errors: ['EcoTaxa project is already linked…'] }`. | Call `http(TEST_URL)`. | It rejects with the first backend error (matches `/already linked/i`). |
| **TC-AC3** | Refresh token loop (success) | The target returns 401 on the first attempt then 200; `POST /auth/refreshToken` succeeds. | Call `http(TEST_URL)`. | • The 401 is intercepted, the token is refreshed and the original request is retried.<br>• The final data is returned and the target was hit exactly twice. |
| **TC-AC4** | Refresh token loop (failure) | The target returns 401 and the refresh endpoint also returns 401. | Call `http(TEST_URL)`. | It rejects with a "Session expired" error (`/Session expired/i`). |
| **TC-AC5** | Single refresh for concurrent 401s | Two parallel calls both get 401; the refresh succeeds; the retry wave gets 200. | Call `http` twice via `Promise.all`. | • Both resolve to `{ message: 'ok' }`.<br>• The refresh runs exactly once (`refreshCount === 1`); the target is hit 4 times total. |
| **TC-AC6** | Retry error surfaced | The target returns 401 then 500 after a successful refresh. | Call `http(TEST_URL)`. | • It rejects with the retry error (`/Retry failed on backend/i`).<br>• The target is hit exactly twice. |

### AD. Routing & Guards

*`test/routing/ProtectedRoute.test.tsx` · `test/routing/PublicOnlyRoute.test.tsx`*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-AD1** | Block unauthenticated access | The user is not authenticated. | Render a `<ProtectedRoute>` at `/dashboard`. | • The protected content ("Protected Dashboard") is not rendered.<br>• The user is redirected to `/login` (the "Login Page" renders). |
| **TC-AD2** | Allow authenticated access | The user is authenticated (`loginAsUser`). | Render a `<ProtectedRoute>` at `/dashboard`. | The protected content ("Protected Dashboard") is rendered; no redirect. |
| **TC-AD3** | Public-only redirect | The user is authenticated. | Render `<PublicOnlyRoute>` at `/login`, then unmount and render it at `/register`. | • On `/login`: the Login page is not rendered; the app lands on the Dashboard.<br>• On `/register`: the Register page is not rendered; the app lands on the Dashboard. |

### AE. Admin — Tasks Tab (`AdminTasksTab`)

*`features/admin/components/AdminTasksTab.test.tsx` — reuses `useTasksTable`, hitting `POST /tasks/searches` + `DELETE /tasks/:id/`.*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-AE1** | Render & load | The tasks search returns 2 tasks (IMPORT, BACKUP). | Render the Admin Tasks tab. | • The "Tasks" and "Task list" headings render.<br>• The IMPORT and BACKUP rows appear.<br>• At least one search call was issued. |
| **TC-AE2** | Empty state | The search returns no tasks. | Render the tab. | The "No rows" overlay is shown. |
| **TC-AE3** | Pagination (1-indexed) | The search returns 1 row with `total = 45`. | Click **Go to next page**. | The latest search call carries `page=2` and `limit=10`. |
| **TC-AE4** | Status search (LIKE) | The tab is loaded. | Type "error" in the Search field. | The latest filters equal `[{ field: 'task_status', operator: 'LIKE', value: '%error%' }]`. |
| **TC-AE5** | Task id search (exact) | The tab is loaded. | Switch the Attribute to "Task id" and type "42". | The latest filters equal `[{ field: 'task_id', operator: '=', value: 42 }]`. |
| **TC-AE6** | Row click → `from=/admin/tasks` | Two tasks: id 3 (project 7) and id 4 (project null). | Click the orphan row (4), then the valid row (3). | • Clicking the orphan row does not navigate.<br>• Clicking task 3 navigates to the detail page and passes `state.from = '/admin/tasks'` (so "Back" returns here). |
| **TC-AE7** | Delete after confirmation | 2 tasks; `window.confirm` → true; delete mocked OK. | Select 2 rows, click **DELETE**. | • Both IDs are deleted (`[1, 2]`).<br>• The "Selected tasks removed successfully." snackbar shows.<br>• The selection returns to "0 items selected". |
| **TC-AE8** | Reserved bulk actions disabled | The tab is loaded. | Inspect the USERS and PROJECTS bulk-action buttons. | Both are disabled (reserved). |
| **TC-AE9** | Error alert | `POST /tasks/searches` returns 500. | Render the tab. | • "Failed to load tasks" is shown.<br>• No IMPORT row is rendered. |

### AF. Admin — Users Tab (`AdminUsersTab`)

*`features/admin/components/AdminUsersTab.test.tsx` — hits `POST /users/searches` (list) and `PATCH /users/:id/` (grant/revoke admin).*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-AF1** | Render & load | The users search returns John Doe and Jane Roe. | Render the Admin Users tab. | • The "Users" and "User list" headings render.<br>• "John Doe" and "jane@roe.com" appear.<br>• The default sort is `desc(user_id)`. |
| **TC-AF2** | Empty state | The search returns no users. | Render the tab. | The "No rows" overlay is shown. |
| **TC-AF3** | Country resolution | A user has country `FR`. | Render the tab. | The ISO code resolves to the display name "France". |
| **TC-AF4** | Administrate flag (Yes / No) | One admin user and one non-admin user. | Inspect the Administrate column. | It renders "Yes" for the admin and "No" for the non-admin. |
| **TC-AF5** | Account status icons | Three users: active, pending (invalid email), deactivated (deleted). | Inspect the status column. | The `CheckCircleIcon` (active), `MailOutlineIcon` (pending) and `ErrorIcon` (deactivated) are shown. |
| **TC-AF6** | Name search (LIKE, default attribute) | The default attribute is Name. | Type "doe" in the Search field. | The latest filters equal `[{ field: 'last_name', operator: 'LIKE', value: '%doe%' }]`. |
| **TC-AF7** | User id search (exact) | The tab is loaded. | Switch the Attribute to "User id" and type "42". | The latest filters equal `[{ field: 'user_id', operator: '=', value: 42 }]`. |
| **TC-AF8** | Pagination (1-indexed) | The search returns 1 row with `total = 45`. | Click **Go to next page**. | The latest search call carries `page=2` and `limit=10`. |
| **TC-AF9** | Grant admin after confirmation | 2 non-admin users; `window.confirm` → true; patch mocked OK. | Select 2 rows, click **ADD ADMIN**. | • Two PATCH calls fire, each with `is_admin: true`, for user IDs `[1, 2]`.<br>• The "Admin rights granted." snackbar shows.<br>• The selection returns to "0 items selected". |
| **TC-AF10** | Revoke admin after confirmation | One admin user (id 5); `window.confirm` → true; patch mocked OK. | Select the row, click **REMOVE ADMIN**. | • A single PATCH fires: `{ userId: 5, body: { is_admin: false } }`.<br>• The "Admin rights revoked." snackbar shows. |
| **TC-AF11** | Cancel action (no API call) | `window.confirm` → false. | Select a row and click **ADD ADMIN**. | No PATCH call is made. |
| **TC-AF12** | Disabled actions without selection | Nothing is selected. | Inspect **ADD ADMIN** and **REMOVE ADMIN**. | Both are disabled. |
| **TC-AF13** | Not-yet-wired actions disabled | The tab is loaded. | Inspect the reserved actions. | **NEW USER**, **REMOVE FROM ALL PROJECTS**, **ACTIVE**, **DEACTIVE**, **TASKS** and **PROJECTS** are all disabled. |
| **TC-AF14** | Prevents selecting a deleted account | One active user and one anonymized/deleted user. | Inspect the row checkboxes. | Exactly one checkbox is disabled (the deleted user cannot be selected). |
| **TC-AF15** | Search error alert | `POST /users/searches` returns 500. | Render the tab. | • "Failed to load users" is shown.<br>• "John Doe" is not rendered. |
| **TC-AF16** | Partial failure keeps failed users selected | 2 users; `window.confirm` → true; the PATCH for user 2 returns 500, user 1 succeeds. | Select both rows and click **ADD ADMIN**. | • The "Failed to update some users." snackbar shows.<br>• Only the failed user stays selected ("1 items selected"). |

### AG. Admin — Projects Tab (`AdminProjectsTab`)

*`features/admin/components/AdminProjectsTab.test.tsx` — hits `POST /projects/searches` (list), `POST /projects/:id/samples/searches` (per-row sample count) and `DELETE /projects/:id/` (bulk delete).*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-AG1** | Render & load (managers & members) | The projects search returns 2 projects with managers and members. | Render the Admin Projects tab. | • The "Projects" and "Project list" headings render.<br>• The project titles, managers ("Marc Picheral") and members ("Julie Coustenoble") appear.<br>• The default sort is `desc(project_id)` and the admin scope omits `for_managing` (empty filters). |
| **TC-AG2** | "Not linked" chip | A project has no EcoTaxa project (`ecotaxa_project_name: null`). | Render the tab. | The "Not linked" chip is shown. |
| **TC-AG3** | Empty state | The search returns no projects. | Render the tab. | The "No rows" overlay is shown. |
| **TC-AG4** | Title search (LIKE, default attribute) | The default attribute is Title. | Type "bats" in the Search field. | The latest filters equal `[{ field: 'project_title', operator: 'LIKE', value: '%bats%' }]`. |
| **TC-AG5** | Project id search (exact) | The tab is loaded. | Switch the Attribute to "Project id" and type "473". | The latest filters equal `[{ field: 'project_id', operator: '=', value: 473 }]`. |
| **TC-AG6** | Manager search (exact) | The tab is loaded. | Switch the Attribute to "Manager (user id)" and type "10". | The latest filters equal `[{ field: 'managers', operator: '=', value: 10 }]`. |
| **TC-AG7** | Non-numeric manager input (no filter) | The Manager attribute is selected. | Type "Marc" (non-numeric) in the Search field. | No manager filter is sent (an empty filter list), rather than a value the backend would reject. |
| **TC-AG8** | Delete after confirmation | 2 projects; `window.confirm` → true; delete mocked OK. | Select 2 rows, click **DELETE**. | • Both IDs are deleted (`[1, 2]`).<br>• The "Project(s) deleted." snackbar shows.<br>• The selection returns to "0 items selected". |
| **TC-AG9** | Cancel delete (no API call) | `window.confirm` → false. | Select a row and click **DELETE**. | No DELETE call is made. |
| **TC-AG10** | Disabled delete without selection | Nothing is selected. | Inspect the **DELETE** button. | It is disabled. |
| **TC-AG11** | Not-yet-wired actions disabled | The tab is loaded. | Inspect the reserved actions. | **REMOVE ALL MANAGER**, **REMOVE ALL MEMBERS**, **TASKS** and **USERS** are all disabled. |
| **TC-AG12** | Partial failure keeps failed projects selected | 2 projects; `window.confirm` → true; the DELETE for project 2 returns 500, project 1 succeeds. | Select both rows and click **DELETE**. | • The "Failed to delete some projects." snackbar shows.<br>• Only the failed project stays selected ("1 items selected"). |
| **TC-AG13** | Search error alert | `POST /projects/searches` returns 500. | Render the tab. | "Failed to load projects" is shown. |

### AH. Admin — Quick Access Tab (`AdminQuickAccessTab`)

*`features/admin/components/AdminQuickAccessTab.test.tsx` — derives four counters from the `search_info.total` of `POST /projects/searches`, `POST /users/searches` and two `POST /tasks/searches` (exports vs. all tasks, told apart by filters).*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-AH1** | Render the four counters | The four searches return totals 340 / 600 / 450 / 367. | Render the Admin Quick Access tab. | • The "Quick access" heading renders.<br>• The four counters (340, 600, 450, 367) and their labels (Projects, Users, Exports, Tasks) are shown. |
| **TC-AH2** | Exports filter & default period | The counters load with the default period. | Render the tab. | • The Exports counter sends an `IN` filter on the export task types (`['EXPORT', 'EXPORT_BACKUP', 'EXPORT_RAW']`).<br>• "All time" (the default) sends no creation-date filter on any counter. |
| **TC-AH3** | Period scopes every counter (LIKE) | The tab is loaded. | Pick "This year" in the Period selector. | • Each counter gains a `LIKE` date-prefix filter on its creation-date field (e.g. `"2026%"`).<br>• Exports keep the type `IN` filter **and** gain the date-prefix filter. |
| **TC-AH4** | Shortcuts & useful links | The counters load. | Inspect the shortcuts and links. | • The "See all projects/tasks as administrator" shortcuts render.<br>• The "Github repository" link points to `https://github.com/ecotaxa/ecopart_front`. |
| **TC-AH5** | Single failing counter (no banner) | One counter's request returns 500; the others succeed. | Render the tab. | • The failing counter shows "—".<br>• The global error banner is **not** raised. |
| **TC-AH6** | All counters fail (error banner) | Every search returns 500. | Render the tab. | The "Failed to load the administration statistics" banner is shown. |

### AU. Admin — Updates (`AdminUpdatesTab`, `useAdminUpdates`, `announcement.store`, `GlobalAnnouncementBanner`)

*The UPDATES tab broadcasts a single site-wide message to every user. There is no backend endpoint, so the message lives in the `useAnnouncementStore` Zustand store (persisted to `localStorage`), and `GlobalAnnouncementBanner` — mounted in `MainLayout` — shows it on every page. Tests span the tab component, its hook, the store, and the banner.*

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-AU1** | Render the creation form | No message is active. | Render the Admin Updates tab. | • The "Show message to all users" heading renders.<br>• The Message and Sub message fields and the "Message layout style" label are shown. |
| **TC-AU2** | CREATE gated on message + confirmation | The form is empty. | Type a message, then tick the confirmation. | • CREATE is disabled while empty.<br>• Still disabled with a message alone.<br>• Enabled once the confirmation is ticked. |
| **TC-AU3** | Create stores & shows the message | The form is filled. | Fill Message + Sub message, pick "Warning", tick the confirmation, click **Create**. | • The store holds `{ message, subMessage, severity: 'warning' }`.<br>• The form is replaced by the active-message view (no CREATE button). |
| **TC-AU4** | Remove returns to the form | A message is active. | Click the active alert's close button. | The announcement is cleared and the creation form reappears. |
| **TC-AU5** | Whitespace-only message stays invalid | `useAdminUpdates`. | Set the message to spaces and tick the confirmation. | `canCreate` is `false` (the `message.trim()` guard). |
| **TC-AU6** | Trims message & sub message | `useAdminUpdates`. | Set padded message/sub message, pick "Warning", confirm, `create()`. | The stored announcement holds the trimmed strings. |
| **TC-AU7** | Form reset + toast after create | `useAdminUpdates`. | Fill the form and `create()`. | `message`/`subMessage` are empty, `severity` is back to `"info"`, `confirmed` is `false`, and `justCreated` is `true`. |
| **TC-AU8** | Dismiss the toast only | `useAdminUpdates` with a fresh announcement. | Call `dismissJustCreated()`. | `justCreated` is `false` while `activeAnnouncement` stays set. |
| **TC-AU9** | create() no-op when invalid | `useAdminUpdates`. | Set a message without confirming, then `create()`. | No announcement is stored and `justCreated` stays `false`. |
| **TC-AU10** | remove() clears everything | `useAdminUpdates` with an active announcement. | Call `remove()`. | `activeAnnouncement` is `null` and `justCreated` is `false`. |
| **TC-AU11** | setAnnouncement resets dismissal | `announcement.store` with `dismissed: true`. | Call `setAnnouncement(...)`. | The announcement is stored and `dismissed` returns to `false`. |
| **TC-AU12** | dismiss hides without deleting | `announcement.store` with an active announcement. | Call `dismiss()`. | `dismissed` is `true` and the announcement is preserved. |
| **TC-AU13** | clearAnnouncement resets state | `announcement.store` with an active, dismissed announcement. | Call `clearAnnouncement()`. | `announcement` is `null` and `dismissed` is `false`. |
| **TC-AU14** | Persists only the announcement | `announcement.store`. | `setAnnouncement(...)` then `dismiss()`. | `localStorage['ecopart-admin-announcement']` holds the announcement but **not** `dismissed` (the `partialize`). |
| **TC-AU15** | Banner hidden without a message | No announcement. | Render `GlobalAnnouncementBanner`. | No alert is rendered. |
| **TC-AU16** | Banner hidden when dismissed | An announcement exists but `dismissed: true`. | Render the banner. | No alert is rendered. |
| **TC-AU17** | Banner renders with the chosen severity | An active "Warning" announcement with a sub message. | Render the banner. | The alert shows the message + sub message and carries the `MuiAlert-standardWarning` class. |
| **TC-AU18** | Banner close button dismisses | An active announcement. | Click the banner's close button. | The store's `dismissed` becomes `true` and the alert disappears. |
