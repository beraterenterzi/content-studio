# TERZİ

## Android uygulaması

Android kabuğu Capacitor ile `android/` dizininde tutulur. Uygulama kimliği
`com.orbitcontentfactory.app` olarak ayarlanmıştır. Mobil uygulama, gizli API
anahtarlarını telefona gömmek yerine HTTPS üzerinden Cloudflare backend'ine bağlanır.

Android Studio ve JDK 21 kurulduktan sonra:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run mobile:sync
& 'C:\Program Files\nodejs\npm.cmd' run mobile:open
```

Android Studio içinden bir telefon veya emülatör seçip `Run` ile başlatılabilir.
Komut satırından bağlı cihaza kurmak için `npm run mobile:run` kullanılabilir.

Türkçe YouTube Shorts için konu kuyruğu, özgün AI içerik paketi ve insan
onayı sağlayan yerel kontrol merkezi.

## Çalıştırma

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run setup-render
& 'C:\Program Files\nodejs\npm.cmd' start
```

Ardından `http://127.0.0.1:4310` adresini aç. Anahtarsız kullanımda demo
içerik oluşur. Gerçek AI için:

```powershell
$env:OPENAI_API_KEY='...'
$env:OPENAI_MODEL='gpt-5-mini'
& 'C:\Program Files\nodejs\npm.cmd' start
```

Gemini ile senaryo ve dikey sahne görselleri için:

```powershell
$env:GEMINI_API_KEY='...'
$env:GEMINI_TEXT_MODEL='gemini-3.6-flash'
$env:GEMINI_IMAGE_MODEL='gemini-3.1-flash-image'
$env:GEMINI_IMAGES_PER_RUN='1'
& 'C:\Program Files\nodejs\npm.cmd' start
```

Arayüzde sağlayıcı olarak Gemini seçilir. Görseller yalnızca içerik paketi
onaylandıktan sonra üretilir ve `outputs` klasörüne kaydedilir.
Gemini görsel kotası sıfırsa sistem otomatik olarak ücretsiz yerel SVG
sahneleri üretir; süreç durmaz ve ek API ücreti oluşmaz.

## YouTube trend keşfi

Google Cloud Console'da YouTube Data API v3 hizmetini etkinleştirip bir API
anahtarı oluştur. Anahtarı arayüzde `Ayarlar > Entegrasyonlar > YouTube Data
API` bölümünden ekleyebilir veya `.env` dosyasına yazabilirsin:

```powershell
$env:YOUTUBE_API_KEY='...'
& 'C:\Program Files\nodejs\npm.cmd' start
```

Kaynak ekranındaki YouTube Pulse paneli `mostPopular` listesini ülke ve
kategoriye göre getirir. Bir sonuç fikir kuyruğuna aktarılırken video yalnızca
araştırma sinyali olarak kaydedilir; başlık, metin veya küçük resim üretim
varlığı olarak kopyalanmaz.

### YouTube kanalına gizli yükleme

Google Cloud Console'da `Web application` türünde bir OAuth istemcisi oluştur
ve izin verilen yönlendirme adresine
`http://127.0.0.1:4310/api/youtube/oauth/callback` değerini ekle. Ardından
`.env` içindeki `YOUTUBE_OAUTH_CLIENT_ID`, `YOUTUBE_OAUTH_CLIENT_SECRET` ve
`YOUTUBE_OAUTH_REDIRECT_URI` alanlarını doldur. Renderı hazır bir projede
`YouTube'a gizli yükle` düğmesi ilk kullanımda kanal iznini ister. Yenileme
tokenı yerel `.env` dosyasında tutulur ve arayüze geri gönderilmez.

Yüklemeler her zaman `private` başlar. Yayına alma, planlama veya görünürlüğü
değiştirme işlemi YouTube Studio'da ayrıca yapılır.

## Telegram editör onayı

BotFather ile bir bot oluştur ve botla hedef sohbetten en az bir mesaj paylaş.
Yerel sunucuda bot tokenı ile sayısal Chat ID değerini `Ayarlar > Entegrasyonlar
> Telegram Bot` bölümüne girebilirsin. Cloudflare sürümünde bu bilgiler arayüzden
kaydedilmez; Worker secret'ları olarak tanımlanmalıdır:

```text
TELEGRAM_BOT_TOKEN=123456789:...
TELEGRAM_CHAT_ID=123456789
TELEGRAM_EDITOR_USER_IDS=123456789
TELEGRAM_WEBHOOK_SECRET=uzun-rastgele-bir-deger
```

Grup sohbeti kullanılıyorsa `TELEGRAM_EDITOR_USER_IDS` alanına onay verebilecek
Telegram kullanıcı kimliklerini virgülle ayırarak yaz. Bu allowlist olmadan grup
üyelerinden gelen onay ve ret işlemleri kabul edilmez.

