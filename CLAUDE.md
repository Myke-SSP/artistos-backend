# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

ArtistOS backend — an Express 5 REST API backed by SQLite. Helps musicians create profiles, input goals, generate activity roadmaps, and track task completion.

## Commands

```bash
npm run dev    # nodemon (auto-restart on change)
npm start      # production start
```

No test suite exists yet. Smoke test manually via curl or a REST client against `http://localhost:3000`.

## Architecture

Single-file server (`server.js`) using ES modules (`"type": "module"` in package.json). All schema creation, route definitions, and server startup live in one file.

**Database:** `better-sqlite3` (synchronous SQLite). File lives at `./data/artistos.db`. Tables are created with `CREATE TABLE IF NOT EXISTS` on every startup — no migration tool.

**Known schema gap:** The `tasks` table is referenced in three routes (`PATCH /tasks/:id`, `GET /roadmaps/:id/tasks`, `GET /roadmaps/:id`) but is never created in server.js. Any call to those routes will fail until the `tasks` table DDL is added.

**Roadmap storage:** Roadmap JSON is serialized as a string in `roadmaps.json` (TEXT column). Parse/stringify explicitly when reading or writing.

## Route Map

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| POST | `/profiles` | Create profile |
| GET | `/profiles/:id` | Get profile |
| POST | `/goals` | Create goal (requires profile_id) |
| POST | `/roadmaps/generate` | Generate + save stub roadmap |
| GET | `/roadmaps` | Get latest roadmap for profile (`?profile_id=`) |
| GET | `/roadmaps/:id` | Get roadmap with task progress |
| GET | `/roadmaps/:id/tasks` | Get all tasks for a roadmap |
| PATCH | `/tasks/:id` | Toggle task completion (`{ completed: true/false }`) |

## Environment

Reads from `.env` via `dotenv`. Only variable currently used: `PORT` (default 3000).
