# TERZİ Creator Studio — ürün ve ekip incelemesi

Tarih: 2026-09-10. Ürün, UX ve teknik kalite üç ayrı ajanla incelendi.
Kullanıcı hedefi: gelir üreten, tutarlı ürün ve kapsam içinde özerk geliştirme.

## Kanıt ve ticari hipotez

Mevcut arayüz iki yol içeriyor: AI içerik stüdyosu ve cihazda fotoğraftan video.
Atölye Pro için güvenli hesap, yetkilendirme ve Stripe Checkout/Portal altyapısı
eklendi; canlı Stripe anahtarları tanımlanmadığı ve dağıtım yapılmadığı için satış
henüz açık değildir. Kendi API anahtarını kullanmak TERZİ için gelir değildir.
Talep veya satış kanıtı bu incelemede bulunmadı.

Ürünü satmak ile üretilen içerikten gelir kazanmak farklı iş modelleridir.
Ticari yön kesinleşene kadar mevcut akışları koru, ilk kullanılabilir çıktı
yolculuğunu iyileştir. Fiyat, gelir veya dönüşüm oranı uydurma.

Doğrulanacak dar teklif: küçük satıcıların kendi ürün fotoğraflarından tekrar
kullanılabilir sosyal video paketleri. Mevcut ürün şablonuyla denenebilir; bu
bir öneridir, müşteri talebi veya onaylanmış ürün yönü değildir.

Genel fotoğraftan video vaadi tek başına farklılaşma kanıtı değil:
- https://www.canva.com/create/photo-videos/
- https://www.capcut.com/create/photo-video-maker

Kendi kanalından gelir modeli seçilirse güncel platform uygunluğu ayrıca
değerlendirilmeli; otomatik video sayısı gelir kanıtı değildir:
https://support.google.com/youtube/answer/1311392?hl=en-EN

## İlk iyileştirme: güvenilir yerel video

- Mobil oluşturma düğmesini masaüstündeki gerçek uygunluk ve meşgul durumuyla eşitle.
- Devre dışı mobil düğmeyi gizleme; durum metnini göster.
- Yerel taslak, kurtarma ve video yüklemesini sunucu bağlantısından bağımsız başlat.
- Geciken yerel video yüklemesinin yeni üretimi ezmesini önle.
- Gerçek fonksiyonları izole DOM ile çalıştıran davranış testleri ekle.

Bu iş gelir doğrulaması veya kapsamlı tasarım yenilemesi değildir.

## İlk güvenilirlik turu tamamlandı

- Yerel video düğmesi mobilde gerçek render durumuyla eşitlendi.
- Yerel taslak ve çıktı yükleme sunucudan bağımsız başlatılıyor.
- Cloudflare Worker state yazımı kayıt bazlı birleştirme ve D1 compare-and-swap
  ile çakışan kayıtları sessizce ezmiyor.
- Demo rezervasyonu Workers AI bağı olmasa da alınabiliyor; deterministik Türkçe/İngilizce
  geri dönüş paketi boş ekranı önlüyor. Ömürlük atomik kota üretim/kayıt hatasında
  iade ediliyor ve başarılı kayıttan sonra korunuyor.
- Aktif workspace çerezi her yanıtta yenileniyor.
- R2 bulut videoları dosya, parça ve workspace kotasıyla sınırlandırılıyor; gerçek
  nesne boyutu beyanla eşleşmezse kayıt başarısız sayılıp nesne kaldırılıyor. Kota
  veritabanı tetikleyicisiyle yarışa dayanıklı; yarım yüklemeler iptal/süre aşımıyla
  kotadan çıkıyor ve video yanıtları HTTP Range destekliyor.
- Telegram onay tokenı atomik tüketiliyor; grup onayları editör kullanıcı allowlist'i
  istiyor ve aynı proje için yalnızca bir bekleyen mesaj oluşturuluyor.
- İlk kullanımda dil/yasal/karşılama pencereleri üst üste açılmıyor; örnek CTA
  gerçek yerel projeyi açıyor ve AI seslendirme açık bir tercih hâline geldi.