Cloudflare dağıtımından sonra Telegram webhook'unu bir kez kaydet. Aşağıdaki
değerleri kendi bot tokenın, alan adın ve aynı webhook secret ile değiştir:

```powershell
$body = @{ url = "https://uygulaman.example/api/telegram/webhook"; secret_token = "uzun-rastgele-bir-deger" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" -ContentType "application/json" -Body $body
```

Proje editöründeki `Telegram'a gönder` düğmesi başlık, format ve kancayı iki
inline düğmeyle yollar. Telegram'da verilen onay veya ret, `Yanıtı kontrol et`
düğmesiyle projeye işlenir. Yalnızca yapılandırılmış Chat ID'den gelen ve hâlâ
bekleyen istekler kabul edilir.

## Hesaplar ve Atölye Pro ödemeleri

Cloudflare sürümü e-posta/parola hesabı, e-posta doğrulama, parola sıfırlama,
30 günlük güvenli oturum, anonim workspace'i hesaba bağlama ve `free`/`pro`
yetkilendirmesi içerir. Üretim öncesi tüm D1 migration'larını uygula. Yeni
hesapların yönetilen denemeyi kullanabilmesi ve ödeme başlatabilmesi için
e-posta adresi doğrulanmış olmalıdır.

### Canlı lansman kapısı

Worker `/api/state` yanıtında `runtime.launchReadiness` alanıyla eksikleri
raporlar ve tüm kontroller geçmeden ödeme düğmelerini kapalı tutar. Canlıda şu
değerlerin secret/var olarak tamamlanması gerekir:

```text
APP_ORIGIN=https://uygulaman.example
BUSINESS_NAME=Gerçek ticari unvan
BUSINESS_ADDRESS=Tebligat adresi
SUPPORT_EMAIL=destek@uygulaman.example
RESEND_API_KEY=re_...
EMAIL_FROM=TERZI <noreply@uygulaman.example>
TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...
OPENAI_API_KEY=... # veya GEMINI_API_KEY; yönetilen ses için
MANAGED_DAILY_PROJECT_CAP=100
MANAGED_DAILY_TTS_CAP=200
MANAGED_DAILY_IMAGE_CAP=300
```

Migration ve dağıtım sırası:

```powershell
npx wrangler d1 migrations apply orbit-ai-studio-db --remote
npm run check
npx wrangler deploy
```

Ardından gerçek bir doğrulama e-postası, parola sıfırlama bağlantısı, Stripe test
checkout/webhook/portal akışı ve hesap silme engeli test edilmelidir. `BUSINESS_*`
ve `SUPPORT_EMAIL` gerçek bilgiler olmadan ücretli lansman açılmaz.

Atölye Pro için Stripe'ta aylık bir recurring Price oluştur ve Worker secret'ları
olarak aşağıdaki değerleri tanımla:

```text
STRIPE_SECRET_KEY=sk_...
STRIPE_PRICE_PRO=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Stripe webhook adresini `https://<alan-adı>/api/billing/webhook` olarak ekle;
`checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`,
`customer.subscription.updated` ve `customer.subscription.deleted` olaylarını
seç. İmza doğrulaması ham istek gövdesiyle yapılır ve tekrar gelen event'ler D1
üzerinde idempotent işlenir. Checkout ve müşteri portalı yalnız giriş yapmış
kullanıcının sunucu taraflı kimliğiyle oluşturulur; istemciden Price veya Customer
ID kabul edilmez.

## Çalışan akış

1. Kanal nişi ve hedef kitle ayarı
2. Konu ve kaynak notu ekleme
3. OpenAI ile özgün Shorts paketi (veya anahtarsız demo)
4. Senaryo ve sahne planını editör incelemesine sunma
5. Onaylama/reddetme ve yerel kayıt
6. Edge TTS ile Türkçe MP3 seslendirme
7. NASA görseli, ses ve hareketten 1080x1920 H.264/AAC MP4

## Uçtan uca üretim

Arayüz dört adımdır: NASA kaynağı seç, Gemini ile hikâye üret, editör
onayı ver ve Video Laboratuvarı'nda render başlat. Hazır olduğunda MP4,
MP3 ve SRT ayrı ayrı oynatılabilir veya indirilebilir.

## Ücretsiz NASA akışı

Arayüzde NASA arşivinde konu aranabilir. Seçilen içeriğin NASA ID, başlık,
açıklama, tarih, merkez, fotoğrafçı ve kaynak sayfası senaryo girdisine
eklenir. Belirgin üçüncü taraf telif ibaresi bulunan içeriklerin otomatik
içe aktarımı durdurulur; kişi ve logo riski ayrıca gösterilir.

Sonraki aşama: YouTube trend toplama, MoneyPrinterTurbo/FFmpeg render,
gizli YouTube yüklemesi ve Telegram onayı.
