# OpenHiggsfield Story Studio

An independent, self-hostable character-to-film studio. Pick from 50 characters or upload your own, write a one-minute story, review six scenes and a cost estimate, then generate with your own provider credentials.

**Not affiliated with, operated by, sponsored by, or endorsed by Higgsfield.ai.** Provider names and trademarks belong to their owners.

[Project website](https://openhiggsfield.com) · [Hosted preview](https://thehiggsfield.ai)

## What is included

- Character browser, image uploads, private drafts and draft deletion.
- Scene scripts, narration directions and generation estimates.
- fal and Higgsfield connections with encrypted credential storage.
- Per-scene render progress, clip previews and an assembled MP4.
- Account/workspace isolation and email magic-link authentication.
- Responsive studio navigation, skeleton states, styled dialogs and device-aware dark/light themes.

Public gallery publishing and private share links are not a complete production workflow yet. Generated voice and character consistency depend on the selected model. Estimates are not final provider invoices.

## Run with Docker

Requires Docker Compose. For public deployment, configure HTTPS and real email delivery.

```sh
git clone https://github.com/thehiggsfieldai/OpenHiggsfield.git
cd OpenHiggsfield
cp .env.example .env
# Generate an authentication secret:
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
# Set BETTER_AUTH_SECRET, PUBLIC_ORIGIN, RESEND_API_KEY and EMAIL_FROM.
# Set SIGNUP_EMAILS for invited users, or ALLOW_SIGNUP=true for open registration.
docker compose up --build -d
```

Open http://localhost:3000. Connect your provider inside Connections after signing in. Do not put provider credentials in frontend source. Email sign-in must be configured to use the hosted account flow. Keep a backup of the data volume, including the credential-encryption key. Use one application process per data directory.

## Local development

Node.js 24+ and FFmpeg on PATH are required for video assembly. Set FFMPEG_PATH if needed.

```sh
npm ci
npm ci --prefix apps/story-studio
npm run dev
# In a second terminal:
npm --prefix apps/story-studio run dev
```

Open http://127.0.0.1:5193. The local email screen offers a test sign-in link. Test authentication is restricted to localhost and is rejected in production. Local users and keys live in ignored .studio-data, never in Git.

## Build and checks

```sh
npm run build
npm test
node scripts/test-story-studio.mjs
node scripts/test-story-films.mjs --fal --recommended
```

Provider tests use mocked requests and do not purchase generations. The current app lives in apps/story-studio; the server and provider adapters live in deploy. The earlier editor UI and obsolete demo assets were removed in this release; Git history preserves previous versions.

## Privacy and deployment

Drafts, uploads and renders are private workspace data. Authorized generation sends required inputs to the chosen provider. Stored keys are encrypted at rest, not end-to-end encrypted. Removing a draft does not remove completed films. Configure your own privacy terms, contact endpoint, backups and retention policy before operating a public service; the bundled legal text describes the hosted project and must be adapted for your deployment.

## License and attribution

MIT; retain license and third-party notices. Frontend provenance is recorded in apps/story-studio/UPSTREAM.json. Character artwork is included as project assets; the code license does not confer rights to third-party names, trademarks or likenesses. No private uploaded characters or generated user films are included.