- Kullanıcı onayı etkinse otomatik üretim artık içeriği kullanıcı adına onaylamıyor.
- 409 iş kuralı hataları eşzamanlı düzenleme çakışması gibi gösterilmiyor; uzun
  seslendirmeler 4.000 karakterde kesilmeden güvenli parçalara ayrılıyor.

25 otomatik test geçti; Worker sözdizimi kontrolü ve yerel D1 migration zinciri
ayrıca geçti. Gerçek uzak Cloudflare ve gerçek tarayıcı video üretim akışı henüz
canlıda doğrulanmadı.

## Mobil ölçek ve erişilebilirlik turu tamamlandı

- Alt navigasyon ve flow eylem çubuğu iPhone güvenli alanıyla birlikte büyüyor;
  içerik bu iki sabit katmanın arkasında kalmıyor.
- Mobil klavye metin alanında açıldığında sabit alt katmanlar gizleniyor ve aktif
  alan görünür bölgenin ortasına taşınıyor.
- Tam ekran ayarlar açıldığında alt navigasyon gizleniyor; kaydet/vazgeç alanı
  ekranın altında erişilebilir kalıyor.
- Hesap, AI, dil, yasal, karşılama, toplu metin, kadraj ve kurulum pencereleri
  `100dvh` sınırında kaydırılabilir hâle getirildi.
- 320 piksel genişlikte üst bar, yayın kiti, proje görsel başlığı ve toplu seçim
  araçları taşmak yerine sarılıyor. Küçük kritik düğmeler 44×44 dokunma hedefi aldı.
- PWA önbelleği güncel mobil CSS ve JavaScript'in eski kurulumlara ulaşması için
  `v26` sürümüne yükseltildi.

Bu turdaki doğrulama kaynak/cascade incelemesi, JavaScript sözdizimi ve otomatik
regresyon testlerini kapsıyor. Fiziksel iOS/Android cihaz matrisi henüz çalıştırılmadı.

## Açık arşiv görsel çeşitliliği tamamlandı

- Otomatik üretim artık ilk risksiz arşiv sonucunu bütün sahnelerde tekrarlamıyor.
- Kullanıcı 4, 6 veya 8 farklı görsel yoğunluğu seçebiliyor; varsayılan 6.
- Risk işaretli, aynı kimlikli veya aynı önizlemeye sahip sonuçlar eleniyor; güvenli
  sonuçlar üretimden önce sunucuda yeniden doğrulanıp hikâyeye bağlanıyor.
- Görsel sayısı yetersizse akış bozulmadan mevcut güvenli sonuçlarla devam ediyor
  ve sonuç mesajı tek görsele düşüldüğünü açıkça belirtiyor.
- Cloudflare Worker ile yerel backend'in projeye arşiv görseli ekleme ve tekrar
  engelleme davranışı eşitlendi.

## Seslendirme ve ekrandaki yazı eşleştirmesi tamamlandı

- Proje seslendirmesi ile kısa sahne özetleri artık iki ayrı metin kaynağı olarak
  render edilmiyor. Anlatım, kelimeleri kaybetmeden sahnelere bölünüyor ve aynı
  parçalar hem ses zaman çizelgesini hem ekrandaki yazıyı besliyor.
- Gerçek ses süresi sahnelere kelime ve noktalama yoğunluğuna göre dağıtılıyor;
  geçiş animasyonu sonraki sahnenin yazısını erken göstermiyor.
- Aralık biçimindeki sahne süreleri (`0-6`) gerçek saniye uzunluğuna çevriliyor.
- Sahne metni, sırası veya sayısı değiştiğinde ses kaynağı mevcut sahne sırasından
  yeniden kuruluyor.
- Yerel Python render SRT toplamını tahmini konuşma hızından değil sentezlenen sesin
  gerçek süresinden alıyor; böylece sesin sonunun kesilme riski azaltıldı.

## Hesap ve gelir altyapısı turu tamamlandı

- Parolalar kullanıcıya özel salt ile PBKDF2-SHA256 kullanılarak saklanıyor;
  oturumun yalnız özeti D1'da, ham token Secure/HttpOnly/Strict çerezde tutuluyor.
- Anonim çalışma alanı kayıt sırasında hesaba sahipleniliyor; çıkıştan sonra anonim
  çerez sahiplenilmiş alana yeniden erişemiyor.
