# TERZİ Creator Studio

Un espacio de trabajo local-first y de código abierto para convertir ideas y fotos en proyectos de vídeo corto editables.

[English](README.md) · [Türkçe](README.tr.md) · **Español** · [简体中文](README.zh-CN.md) · [Português (Brasil)](README.pt-BR.md)

## Inicio

**Requiere Node.js 20 o posterior.**

```bash
npm install
npm start
```

Abre [http://127.0.0.1:4310](http://127.0.0.1:4310). El flujo visual local no necesita credenciales de nube; por defecto, los archivos permanecen en tu dispositivo.

## Verificar cambios

```bash
npm run check
node --check public/app.js
node --check cloudflare/worker.js
```

`wrangler.jsonc` es una plantilla segura de Cloudflare, no una configuración de producción. Usa un `wrangler.production.jsonc` con tus propios recursos D1 y rate-limit, y nunca subas secretos a Git. Consulta el [README en inglés](README.md#optional-cloudflare-deployment) y [SECURITY.md](SECURITY.md).

El código se distribuye bajo [GNU AGPL v3.0](LICENSE). Consulta [TRADEMARK.md](TRADEMARK.md) para el nombre y el logotipo.
