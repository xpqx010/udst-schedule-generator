# UDST Schedule Generator

Next.js 16 application with MongoDB-backed accounts and an API-first backend.

## Local Setup

1. Start MongoDB with `docker compose up -d` or provide another MongoDB connection.
2. Create `.env.local` from `.env.example`.
3. Generate `AUTH_SECRET` with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
4. Install dependencies with `npm install`.
5. Start the app with `npm run dev`.

Development password-reset links are returned by the API and shown in the recovery screen when SMTP is not configured. Production requires the SMTP variables from `.env.example`.

## Commands

- `npm run dev`: start the Webpack development server.
- `npm run typecheck`: check TypeScript.
- `npm run lint`: run ESLint.
- `npm test`: run validation tests.
- `npm run build`: create a production build.

Webpack is selected explicitly because this Windows environment loads Next.js through its WASM SWC fallback, which does not support Turbopack.