- Ücretsiz ve Pro yetkileri sunucu tarafında uygulanıyor. Yönetilen görsel, bulut
  medya ve geniş ses kotası yalnız etkin veya deneme durumundaki Pro hesaba açık.
- Stripe Checkout fiyatı istemciden alınmıyor; sunucudaki fiyat kimliği kullanılıyor.
  Portal yalnız hesaba bağlı Stripe müşteri kimliğiyle açılıyor.
- Webhook imzası ham gövde üzerinden ve zaman toleransıyla doğrulanıyor. Olaylar
  kimlik ve oluşturulma sırasına göre tekilleştiriliyor; henüz hedefi oluşmamış olay
  tüketilmeyerek yeniden denemeye bırakılıyor.
- Yalnız `active` ve `trialing` abonelik durumları Pro erişimi veriyor. Fatura
  olayları müşteri kimliğiyle değil tam abonelik kimliğiyle eşleşiyor.
- Yerel D1 üzerinde kayıt, giriş, oturumlu state ve çıkış akışları doğrulandı;
  oluşturulan test hesabı ve çalışma alanı temizlendi.

Canlı satış öncesi zorunlu ürün işleri: doğrulanmış e-posta, parola sıfırlama,
işletme/fatura metinleri, iade koşulları ve gerçek Stripe test-mode uçtan uca testi.

## Sıradaki öncelikler

| Öncelik | Kanıt / sorun | Kabul ölçütü |
| --- | --- | --- |
| P0 | Worker dış servis çağrısı sırasında aynı kaydın değişmesi | Çakışma kullanıcıya açıklanıyor; dış çağrı tekrarlanmıyor |
| P1 | Demo rezervasyonu Worker kesintisinde takılı kalabilir | Sahiplik/lease ve güvenli kurtarma politikası |
| P1 | Hesap var, doğrulanmış e-posta/parola kurtarma yok | E-posta doğrulama ve güvenli parola sıfırlama |
| P1 | Üç giriş diyaloğu ve çok sayıda başlangıç yolu | Tek anlaşılır ilk çıktı yolu; mevcut seçimler korunur |
| P1 | Yerel veri vaadi bulut/AI yoluyla karışıyor | Her eylemde doğru saklama ve işlem açıklaması |
| P1 | Türkçe AI ses demo erişimi sunucu anahtarına bağlı | Anahtarsız demo baştan indirilebilir çıktıya doğrulanır |
| P2 | README mevcut ve gelecek özellikleri karıştırıyor | Yerel/tarayıcı/bulut yetenek tablosu |

## Teknik olmayan içerik üreticisi deneyimi turu tamamlandı

- Mobil alt menüdeki ana **Oluştur** eylemi artık ayrı cihaz aracına değil önerilen
  otomatik içerik üretim yoluna açılıyor; fotoğraflardan hızlı video ayrı seçenek
  olarak korunuyor.
- Otomatik brief yalnızca konu istemiyor: video amacı, hedef kitle ve anlatım tonu
  her proje için açıkça seçilebiliyor. Boş sayfa kaygısını azaltmak için örnek fikirler
  eklendi.
- “Videomu hazırla” şeklindeki yanıltıcı vaat “Taslağımı hazırla” olarak düzeltildi;
  yaklaşık bekleme ve sonraki adım seçimden önce açıklanıyor.
- Otomatik üretim, genel editör onayı ayarı açık olsa bile bir onay kuyruğunda
  durmuyor. Taslak düzenlenebilir kalıyor ve kullanıcı doğrudan video oluşturma
  adımına geçebiliyor.
- Üretimin dört gerçek aşaması formun içinde kalıcı ve ekran okuyucuya duyurulan
  bir durum alanında gösteriliyor. Hata durumunda ham servis mesajı yerine girdilerin
  korunduğu ve işlemin yeniden denenebileceği söyleniyor.
- Son kontrol ekranına başlık karakteri, tahmini video süresi, görsel sayısı ve üç
  somut içerik kontrolü eklendi. Teknik “render/FLUX/metadata/Credits” dili ana
  yolculukta “video hazırlanıyor/AI görseli/kullanım bilgileri/görsel kaynakları”
  olarak sadeleştirildi.
