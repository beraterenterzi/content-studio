# TERZİ Creator Studio Android yayın kontrol listesi

Android uygulaması Capacitor 8 kabuğudur ve üretimde
`https://terzi.orbitvideolab.workers.dev` adresini açar. Paket kimliği
`com.orbitvideolab.terzi`, ilk mağaza sürümü `1.0.0` (`versionCode 1`) olarak
sabitlenmiştir. Google Play'de ilk yüklemeden sonra paket kimliği değiştirilemez;
her yeni yüklemede `versionCode` artırılmalıdır.

## Yerel ön koşullar

- Node.js 22 veya üzeri (Capacitor 8 CLI gereksinimi)
- Android Studio, Android SDK 36 ve JDK 21
- Üretim backend'inin HTTPS üzerinden erişilebilir olması

Web varlıklarını ve Android projesini eşitle:

```powershell
npm ci
npm run mobile:sync
```

Bu proje uzaktaki üretim URL'sini kullandığı için `cap sync` ile kopyalanan
`public/` dosyaları uygulamanın ana çalışma kaynağı değildir. Buna rağmen native
bağımlılık ve yapılandırma değişikliklerinden sonra sync çalıştırılmalıdır.

## Doğrulama ve AAB

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
Set-Location android
.\gradlew.bat testDebugUnitTest lintRelease bundleRelease
```

İmzasız bundle çıktısı `android/app/build/outputs/bundle/release/` altında oluşur.
Mağazaya yüklenecek imzalı AAB için Android Studio'da **Build > Generate Signed
Bundle / APK > Android App Bundle** akışını kullan.

## İmzalama

1. Kuruluşa ait yeni bir upload keystore'u çevrimdışı ve şifreli bir konumda
   oluştur; repository'ye veya bulut build loglarına ekleme.
2. Google Play App Signing'i etkinleştir ve yalnız upload key ile yayın yap.
3. Keystore, alias ve parolaları Android Studio'nun yerel signing ayarlarında ya
   da CI secret'larında tut.
4. İmzalı AAB'yi önce Internal testing kanalına yükle; Play'in ürettiği APK'ları
   gerçek düşük/orta segment cihazlarda doğrula.

Bu repository imzalama anahtarı, parola veya mağaza hesabı oluşturmaz.

## Kapalı test kabul kriterleri

- İlk açılış, giriş/kayıt, parola kurtarma ve çıkış
- Türkçe ve İngilizce otomatik hikâye üretimi
- Galeriden dosya seçme, ses önizleme, video indirme ve Android paylaşım akışı
- Ağ kesilmesi, uygulamanın arka plana alınması ve oturum süresinin dolması
- 320–480 dp genişlikler, ekran klavyesi, sistem geri hareketi ve koyu/açık sistem
- Satın alma açıldığında Play Billing uyumu ve abonelik geri yükleme
- Crash/ANR, WebView ve API hata oranlarının izlenmesi

Kamera, Filesystem, Share, Network veya App için kullanılmayan Capacitor
pluginleri bilerek eklenmemiştir. Sadece paket kurmak native davranış sağlamaz ve
gereksiz izin/veri beyanı yüzeyi oluşturur. Ürün arayüzü native bir özelliği
çağırmaya başladığında ilgili resmi Capacitor plugini, hata ve web fallback'iyle
birlikte eklenmelidir.

## Google Play ve veri güvenliği dış bağımlılıkları

Yayın sahibi aşağıdakileri Google Play Console'da tamamlamalıdır:

- Geliştirici hesabı ve kimlik doğrulaması
- Uygulama adı, açıklama, telefon/tablet ekran görüntüleri, 512 px ikon ve feature
  graphic
- Herkese açık gizlilik politikası, destek e-postası ve hesap silme URL'si
- İçerik derecelendirmesi, hedef kitle, reklam ve uygulama erişimi beyanları
- Data safety formu ve veri saklama/silme açıklaması
- Internal testing test kullanıcıları ve gerekiyorsa inceleme hesabı

Data safety yanıtları koddan otomatik türetilmemelidir. Mevcut akış en azından
hesap e-postası, oturum verisi, kullanıcı metni/görseli, oluşturulan medya,
abonelik durumu, IP/güvenlik logları ve kullanılan AI/ödeme sağlayıcılarına veri
aktarımı açısından ürün sahibi ve hukuk danışmanı tarafından doğrulanmalıdır.

## Yayını durduracak konular

- Gizlilik politikası, kullanım koşulları, iade/abonelik şartları ve hesap silme
  akışı yayımlanmadan production kanalına çıkma.
- Dijital Pro aboneliğini Android uygulamasında web checkout ile satma. Google
  Play'in geçerli ödeme politikasına göre Play Billing uygulaması ve sunucu
  doğrulaması tamamlanmadan mobil ödeme CTA'sını açma.
- Uzak WebView kabuğunu tek başına mağaza değeri sayma. Kamera/galeri, güvenilir
  dosya kaydetme/paylaşma, üretim tamamlanma bildirimi veya kesintiden devam gibi
  mobil değerlerden en az biri kapalı test öncesinde ürün akışına eklenmelidir.
