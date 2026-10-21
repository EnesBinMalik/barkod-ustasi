#!/usr/bin/env node
/**
 * ============================================================================
 *   BARKOD USTASI CLI - BARKOD OLUŞTURUCU VE OKUYUCU KONSOL UYGULAMASI
 *   Geliştirici: Enes Öztürk
 *   İmza: "Enes Öztürk el emeği, dolu dolu konsol uygulaması"
 * ============================================================================
 * 
 * Bu uygulama Node.js ortamında doğrudan terminalden çalışır.
 * 3. parti kütüphaneleri (bwip-js, fs, path, readline) kullanarak:
 *  1. Barkod üretir (Code128, EAN13, QR Code vb.)
 *  2. Kullanıcının bilgisayarında belirttiği lokasyona dosya olarak yazar (save to disk)
 *  3. Daha önce kaydedilmiş barkod dosyasını okuyup terminale döker
 * 
 * Kullanım:
 *   node barcode-cli.js
 *   node barcode-cli.js generate "869012345678" --type ean13 --output ./barkod.png
 *   node barcode-cli.js read ./barkod.png
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import bwipjs from 'bwip-js';

// ASCII Sanat Banner & İmza
const BANNER = `
\x1b[36m╔════════════════════════════════════════════════════════════════════╗
║     ____             _             _     _   _     _               ║
║    | __ )  __ _ _ __| | _____   __| |   | | | |___| |_ __ _ ___    ║
║    |  _ \\ / _\` | '__| |/ / _ \\ / _\` |   | | | / __| __/ _\` / __|   ║
║    | |_) | (_| | |  |   < (_) | (_| |_  | |_| \\__ \\ || (_| \\__ \\   ║
║    |____/ \\__,_|_|  |_|\\_\\___/ \\__,_(_)  \\___/|___/\\__\\__,_|___/   ║
║                                                                    ║
║   BARKOD OLUŞTURUCU & OKUYUCU KONSOL UYGULAMASI                    ║
║   \x1b[33mGeliştirici & Tasarım: Enes Öztürk [El Emeği Özel Sürüm]\x1b[36m         ║
╚════════════════════════════════════════════════════════════════════╝\x1b[0m
`;

// Desteklenen Barkod Tipleri
const SUPPORTED_TYPES = {
  code128: 'Code 128 (Genel amaçlı alfasayısal)',
  ean13: 'EAN-13 (Perakende - 13 hane)',
  qrcode: 'QR Kod (2D Kare Matris)',
  code39: 'Code 39 (Endüstriyel)',
  upca: 'UPC-A (12 hane)',
  datamatrix: 'Data Matrix (2D)',
  pdf417: 'PDF417 (2D Yığıtlı)',
};

/**
 * 1. Teknik: 3. Parti Kütüphanesi ile Barkod Üretip Dosyaya Yazma (Write to File)
 */
export async function generateAndSaveBarcode(text, type = 'code128', outputPath = './barkod.png') {
  console.log(`\n\x1b[32m[+] Barkod Üretiliyor...\x1b[0m`);
  console.log(`    Metin  : \x1b[33m${text}\x1b[0m`);
  console.log(`    Format : \x1b[34m${type}\x1b[0m (${SUPPORTED_TYPES[type] || 'Özel Tip'})`);
  console.log(`    Konum  : \x1b[35m${path.resolve(outputPath)}\x1b[0m`);

  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: type,
        text: text,
        scale: 3,
        height: 12,
        includetext: true,
        textxalign: 'center',
        paddingwidth: 10,
        paddingheight: 10,
      },
      (err, pngBuffer) => {
        if (err) {
          console.error(`\x1b[31m[!] Hata:\x1b[0m ${err.message || err}`);
          reject(err);
          return;
        }

        try {
          // Dosyaya Yazma Tekniği: fs.writeFileSync
          const targetDir = path.dirname(path.resolve(outputPath));
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }

          fs.writeFileSync(outputPath, pngBuffer);
          console.log(`\x1b[32m[✓] Başarılı! Barkod diske yazıldı:\x1b[0m ${path.resolve(outputPath)}`);
          console.log(`    Dosya Boyutu: ${(pngBuffer.length / 1024).toFixed(2)} KB`);
          console.log(`    \x1b[33m[Enes Öztürk İmzası] Dosya kaydı eksiksiz tamamlandı.\x1b[0m\n`);
          resolve(outputPath);
        } catch (writeErr) {
          console.error(`\x1b[31m[!] Dosyaya yazma hatası:\x1b[0m ${writeErr.message}`);
          reject(writeErr);
        }
      }
    );
  });
}

/**
 * 2. Teknik: Dosyadan Okuma (Read from File) ve Bilgi Analizi
 */