- Mobilde form alanları 16 piksel yapılarak iOS odak yakınlaştırması önlendi;
  veri aktarımı açıklaması tekrar görünür oldu, kadraj hedefi 44×44 piksele çıktı ve
  seslendirme ayarı yalnız Tasarım adımında gösteriliyor.

Tarayıcı doğrulamasında 390×844 ve 1366×900 görünümde yatay taşma görülmedi;
mobil form alanları 16px, ana eylem 52px ve gizlilik notu görünür doğrulandı.

## Açık arşiv ve AI taslak hata turu tamamlandı

- Türkçe konu cümlesi artık NASA/Wikimedia'ya ham metin olarak gönderilmiyor. Konu,
  kısa İngilizce görsel kavramlara çevriliyor; kullanıcı aramanın nasıl yorumlandığını
  sonuç ekranında görebiliyor.
- NASA yalnız uzay odaklı sorgularda kullanılıyor. Konu NASA'ya uygun değilse veya
  yeterli güvenli/çeşitli sonuç yoksa Wikimedia Commons otomatik yedek kaynak oluyor.
- Kullanım kontrolünden geçmeyen arşiv kartları hata veren aktif eylem sunmuyor;
  kart üzerinde neden kullanılamadığı görülüyor.
- Ücretsiz veya kendi metin API anahtarını kullanan ancak Pro olmayan hesaplarda
  yönetilen AI görsel yolu artık varsayılan değil. Erişim yoksa otomatik akış açık
  arşive geçiyor; böylece metin taslağından sonra 402 ile yarım kalmıyor.
- Başarısız kullanıcı-anahtarlı metin üretimi ve başarısız arşiv içe aktarımı artık
  tüketilen günlük kotayı geri veriyor. Worker model seçimi sağlayıcı allowlist'iyle
  doğrulanıyor; Claude JSON yanıtı için çıktı payı artırıldı.

## Gelir deneyi taslağı

Hedef segment ve teklif doğrulanmadan ödeme sistemi ekleme. Önce örnek çıktı,
teslim kapsamı, üretim süresi ve birim maliyet tablosu hazırla. Görüşme ve dış
iletişim mevcut yetki gerektirir. Ölçümler: ilk çıktı tamamlama, tekrar kullanım,
teklif kabulü, gerçek ödeme ve üretim başına maliyet. Yerel analitik işletme
geneli veri değildir; mevcut cihaz dışına aktarılmama sözünü koru.

## Doğrulama sınırları

Mevcut 30 testin bir bölümü kaynak sözleşmelerini denetliyor. Yeni davranış testleri
tarayıcı, gerçek video kodlama, canlı ödeme veya bulut eşzamanlılık testinin yerine geçmez.
Canlı dağıtım sonrası ana sayfa, istemci dosyaları, durum API'si ve Türkçe semantik
arşiv araması smoke testinden geçti; gerçek ücretli AI çağrısı yapılmadı.

## İşlev denetimi — 2026-09-26

- Kontrol merkezindeki **YouTube trendleri** başlangıç eylemi artık görünür bir
  sonuç bölümüne yönlenir; bölümün üstünde kalan `product-deferred` sınıfı
  kaldırıldı.
- Cloudflare dağıtımında kullanıcıdan Cloudflare API Token ve Account ID istenmez.
  Bu kimlik bilgileri Worker secret'ı olarak yönetilir; böylece arayüz Worker'da
  olmayan `/api/config/cloudflare` yoluna istek atmaz. Yerel sunucuda bu isteğe
  bağlı bağlantı yolu korunur.
- Doğrulama: `npm run check` (41 test), `node --check public/app.js` ve
  `node --check cloudflare/worker.js`. Yasal yaş beyanı kullanıcıya ait olduğu
  için, ilk açılıştaki onay perdesi aşılmadan yalnız salt-okunur tarayıcı kontrolü
  yapıldı; konsolda hata görülmedi.

## Başlangıç deneyimi iyileştirmesi — 2026-09-26

- Yan menüdeki **Yeni video** artık gerçekten açılır bir üretim adımları menüsüdür;
  ARIA genişletme durumu ile görünür davranış eşitlendi. Ana ekrandaki birincil
  CTA ise doğrudan otomatik üretim yolunu açmaya devam eder.
