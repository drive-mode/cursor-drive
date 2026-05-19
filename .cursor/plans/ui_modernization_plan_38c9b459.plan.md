---
name: UI Modernization Plan
overview: "Single actionable plan for roler_ui modernization: current state, completed work (nav, buttons, fonts, account, admin login), verification steps, and optional follow-ups from research."
todos: []
isProject: false
---

# UI Modernization — Build Plan

**Scope:** [roler_ui](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler_ui) only. Reference: [.cursor/plans/ui-modernization.plan.md](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler_ui\.cursor\plans\ui-modernization.plan.md).

---

## 1. Current state (as implemented)

- **Pages:** Landing (`/`), Dashboard (`/dashboard`), Templates (`/templates`), Resources (`/resources`), Admin (`/admin`).
- **DashboardNav:** Logo, flat nav (Home, Profile, Templates, Resources, Admin), global search (“Search applications, templates…”), Account dropdown (Account Settings, Logout). Mobile: Sheet drawer + same links + search. [DashboardNav.tsx](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler_ui\src\components\layout\DashboardNav.tsx).
- **Buttons:** shadcn variants including `pill` for nav active state; nav uses `variant="pill"` when active, `ghost` otherwise. [button.tsx](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler_ui\src\components\ui\button.tsx) (lines 22–23).
- **Fonts:** Plus Jakarta Sans via `.font-heading`; Google Fonts in [index.html](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler_ui\index.html).
- **Admin login:** Landing “Admin login” uses `login('admin', 'password')`; SECURITY comment in [LandingPage.tsx](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler_ui\src\pages\LandingPage.tsx). Credentials documented in [docs/DEVELOPMENT.md](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler_ui\docs\DEVELOPMENT.md) with security flag.

---

## 2. Completed work (per plan frontmatter)

| ID | Item | Evidence |
|----|------|----------|
| ui-mod-1 | Button variant audit | shadcn variants + pill in use |
| ui-mod-2 | Pill variant for nav active | `variant="pill"` in DashboardNav |
| ui-mod-3 | Font consistency | Plus Jakarta Sans, `.font-heading` |
| ui-mod-4 | Nav structure (flat) | Flat nav; no Product dropdown |
| ui-mod-5 | Global search in nav | Search input in DashboardNav (desktop + mobile) |
| ui-mod-6 | Admin login + doc | LandingPage admin login; DEVELOPMENT.md |
| ui-mod-7 | Backend admin/password | authenticate_dev (roler); frontend calls login |

---

## 3. Verification (do once)

- **Sync plan doc:** Update section 4 “Todos” table in [ui-modernization.plan.md](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler_ui\.cursor\plans\ui-modernization.plan.md) so status values match frontmatter (`completed` for ui-mod-1–7).
- **Security check:** Confirm [docs/DEVELOPMENT.md](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler_ui\docs\DEVELOPMENT.md) contains: credentials `admin` / `password`, “dev only,” and **must be removed or replaced before production**.
- **Build + smoke:** `npm run build`; run app; click nav, search, Account dropdown, Admin login (admin/password), and one protected route.

---

## 4. Optional follow-ups (from research)

- **Account trigger:** Show avatar/initials when user profile is available (keep “Account” + ChevronDown as fallback).
- **Admin in dropdown:** Add “Admin” item in Account dropdown when user has admin access (in addition to nav button).
- **Command palette:** Global shortcut (e.g. Cmd+K) to search/filter nav and actions (later phase).
- **Button usage doc:** Short design note for which variant/size to use where (e.g. primary CTA = default lg, nav = ghost/pill sm).

---

## 5. Admin login — reference

- **Credentials (dev only):** `admin` / `password`.
- **Doc:** [docs/DEVELOPMENT.md](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler_ui\docs\DEVELOPMENT.md).
- **Security:** Private repo only; **flag for removal/update before any production deployment.** Backend: `roler` auth service; frontend: LandingPage admin login + auth-client.

---

## 6. Dependencies

- Backend (`roler`): `auth.service.authenticate_dev` accepts `admin`/`password` when dev auth is enabled.
- Frontend: `auth-client.login` called with `admin` / `password` for Admin login flow.
