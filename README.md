<p align="center">
  <img src="public/logo.svg" width="96" alt="Content Studio logo">
</p>

<h1 align="center">Content Studio</h1>

<p align="center">
  Plan, craft, review, and export short-form video — with your media staying on your device by default.
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-6c5ce7.svg"></a>
  <img alt="Node.js 20 or newer" src="https://img.shields.io/badge/node-%E2%89%A520-339933.svg">
  <img alt="Local-first" src="https://img.shields.io/badge/privacy-local--first-20a36a.svg">
</p>

<p align="center">
  <strong>English</strong> · <a href="README.tr.md">Türkçe</a> · <a href="README.es.md">Español</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.pt-BR.md">Português (Brasil)</a>
</p>

<p align="center"><a href="https://terzi.orbitvideolab.workers.dev">View the hosted demo</a> <sub>· the deployed build can lag behind <code>main</code></sub></p>

## The creator workspace for short-form video

Content Studio brings the messy middle of short-form production into one focused workspace: a spark of an idea, the source material, the story, the scenes, the voice, and the final export. It is built for creators who want to stay in control instead of handing every photo, draft, and edit to a black box.

It runs as a local-first web app. The manual visual flow works in the browser without a cloud account or API key, while Cloudflare and AI integrations are optional layers you can self-host and enable when they genuinely help.

## What you can do

| Start with a real idea | Shape the story | Finish with confidence |
| --- | --- | --- |
| Start from a topic, your own photos, a licensed image URL, or an archive discovery flow. | Turn a brief into editable scenes; refine copy, timing, camera movement, crop, narration, and language. | Preview, revise, export your project, download a cover frame, and prepare a publishing package. |

### Built into the studio

- **Visual Flow** — turn a set of photos into an editable browser-based video; your media remains on the device.
- **Creator workflow** — move from source → story → review → render with explicit steps instead of a one-shot prompt.
- **Source-aware planning** — keep source notes alongside the project and work from licensed or user-provided material.
- **Editorial controls** — rewrite scene text, reorder scenes, adjust duration and motion, and review before export.
- **Flexible AI setup** — connect your own supported provider for advanced flows, or self-host optional managed services on Cloudflare.
- **Local project ownership** — save drafts in the browser, export/import a project file, and continue working without a mandatory account.

## Hosted demo

The current hosted build is available at [terzi.orbitvideolab.workers.dev](https://terzi.orbitvideolab.workers.dev). It is a deployed snapshot, so consult this repository's `main` branch for the latest source and release notes.

## Who it is for

Content Studio is a practical starting point for social-video creators, small marketing teams, educators, and product builders who need a transparent creative workflow. It is not a promise of instant, finished content: the studio is deliberately designed to leave editorial decisions with the person publishing the work.

## Start locally

**Requires Node.js 20 or newer.**

```bash
npm install
npm start
```

Open [http://127.0.0.1:4310](http://127.0.0.1:4310), choose **Quick video**, and add photos to try the local visual flow. No cloud credentials are needed for that path. Use `.env.example` only when configuring optional third-party integrations.

## Development and checks

```bash
npm run check
node --check public/app.js
node --check cloudflare/worker.js
```

The test suite covers the main studio paths, local video behavior, export states, Cloudflare security boundaries, account controls, quotas, and provider contracts.

## Optional Cloudflare deployment

The committed `wrangler.jsonc` is a safe template, not a production configuration. Copy it to an ignored file and replace its D1 and rate-limit placeholders with resources in **your** Cloudflare account:

```bash
cp wrangler.jsonc wrangler.production.jsonc
# Edit wrangler.production.jsonc with your own Cloudflare resource IDs.
npx wrangler d1 migrations apply <your-d1-database-name> --remote --config wrangler.production.jsonc
npx wrangler deploy --config wrangler.production.jsonc
```

Keep `wrangler.production.jsonc`, `.dev.vars`, `.env`, and all secrets out of Git. Read [SECURITY.md](SECURITY.md) before making an instance public.

## Project guide

- [Contributing](CONTRIBUTING.md)
- [Security reporting and deployment baseline](SECURITY.md)
- [Trademark policy](TRADEMARK.md)
- [Android release checklist](docs/mobile-release.md)
- [Product review](docs/product-review.md)

## License and name

The source code is licensed under the [GNU AGPL v3.0](LICENSE). The **Content Studio** name and Content Studio logo are governed separately by [TRADEMARK.md](TRADEMARK.md).