- Kontrol merkezi görünür bırakıldı; otomatik, manuel ve cihazda video üretim
  yolları ilk ekranda karşılaştırılabilir.
- Yaş beyanı yapılmadan önceki **Stüdyoya gir** düğmesi nötr pasif stilde
  gösterilir; etkin bir eylem izlenimi vermez.

## Doğal ses ve sade ürün yüzeyi

## Metin odaklı motivasyon paylaşımı

- Cihazda video akışına, fotoğraf gerektirmeyen bir motivasyon paylaşımı yolu eklendi.
- Kullanıcı her satıra bir cümle yazar; her cümle tasarımlı bir arka plan üzerinde ayrı sahne olur. Boş metinde düzenlenebilir örnek cümleler kullanılır.
- Bu yol görsel yüklemez, AI çağrısı yapmaz ve mevcut cihaz içi video, taslak, kapak ve yayın paketi akışlarıyla çalışır.

- Türkçe seslendirme, içerik türüne göre sıcak, belgesel, enerjik veya ilham verici
  konuşma yönetimi alan Gemini TTS yoluna taşındı. Daha sıcak `Sulafat` sesi seçildi;
  paragraf araları korunuyor ve uzun metin parçaları arasına kısa nefes payı ekleniyor.
- Türkçe desteği bulunmayan MeloTTS yedeği kaldırıldı. Gemini bağlantısı yoksa robotik
  bir çıktı üretmek yerine kullanıcıya Entegrasyonlar ekranındaki çözüm gösteriliyor;
  başarısız denemede ses kotası geri veriliyor.
- Yerel Edge TTS video renderı hızlandırılmıyor; konuşma hızı doğal varsayılana alındı.
- Ana navigasyon artık Ana sayfa, Projeler ve Yeni video odağında. Dosyalar, çöp kutusu
  ve ayrı hızlı-video girişi arayüzden kaldırıldı; mevcut veriler ve eski projelerin
  ihtiyaç duyduğu altyapı silinmedi.
- İkincil üretim yolları ve doğrulanmamış trend keşfi ana akıştan kaldırıldı. Sahte bir
  pazar metriği izlenimi veren anlatım açısı puanları da gösterilmiyor.

## Çok dilli proje üretimi

- İçerik ve ses dili artık proje başlangıcında seçilebiliyor; Türkçe, İngilizce,
  İspanyolca, Almanca, Fransızca, Portekizce, İtalyanca, Arapça, Hintçe, Çince,
  Japonca, Korece, Rusça, Felemenkçe, Lehçe, Endonezce, Vietnamca, Ukraynaca ve
  Tayca seçenekleri aynı sözleşmeyle yerel ve Cloudflare backend'e taşınıyor.
- Proje dili global kanal ayarından bağımsız olarak kaydediliyor. Böylece aynı kanalda
  farklı dillerde üretim yapılırken anlatım ve altyazı dili karışmıyor.
- Gemini TTS seçilen dilin koduna göre çalışıyor; yerel Edge TTS renderında da dil bazlı
  ses eşleştirmesi var. Gemini anahtarı olmadan Cloudflare MeloTTS yalnız kendi sınırlı
  dil kümesinde yedek olarak kullanılabiliyor.
- Yerel, anahtarsız demo metni güvenilir biçimde yalnız Türkçe ve İngilizce sunuyor;
  diğer dillerde kullanıcıya seçtiği metin sağlayıcısını bağlaması söyleniyor. Cloudflare
  Demo modelinde ise seçilen dil doğrudan üretim talimatına veriliyor.
- Model boş veya eksik JSON döndürürse üretim kaydedilmiyor; paket şeması doğrulanıyor,
  kota iade ediliyor ve kullanıcıya tekrar denemesi için sade bir hata gösteriliyor.
- Yerel ve Cloudflare Gemini üretimi yeni hesaplarda kullanılabilen kararlı
  `gemini-3.6-flash` modeline taşındı. Metin, görsel analizi, görsel üretimi ve
  Gemini TTS çağrıları önerilen `/v1beta/interactions` uç noktasını kullanıyor.
- Üretim artık tek sağlayıcıya kilitli değil: seçilen sağlayıcı hazır değilse onaylanmış
  OpenAI, Gemini veya Claude anahtarlarından ilkiyle devam ediyor; kullanılan sağlayıcı
  istek başlığında açıkça taşınıyor ve backend aynı sağlayıcıyı seçiyor.
