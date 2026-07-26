# UDST Schedule Generator

Next.js 16 application with MongoDB-backed accounts and an API-first backend.

## Local Setup

1. Start MongoDB with `docker compose up -d` or provide another MongoDB connection.
2. Create `.env.local` from `.env.example`.
3. Generate `AUTH_SECRET` with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
4. Install dependencies with `npm install`.
5. Start the app with `npm run dev`.

Development password-reset links are returned by the API and shown in the recovery screen when SMTP is not configured. Production requires the SMTP variables from `.env.example`.

Course screenshots are stored privately in `storage/screenshots` during local development and are available only through authenticated API routes. They are removed when the screenshot, owning course, or owning term plan is deleted. Set `SCREENSHOT_STORAGE_DIR` to use another local directory. Local storage is for development only and must be replaced with private object storage before deploying to multiple or ephemeral servers.

Automatic PeopleSoft extraction uses the OpenAI Responses API only after the student explicitly consents in the interface. Set `OPENAI_API_KEY` to enable it and optionally override `OPENAI_VISION_MODEL`. Manual option and meeting entry remains available without an API key. Review OpenAI's current data controls and retention terms before enabling this integration for real student data.

## Commands

- `npm run dev`: start the Webpack development server.
- `npm run typecheck`: check TypeScript.
- `npm run lint`: run ESLint.
- `npm test`: run validation tests.
- `npm run build`: create a production build.

Webpack is selected explicitly because this Windows environment loads Next.js through its WASM SWC fallback, which does not support Turbopack.
