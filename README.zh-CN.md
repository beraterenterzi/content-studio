# TERZİ Content Manager

一个本地优先、开源的工作区，可将创意和照片转化为可编辑的短视频项目。

[English](README.md) · [Türkçe](README.tr.md) · [Español](README.es.md) · **简体中文** · [Português (Brasil)](README.pt-BR.md)

## 开始使用

**需要 Node.js 20 或更高版本。**

```bash
npm install
npm start
```

打开 [http://127.0.0.1:4310](http://127.0.0.1:4310)。本地可视化流程不需要云端凭据；默认情况下媒体文件保留在你的设备上。

## 验证更改

```bash
npm run check
node --check public/app.js
node --check cloudflare/worker.js
```

`wrangler.jsonc` 是安全的 Cloudflare 模板，不是生产配置。请使用包含你自己的 D1 和速率限制资源的 `wrangler.production.jsonc`，并且不要把密钥提交到 Git。参阅[英文 README](README.md#optional-cloudflare-deployment) 和 [SECURITY.md](SECURITY.md)。

源代码采用 [GNU AGPL v3.0](LICENSE) 许可。名称和标志请参阅 [TRADEMARK.md](TRADEMARK.md)。