- Sağlayıcı değiştiğinde model de aynı sağlayıcının allowlist'inden yeniden çözülüyor;
  Gemini model adının OpenAI isteğine taşınması engellendi. OpenAI yanıtı strict JSON Schema
  ile başlık, hook, anlatım ve sahne alanlarını zorunlu üretiyor.
- Mobil alt navigasyon `Ana Sayfa · Oluştur · Projeler` olarak üç gerçek hedefe indirildi;
  Oluştur sabit orta kolonda, Ayarlar ise üst sağdaki mevcut düğmede. 390×844 tarayıcı
  render'ında merkez geometrisi ve görünür durum kontrol edildi.
- Yönetilen model kullanılamadığında Türkçe/İngilizce geri dönüş artık kaynak başlığı ve
  açıklamasından bir başlangıç taslağı oluşturuyor ve arayüzde `Kaynak taslağı` diye etiketleniyor.
  Diğer dillerde yanlışlıkla İngilizce içerik göstermek yerine entegrasyon gereksinimi açıklanıyor.
- BYOK Gemini ve OpenAI anahtarları artık yalnız hikâye için değil, otomatik ve editör içi
  AI görselleri için de doğrudan kullanılabiliyor.
- Sağlayıcı hataları artık yanlış biçimde “seçilen dil üretilemedi” mesajına çevrilmiyor;
  gerçek API, model, kota veya faturalandırma hatası kullanıcıya gösteriliyor.
- Metin sağlayıcılarına seçilen dili tüm kullanıcıya görünen alanlarda koruyan açık bir dil
  sözleşmesi gönderiliyor. Yeni anahtar kaydından sonra zorunlu aktarım rızası aynı akışta tamamlanıyor.
- Entegrasyonlar ekranı teknik model listesinden önce tek servis seçimine indirildi. Kullanıcıya
  üç anahtar gerekmediği, Gemini'nin tek anahtarla metin, görsel, fotoğraf analizi ve sesi açtığı;
  OpenAI ve Claude seçeneklerinin sınırları kart üzerinde anlatılıyor.
- Model seçimi varsayılan akıştan kaldırılıp “Gelişmiş” ayrıntısına taşındı. TERZİ sağlayıcı
  değiştiğinde dengeli modeli otomatik seçiyor; isteyen kullanıcı modeli ayrıca değiştirebiliyor.

## Açık arşivden hikâye üretimi

- Arşiv kartındaki eylem artık görseli yalnızca fikir kuyruğuna bırakmıyor. Tek veya çoklu
  görsel seçiminde kaynak içe aktarılıyor, varsayılan anlatım açısı hazırlanıyor, seçili AI
  sağlayıcısı hikâyeyi yazıyor ve sonuç doğrudan proje editöründe açılıyor.
- Kayıtlı bir API anahtarının veri aktarım onayı eksikse yönetilen demoya sessiz geçiş
  yapılmıyor. Onay ekranı açılıyor ve onaydan sonra aynı arşiv eylemi otomatik sürdürülüyor.
- Hiç anahtar yoksa kullanılabilir demo açıkça kaynak taslağı olarak çalışmaya devam ediyor.
  Üretim hatasında içe aktarılan kaynak korunuyor ve Hikâye ekranından tekrar denenebiliyor.
- Arşiv sorgusu semantik AI analizi değilse arayüz artık “görsel niyetiyle” iddiasında
  bulunmuyor; gerçek durumu “anahtar kelimelerle arandı” olarak gösteriyor.
- Regresyon kapsamı 39 teste çıkarıldı. Gerçek ücretli sağlayıcı çağrısı testlerde yapılmıyor.

## Teknik olmayan kullanıcı için paket sadeleştirmesi

- Normal Cloudflare ürün yolculuğu artık API anahtarı istemiyor. İlk tam otomatik proje
  ücretsiz deneme hakkından, sonraki yönetilen projeler Atölye Pro yetkisinden çalışıyor.
