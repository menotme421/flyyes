# Project Rules — Follow These at All Times

## 1. Code Quality & Structure
- Always use a clean, modular architecture. Separate concerns (routes, controllers, services, models, utils).
- Never put everything in one file. Each file should have a single responsibility.
- Use clear, descriptive naming for variables, functions, and files. No abbreviations.
- Add comments explaining WHY, not WHAT. The code should be self-explanatory for WHAT.
- Always create a README.md explaining: what the project does, how to set it up, how to run it, and the folder structure.

## 2. Security — Non-Negotiable
- NEVER store passwords in plain text. Always hash (bcrypt or argon2).
- NEVER hardcode API keys, secrets, or credentials in code. Always use environment variables (.env) and add .env to .gitignore.
- Always validate and sanitize ALL user inputs — both client-side and server-side.
- Always use parameterized queries / ORM. NEVER concatenate user input into SQL strings.
- Implement rate limiting on all authentication endpoints.
- Set proper CORS policies — never use wildcard (*) in production.
- Always use HTTPS in production.
- Implement proper authentication & authorization checks on every protected route.
- Set secure, httpOnly, sameSite flags on cookies.
- Never expose stack traces or detailed error messages to the end user in production.

## 3. Database
- Always design the database schema FIRST before writing application code. Show me the schema and explain the relationships before proceeding.
- Use proper data types, indexes, and foreign key constraints.
- Never store sensitive data unencrypted.
- Always implement database backups strategy.
- Use migrations for any database schema changes — never modify the database directly.

## 4. Error Handling & Logging
- Always implement proper try-catch / error handling. Never let the app crash silently.
- Create a centralized error handling mechanism.
- Log errors with enough context to debug (timestamp, endpoint, user ID, error message) but NEVER log sensitive data (passwords, tokens, personal info).

## 5. Architecture Decisions
- Before writing any code, FIRST explain:
  - What approach you're taking and WHY
  - What alternatives exist and why you didn't choose them
  - Any trade-offs or limitations
- If I ask you to build something that has a better standard solution, tell me before implementing my way.
- Always consider scalability. Design as if the user base could grow 100x.

## 6. Testing
- Write basic tests for critical paths: authentication, payment, data creation/deletion.
- Test edge cases: empty inputs, extremely long inputs, special characters, concurrent requests.

## 7. Dependencies & Tech Choices
- Minimize dependencies. Don't install a library for something that can be done in a few lines.
- When suggesting a library/package, tell me: how popular it is, when it was last updated, and if there are known security issues.
- Never use deprecated packages.

## 8. Version Control
- Structure work in small, logical commits.
- Never commit node_modules, .env, or build artifacts.
- Always maintain a proper .gitignore file.

## 9. Performance
- Implement pagination for any list/query that could return large datasets.
- Optimize database queries — no N+1 queries.
- Implement caching where appropriate.
- Lazy load / code split on the frontend where possible.

## 10. Communication Rules
- When I ask you to build a feature, ALWAYS start by asking clarifying questions if anything is ambiguous.
- If you're unsure about a requirement, ASK. Don't guess.
- After completing a feature, give me a summary of: what was built, what files were created/modified, and what I need to do next (if anything).
- If something could break existing functionality, WARN me before making the change.
- Explain technical concepts in simple terms. I am not a programmer.
- If you find a bug or security issue in existing code while working on something new, STOP and tell me immediately.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
