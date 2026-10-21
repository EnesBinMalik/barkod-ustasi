import React, { useState } from 'react';
import { Terminal, Copy, Check, Download, ExternalLink, Code } from 'lucide-react';

interface CliModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CLI_SCRIPT_CONTENT = `#!/usr/bin/env node
/**
 * BARKOD USTASI CLI - BARKOD OLUŞTURUCU VE OKUYUCU KONSOL UYGULAMASI
 * Geliştirici: Enes Öztürk [El Emeği Özel Sürüm]
 * 
 * Kurulum:
 *   npm install bwip-js
 * 
 * Çalıştırma:
 *   node barcode-cli.js               (İnteraktif Konsol Menüsü)
 *   node barcode-cli.js generate "ENES2026" --type code128 --output ./barkod.png
 *   node barcode-cli.js read ./barkod.png
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import bwipjs from 'bwip-js';

// Enes Öztürk Konsol Bannerı
console.log("\\x1b[36m╔═══════════════════════════════════════════════════════╗");
console.log("║     BARKOD USTASI CLI - BARKOD OLUŞTURUCU & OKUYUCU   ║");
console.log("║     Geliştirici: Enes Öztürk [El Emeği]               ║");
console.log("╚═══════════════════════════════════════════════════════╝\\x1b[0m\\n");

async function generateAndSave(text, type = 'code128', outputPath = './barkod.png') {
  console.log(\`[+] Barkod üretiliyor: metin="\${text}", format=\${type}\`);
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer({
      bcid: type,
      text: text,
      scale: 3,
      height: 12,
      includetext: true,
      textxalign: 'center'
    }, (err, pngBuffer) => {
      if (err) return reject(err);
      fs.writeFileSync(outputPath, pngBuffer);
      console.log(\`[✓] Dosyaya başarıyla yazıldı: \${path.resolve(outputPath)}\`);
      console.log(\`    Boyut: \${(pngBuffer.length / 1024).toFixed(2)} KB\`);
      console.log(\`    İmza : Enes Öztürk\`);
      resolve(outputPath);
    });
  });
}

function readFileInfo(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(\`[!] Dosya bulunamadı: \${filePath}\`);
    return;
  }
  const stat = fs.statSync(filePath);
  console.log(\`[✓] Dosya okundu: \${path.resolve(filePath)}\`);
  console.log(\`    Boyut: \${stat.size} bayt | Tarih: \${stat.mtime.toLocaleString()}\`);
}

// Komut satırı argümanları
const args = process.argv.slice(2);
if (args[0] === 'generate') {
  generateAndSave(args[1] || 'ENES-OZTURK', args[3] || 'code128', args[5] || './barkod.png');
} else if (args[0] === 'read') {
  readFileInfo(args[1] || './barkod.png');
} else {
  // İnteraktif Menü
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("1) Barkod Oluştur ve Bilgisayara Kaydet");
  console.log("2) Barkod Dosyasını Oku");
  console.log("3) Çıkış");
  rl.question("Seçiminiz (1-3): ", (secim) => {
    if (secim === '1') {
      rl.question("Metin: ", (txt) => {
        generateAndSave(txt || 'ENES2026').then(() => rl.close());
      });
    } else if (secim === '2') {
      rl.question("Dosya Yolu: ", (p) => {
        readFileInfo(p || './barkod.png');
        rl.close();
      });
    } else {
      rl.close();
    }
  });
}
`;

export const CliModal: React.FC<CliModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(CLI_SCRIPT_CONTENT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([CLI_SCRIPT_CONTENT], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'barcode-cli.js';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-100 font-mono">
                Node.js Bağımsız Konsol Betiği (barcode-cli.js)
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Kendi bilgisayarınızın terminalinde doğrudan çalıştırmak için
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition cursor-pointer font-mono"
          >
            ✕
          </button>
        </div>

        <div className="py-3 text-xs text-neutral-300 space-y-2 shrink-0">
          <p className="font-mono text-neutral-400">
            Aşağıdaki script projenin kök dizininde de hazır bulunmaktadır (<code className="text-emerald-400 bg-neutral-900 px-1 py-0.5 rounded">barcode-cli.js</code>).
            Terminalinizde <code className="text-amber-400 bg-neutral-900 px-1 py-0.5 rounded">node barcode-cli.js</code> yazarak doğrudan çalıştırabilirsiniz:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-mono text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Kopyalandı!' : 'Kodu Kopyala'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-mono text-xs flex items-center gap-1.5 transition cursor-pointer shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>barcode-cli.js İndir</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mt-2 rounded-xl bg-black border border-neutral-800 p-4 font-mono text-xs text-neutral-300">
          <pre className="whitespace-pre overflow-x-auto text-emerald-400/90 leading-relaxed">
            {CLI_SCRIPT_CONTENT}
          </pre>
        </div>

        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs font-mono text-neutral-400 shrink-0">
          <span>Geliştirici: Enes Öztürk</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