- Plan dili `Ücretsiz / Atölye Pro` olarak sadeleştirildi. Gemini, OpenAI ve Claude anahtarı
  bağlama ekranı plan olmaktan çıkarılıp kapalı bir `Gelişmiş: Kendi AI hesabımı bağla`
  bölümüne taşındı; teknik kullanıcılar için geriye dönük BYOK desteği korunuyor.
- Pro backend sözleşmesi düzeltildi: anahtarsız Pro kullanıcı ayda 30 yönetilen hikâye
  projesi üretebiliyor. Yönetilen üretim Cloudflare Workers AI üzerinde yapılandırılmış
  çıktı kullanan Llama 3.3 70B yolunu kullanıyor; başarısız çağrı kotayı geri veriyor ve
  ücretli kullanıcıya düşük kaliteli deterministik fallback gösterilmiyor.
- Kendi AI anahtarını kullanan metin, görsel ve ses çağrılarından TERZİ ürün kotası
  kaldırıldı; yalnız güvenlik/rate-limit sınırı devam ediyor. Sağlayıcı maliyeti kullanıcıya ait.
- Hoş geldin ekranındaki `İlk videomu oluştur` eylemi artık İngilizce sabit bir cihaz demosuna
  atlamıyor; örnek Türkçe konuyla gerçek otomatik üretim formunu açıyor.
- Ödeme altyapısı yapılandırılmamışsa `Pro'ya geç` aktif bir satın alma vaadi sunmuyor ve
  `Yakında` olarak devre dışı kalıyor. Ücretli lansmandan önce e-posta doğrulama/parola
  kurtarma, Türkçe yönetilen TTS ve gerçek maliyet tabanlı fiyat doğrulaması hâlâ zorunlu.
- Pahalı yönetilen denemenin çerez silerek tekrarlanmasını azaltmak için tam otomatik deneme
  ücretsiz hesaba bağlandı; manuel cihaz içi üretim hesapsız ve ücretsiz kalıyor. Yönetilen AI
  binding'i hazır değilse ödeme akışı backend ve arayüzde kapalı kalıyor.
- Yönetilen hikâye şeması artık tam altı sahneyi, üç hook seçeneğini, altı başlık seçeneğini,
  merak boşluğunu, payoff'u ve her sahnenin görsel amacını zorunlu tutuyor. Böylece prompt ile
  structured-output sözleşmesi arasındaki kalite kaybı kaldırıldı.
- Plan ve karşılama metinleri İngilizce/İspanyolca tamamlandı; Pro ve Ücretsiz kartların aktif
  durumu karşılıklı dışlayıcı yapıldı. Mobil üst çubuk dar ekranlarda ikonlara sadeleşiyor ve
  çentikli ekran safe-area yönleri düzeltildi.
- Pro kartı kalan aylık hikâye hakkını gösteriyor. AI görsellerinin ayrıca günlük adil kullanım
  sınırı olduğu satış metninde açıkça belirtiliyor; seçili dil Melo tarafından desteklenmiyorsa
  yönetilen ses yeteneği yanlış biçimde açık gösterilmiyor.
- Regresyon kapsamı 40 teste çıkarıldı. Gerçek ödeme veya ücretli model çağrısı yapılmadı.

## 25 Eylül 2026 canlı lansman hazırlığı

- Yeni hesaplar e-posta doğrulaması tamamlanana kadar yönetilen deneme ve ödeme açamıyor.
  Doğrulama ve parola sıfırlama bağlantıları hash'lenmiş, süreli, tek kullanımlık D1
  tokenlarıyla ve Resend üzerinden çalışıyor; public hesap eylemleri Turnstile ile korunuyor.
- Stripe, e-posta, bot koruması, yönetilen AI/ses ve gerçek işletme kimliği birlikte hazır
  olmadan backend ödeme düğmesini açmıyor. Uygulama eksikleri `launchReadiness` ile raporluyor.
- Hikâye, ses ve görsel üretiminin her birine hesap kotasına ek global günlük harcama devre
  kesicisi eklendi. Başarısız sağlayıcı çağrıları hem kullanıcı hem global kotayı geri alıyor.
- Hesap silme parolayı tekrar istiyor, R2/D1 verilerini kaldırıyor ve terminal durumda olmayan
  bağlı Stripe aboneliği varsa silmeyi reddediyor.
