# CleanDeck

CleanDeck is an audit-first deck QA tool with safe partial normalization for existing `.pptx` files.

Current product truth:
- audit existing decks
- apply safe autofix where confidence is high
- preserve structure and editability
- export corrected PPTX plus deterministic report

Not current product truth:
- strict cleanup engine
- template enforcement platform
- AI deck post-processing layer

It provides:
- browser UI served by Express
- `POST /audit`
- `POST /fix`
- `GET /download/:file`

The engine remains in the existing audit, fix, and validation modules. The product shell only orchestrates them.

## Local Run

Install dependencies:

```bash
npm install
```

Build the browser UI:

```bash
npm run build
```

Start the single service:

```bash
npm start
```

By default the service listens on port `3000`. In hosting environments it uses `PORT` when provided.

## Deployment

Target model:
- one deploy
- one public URL
- Express serves the built React UI
- the same service handles `/audit`, `/fix`, and `/download`

Recommended Node platform:
- Railway

Build command:

```bash
npm install && npm run build
```

Start command:

```bash
npm start
```

Environment:
- `PORT` is optional locally and is typically injected by the platform in production

## Notes

- Built UI assets are served from `apps/product-shell-ui/dist/` when present.
- Temporary uploads are stored under `apps/product-shell/storage/tmp/`.
- Fixed files are stored under `apps/product-shell/storage/output/`.

## Deployment Risks

- Storage is local and temporary. On many Node hosting platforms, filesystem state is ephemeral.
- There is no cleanup policy yet for uploaded or generated files.
- There is no authentication yet, so the current shell is suitable for controlled beta testing only.
- Frontend and backend are intentionally deployed together for now; scaling and isolation concerns are deferred.
