<p align="center"><img src="public/logo.svg" width="88" alt="TERZİ Content Manager logo"></p>

<h1 align="center">TERZİ Content Manager</h1>

<p align="center">A local-first, open-source workspace for turning ideas and photos into editable short-form video projects.</p>

<p align="center">
  <a href="LICENSE"><img alt="License: AGPL-3.0" src="https://img.shields.io/badge/license-AGPL--3.0-6c5ce7.svg"></a>
  <img alt="Node.js 20 or newer" src="https://img.shields.io/badge/node-%E2%89%A520-339933.svg">
</p>

<p align="center"><strong>English</strong> · <a href="README.tr.md">Türkçe</a> · <a href="README.es.md">Español</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.pt-BR.md">Português (Brasil)</a></p>

## What it does

| Local-first by default | Optional managed services | Built for review |
| --- | --- | --- |
| Turn photos into video in the browser; media stays on your device. | Connect Cloudflare, AI, and other integrations only when you choose to. | Edit scenes, narration, timing, source notes, and publishing assets before export. |

## Start locally

**Requires Node.js 20 or newer.**

```bash
npm install
npm start
```

Open [http://127.0.0.1:4310](http://127.0.0.1:4310). The local visual flow works without cloud credentials. Use `.env.example` only for optional third-party integrations.

## Validate a change

```bash
npm run check
node --check public/app.js
node --check cloudflare/worker.js
```

## Optional Cloudflare deployment

`wrangler.jsonc` is a safe template, not a production configuration. Copy it to an ignored file, replace the D1 and rate-limit placeholders with resources in your own Cloudflare account, then deploy it:

```bash
cp wrangler.jsonc wrangler.production.jsonc
npx wrangler d1 migrations apply <your-d1-database-name> --remote --config wrangler.production.jsonc
npx wrangler deploy --config wrangler.production.jsonc
```

Keep `wrangler.production.jsonc`, `.dev.vars`, `.env`, and secrets out of Git. Read [SECURITY.md](SECURITY.md) before a public deployment.

## Project guide

- [Contributing](CONTRIBUTING.md)
- [Security reporting and deployment baseline](SECURITY.md)
- [Trademark policy](TRADEMARK.md)
- [Android release checklist](docs/mobile-release.md)
- [Product review](docs/product-review.md)

## License and name

The source code is licensed under the [GNU AGPL v3.0](LICENSE). The **TERZİ Content Manager** name and TERZİ logo are governed by [TRADEMARK.md](TRADEMARK.md).
