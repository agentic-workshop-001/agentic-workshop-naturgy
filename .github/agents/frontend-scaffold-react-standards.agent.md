---
name: frontend-scaffold-react-standards
description: Builds or refactors the React/Vite UI following Naturgy React standards defined in the GitHub Copilot Space "React-Standards". Produces a runbook.
tools:
  - read
  - search
  - edit
  - shell
---
## Goal
Build (or restyle) the workshop React/Vite UI following the Naturgy React standards defined in the Copilot Space "React-Standards", and end with a short runbook to launch and test end-to-end.

## Specs (SSOT)
- Data/business SSOT (repo):
  - `_data/specs/csv-spec.txt`
  - `_data/specs/logic-spec.txt`
- UI standards SSOT (Space):
  - GitHub Copilot Space: **"React-Standards"** (Naturgy)
- UI standards fallback (repo, must match the Space):
  - `_data/specs/react-standards.md`

## Operating rules
- Do not ask questions or request confirmations.
- Do not restate specs; apply them.
- Primary UI guidance comes from the Space "React-Standards". If Space context is not available in this execution path, use `_data/specs/react-standards.md`.
- Do not change backend endpoints or business logic. Only UI/UX structure, components, styling, and frontend-only concerns.
- If something is ambiguous, record a minimal note in `_data/specs/clarifications.txt`.

## What to build
- React + Vite + TypeScript in `frontend/`
- Apply Naturgy UI standards (Space "React-Standards"):
  - consistent layout (app shell + navigation)
  - consistent component library + theme/tokens
  - consistent forms, tables, feedback (loading/error/success)
- Pages:
  1) Meters maintenance (CRUD)
  2) Contracts maintenance (CRUD, contractType with conditional fields)
  3) Readings maintenance (CRUD, filters by meterId/date range)
  4) Billing/Invoices (period input, run billing, list invoices, download PDF)
- Optional: CSV import panel calling backend import endpoints
- Basic UX: loading + errors

## Final output (must be produced at end)
Write a short runbook:
- prerequisites
- start backend
- start frontend
- demo steps (UI and optional curl)
- remind SSOT paths (data/business + UI standards) and sample CSV paths