## Repository purpose
Small Express-based student management back-end that serves static pages from `public/` and persists data as JSON files under `data/`, `uploads/`, `assignmnt/`, `lecturers/`, `notification/`, `year/`, and `time/` directories.

## Big picture
- Single Node.js Express server in `server.js` (port 3005). No DB: all persistent state is stored in JSON files under the repo. Many endpoints follow the pattern `/api/<resource>` and operate directly on files using synchronous `fs` helpers (`readJSON`, `writeJSON`, `appendDataToFile`).
- Static frontend in `public/` (HTML pages talk to the Express endpoints). File uploads are saved to `uploads/` using `multer`.
- External integrations: OpenAI client (`openai`), Twilio, and Nodemailer configured via environment variables in `.env` (not checked in).

## What matters to an AI coding assistant
- Preserve the single-file server structure when making small fixes; global state is used (e.g., `loggedInUser`, `loggedInUserId`) and many endpoints rely on these variables. Avoid introducing async/db refactors without broad updates.
- File paths are relative to repository root. Use the existing helpers `readJSON`, `writeJSON`, and `appendDataToFile` when adding endpoints to keep consistent file-format behavior (arrays of objects, pretty-printed with 2 spaces).
- Be conservative when changing authentication or file-writes: tests/rollbacks are manual (no migrations). If adding a breaking change, include a migration plan and update the README.

## Helpful patterns & examples
- Add new resource endpoints following existing patterns: validate required fields, read array via `readJSON(filePath)`, push/modify, then `writeJSON(filePath, data)`. See `POST /api/help` and `POST /api/comments` for minimal examples.
- For file uploads, reuse `multer` storage config and save paths as `/uploads/<filename>` in user records. See `POST /api/profile-picture` and assignment submit routes (e.g., `POST /api/aonesone/:name/submit`).
- For notifications with expiry, the code uses a timeout scheduling pattern (see `POST /api/notification`) — avoid duplicating scheduling logic without understanding lifetime implications.

## Environment & run notes
- Start server: node `server.js`. Project uses dependencies in `package.json`; run `npm install` before starting. There are no start/test scripts defined (add scripts if needed).
- Required environment variables for full features: `OPENAI_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`. Email credentials are configured inline in `server.js` but should be moved to `.env` (sensitive data appears in code and must be rotated).

## Project-specific conventions
- JSON files are arrays (empty files are initialized with `[]`). IDs are often timestamps `Date.now().toString()` or numeric indices. When searching by id, many routes use string comparison; ensure `id` types match when editing.
- Routes are organized by resource groups but all live in `server.js`. When adding substantial features, prefer extracting helper modules but keep backward-compatible route names.

## Quick checklist for PRs by an AI assistant
1. Run `npm install` and `node server.js` locally to smoke test endpoints you change.
2. When editing `server.js`, run a quick grep for globals (`loggedInUser`, file paths) — update all usages if you rename them.
3. Preserve JSON formatting (`JSON.stringify(..., null, 2)`).
4. If adding env vars, update `README.md` and mention required keys.
5. Note any hard-coded secrets or emails and flag them for removal.

## Where to look next (key files)
- `server.js` — main server and all routes (start here for behavior)
- `package.json` — dependency list and scripts (no start script present)
- `public/` — static pages that call the API endpoints
- `data/`, `uploads/`, `assignmnt/`, `lecturers/`, `notification/`, `year/`, `time/` — persistent JSON storage locations

If anything in this guidance is unclear or you want more detail (for example, an extraction plan for splitting `server.js`), tell me which area to expand and I'll iterate.