- Ürün hunisi yalnız günlük toplu sayımlarla izleniyor. İzin verilen boyutlar dil, yüzey ve
  sonuç; konu, hikâye, e-posta veya kullanıcı metni analitiğe yazılmıyor.
- Mobil paket mağaza öncesi kalıcı `com.orbitvideolab.terzi` kimliğine taşındı; cleartext ve
  yedekleme kapatıldı, paylaşım yolları daraltıldı, release R8 etkinleştirildi. Release AAB
  derlendi fakat kullanıcıya ait Play App Signing anahtarı olmadan bilinçli olarak imzalanmadı.
- Kalan dış bağımlılıklar: gerçek ticari kimlik ve destek adresi, doğrulanmış e-posta alan adı,
  Turnstile/Resend/Stripe secretları, Stripe test webhook senaryosu, Android upload anahtarı,
  mağaza hesabı ve gerçek cihaz kapalı testidir. Bunlar tamamlanmadan ücretli lansman hazır
  sayılmaz; kod ödeme yolunu kapalı tutar.

## 27 Eylül 2026 test ve kullanıcı akışı düzeltmesi

- Birim/regresyon paketi, çalışan `Dosyalar`, `Çöp kutusu` ve masaüstü `Hızlı video`
  alanlarının gezinmeden CSS ile saklanmadığını; şablonların erişilebilir seçili durumunu ve
  kullanılmayan Pro teklifinin ödeme/hesap akışını açmadığını doğrular.
- Şablon seçimi artık hem görünür adla hem `aria-pressed` durumuyla geri bildirim verir.
  Bu, Canva/CapCut'taki “şablonu kullan, sonra kişiselleştir” davranışına yakındır; seçim
  üretimi başlatmaz.
- Ödeme altyapısı kapalıyken AI bağlantı penceresindeki Atölye Pro denetimi açıkça devre dışı
  ve açıklamalıdır; hazır olduğunda aynı denetim gerçek Pro inceleme eylemine dönüşür.
- Yasal bilgi penceresi Escape ile kapatılabilir. Yaş beyanı gerektiren giriş kapısı otomatik
  testte geçilmedi; bu, kullanıcı adına yapılamayan bir beyan olduğu için bilinçli sınırdır.
- Doğrulama: `npm run check` (43/43) ve istemci/Worker sözdizim kontrolleri geçti. Güncel
  PWA paketinde masaüstü gezinme alanları görünür, yaş-beyan düğmesi beyan yapılmadan devre dışı
  ve kapalı iş akışı menüsü doğru `aria-expanded`/`hidden` durumunda; yasal pencere Escape ile
  kapandı. Gerçek ödeme, ücretli AI, yükleme veya yayın çağrısı yapılmadı. Kalan manuel kapsama:
  klavye odak hapsi, mobil cihazda medya seçme/render ve gerçek hesabın ağ-hata toparlanması.

## 12 Ekim 2026 pazarlama vaadi ve canlı-test sınırı

- Ürünün ana vaadi `Fikrinden veya fotoğraflarından düzenlenebilir Shorts taslağı` olarak
  netleştirildi. Başlangıç ekranı ve karşılama akışı, genel bir AI video aracı vaadi yerine
  fikir/fotoğraf → taslak → kontrol → indirme yolunu anlatır.
- Ücretsiz teklif açık sınırlarıyla yazılır: cihazdaki video üretimi ücretsizdir; otomatik demo,
  yalnız doğrulanmış ücretsiz hesapla bir kez ve yönetilen hizmet hazırsa çalışır. Bu nedenle
  `ücretsiz AI video`, `sınırsız` ve koşulsuz `API anahtarı gerekmez` iddiaları kullanılmaz.
- Atölye Pro ödemesi canlılık kontrolleri tamamlanmadıkça kapalı kalır. Açıldığında vaat,
  ayda 30 yönetilen hikâye ve AI görselleri için günlük adil kullanım sınırıyla sınırlıdır.
- Canlı smoke testleri; gezinme, modal/klavye, örnek cihaz-içi proje, taslak kurtarma ve mobil
  görünümle sınırlı tutulmalıdır. Gerçek ödeme, yönetilen AI, YouTube/Telegram, kişisel dosya
  yükleme veya hesap silme test hesabı ve ayrı test ortamı olmadan yapılmaz.
