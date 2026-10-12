# TERZİ Creator Studio

Um espaço de trabalho open source e local-first para transformar ideias e fotos em projetos de vídeo curto editáveis.

[English](README.md) · [Türkçe](README.tr.md) · [Español](README.es.md) · [简体中文](README.zh-CN.md) · **Português (Brasil)**

## Começar localmente

**Requer Node.js 20 ou superior.**

```bash
npm install
npm start
```

Abra [http://127.0.0.1:4310](http://127.0.0.1:4310). O fluxo visual local não exige credenciais de nuvem; por padrão, a mídia fica no seu dispositivo.

## Validar alterações

```bash
npm run check
node --check public/app.js
node --check cloudflare/worker.js
```

`wrangler.jsonc` é um modelo seguro do Cloudflare, não uma configuração de produção. Use `wrangler.production.jsonc` com seus próprios recursos D1 e de limite de taxa e nunca envie segredos ao Git. Veja o [README em inglês](README.md#optional-cloudflare-deployment) e [SECURITY.md](SECURITY.md).

O código é licenciado sob a [GNU AGPL v3.0](LICENSE). Consulte [TRADEMARK.md](TRADEMARK.md) para o nome e o logotipo.
