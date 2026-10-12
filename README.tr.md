# TERZİ Creator Studio

Fikirlerini ve fotoğraflarını düzenlenebilir kısa video projelerine dönüştüren yerel-öncelikli, açık kaynak çalışma alanı.

[English](README.md) · **Türkçe** · [Español](README.es.md) · [简体中文](README.zh-CN.md) · [Português (Brasil)](README.pt-BR.md)

## Başlangıç

**Node.js 20 veya yenisi gerekir.**

```bash
npm install
npm start
```

[http://127.0.0.1:4310](http://127.0.0.1:4310) adresini aç. Yerel görsel akış bulut kimlik bilgisi gerektirmez; medya varsayılan olarak cihazında kalır.

## Kontrol

```bash
npm run check
node --check public/app.js
node --check cloudflare/worker.js
```

`wrangler.jsonc` üretim ayarı değil, güvenli bir Cloudflare şablonudur. Kendi D1 ve rate-limit kaynaklarınla doldurduğun `wrangler.production.jsonc` dosyasını kullan; sırları Git'e ekleme. Ayrıntılar için [README](README.md#optional-cloudflare-deployment) ve [SECURITY.md](SECURITY.md) dosyalarına bak.

Kod [GNU AGPL v3.0](LICENSE) ile lisanslanmıştır. Marka kullanımı için [TRADEMARK.md](TRADEMARK.md) geçerlidir.
