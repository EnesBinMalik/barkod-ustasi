import React, { useState, useEffect } from 'react';
import {
  Barcode,
  QrCode,
  Download,
  Upload,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  HardDrive,
  Camera,
  Layers,
  FileText,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2
} from 'lucide-react';
import {
  BARCODE_FORMATS,
  BarcodeFormatType,
  BarcodeGenerateOptions,
  SavedBarcodeItem,
  ReadBarcodeResult
} from '../types/barcode';
import {
  generateBarcode,
  readBarcode,
  saveFileToClientDisk,
  dataUrlToBlob,
  normalizeBarcodeText
} from '../services/barcodeService';
import { playScannerBeep, playSuccessChime, playErrorBuzzer } from '../services/soundEffects';
import confetti from 'canvas-confetti';

interface VisualStudioProps {
  onOpenCli: () => void;
  onOpenSignature: () => void;
  onOpenCamera: () => void;
  savedBarcodes: SavedBarcodeItem[];
  onAddSavedBarcode: (item: SavedBarcodeItem) => void;
  onDeleteSavedBarcode: (id: string) => void;
}

export const VisualStudio: React.FC<VisualStudioProps> = ({
  onOpenCli,
  onOpenSignature,
  onOpenCamera,
  savedBarcodes,
  onAddSavedBarcode,
  onDeleteSavedBarcode,
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'read' | 'batch' | 'storage'>('generate');

  // Generator states
  const [text, setText] = useState('8690123456789');
  const [format, setFormat] = useState<BarcodeFormatType>('ean13');
  const [includeText, setIncludeText] = useState(true);
  const [scale, setScale] = useState(3);
  const [height, setHeight] = useState(12);
  const [barColor, setBarColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [rotate, setRotate] = useState<'N' | 'R' | 'L' | 'I'>('N');

  // Generation result preview
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [previewSvg, setPreviewSvg] = useState<string>('');
  const [correctedText, setCorrectedText] = useState<string>('');
  const [genError, setGenError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastSavedPath, setLastSavedPath] = useState<string | null>(null);

  // Reader states
  const [readerFile, setReaderFile] = useState<File | null>(null);
  const [readResult, setReadResult] = useState<ReadBarcodeResult | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Batch states
  const [batchInput, setBatchInput] = useState<string>(
    '8690123456789, ean13, Market Süt\nTR-KARGO-987654, code128, Kargo Paketi\nhttps://enesozturk.dev, qrcode, Web Portfolyo\nSTOK-VIDA-M6, code39, Atölye Stok'
  );
  const [batchResults, setBatchResults] = useState<Array<{ text: string; format: string; url: string; label: string }>>([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  // Generate on input changes
  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(async () => {
      if (!text.trim()) {
        setPreviewDataUrl('');
        setGenError(null);
        return;
      }
      setIsGenerating(true);
      setGenError(null);
      try {
        const res = await generateBarcode({
          text,
          format,
          includeText,
          scale,
          height,
          barColor,
          bgColor,
          rotate,
        });
        if (!isCancelled) {
          setPreviewDataUrl(res.dataUrl);
          setPreviewSvg(res.svgText);
          setCorrectedText(res.correctedText);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : 'Barkod çizilemedi';
          setGenError(msg);
          setPreviewDataUrl('');
        }
      } finally {
        if (!isCancelled) setIsGenerating(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [text, format, includeText, scale, height, barColor, bgColor, rotate]);

  // Save current generated barcode to disk
  const handleSaveToClientDisk = async (extension: 'png' | 'svg' = 'png') => {
    if (!previewDataUrl) return;

    try {
      const suggestedName = `${format}_${correctedText.replace(/[^a-zA-Z0-9_-]/g, '_')}.${extension}`;
      let blob: Blob;

      if (extension === 'svg' && previewSvg) {
        blob = new Blob([previewSvg], { type: 'image/svg+xml' });
      } else {
        blob = dataUrlToBlob(previewDataUrl);
      }

      const res = await saveFileToClientDisk(blob, suggestedName, extension);
      setLastSavedPath(res.filePath || suggestedName);
      playSuccessChime();

      // Add to session saved archive
      onAddSavedBarcode({
        id: Math.random().toString(36).substring(2, 9),
        title: suggestedName,
        text: correctedText,
        format,
        formatName: format.toUpperCase(),
        dataUrl: previewDataUrl,
        createdAt: new Date().toLocaleTimeString('tr-TR'),
        sizeBytes: blob.size,
        savedToDiskLocation: res.filePath,
      });

      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('iptal')) return;
      playErrorBuzzer();
      alert(`Dosya kaydedilirken hata oluştu: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Reader file handlers
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processReadFile(e.dataTransfer.files[0]);
    }
  };

  const processReadFile = async (file: File) => {
    setReaderFile(file);
    setIsReading(true);
    setReadResult(null);

    try {
      const res = await readBarcode(file);
      setReadResult(res);
      if (res.success && res.text) {
        playScannerBeep();
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.6 },
        });

        // Add to saved library
        onAddSavedBarcode({
          id: Math.random().toString(36).substring(2, 9),
          title: file.name,
          text: res.text,
          format: 'code128',
          formatName: res.formatName || 'OKUNAN BARKOD',
          dataUrl: res.previewUrl || '',
          createdAt: res.timestamp,
          sizeBytes: file.size,
          filePath: file.name,
        });
      } else {
        playErrorBuzzer();
      }
    } catch (e: unknown) {
      playErrorBuzzer();
      setReadResult({
        success: false,
        error: e instanceof Error ? e.message : 'Dosya okunamadı',
        timestamp: new Date().toLocaleTimeString('tr-TR'),
      });
    } finally {
      setIsReading(false);
    }
  };

  // Preset samples
  const applyPreset = (presetText: string, presetFormat: BarcodeFormatType) => {
    setText(presetText);
    setFormat(presetFormat);
  };

  // Batch generate executor
  const handleRunBatch = async () => {
    setIsBatchRunning(true);
    setBatchResults([]);
    const lines = batchInput.split('\n').filter((l) => l.trim().length > 0);
    const results: Array<{ text: string; format: string; url: string; label: string }> = [];

    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim());
      const itemText = parts[0] || '123456';
      const itemFormat = (parts[1] || 'code128').toLowerCase() as BarcodeFormatType;
      const itemLabel = parts[2] || itemText;

      try {
        const res = await generateBarcode({
          text: itemText,
          format: itemFormat,
          scale: 2,
          height: 10,
        });
        results.push({
          text: res.correctedText,
          format: itemFormat.toUpperCase(),
          url: res.dataUrl,
          label: itemLabel,
        });

        const blob = dataUrlToBlob(res.dataUrl);
        onAddSavedBarcode({
          id: Math.random().toString(36).substring(2, 9),
          title: `${itemLabel}.png`,
          text: res.correctedText,
          format: itemFormat,
          formatName: itemFormat.toUpperCase(),
          dataUrl: res.dataUrl,
          createdAt: new Date().toLocaleTimeString('tr-TR'),
          sizeBytes: blob.size,
        });
      } catch {
        // continue with others
      }
    }

    setBatchResults(results);
    setIsBatchRunning(false);
    playSuccessChime();
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Visual Studio Tab Navigation */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-950 border-b border-neutral-800">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'generate'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            <Barcode className="w-3.5 h-3.5" />
            <span>Barkod Oluşturucu</span>
          </button>

          <button
            onClick={() => setActiveTab('read')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'read'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Dosyadan Oku</span>
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'batch'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Toplu Üretim</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'storage'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Dosya Havuzu ({savedBarcodes.length})</span>
          </button>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCamera}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono transition cursor-pointer border border-neutral-700"
            title="Canlı kamera ile barkod oku"
          >
            <Camera className="w-3.5 h-3.5 text-purple-400" />
            <span>Kamera</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* ================= TAB 1: GENERATE ================= */}
        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Controls Column */}
            <div className="lg:col-span-7 space-y-5">
              {/* Presets Bar */}
              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-2">
                  Hızlı Örnek Şablonlar:
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => applyPreset('8690123456789', 'ean13')}
                    className="px-2.5 py-1 text-xs rounded-md bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 font-mono transition cursor-pointer"
                  >
                    🇹🇷 EAN-13 (Türk Malı 869...)
                  </button>
                  <button
                    onClick={() => applyPreset('TR-KARGO-2026-987654', 'code128')}
                    className="px-2.5 py-1 text-xs rounded-md bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 font-mono transition cursor-pointer"
                  >
                    📦 Kargo Takip (Code 128)
                  </button>
                  <button
                    onClick={() => applyPreset('https://enesozturk.dev/barkod', 'qrcode')}
                    className="px-2.5 py-1 text-xs rounded-md bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 font-mono transition cursor-pointer"
                  >
                    🌐 Web QR Kod
                  </button>
                  <button
                    onClick={() => applyPreset('STOK-A500-METAL', 'code39')}
                    className="px-2.5 py-1 text-xs rounded-md bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 font-mono transition cursor-pointer"
                  >
                    🏷️ Depo Kodu (Code 39)
                  </button>
                </div>
              </div>

              {/* Barcode Text Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-neutral-300 font-semibold flex items-center gap-1.5">
                    <span>Barkod Metni / Numarası</span>
                    <span className="text-red-400">*</span>
                  </label>
                  {format === 'ean13' && (
                    <span className="text-[11px] text-amber-400 font-mono">
                      12 veya 13 hane (Sağdaki kontrol hanesi otomatik hesaplanır)
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Barkod içeriğini giriniz..."
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-neutral-100 font-mono text-sm focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Format Selection Grid */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-neutral-300 font-semibold block">
                  3. Parti Barkod Formatı Seçimi
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BARCODE_FORMATS.map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => {
                        setFormat(fmt.id);
                        if (!text || text === '8690123456789' || text === 'https://enesozturk.dev/barkod') {
                          setText(fmt.example);
                        }
                      }}
                      className={`p-2.5 text-left rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                        format === fmt.id
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-sm'
                          : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                      }`}
                    >
                      <div className="font-mono font-bold text-xs truncate">{fmt.name}</div>
                      <div className="text-[10px] text-neutral-500 truncate mt-1">{fmt.category}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Customization Sliders & Options */}
              <div className="p-4 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono text-neutral-300 font-semibold mb-1">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Boyut ve Görünüm Ayarları</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  {/* Scale */}
                  <div>
                    <div className="flex justify-between text-neutral-400 mb-1">
                      <span>Ölçek / Kalite:</span>
                      <span className="text-emerald-400">{scale}x</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={scale}
                      onChange={(e) => setScale(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  {/* Height (for 1D) */}
                  <div>
                    <div className="flex justify-between text-neutral-400 mb-1">
                      <span>Yükseklik:</span>
                      <span className="text-emerald-400">{height} mm</span>
                    </div>
                    <input
                      type="range"
                      min={6}
                      max={30}
                      step={2}
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  {/* Bar color */}
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Çizgi Rengi:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={barColor}
                        onChange={(e) => setBarColor(e.target.value)}
                        className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer"
                      />
                      <span className="text-[11px] text-neutral-300">{barColor}</span>
                    </div>
                  </div>

                  {/* BG color */}
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Arka Plan Rengi:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer"
                      />
                      <span className="text-[11px] text-neutral-300">{bgColor}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-neutral-800 text-xs font-mono">
                  <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeText}
                      onChange={(e) => setIncludeText(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <span>Metni Barkodun Altında Göster (IncludeText)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Live Preview & File Save Column */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-neutral-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Canlı Barkod Önizlemesi</span>
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">
                      {format}
                    </span>
                  </div>

                  {/* Preview Canvas Box */}
                  <div className="min-h-[220px] rounded-xl bg-neutral-900 border border-neutral-800 p-4 flex flex-col items-center justify-center relative overflow-hidden">
                    {isGenerating && (
                      <div className="absolute inset-0 bg-neutral-950/70 flex items-center justify-center z-10">
                        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                      </div>
                    )}

                    {genError ? (
                      <div className="p-4 text-center space-y-2">
                        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                        <p className="text-xs text-amber-300 font-mono">{genError}</p>
                        <p className="text-[11px] text-neutral-500 font-mono">
                          Lütfen seçilen formatın karakter ve uzunluk kurallarına uygun veri giriniz.
                        </p>
                      </div>
                    ) : previewDataUrl ? (
                      <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-white shadow-md max-w-full overflow-hidden">
                        <img
                          src={previewDataUrl}
                          alt="Barkod"
                          className="max-h-48 object-contain"
                        />
                        {includeText && correctedText && (
                          <div className="text-neutral-900 font-mono font-bold text-xs mt-1 tracking-wider">
                            {correctedText}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-neutral-500 text-xs font-mono">Barkod üretilmek için hazır</div>
                    )}
                  </div>
                </div>

                {/* Save to Client Disk Section */}
                <div className="mt-4 pt-4 border-t border-neutral-800 space-y-3">
                  <div className="text-xs font-mono text-neutral-300">
                    <span className="font-semibold text-emerald-400">Teknik: Dosyaya Yazma (Client Disk)</span>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Barkodu bilgisayarınızda istediğiniz klasöre doğrudan kaydedebilirsiniz.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSaveToClientDisk('png')}
                      disabled={!previewDataUrl}
                      className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-950/50"
                    >
                      <HardDrive className="w-4 h-4" />
                      <span>Bilgisayara Kaydet (PNG)</span>
                    </button>

                    <button
                      onClick={() => handleSaveToClientDisk('svg')}
                      disabled={!previewDataUrl}
                      className="px-3 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-cyan-950/50"
                    >
                      <Download className="w-4 h-4" />
                      <span>SVG Vektör İndir</span>
                    </button>
                  </div>

                  {lastSavedPath && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-300 flex items-center justify-between">
                      <span className="truncate">Son Kaydedilen: <strong>{lastSavedPath}</strong></span>
                      <span className="text-[10px] text-neutral-400">Enes Öztürk [Disk I/O]</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: READ (DOSYADAN OKUMA) ================= */}
        {activeTab === 'read' && (
          <div className="space-y-6">
            <div className="bg-neutral-950/80 p-4 rounded-xl border border-neutral-800">
              <h3 className="text-sm font-mono font-bold text-neutral-100 flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Teknik: Dosyadan Okuma (Client Bilgisayarından Barkod Çözümleme)</span>
              </h3>
              <p className="text-xs text-neutral-400 font-mono mt-1">
                Bilgisayarınızda kayıtlı herhangi bir barkod veya QR görselini seçiniz.
                3. parti <strong>@zxing/library</strong> motoru dosyayı okuyup anında çözümleyecektir.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dropzone area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition cursor-pointer min-h-[260px] ${
                  dragActive
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : 'border-neutral-700 hover:border-neutral-600 bg-neutral-950'
                }`}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const f = (e.target as HTMLInputElement).files?.[0];
                    if (f) processReadFile(f);
                  };
                  input.click();
                }}
              >
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-inner">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-mono font-bold text-neutral-200">
                  Barkod Dosyasını Sürükleyip Bırakın
                </h4>
                <p className="text-xs text-neutral-400 font-mono mt-1 max-w-xs">
                  veya bilgisayarınızdaki lokasyondan bir PNG, JPEG veya WebP görseli seçin
                </p>
                <span className="mt-4 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono text-xs border border-neutral-700">
                  Bilgisayardan Dosya Seç
                </span>
              </div>

              {/* Decode Result Box */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                    <span className="text-xs font-mono font-bold text-neutral-200">
                      Çözümleme Sonucu (Decode)
                    </span>
                    {isReading && (
                      <span className="text-xs font-mono text-cyan-400 flex items-center gap-1">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Okunuyor...</span>
                      </span>
                    )}
                  </div>

                  {readResult ? (
                    readResult.success && readResult.text ? (
                      <div className="mt-4 space-y-4">
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold mb-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Barkod Başarıyla Çözümlendi!</span>
                          </div>
                          <div className="text-lg font-mono font-bold text-white break-all my-2">
                            {readResult.text}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs font-mono text-neutral-400">
                            <span className="bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                              Format: <strong className="text-emerald-300">{readResult.formatName}</strong>
                            </span>
                            {readResult.fileName && (
                              <span className="bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800 truncate">
                                Dosya: {readResult.fileName}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Copy button */}
                        <button
                          onClick={() => {
                            if (readResult?.text) {
                              navigator.clipboard.writeText(readResult.text);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }
                          }}
                          className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl font-mono text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          <span>{copied ? 'Metin Kopyalandı' : 'Metni Kopyala'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-center space-y-2">
                        <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                        <div className="text-xs font-mono text-red-300 font-semibold">Barkod Okunamadı</div>
                        <p className="text-[11px] font-mono text-neutral-400">
                          {readResult.error || 'Görselde okunabilir barkod bulunamadı.'}
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="mt-12 text-center text-xs font-mono text-neutral-500">
                      Henüz bir barkod dosyası seçilmedi. Soldaki alandan dosya yükleyiniz.
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-[11px] font-mono text-neutral-400">
                  <span>Enes Öztürk ZXing Okuyucu Motoru</span>
                  <button
                    onClick={onOpenCamera}
                    className="text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Canlı Kamera ile Oku</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: BATCH (TOPLU ÜRETİM) ================= */}
        {activeTab === 'batch' && (
          <div className="space-y-6">
            <div className="bg-neutral-950/80 p-4 rounded-xl border border-neutral-800">
              <h3 className="text-sm font-mono font-bold text-neutral-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Toplu Barkod Oluşturucu (Batch Generator)</span>
              </h3>
              <p className="text-xs text-neutral-400 font-mono mt-1">
                Her satıra bir barkod bilgisi yazarak aynı anda onlarca barkod üretin ve arşivleyin:
                <code className="text-purple-300 bg-neutral-900 px-1 py-0.5 rounded ml-1">
                  metin, format, etiket
                </code>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-6 space-y-3">
                <label className="text-xs font-mono text-neutral-300 font-semibold block">
                  Toplu Liste Girişi (CSV Biçiminde)
                </label>
                <textarea
                  rows={8}
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3 text-neutral-200 font-mono text-xs focus:outline-none focus:border-purple-500 leading-relaxed"
                />

                <button
                  onClick={handleRunBatch}
                  disabled={isBatchRunning}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-mono text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-purple-950/50"
                >
                  {isBatchRunning ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{isBatchRunning ? 'Toplu Üretiliyor...' : 'Tüm Barkodları Oluştur'}</span>
                </button>
              </div>

              {/* Batch Results Grid */}
              <div className="md:col-span-6 bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-xs font-mono text-neutral-300">
                    <span>Üretilen Barkodlar ({batchResults.length})</span>
                    <span className="text-[11px] text-neutral-500">Enes Öztürk Toplu Modülü</span>
                  </div>

                  {batchResults.length > 0 ? (
                    <div className="mt-3 grid grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                      {batchResults.map((b, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col items-center justify-between space-y-2"
                        >
                          <div className="bg-white p-2 rounded w-full flex items-center justify-center">
                            <img src={b.url} alt={b.text} className="max-h-16 object-contain" />
                          </div>
                          <div className="w-full text-center">
                            <div className="text-[11px] font-mono font-bold text-neutral-200 truncate">
                              {b.label}
                            </div>
                            <div className="text-[10px] font-mono text-purple-400">{b.format}</div>
                          </div>
                          <button
                            onClick={async () => {
                              const blob = dataUrlToBlob(b.url);
                              await saveFileToClientDisk(blob, `${b.label}.png`, 'png');
                            }}
                            className="w-full py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[10px] font-mono flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>İndir</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-16 text-center text-xs font-mono text-neutral-500">
                      Toplu barkodlar burada listelenecektir.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: STORAGE (DOSYA HAVUZU) ================= */}
        {activeTab === 'storage' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-neutral-950/80 p-4 rounded-xl border border-neutral-800">
              <div>
                <h3 className="text-sm font-mono font-bold text-neutral-100 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-amber-400" />
                  <span>Kayıtlı Barkod Dosyaları Havuzu</span>
                </h3>
                <p className="text-xs text-neutral-400 font-mono mt-0.5">
                  Bu oturumda üretilen veya client bilgisayarından okunan tüm barkodlar
                </p>
              </div>
              <span className="text-xs font-mono text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                Toplam: {savedBarcodes.length} dosya
              </span>
            </div>

            {savedBarcodes.length === 0 ? (
              <div className="p-12 text-center border border-neutral-800 rounded-2xl bg-neutral-950">
                <FileText className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
                <p className="text-xs font-mono text-neutral-400">
                  Henüz kaydedilmiş bir dosya bulunmuyor. Barkod Oluşturucu sekmesinden bir barkod üretip kaydedebilirsiniz.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {savedBarcodes.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between space-y-3 hover:border-neutral-700 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-neutral-200 truncate max-w-[180px]">
                          {item.title}
                        </span>
                        <button
                          onClick={() => onDeleteSavedBarcode(item.id)}
                          className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                        Format: <span className="text-amber-400">{item.formatName}</span> • {item.createdAt}
                      </div>

                      {item.dataUrl && (
                        <div className="mt-3 bg-white p-2 rounded-lg flex items-center justify-center max-h-24 overflow-hidden">
                          <img src={item.dataUrl} alt={item.text} className="max-h-20 object-contain" />
                        </div>
                      )}

                      <div className="text-[11px] font-mono text-neutral-300 bg-neutral-900 px-2 py-1 rounded mt-2 break-all">
                        {item.text}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-neutral-500">
                        {item.sizeBytes ? `${(item.sizeBytes / 1024).toFixed(1)} KB` : 'Bellek'}
                      </span>
                      <button
                        onClick={async () => {
                          if (item.dataUrl) {
                            const blob = dataUrlToBlob(item.dataUrl);
                            await saveFileToClientDisk(blob, item.title, 'png');
                          }
                        }}
                        className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono flex items-center gap-1 transition cursor-pointer"
                      >
                        <Download className="w-3 h-3 text-emerald-400" />
                        <span>Diske Yaz</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