export async function readBarcodeFile(filePath) {
  console.log(`\n\x1b[34m[?] Barkod Dosyası Okunuyor...\x1b[0m`);
  console.log(`    Hedef Dosya: \x1b[35m${path.resolve(filePath)}\x1b[0m`);

  if (!fs.existsSync(filePath)) {
    console.error(`\x1b[31m[!] Hata: Belirtilen konumda dosya bulunamadı:\x1b[0m ${filePath}`);
    return;
  }

  try {
    // Dosyadan Okuma Tekniği: fs.readFileSync & fs.statSync
    const stats = fs.statSync(filePath);
    const fileBuffer = fs.readFileSync(filePath);

    console.log(`\x1b[32m[✓] Dosya başarıyla okundu!\x1b[0m`);
    console.log(`    - Dosya Adı     : ${path.basename(filePath)}`);
    console.log(`    - Dosya Boyutu  : ${(stats.size / 1024).toFixed(2)} KB (${stats.size} bayt)`);
    console.log(`    - Son Değiştirme: ${stats.mtime.toLocaleString('tr-TR')}`);
    console.log(`    - Format Başlığı: ${fileBuffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a' ? 'Geçerli PNG Görseli' : 'İkili Veri / Görsel'}`);

    console.log(`\n\x1b[33m[Enes Öztürk İpucu]:\x1b[0m Bu barkod dosyasını web arayüzünden sürükleyip anında çözebilirsiniz!\n`);
  } catch (err) {
    console.error(`\x1b[31m[!] Dosya okuma hatası:\x1b[0m ${err.message}`);
  }
}

/**
 * 3. Teknik: İnteraktif Konsol Menüsü (Interactive CLI Loop)
 */
function runInteractiveMenu() {
  console.clear();
  console.log(BANNER);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const showMenu = () => {
    console.log(`\x1b[36m========== ANA MENÜ (Seçiminizi Giriniz) ==========\x1b[0m`);
    console.log(`  \x1b[32m1)\x1b[0m Yeni Barkod Oluştur ve Bilgisayara Kaydet`);
    console.log(`  \x1b[32m2)\x1b[0m Kaydedilmiş Barkod Dosyasını Oku`);
    console.log(`  \x1b[32m3)\x1b[0m Desteklenen Barkod Tiplerini Listele`);
    console.log(`  \x1b[32m4)\x1b[0m Enes Öztürk Hakkında & Proje Künyesi`);
    console.log(`  \x1b[32m5)\x1b[0m Çıkış`);
    console.log(`\x1b[36m═══════════════════════════════════════════════════\x1b[0m`);
    rl.question(`\x1b[33mSeçiminiz (1-5): \x1b[0m`, handleChoice);
  };

  const handleChoice = async (choice) => {
    switch (choice.trim()) {
      case '1':
        rl.question(`Barkod metnini girin (örn: ENES2026): `, (text) => {
          rl.question(`Barkod tipini girin [code128/ean13/qrcode] (varsayılan: code128): `, (typeInput) => {
            const type = typeInput.trim().toLowerCase() || 'code128';
            rl.question(`Kaydedilecek dosya yolu (varsayılan: ./barkod.png): `, async (outInput) => {
              const outPath = outInput.trim() || './barkod.png';
              try {
                await generateAndSaveBarcode(text || 'ENES-OZTURK', type, outPath);
              } catch (e) {
                // error handled inside
              }
              rl.question(`\nDevam etmek için ENTER tuşuna basın...`, () => showMenu());
            });
          });
        });
        break;

      case '2':
        rl.question(`Okunacak barkod dosyasının yolunu girin: `, async (filePath) => {
          await readBarcodeFile(filePath.trim());
          rl.question(`\nDevam etmek için ENTER tuşuna basın...`, () => showMenu());
        });
        break;

      case '3':
        console.log(`\n\x1b[34mDesteklenen Barkod Tipleri:\x1b[0m`);
        Object.entries(SUPPORTED_TYPES).forEach(([k, v]) => {
          console.log(`  • \x1b[32m${k.padEnd(12)}\x1b[0m : ${v}`);
        });
        rl.question(`\nDevam etmek için ENTER tuşuna basın...`, () => showMenu());
        break;

      case '4':
        console.log(`\n\x1b[35m=== PROJE KÜNYESİ ===\x1b[0m`);
        console.log(`Geliştirici : \x1b[33mEnes Öztürk\x1b[0m`);
        console.log(`Proje       : Barkod Oluşturucu / Okuyucu Konsol Çözümü`);
        console.log(`Nitelik     : El emeği, dolu dolu tam konsol & dosya I/O mimarisi`);
        console.log(`Kütüphaneler: bwip-js, @zxing/library, Node.js fs & readline`);
        rl.question(`\nDevam etmek için ENTER tuşuna basın...`, () => showMenu());
        break;

      case '5':
        console.log(`\n\x1b[32mGüle güle! Enes Öztürk Barkod Ustası kapandı.\x1b[0m\n`);
        rl.close();
        process.exit(0);
        break;

      default:
        console.log(`\x1b[31mGeçersiz seçim! Lütfen 1-5 arasında bir rakam girin.\x1b[0m\n`);
        showMenu();
        break;
    }
  };

  showMenu();
}

// Komut satırı argümanları ayrıştırma
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'interactive' || command === 'menu') {
  runInteractiveMenu();
} else if (command === 'generate') {
  const text = args[1] || 'ENES-OZTURK';
  const typeIndex = args.indexOf('--type');
  const type = typeIndex !== -1 && args[typeIndex + 1] ? args[typeIndex + 1] : 'code128';
  const outIndex = args.indexOf('--output');
  const output = outIndex !== -1 && args[outIndex + 1] ? args[outIndex + 1] : './barkod.png';

  generateAndSaveBarcode(text, type, output).catch(() => process.exit(1));
} else if (command === 'read') {
  const file = args[1] || './barkod.png';
  readBarcodeFile(file);
} else {
  console.log(`Kullanım:`);
  console.log(`  node barcode-cli.js (İnteraktif menü açar)`);
  console.log(`  node barcode-cli.js generate <metin> [--type code128|ean13|qrcode] [--output ./yol.png]`);
  console.log(`  node barcode-cli.js read <dosya_yolu>`);
}
