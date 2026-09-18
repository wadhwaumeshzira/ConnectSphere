# Workflow: add a new feature

Save this file at `.agents/workflows/add-feature.md` in the project.

1. Read `AGENTS.md`, `prompt.md`, `api-contract.md`, and `schema.md` before starting.
2. Check whether a similar pattern already exists in the codebase (a route, a socket handler, a component) and follow it instead of inventing a new one.
3. Build the backend piece first (route/controller/model or socket handler). Test it manually before touching the frontend.
4. Build the frontend piece and wire it to the backend.
5. Update `api-contract.md` and/or `schema.md` if this change adds or changes an endpoint, event, or data model.
6. Append an entry to `procedure.md` in Hinglish: what was built, how, and any problem + fix hit along the way.
7. Commit with a conventional commit message (`feat: ...`, `fix: ...`).
