# Barkod Ustası

Tarayıcıda barkod oluşturup görselleri veya kamerayı kullanarak barkod okuyabileceğiniz; ayrıca PNG barkodları terminalden üretebileceğiniz bir TypeScript ve Node.js projesi.

## Özellikler

- Code 128, EAN-13, EAN-8, UPC-A, Code 39, QR Code, Data Matrix, PDF417 ve ITF-14 biçimlerinde barkod üretimi
- Tarayıcıda PNG ve SVG olarak dışa aktarma
- Yüklenen bir görselden barkod ve QR kodu okuma
- İzin verildiğinde cihaz kamerasıyla canlı tarama
- Toplu barkod üretimi, örnekler ve terminal benzeri etkileşimli arayüz
- Ayrı Node.js CLI ile terminalden PNG oluşturma

## Teknolojiler

- React 19, TypeScript ve Vite
- bwip-js ile barkod üretimi
- ZXing ile görsel ve kamera taraması
- Tailwind CSS ve Lucide React

## Gereksinimler

- Node.js 20.19+ veya 22.12+
- npm

## Tarayıcı arayüzünü çalıştırma

```bash
npm install
npm run dev
```

Vite geliştirme sunucusu `http://localhost:3000` adresinde açılır. Kamera taraması için tarayıcı izni gerekir; kamera erişimi `localhost` veya HTTPS üzerinden kullanılmalıdır.

## Barkod CLI

Bağımsız `barcode-cli.js` betiği aynı proje bağımlılıklarını kullanır:

```bash
# Etkileşimli menü
node barcode-cli.js

# PNG barkod üret
node barcode-cli.js generate "ENES2026" --type code128 --output ./barkod.png

# Dosya bilgilerini görüntüle
node barcode-cli.js read ./barkod.png
```

**Not:** CLI'daki `read` komutu dosyanın varlığını ve temel dosya bilgilerini gösterir; barkod içeriğini çözmez. Görseldeki barkodu okumak için tarayıcı arayüzündeki görsel yükleme veya kamera tarama özelliğini kullanın.

## Denetim ve üretim derlemesi

```bash
npm run lint
npm run build
npm run preview
```

`npm run lint`, TypeScript denetimini; `npm run build`, üretim derlemesini çalıştırır. `npm run preview`, derlemeyi yerel olarak sunar.

## Veri ve gizlilik

Uygulama barkodları tarayıcıda üretir ve okur; sunucuya veya harici bir API'ye göndermez. Kaydedilen barkod listesi aynı tarayıcıdaki `localStorage` içinde tutulur. Kamera kullanımı için açık tarayıcı izni gerekir. CLI betiği yalnızca belirttiğiniz yerel dosya yoluna yazma/okuma işlemleri yapar.

Örnek barkod içeriklerini gerçek ürün kodu, ödeme bilgisi veya üretimde kullanılacak benzersiz kimlik olarak değerlendirmeyin. EAN/UPC numaralarının gerçek ürünlerde kullanımı için ilgili standart ve tahsis kurallarına uyun.

## Proje yapısı

```text
barcode-cli.js       Node.js PNG üretim CLI'si
src/
  components/        Terminal, görsel stüdyo ve tarayıcı bileşenleri
  services/          Barkod üretimi, okuma ve ses yardımcıları
  types/             Barkod biçimleri ve sonuç türleri
```

## Lisans

Bu depoda bir açık kaynak lisansı bulunmuyor. Depoyu herkese açık görüntüleyebilirsiniz; kullanım ve yeniden dağıtım izinleri için hak sahibinden izin alın.
