# Project Guidelines

## Tech Stack

- Frontend: Vue 3 (Composition API, `<script setup>`) + Vite 6 + Vue Router 4
- Backend: Node.js + Express (ES Module, `import/export`)
- Database: MySQL via mysql2 (connection pool)
- Visualization: ECharts 5, Three.js, Canvas 2D
- AI: Coze API integration

## Code Style

### Vue 3 Frontend

All `.vue` files use `<script setup>` with Composition API. No Options API (`export default { data(), methods: {} }`) is permitted. Reactive state uses `ref()` for primitives and `reactive()` for objects. Computed values use `computed()`. Lifecycle hooks use `onMounted`, `onBeforeUnmount`, etc., imported from `vue`.

Component templates avoid inline style tags. Scoped styles use `<style scoped>` with BEM-like class naming. Import `.css` files via `@import` in style blocks or as module imports.

### Backend (Node.js + Express)

All files use ES Module syntax (`import`/`export`). Route files export a default Express router. Middleware follows the standard `(req, res, next)` pattern. Database queries go through the shared `db` instance from `config/db.js`.

### Imports

Group imports by source: external packages first, then internal modules using relative paths or `@/` alias for frontend source files. Remove unused imports.

## Architecture

### Frontend (under `frontend/`)

- `src/views/` - Page-level components, one per route
- `src/components/` - Reusable components
- `src/router/index.js` - Route definitions
- `src/api/index.js` - Axios HTTP client wrapper
- `src/assets/` - Static assets: CSS, JS utilities, images, SVGs
- `public/experiments/` - Independent iframe experiment pages (not Vue components, do not modify)
- `public/js/` - Circuit simulation Canvas logic, experiment communication library

The router uses hash history (`createWebHashHistory`). Home view redirects based on user role: teacher -> `/experiment/manage`, student -> `/experiment/tasks`.

### Backend (under `backend/`)

- `routes/` - Express route handlers, one per domain
- `models/` - Data access layer (e.g., `User.js`)
- `middleware/` - Auth middleware (JWT verification)
- `config/` - Database connection configuration
- `utils/` - Utility functions

All API routes are prefixed with `/api`.

## Build and Test

```sh
# Frontend (always run after frontend changes)
cd frontend && npm run build

# Backend
cd backend && node app.js

# Development
cd frontend && npm run dev
```

After any frontend change, run `npm run build` to verify the build passes before considering work complete.

## Security

- `backend/.env` contains database credentials and JWT secret -- never commit to Git
- SQL dump files (`*.sql`) contain student data and must never be tracked by Git
- Coze API keys and bot IDs are hardcoded in `src/assets/js/coze-api.js` -- replace with environment variables before production deployment
- Passwords are hashed with bcrypt before storage
- JWT tokens expire after 24 hours

## Design Conventions

Use minimal, clean UI with intentional whitespace. Primary color palette centers on blue tones (`#1976d2`, `#5ab5ff`, `#305fce`). Cards and dialogs use subtle box shadows and rounded corners. Form controls use consistent padding, border-radius, and hover states.

Motion is used sparingly: smooth page transitions, hover micro-interactions, and ambient effects (Three.js wave background). No decoration without purpose.

## Git Workflow

- Use a proxy when pushing/pulling: `git -c http.proxy=http://127.0.0.1:7897`
- Sensitive files (.env, *.pem, *.sql with data) must be listed in `.gitignore` before first commit
- Force push with caution -- prefer `git filter-branch` to purge sensitive data from history
