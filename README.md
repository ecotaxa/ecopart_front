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

# Test Scenarios & Strategy

This document outlines the testing architecture, tools, and specific test cases for the application.

## 🛠 Testing Tech Stack

| Tool | Purpose | Why? |
| --- | --- | --- |
| **Vitest** | Test Runner | Ultra-fast runner with a Jest-compatible API for unit and integration testing. |
| **Vitest UI** | Visual Interface | A web-based UI to run, filter, and inspect tests live via `vitest --ui`. |
| **Testing Library** | UI Testing | Encourages testing from the user's perspective (roles, labels) rather than implementation details. |
| **MSW** | API Mocking | Mock Service Worker intercepts network calls at the network level, allowing for realistic API simulations. |
| **React Router** | Navigation | Uses `MemoryRouter` via a custom `renderWithRouter` helper to simulate URLs and redirects. |
| **Zustand** | State Management | Global auth state is reset before each test to prevent "Zombie User" issues (cross-test contamination). |

---

## 🏗 Testing Architecture

We follow a modular strategy to ensure the suite remains DRY (*Don't Repeat Yourself*) and maintainable:

* **Feature Tests** (`src/features/*/pages/*.test.tsx`): Focus strictly on business logic, user flows, and error handling.
* **Accessibility Tests** (`src/test/accessibility/*.a11y.test.tsx`): Focus on technical compliance (tab order, ARIA labels, focus management).
* **Test Helpers** (`src/test/helpers/*.ts`): Reusable functions to simulate user actions (e.g., `fillAuthForm`) to keep test files clean.
* **Shared Assertions** (`src/test/assertions/*.ts`): Reusable expectations (e.g., `expectSubmitDisabled`) for UI consistency.

---

## 📋 Test Scenarios

### Convention Used:

`ID` | `Title` | `Preconditions` | `Steps` | `Expected Result`

---

### A. LOGIN PAGE

#### Functional Tests

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-A1** | Initial Rendering | User not authenticated. | Navigate to `/login`. | Form displayed; Login button disabled; No errors visible. |
| **TC-A2** | Validation Logic | On Login page. | Enter invalid email + Blur field. | Email error message displayed; Button remains disabled. |
| **TC-A3** | Successful Login | API available. | Enter valid credentials + Click "LOG IN". | API called; User redirected to `/dashboard`. |
| **TC-A4** | API Error Handling | Backend returns 401/500. | Enter valid format + Click "LOG IN". | No crash; "Invalid email or password" displayed; User stays on page. |
| **TC-A5** | Auth Redirect | Session exists. | Navigate to `/login`. | User immediately redirected to `/dashboard`. |

#### Accessibility Tests

| ID | Title | Steps | Expected Result |
| --- | --- | --- | --- |
| **TC-A6** | Keyboard Nav | Fill form + Tab through. | Inputs have `<label>`; Focus order: Email → Password → Toggle → Remember → Button. |

---

### B. REGISTER PAGE

#### Functional Tests

| ID | Title | Preconditions | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| **TC-B1** | Initial State | Not authenticated. | Navigate to `/register`. | Form displayed; Submit button disabled. |
| **TC-B2** | Password Logic | On Register page. | Enter weak password or mismatch. | Specific error displayed; Submit button disabled. |
| **TC-B3** | Success | Valid fields. | Complete form + Click "Sign up". | API called; Success message shown; Form hidden. |
| **TC-B4** | API Error | 409 (Conflict) or 500. | Submit valid data. | Error shown; Form visible; Data is preserved. |

#### Accessibility Tests

| ID | Title | Steps | Expected Result |
| --- | --- | --- | --- |
| **TC-B5** | Advanced Nav | Tab through form. | Logical top-to-bottom order; Autocomplete accessible via arrows; Checkbox via Spacebar. |

---

### C. RESET PASSWORD (REQUEST)

#### Functional Tests

| ID | Title | Steps | Expected Result |
| --- | --- | --- | --- |
| **TC-C1** | Rendering | Navigate to `/reset-password`. | Email input displayed; Button disabled if invalid. |
| **TC-C2** | Success | Valid email + Submit. | API called; Success message shown (Anti-enumeration policy). |
| **TC-C3** | Server Error | Submit form while API is down. | No white screen; Graceful error or success message shown. |

#### Accessibility Tests

| ID | Title | Steps | Expected Result |
| --- | --- | --- | --- |
| **TC-C4** | Keyboard Nav | Tab through page. | Proper labels; Focus moves logically from Input to Button. |

---

### D. RESET PASSWORD CONFIRMATION

#### Functional Tests

| ID | Title | Preconditions | Expected Result |
| --- | --- | --- | --- |
| **TC-D1** | Valid Token | Valid token in URL. | New password fields displayed; Button disabled. |
| **TC-D2** | Invalid Token | Missing/expired token. | Error message displayed or redirected; Submission blocked. |
| **TC-D3** | Validation | Weak/mismatching pass. | Validation error displayed; Button disabled. |
| **TC-D4** | Reset Success | Valid token/data. | API called; Redirect to `/login` with success message. |

---

### E. PROFILE PAGE

#### Functional Tests

| ID | Title | Steps | Expected Result |
| --- | --- | --- | --- |
| **TC-E1** | Initial Loading | Navigate to `/settings`. | Loading indicator shown; Profile data loaded; "Planned usage" read-only. |
| **TC-E2** | Update Profile | Test "SAVE" and "CANCEL". | SAVE: API called + success; CANCEL: Values restored. |
| **TC-E3** | Update Failure | Save changes (API Error). | Error message displayed; UI does not persist changes. |
| **TC-E4** | Change Password | Enter current + new password. | API called; Success message; Fields cleared. |
| **TC-E5** | Delete Account | Click "DELETE" + Confirm. | API called; Session cleared; Redirect to `/login`. |

#### Accessibility Tests

| ID | Title | Steps | Expected Result |
| --- | --- | --- | --- |
| **TC-E6** | Keyboard Nav | Navigate using Tab. | Labels present; Tabs (EcoPart/EcoTaxa) selectable via keyboard; Logical focus. |

