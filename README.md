# OpenHiggsfield

An MIT-licensed, self-hostable creative video workspace. Bring your own provider accounts. Provider usage is billed by the provider; the studio does not charge a platform fee.

OpenHiggsfield is an independent community project, not affiliated with or endorsed by Higgsfield AI or TypeSafe. The hosted marketing website is maintained separately and is not part of this distribution.

## Watch the studio in action

[![Watch the 18-second OpenHiggsfield overview](https://raw.githubusercontent.com/thehiggsfieldai/OpenHiggsfield/main/docs/media/studio-explainer-poster.jpg)](https://github.com/thehiggsfieldai/OpenHiggsfield/blob/main/docs/media/studio-explainer.mp4)

**[▶ Watch the video](https://github.com/thehiggsfieldai/OpenHiggsfield/blob/main/docs/media/studio-explainer.mp4)** · [Download MP4](https://raw.githubusercontent.com/thehiggsfieldai/OpenHiggsfield/main/docs/media/studio-explainer.mp4)

An animated overview of the idea composer, references, creative review and a finished-video example.

1. **Start with an idea:** describe your product or story, choose the video size and target length, and add references.
2. **Shape the direction:** review the creative plan, compatible model and available cost estimate before approving generation.
3. **Make it yours:** edit scenes, add captions and audio, then export.

## Hosted version and source code

- **Hosted private beta:** [TheHiggsField.ai](https://thehiggsfield.ai) — explore the hosted studio and join the waitlist.
- **Source repository:** [thehiggsfieldai/OpenHiggsfield](https://github.com/thehiggsfieldai/OpenHiggsfield).
- **Project website:** [OpenHiggsfield.com](https://openhiggsfield.com).

The studio is free and MIT-licensed. Connected AI providers bill usage separately; self-hosting also requires your own infrastructure. The hosted marketing pages are not included in this source distribution.

## Start a private beta

Use Node 24 or Docker. Copy `.env.example` to `.env`, set a unique random `BETTER_AUTH_SECRET` of at least 32 characters, and configure your public HTTPS origin. Keep `ALLOW_SIGNUP=false`; put your initial invited email addresses in `SIGNUP_EMAILS`.

Configure Resend with a verified `EMAIL_FROM` and Google OAuth with the exact callback `PUBLIC_ORIGIN/api/auth/callback/google`. Configure your own brand name and terms/privacy URLs. Without those credentials, real sign-in cannot be verified. There is no default password or hidden production test login.

```sh
docker compose up --build -d
```

The app binds to localhost port 3000. Place an HTTPS reverse proxy in front. The container includes FFmpeg, runs as a non-root user and stores SQLite, encrypted credentials and media in the persistent data volume. It needs one application process per data directory; horizontal scaling is not supported by this SQLite/local-storage release.

For local source development, run `npm ci --ignore-scripts`, `npm run build`, then `node --env-file=.env deploy/studio/server.mjs`. Install FFmpeg/FFprobe for MP4 exports outside Docker. Use `http://localhost:3000` for local development; image-reference generation requires publicly reachable HTTPS.

## Connections and workflow

Sign in, create a workspace and save keys in Connections. Workspace keys are encrypted at rest and never read back through the API. The server decrypts them to call providers: this is not zero-knowledge encryption. The key owner controls who may spend through workspace roles.

Jev supports Vercel AI Gateway or OpenRouter. Script writing currently uses OpenRouter. Higgsfield accepts combined `key-ID:key-secret` credentials. Local environment provider keys are not silently shared with user workspaces.

Start with a brief or public YouTube/TikTok/X references. Review scripts and product claims, edit scenes, upload owned media, optionally generate clips, and save completed clips into the workspace. Current generation adapters are Wan text-to-video and Seedance 2.5 text/reference-to-video; this is not the complete Higgsfield catalog. Reference images are sent only after consent via one-hour links.

Uploads support PNG/JPEG/WebP, MP4/WebM and common voiceover formats. Limits: 25 MB per upload, 500 MB and 200 media files per workspace. The browser renders the storyboard; keep the tab visible. Server MP4 conversion persists after the tab closes. MP4 sources are limited to 180 seconds and 9 megapixels. Completed exports can be downloaded later. Failed conversions can be explicitly retried; generation submissions are never automatically repeated.

## Regression suite

```sh
npm ci --ignore-scripts
npx playwright install --with-deps chromium
npm run typecheck
npm run build
npm test
npm run test:browser
npm run test:mp4
```

The full browser suite requires FFmpeg/FFprobe and creates actual MP4 output. On a machine with Chrome installed, optionally set `CHROME_PATH` to its executable. `STUDIO_TEST_IMAGE` runs the browser workflow against that Docker image. `SKIP_MP4_UI=1` skips only the browser MP4 step for a limited smoke check; do not treat that as the complete suite. Test identities and email delivery are isolated fixtures. Core tests never send external email or purchase generation. The included GitHub Actions workflow runs the deterministic suites and builds the container.

`npm run release:check` checks production configuration. It does not prove email delivery, Google OAuth, provider access, restore readiness or successful deployment. Run those live checks separately before inviting customers.

## Backup, rotation and recovery

Stop every studio process before backup or rotation. Backups contain sensitive data; protect their filesystem permissions and keep a secured offsite copy. The destination must be a new directory.

```sh
node scripts/vault-maintenance.mjs backup DATA_DIR NEW_BACKUP_DIR --server-stopped
node scripts/vault-maintenance.mjs rotate DATA_DIR NEW_BACKUP_DIR --server-stopped
node scripts/vault-maintenance.mjs verify RESTORED_DATA_DIR
```

Backups include a consistent database, all vault key versions and stored media. Rotation verifies a pre-rotation backup before replacing credential ciphertext transactionally. Preserve old key files while any backups depend on them. Losing a required key makes its encrypted credentials unrecoverable. Restore into a separate directory, verify it, then point the stopped server at it. On Windows, restrict access with filesystem ACLs; Unix modes alone do not establish Windows permissions.

Users can export project data and deactivate their account. Deactivation revokes sessions and blocks sign-in; it preserves workspace data and does not cancel provider jobs or charges. An operator can reactivate an account:

```sh
node scripts/account-status.mjs reactivate DATA_DIR EMAIL
```

## Distribution

This package excludes the hosted company's marketing pages, leads, admin dashboard and legal pages. Supply your own policies and retention schedule. Project-owned code uses MIT. Included Manrope fonts retain their SIL Open Font License in `public/fonts/OFL.txt`; dependencies and container media tools retain their own licenses.

## Uploaded creative references

The References workspace accepts up to 12 private images/videos, 25 MB each. Set product, character, brand or style intent and add notes. Approval is required before visual analysis; approved notes and saved observations are supplied to Jev and the script writer. Analysis uses the workspace's OpenRouter key and Gemini Flash. Original images for analysis must be under 6 MB. Larger images can still be stored and used with notes.

Video analysis samples approximately 10%, 50% and 90% locally and saves those frames privately before sending them for analysis. It does not analyse audio, dialogue, complete motion or unsampled frames. This feature needs a recent browser able to decode the uploaded clip. Provider replies are observations to review, not facts or a performance forecast.

Up to three approved images can be selected for reference-image generation. Image selection is saved with the project; Higgsfield sharing permission must be confirmed again. The complete prompt can be reviewed before generation. Reference videos are not accepted as generation inputs by the current catalog. Removing a reference detaches it; originals and sampled frames remain in workspace Assets.

Run `node scripts/test-uploaded-references.mjs` for security/provider-contract checks and `node scripts/test-reference-browser.mjs` after `node scripts/test-fullframe.mjs` for the upload, sampling, save/reload and generation-handoff browser regression. Provider responses are simulated; these tests make no paid requests.

## Brands, Assets and Usage

Create workspace brand kits in Brands, then select one in a project's brief. The project saves a snapshot, so later kit changes do not silently alter existing work. Kits include a private logo, colours, font, tone and guidelines. Archive kits to retire them.

Assets holds uploads, imported generations and rendered exports. Search names/tags, filter type/origin, preview, rename, archive and reuse media in scenes or creative references. Deletion is refused while saved projects or brand kits reference a file. Generation history can check an existing request and import a completed result without submitting another generation.

Usage shows 7/30/90-day request activity, outcomes, reported costs and CSV export. Missing provider costs are explicitly unreported, not free. Storage is the current workspace total regardless of the activity date filter. Provider invoices remain authoritative.

Creative treatments combine the brief, selected research, Jev assessment and approved references into editable shared guidance and timed shots. Review prompts before applying. Changing their inputs marks the treatment stale. Writing and generation use configured provider keys and can incur provider charges.

The editor supports six ratios (16:9, 9:16, 1:1, 4:3, 3:4, 21:9), three output resolutions, scene editing, private logos, uploaded voiceovers/music and optional original clip audio. Preview renders the complete edit before playback. Generation settings and final edit settings are separate; higher export resolution cannot restore missing source detail.

## Updated studio navigation

Studio now separates Brief, References, Jev & story, and Edit & export. Workspace pages do not show project controls. Settings contains provider connections and membership/account controls. The editor keeps its preview and scene strip beside a scrolling inspector with Visual, Text, Audio and Generate tabs. Video settings expand from the editor toolbar. Export opens a review dialog; MP4 is the primary output, with WebM under Other formats.

References has Upload, Search inspiration and Paste a link views. Expand an uploaded card to edit guidance, approve sharing or request analysis. Jev assessments are bound to the input brief and references: changed inputs mark the assessment stale, and stale assessments are excluded from new AI treatments until refreshed.

The browser regression suite includes screen-boundary, desktop/laptop layout, export-dialog keyboard and stale-assessment checks. It uses simulated providers; it is not a claim of live-provider verification or a substitute for a first-use study.
