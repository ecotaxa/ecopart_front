Below is a **clean, opinionated README** you can drop at the root of the project.
It explains **what is used, why, where code goes, and how to extend it**, with concrete examples.

You can copy-paste it as `README.md`.

---

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
