# YouTube AI Studio

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
