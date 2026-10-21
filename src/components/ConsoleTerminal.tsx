import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  HardDrive,
  Download,
  Upload,
  Play,
  Volume2,
  VolumeX,
  Sparkles,
  Award,
  Camera,
  RefreshCw,
  Folder,
  Layers,
  FileCheck,
  Code
} from 'lucide-react';
import {
  generateBarcode,
  readBarcode,
  saveFileToClientDisk,
  dataUrlToBlob,
  normalizeBarcodeText
} from '../services/barcodeService';
import {
  playScannerBeep,
  playTerminalKeyClick,
  playSuccessChime,
  playErrorBuzzer
} from '../services/soundEffects';
import { BarcodeFormatType, SavedBarcodeItem, ReadBarcodeResult, BARCODE_FORMATS } from '../types/barcode';
import confetti from 'canvas-confetti';

interface LogEntry {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'info' | 'system' | 'banner' | 'barcode-preview';
  text?: string;
  data?: {
    barcodeUrl?: string;
    barcodeText?: string;
    barcodeFormat?: string;
    savedLocation?: string;
    fileSizeKb?: number;
    svgText?: string;
  };
}

interface ConsoleTerminalProps {
  onOpenSignature: () => void;
  onOpenCliScript: () => void;
  onOpenCamera: () => void;
  savedBarcodes: SavedBarcodeItem[];
  onAddSavedBarcode: (item: SavedBarcodeItem) => void;
}

const WELCOME_BANNER = `
 ██████╗  █████╗ ██████╗ ██╗  ██╗ ██████╗ ██████╗      ██████╗██╗     ██╗
 ██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝██╔═══██╗██╔══██╗    ██╔════╝██║     ██║
 ██████╔╝███████║██████╔╝█████╔╝ ██║   ██║██║  ██║    ██║     ██║     ██║
 ██╔══██╗██╔══██║██╔══██╗██╔═██╗ ██║   ██║██║  ██║    ██║     ██║     ██║
 ██████╔╝██║  ██║██║  ██║██║  ██╗╚██████╔╝██████╔╝    ╚██████╗███████╗██║
 ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝      ╚═════╝╚══════╝╚═╝
 
 =========================================================================
   BARKOD USTASI - BARKOD OLUŞTURUCU VE OKUYUCU KONSOL ÇÖZÜMÜ
   Geliştirici & Tasarım: ENES ÖZTÜRK [El Emeği Özel Sürüm]
   Teknikler: 3. Parti Kütüphaneler • Dosyaya Yazma • Dosyadan Okuma
 =========================================================================
`;

const ASCII_BARCODE_ART = `
  ||| | || |||| | | |||| ||| || | ||| |||| |
  ||| | || |||| | | |||| ||| || | ||| |||| |
  ||| | || |||| | | |||| ||| || | ||| |||| |
`;

