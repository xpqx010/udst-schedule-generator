# Project Rules

Review these rules before implementing every feature.

## Architecture

- Use Next.js 16 with the App Router and MongoDB.
- Use Next.js for the frontend and backend.
- Implement backend endpoints as route handlers under `app/api`.
- Every feature must expose a reusable API contract with the appropriate HTTP methods.
- Screens call API routes. UI components and pages never access MongoDB directly.
- Only code executing from route handlers may access MongoDB.

## Accounts And Security

- Require an account from the start of the product flow.
- Support email/password signup, login, logout, and password reset.
- Hash passwords using an appropriate slow password hash.
- Identify the current user and authorize every route that reads or changes their data.
- Validate all external input on the server.

## Reliability

- Persist every meaningful user change through an API route.
- Never discard existing work because another operation failed.
- Never fail silently. Return structured API errors and show clear, actionable messages in the UI.

## Interface Quality

- Preserve `PRODUCT.md` and `DESIGN.md` conventions.
- After building each screen, critique it with the designer agent.
- Run an Impeccable review after each screen and fix material findings.
- Remove generic generated-interface tells such as decorative gradients, centered-everything composition, repetitive cards, timid spacing, and unsupported claims.
- Keep screens responsive, keyboard accessible, and explicit about loading, empty, success, and error states.