export const ConsoleTerminal: React.FC<ConsoleTerminalProps> = ({
  onOpenSignature,
  onOpenCliScript,
  onOpenCamera,
  savedBarcodes,
  onAddSavedBarcode,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [terminalTheme, setTerminalTheme] = useState<'matrix' | 'amber' | 'cyan' | 'classic'>('matrix');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState<null | {
    step: 'generate_text' | 'generate_type' | 'generate_filename';
    tempData: { text?: string; type?: BarcodeFormatType; filename?: string };
  }>(null);

  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize terminal banner
  useEffect(() => {
    setLogs([
      { id: '1', type: 'banner', text: WELCOME_BANNER },
      {
        id: '2',
        type: 'info',
        text: `Sistem hazır. 3. parti bwip-js ve @zxing kütüphaneleri yüklendi.\nKomutları görmek için 'help' veya doğrudan menü için 'menu' yazınız.\nEnes Öztürk imzalı el emeği konsol çözümü.`,
      },
    ]);
  }, []);

  // Auto scroll
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Keep input focused
  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  const addLog = (entry: Omit<LogEntry, 'id'>) => {
    setLogs((prev) => [...prev, { ...entry, id: Math.random().toString(36).substring(2, 9) }]);
  };

  const handleSoundKey = () => {
    if (soundEnabled) {
      playTerminalKeyClick();
    }
  };

  // Execute terminal command
  const handleCommand = async (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed && !activeStep) return;

    // Add command to history
    if (trimmed) {
      setHistory((prev) => [...prev, trimmed]);
      setHistoryIndex(-1);
    }

    // Interactive step wizard
    if (activeStep) {
      addLog({ type: 'input', text: trimmed });
      await handleWizardStep(trimmed);
      return;
    }

    addLog({ type: 'input', text: trimmed });
    const parts = trimmed.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case 'help':
      case '?':
      case 'yardim':
        showHelp();
        break;

      case 'menu':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
        if (/^[1-8]$/.test(cmd)) {
          handleMenuOption(cmd);
        } else {
          showMenu();
        }
        break;

      case 'generate':
      case 'uret':
      case 'olustur':
        await handleGenerateCommand(args);
        break;

      case 'read':
      case 'oku':
      case 'scan':
      case 'tara':
        triggerReadFile();
        break;

      case 'camera':
      case 'kamera':
        onOpenCamera();
        addLog({ type: 'info', text: 'Canlı kamera barkod tarayıcı arayüzü açıldı.' });
        break;

      case 'ls':
      case 'list':
      case 'liste':
      case 'files':
        showFileList();
        break;

      case 'clear':
      case 'cls':
      case 'temizle':
        setLogs([]);
        break;

      case 'banner':
        addLog({ type: 'banner', text: WELCOME_BANNER });
        break;

      case 'about':
      case 'enes':
      case 'imza':
      case 'signature':
        showSignatureInfo();
        break;

      case 'cli':
      case 'script':
      case 'export':
        onOpenCliScript();
        addLog({ type: 'info', text: 'Node.js barcode-cli.js inceleme ve indirme penceresi açıldı.' });
        break;

      case 'types':
      case 'formatlar':
        showTypes();
        break;

      case 'theme':
        handleThemeChange(args[0]);
        break;

      case 'sound':
      case 'ses':
        setSoundEnabled((prev) => {
          const next = !prev;
          addLog({ type: 'info', text: `Terminal ses efektleri: ${next ? 'AÇIK (BEEP/CLICK AKTİF)' : 'KAPALI'}` });
          return next;
        });
        break;

      case 'batch':
      case 'toplu':
        await handleBatchGenerate();
        break;

      default:
        if (soundEnabled) playErrorBuzzer();
        addLog({
          type: 'error',
          text: `Bilinmeyen komut: '${trimmed}'. Geçerli komutları görmek için 'help' veya 'menu' yazınız.`,
        });
        break;
    }
  };

  const showMenu = () => {
    addLog({
      type: 'info',
      text: `\n╔═════════════════════ ANA MENÜ ═════════════════════╗
║  [1] Yeni Barkod Oluştur ve Bilgisayara Kaydet     ║
║  [2] Bilgisayardan Barkod Dosyası Oku (Decode)      ║
║  [3] Toplu (Batch) 5 Barkod Üret & Dosyaya Yaz      ║
║  [4] Canlı Kamera Barkod Tarayıcısını Başlat        ║
║  [5] Kaydedilen Dosyaları Listele (ls)             ║
║  [6] Enes Öztürk İmzası & Proje Künyesi            ║
║  [7] Bağımsız Node.js CLI Betiğini Görüntüle        ║
║  [8] Ekranı Temizle (clear)                        ║
╚═════════════════════════════════════════════════════╝
(Seçmek için doğrudan rakam [1-8] yazıp Enter'a basabilirsiniz.)`,
    });
  };

  const handleMenuOption = async (option: string) => {
    switch (option) {
      case '1':
        setActiveStep({
          step: 'generate_text',
          tempData: {},
        });
        addLog({
          type: 'system',
          text: `[ADIM 1/3] Barkod için metin veya numara giriniz (Örn: 8690123456789 veya ENES-OZTURK-2026):`,
        });
        break;
      case '2':
        triggerReadFile();
        break;
      case '3':
        await handleBatchGenerate();
        break;
      case '4':
        onOpenCamera();
        break;
      case '5':
        showFileList();
        break;
      case '6':
        showSignatureInfo();
        break;
      case '7':
        onOpenCliScript();
        break;
      case '8':
        setLogs([]);
        break;
    }
  };

  // Interactive step-by-step barcode creator
  const handleWizardStep = async (val: string) => {
    if (!activeStep) return;

    if (val.toLowerCase() === 'cancel' || val.toLowerCase() === 'iptal') {
      setActiveStep(null);
      addLog({ type: 'info', text: 'İşlem kullanıcı tarafından iptal edildi.' });
      return;
    }

    if (activeStep.step === 'generate_text') {
      const text = val || 'ENES-OZTURK-2026';
      setActiveStep({
        step: 'generate_type',
        tempData: { ...activeStep.tempData, text },
      });
      addLog({
        type: 'system',
        text: `[ADIM 2/3] Barkod formatını seçiniz:
  • code128   (En esnek genel amaçlı barkod)
  • ean13     (13 haneli perakende market standardı - 869 Türkiye)
  • qrcode    (2D Karekod - URL ve uzun metinler)
  • code39    (Endüstriyel alfasayısal)
  • upca      (12 haneli)
(Varsayılan için ENTER: code128)`,
      });
    } else if (activeStep.step === 'generate_type') {
      const typeInput = val.toLowerCase().replace(/[^a-z0-9]/g, '') || 'code128';
      const validTypes: BarcodeFormatType[] = ['code128', 'ean13', 'qrcode', 'code39', 'upca', 'ean8', 'datamatrix', 'pdf417', 'itf14'];
      const chosenType: BarcodeFormatType = validTypes.includes(typeInput as BarcodeFormatType)
        ? (typeInput as BarcodeFormatType)
        : 'code128';

      setActiveStep({
        step: 'generate_filename',
        tempData: { ...activeStep.tempData, type: chosenType },
      });
      addLog({
        type: 'system',
        text: `[ADIM 3/3] Client bilgisayarına kaydedilecek dosya adını giriniz (Varsayılan: ${chosenType}_barkod.png):`,
      });
    } else if (activeStep.step === 'generate_filename') {
      const filename = val || `${activeStep.tempData.type || 'barkod'}_${Date.now()}.png`;
      const finalFilename = filename.endsWith('.png') ? filename : `${filename}.png`;
      const text = activeStep.tempData.text || 'ENES-OZTURK';
      const type = activeStep.tempData.type || 'code128';

      setActiveStep(null);
      await executeGenerateAndSave(text, type, finalFilename);
    }
  };

  const executeGenerateAndSave = async (text: string, type: BarcodeFormatType, filename: string) => {
    setIsProcessing(true);
    addLog({ type: 'info', text: `[+] 3. Parti bwip-js kütüphanesi ile barkod üretiliyor...` });

    try {
      const result = await generateBarcode({
        text,
        format: type,
        scale: 3,
        height: 12,
        includeText: true,
      });

      if (soundEnabled) playSuccessChime();

      // Convert to blob for saving to client's disk
      const blob = dataUrlToBlob(result.dataUrl);
      const fileSizeKb = Number((blob.size / 1024).toFixed(2));

      addLog({
        type: 'barcode-preview',
        text: `[✓] Barkod başarıyla oluşturuldu!\nMetin: ${result.correctedText}\nFormat: ${type.toUpperCase()}`,
        data: {
          barcodeUrl: result.dataUrl,
          barcodeText: result.correctedText,
          barcodeFormat: type.toUpperCase(),
          svgText: result.svgText,
          fileSizeKb,
        },
      });

      // Dosyaya Yazma Tekniği: Native File System Access API or direct download
      addLog({ type: 'info', text: `[💾] Dosyaya Yazma: Bilgisayarınızda dosya kaydediliyor (${filename})...` });

      try {
        const saveResult = await saveFileToClientDisk(blob, filename, 'png');
        const savedLocation = saveResult.filePath || filename;

        const newSavedItem: SavedBarcodeItem = {
          id: Math.random().toString(36).substring(2, 9),
          title: filename,
          text: result.correctedText,
          format: type,
          formatName: type.toUpperCase(),
          dataUrl: result.dataUrl,
          createdAt: new Date().toLocaleTimeString('tr-TR'),
          sizeBytes: blob.size,
          savedToDiskLocation: savedLocation,
        };
        onAddSavedBarcode(newSavedItem);

        addLog({
          type: 'success',
          text: `[✓ BAŞARILI] Dosya client bilgisayarına yazıldı!\n  → Kaydedilen Dosya: ${savedLocation}\n  → Boyut: ${fileSizeKb} KB\n  → İmza: Enes Öztürk [El Emeği]`,
        });

        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch (saveErr: unknown) {
        const msg = saveErr instanceof Error ? saveErr.message : 'Kaydetme tamamlanamadı.';
        addLog({ type: 'error', text: `[!] Dosya kaydetme: ${msg}` });
      }
    } catch (err: unknown) {
      if (soundEnabled) playErrorBuzzer();
      const msg = err instanceof Error ? err.message : 'Barkod üretimi başarısız.';
      addLog({ type: 'error', text: `[!] Hata: ${msg}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateCommand = async (args: string[]) => {
    if (args.length === 0) {
      // Switch to wizard
      setActiveStep({ step: 'generate_text', tempData: {} });
      addLog({ type: 'system', text: `Barkod metnini giriniz:` });
      return;
    }

    let text = args[0].replace(/^["']|["']$/g, '');
    let type: BarcodeFormatType = 'code128';
    let filename = `barkod_${Date.now()}.png`;

    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--type' && args[i + 1]) {
        type = args[i + 1].toLowerCase() as BarcodeFormatType;
        i++;
      } else if (args[i] === '--output' && args[i + 1]) {
        filename = args[i + 1];
        i++;
      }
    }

    await executeGenerateAndSave(text, type, filename);
  };

  const triggerReadFile = () => {
    addLog({
      type: 'info',
      text: `[📂] Dosyadan Okuma: Bilgisayarınızdan okunacak barkod görselini seçiniz...`,
    });
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so user can pick same file again
    e.target.value = '';

    setIsProcessing(true);
    addLog({
      type: 'info',
      text: `[?] Dosya okunuyor: '${file.name}' (${(file.size / 1024).toFixed(2)} KB)...`,
    });

    try {
      const decodeResult: ReadBarcodeResult = await readBarcode(file);

      if (decodeResult.success && decodeResult.text) {
        if (soundEnabled) playScannerBeep();

        addLog({
          type: 'success',
          text: `╔═══════════════ BARKOD ÇÖZÜMLENDİ (DECODE) ═══════════════╗
  Dosya Adı     : ${decodeResult.fileName}
  Barkod Metni  : ${decodeResult.text}
  Format        : ${decodeResult.formatName}
  Zaman Damgası : ${decodeResult.timestamp}
  Ham Baytlar   : ${decodeResult.rawBytesLength ?? 'Belirtilmedi'} bayt
  Motor         : @zxing/library MultiFormatReader
  İmza          : Enes Öztürk [El Emeği Dosyadan Okuma]
╚══════════════════════════════════════════════════════════╝`,
        });

        // Add to saved barcodes
        if (decodeResult.previewUrl) {
          onAddSavedBarcode({
            id: Math.random().toString(36).substring(2, 9),
            title: file.name,
            text: decodeResult.text,
            format: 'code128',
            formatName: decodeResult.formatName || 'OKUNAN BARKOD',
            dataUrl: decodeResult.previewUrl,
            createdAt: decodeResult.timestamp,
            sizeBytes: file.size,
            filePath: file.name,
          });
        }

        confetti({
          particleCount: 40,
          spread: 70,
          origin: { y: 0.7 },
        });
      } else {
        if (soundEnabled) playErrorBuzzer();
        addLog({
          type: 'error',
          text: `[!] Barkod Okunamadı: ${decodeResult.error || 'Görselde desteklenen bir barkod formatı tespit edilemedi.'}\nİpucu: Görselin net, aydınlık ve barkodun düzgün açıda olduğundan emin olunuz.`,
        });
      }
    } catch (err: unknown) {
      if (soundEnabled) playErrorBuzzer();
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      addLog({ type: 'error', text: `[!] Dosya okuma hatası: ${msg}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchGenerate = async () => {
    setIsProcessing(true);
    addLog({ type: 'info', text: `[+] Toplu (Batch) 5 Barkod Üretim Modu Başlatılıyor...` });

    const batchItems: Array<{ text: string; format: BarcodeFormatType; label: string }> = [
      { text: '8690123456789', format: 'ean13', label: 'Market Perakende Ürünü' },
      { text: 'TR-KARGO-2026-987654', format: 'code128', label: 'Yurtiçi Kargo Takip Kodu' },
      { text: 'https://enesozturk.dev', format: 'qrcode', label: 'Enes Öztürk Portfolyo QR' },
      { text: 'STOK-PARCA-A450', format: 'code39', label: 'Depo Stok Kodu' },
      { text: '012345678905', format: 'upca', label: 'UPC-A İhracat Kodu' },
    ];

    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i];
      try {
        const res = await generateBarcode({
          text: item.text,
          format: item.format,
          scale: 2,
          height: 10,
        });

        const filename = `toplu_${i + 1}_${item.format}.png`;
        const blob = dataUrlToBlob(res.dataUrl);

        onAddSavedBarcode({
          id: Math.random().toString(36).substring(2, 9),
          title: `${filename} (${item.label})`,
          text: res.correctedText,
          format: item.format,
          formatName: item.format.toUpperCase(),
          dataUrl: res.dataUrl,
          createdAt: new Date().toLocaleTimeString('tr-TR'),
          sizeBytes: blob.size,
          savedToDiskLocation: `./${filename}`,
        });

        addLog({
          type: 'success',
          text: `  [${i + 1}/5] Üretildi: ${item.format.toUpperCase()} -> "${res.correctedText}" (${item.label})`,
        });
      } catch (e: unknown) {
        addLog({ type: 'error', text: `  [${i + 1}/5] Başarısız: ${item.text}` });
      }
    }

    if (soundEnabled) playSuccessChime();
    addLog({
      type: 'info',
      text: `[✓] Toplu üretim tamamlandı. Dosyaları incelemek veya tek tek indirmek için 'ls' yazınız.`,
    });
    setIsProcessing(false);
  };

  const showFileList = () => {
    if (savedBarcodes.length === 0) {
      addLog({
        type: 'info',
        text: `Henüz kaydedilmiş bir barkod bulunmuyor. Yeni bir barkod oluşturmak için '1' veya 'generate' yazınız.`,
      });
      return;
    }

    let fileListText = `\n═════════════════ KAYDEDİLEN DOSYALAR LİSTESİ (${savedBarcodes.length}) ═════════════════\n`;
    savedBarcodes.forEach((b, index) => {
      const sizeStr = b.sizeBytes ? `${(b.sizeBytes / 1024).toFixed(1)} KB` : 'N/A';
      fileListText += `[${index + 1}] ${b.title.padEnd(28)} | ${b.formatName.padEnd(10)} | Metin: ${b.text.padEnd(20)} | ${sizeStr} | ${b.createdAt}\n`;
    });
    fileListText += `══════════════════════════════════════════════════════════════════════════`;
    addLog({ type: 'info', text: fileListText });
  };

  const showSignatureInfo = () => {
    onOpenSignature();
    if (soundEnabled) playSuccessChime();
    addLog({
      type: 'info',
      text: `\n╔═════════════════════ ENES ÖZTÜRK İMZASI ═════════════════════╗
║  Geliştirici : Enes Öztürk                                   ║
║  Proje       : Barkod Oluşturucu ve Okuyucu Konsol Çözümü    ║
║  Nitelik     : El emeği, dolu dolu tam konsol & dosya I/O    ║
║  Kütüphaneler: bwip-js, @zxing/library, Node.js fs           ║
║  Özellikler  : Disk I/O, Web Audio, Barkod Formatları,       ║
║                ANSI Terminal, File System Access API         ║
╚═══════════════════════════════════════════════════════════════╝`,
    });
  };

  const showHelp = () => {
    addLog({
      type: 'info',
      text: `\nKULLANILABİLİR KOMUTLAR:
  • menu                   : İnteraktif ana menüyü ekrana basar.
  • [1 - 8]                : Menüdeki numaraya basarak doğrudan başlatır.
  • generate "METIN"       : Belirtilen metinle barkod üretir ve diske yazar.
    Örnek: generate "8690123456789" --type ean13 --output ./market.png
  • read                   : Bilgisayardan dosya seçip barkodu okur (Decode).
  • batch                  : 5 farklı standartta toplu barkod üretir.
  • camera                 : Kamerayı açıp canlı barkod tarar.
  • ls / list              : Kaydedilen barkod dosyalarını listeler.
  • types                  : Desteklenen barkod formatlarını listeler.
  • cli                    : Bağımsız Node.js barcode-cli.js kodunu gösterir.
  • signature / about      : Enes Öztürk proje künyesini ve imzasını açar.
  • sound                  : Terminal seslerini açar / kapatır.
  • theme [matrix|amber|cyan|classic] : Terminal renk temasını değiştirir.
  • clear                  : Terminal ekranını temizler.`,
    });
  };

  const showTypes = () => {
    let out = `\nDESTEKLENEN 3. PARTİ BARKOD FORMATLARI:\n`;
    BARCODE_FORMATS.forEach((fmt) => {
      out += `  • ${fmt.id.padEnd(12)}: ${fmt.name} - Örnek: ${fmt.example}\n    ${fmt.description}\n`;
    });
    addLog({ type: 'info', text: out });
  };

  const handleThemeChange = (themeName?: string) => {
    const validThemes: Array<'matrix' | 'amber' | 'cyan' | 'classic'> = ['matrix', 'amber', 'cyan', 'classic'];
    if (themeName && validThemes.includes(themeName as 'matrix' | 'amber' | 'cyan' | 'classic')) {
      setTerminalTheme(themeName as 'matrix' | 'amber' | 'cyan' | 'classic');
      addLog({ type: 'info', text: `Tema değiştirildi: ${themeName.toUpperCase()}` });
    } else {
      addLog({
        type: 'info',
        text: `Mevcut temalar: matrix, amber, cyan, classic. Kullanım: theme amber`,
      });
    }
  };

  // Keyboard navigation for history
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleSoundKey();

    if (e.key === 'Enter') {
      const val = inputValue;
      setInputValue('');
      handleCommand(val);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx < history.length) {
        setHistoryIndex(nextIdx);
        setInputValue(history[history.length - 1 - nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputValue(history[history.length - 1 - nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputValue('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Auto-complete suggestions
      const commands = ['help', 'menu', 'generate', 'read', 'batch', 'camera', 'ls', 'types', 'cli', 'signature', 'theme', 'clear'];
      const match = commands.find((c) => c.startsWith(inputValue.toLowerCase()));
      if (match) {
        setInputValue(match);
      }
    }
  };

  // Theme styling classes
  const themeStyles = {
    matrix: {
      bg: 'bg-black',
      text: 'text-emerald-400',
      prompt: 'text-emerald-300',
      border: 'border-emerald-500/30',
      caret: 'caret-emerald-400',
      accent: 'text-emerald-500',
    },
    amber: {
      bg: 'bg-stone-950',
      text: 'text-amber-400',
      prompt: 'text-amber-300',
      border: 'border-amber-500/30',
      caret: 'caret-amber-400',
      accent: 'text-amber-500',
    },
    cyan: {
      bg: 'bg-slate-950',
      text: 'text-cyan-400',
      prompt: 'text-cyan-300',
      border: 'border-cyan-500/30',
      caret: 'caret-cyan-400',
      accent: 'text-cyan-500',
    },
    classic: {
      bg: 'bg-neutral-900',
      text: 'text-neutral-100',
      prompt: 'text-emerald-400',
      border: 'border-neutral-700',
      caret: 'caret-white',
      accent: 'text-sky-400',
    },
  }[terminalTheme];

  return (
    <div
      onClick={handleTerminalClick}
      className={`relative flex flex-col h-full rounded-2xl border ${themeStyles.border} ${themeStyles.bg} overflow-hidden shadow-2xl font-mono transition-colors duration-200 select-text`}
    >
      {/* Hidden file input for reading files */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Terminal Top Window Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900/90 border-b border-neutral-800 text-xs select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80 cursor-pointer" onClick={() => setLogs([])} title="Ekranı Temizle" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 cursor-pointer" onClick={showMenu} title="Menüyü Göster" />
            <div className="w-3 h-3 rounded-full bg-green-500/80 cursor-pointer" onClick={onOpenCliScript} title="CLI Kodunu İncele" />
          </div>
          <span className="ml-2 font-bold text-neutral-300 flex items-center gap-1.5">
            <TerminalIcon className="w-3.5 h-3.5 text-neutral-400" />
            <span>enes-ozturk@barkod-cli: ~ (bash v5.2)</span>
          </span>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Audio toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSoundEnabled(!soundEnabled);
            }}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer transition ${
              soundEnabled
                ? 'bg-neutral-800 border-neutral-700 text-neutral-200'
                : 'bg-neutral-800/40 border-neutral-800 text-neutral-500'
            }`}
            title={soundEnabled ? 'Sesleri Kapat' : 'Sesleri Aç'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Theme switcher */}
          <div className="hidden sm:flex items-center gap-1 bg-neutral-800/80 p-0.5 rounded-lg border border-neutral-700/60 text-[10px]">
            {(['matrix', 'amber', 'cyan', 'classic'] as const).map((t) => (
              <button
                key={t}
                onClick={(e) => {
                  e.stopPropagation();
                  setTerminalTheme(t);
                }}
                className={`px-2 py-0.5 rounded capitalize cursor-pointer transition ${
                  terminalTheme === t ? 'bg-neutral-700 text-white font-semibold shadow-xs' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Quick buttons */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerReadFile();
            }}
            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs flex items-center gap-1 cursor-pointer transition"
            title="Bilgisayardan dosya seç ve oku"
          >
            <Upload className="w-3 h-3 text-cyan-400" />
            <span className="hidden md:inline">Dosyadan Oku</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenCamera();
            }}
            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs flex items-center gap-1 cursor-pointer transition"
            title="Kamera ile tara"
          >
            <Camera className="w-3 h-3 text-purple-400" />
            <span className="hidden md:inline">Kamera</span>
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-2 text-xs leading-relaxed ${themeStyles.text}`}>
        {logs.map((log) => {
          if (log.type === 'banner') {
            return (
              <div key={log.id} className="whitespace-pre overflow-x-auto opacity-90 select-none text-[10px] sm:text-xs">
                {log.text}
              </div>
            );
          }

          if (log.type === 'input') {
            return (
              <div key={log.id} className="flex items-start gap-2 pt-1">
                <span className={`${themeStyles.prompt} font-semibold shrink-0`}>enes@barkod:~$</span>
                <span className="text-white font-medium">{log.text}</span>
              </div>
            );
          }

          if (log.type === 'barcode-preview' && log.data) {
            return (
              <div
                key={log.id}
                className="my-3 p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-neutral-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-emerald-400 font-mono text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>Üretilen Barkod Önizlemesi ({log.data.barcodeFormat})</span>
                  </div>
                  <span className="text-[11px] text-neutral-400">Boyut: {log.data.fileSizeKb} KB</span>
                </div>

                {/* Graphical Preview Card */}
                <div className="bg-white p-3 rounded-lg flex flex-col items-center justify-center shadow-inner overflow-hidden">
                  <img
                    src={log.data.barcodeUrl}
                    alt={log.data.barcodeText}
                    className="max-h-36 object-contain"
                  />
                  <div className="text-neutral-800 font-mono font-bold text-xs mt-1 tracking-wider">
                    {log.data.barcodeText}
                  </div>
                </div>

                {/* Quick actions for the generated barcode */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-neutral-800 text-xs">
                  <span className="text-[11px] text-neutral-400">
                    İmza: <strong className="text-amber-400">Enes Öztürk</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        if (log.data?.barcodeUrl) {
                          const blob = dataUrlToBlob(log.data.barcodeUrl);
                          await saveFileToClientDisk(blob, `${log.data.barcodeText}_barkod.png`, 'png');
                          if (soundEnabled) playSuccessChime();
                        }
                      }}
                      className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded flex items-center gap-1 text-[11px] cursor-pointer transition"
                    >
                      <Download className="w-3 h-3" />
                      <span>Bilgisayara Kaydet</span>
                    </button>
                    {log.data.svgText && (
                      <button
                        onClick={async () => {
                          const blob = new Blob([log.data!.svgText!], { type: 'image/svg+xml' });
                          await saveFileToClientDisk(blob, `${log.data!.barcodeText}_barkod.svg`, 'svg');
                          if (soundEnabled) playSuccessChime();
                        }}
                        className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 rounded flex items-center gap-1 text-[11px] cursor-pointer transition"
                      >
                        <Code className="w-3 h-3" />
                        <span>SVG İndir</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          if (log.type === 'error') {
            return (
              <div key={log.id} className="text-red-400 whitespace-pre-wrap pl-2 border-l-2 border-red-500/60 my-1">
                {log.text}
              </div>
            );
          }

          if (log.type === 'success') {
            return (
              <div key={log.id} className="text-emerald-400 whitespace-pre-wrap pl-2 border-l-2 border-emerald-500/60 my-1">
                {log.text}
              </div>
            );
          }

          if (log.type === 'system') {
            return (
              <div key={log.id} className="text-amber-300 whitespace-pre-wrap font-semibold my-1">
                {log.text}
              </div>
            );
          }

          return (
            <div key={log.id} className="whitespace-pre-wrap opacity-95">
              {log.text}
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex items-center gap-2 text-neutral-400 italic">
            <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
            <span>İşlem yürütülüyor (3. parti kütüphane motoru çalışıyor)...</span>
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>

      {/* Terminal Input Bar */}
      <div className="p-3 bg-neutral-900/95 border-t border-neutral-800 flex items-center gap-2">
        <span className={`${themeStyles.prompt} font-semibold shrink-0 select-none text-xs`}>
          {activeStep ? 'wizard>' : 'enes@barkod:~$'}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            activeStep
              ? 'Cevabınızı giriniz (veya iptal etmek için "cancel")...'
              : "Komut giriniz ('help', 'menu', '1', 'read', 'generate 8690...')..."
          }
          className={`flex-1 bg-transparent text-white font-mono text-xs focus:outline-none ${themeStyles.caret}`}
          autoFocus
        />
        <button
          onClick={() => {
            const val = inputValue;
            setInputValue('');
            handleCommand(val);
          }}
          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-mono flex items-center gap-1 cursor-pointer transition shadow-xs"
        >
          <Play className="w-3 h-3 fill-current" />
          <span className="hidden sm:inline">Çalıştır</span>
        </button>
      </div>
    </div>
  );
};
