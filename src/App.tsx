/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * BARKOD USTASI - BARKOD OLUŞTURUCU VE OKUYUCU KONSOL UYGULAMASI
 * Geliştirici: Enes Öztürk
 * İmzalı & El Emeği Özel Üretim
 */

import React, { useState, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  LayoutGrid,
  Columns2,
  HardDrive,
  Camera,
  Download,
  Upload,
  Code2,
  Award,
  Sparkles,
  Heart,
  Cpu,
  HelpCircle,
  FileCode2
} from 'lucide-react';
import { ConsoleTerminal } from './components/ConsoleTerminal';
import { VisualStudio } from './components/VisualStudio';
import { SignatureBadge, SignatureModal } from './components/SignatureBadge';
import { CliModal } from './components/CliModal';
import { CameraScannerModal } from './components/CameraScannerModal';
import { SavedBarcodeItem } from './types/barcode';
import { generateBarcode } from './services/barcodeService';

export default function App() {
  const [viewMode, setViewMode] = useState<'terminal' | 'visual' | 'split'>('terminal');
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [isCliOpen, setIsCliOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Storage for barcodes created or read in session
  const [savedBarcodes, setSavedBarcodes] = useState<SavedBarcodeItem[]>(() => {
    try {
      const local = localStorage.getItem('enes_saved_barcodes');
      if (local) return JSON.parse(local);
    } catch {
      // ignore
    }
    return [];
  });

  // Seed default sample barcode on initial load if empty
  useEffect(() => {
    if (savedBarcodes.length === 0) {
      generateBarcode({
        text: '8690123456789',
        format: 'ean13',
        scale: 2,
        height: 10,
      }).then((res) => {
        const sampleItem: SavedBarcodeItem = {
          id: 'sample-1',
          title: 'Ornek_Turk_Mali_EAN13.png',
          text: res.correctedText,
          format: 'ean13',
          formatName: 'EAN-13',
          dataUrl: res.dataUrl,
          createdAt: new Date().toLocaleTimeString('tr-TR'),
          sizeBytes: 8192,
          savedToDiskLocation: './barkodlar/Ornek_Turk_Mali_EAN13.png',
        };
        setSavedBarcodes([sampleItem]);
      }).catch(() => {
        // ignore
      });
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('enes_saved_barcodes', JSON.stringify(savedBarcodes));
    } catch {
      // ignore
    }
  }, [savedBarcodes]);

  const handleAddSavedBarcode = (item: SavedBarcodeItem) => {
    setSavedBarcodes((prev) => [item, ...prev]);
  };

  const handleDeleteSavedBarcode = (id: string) => {
    setSavedBarcodes((prev) => prev.filter((b) => b.id !== id));
  };

  const handleCameraDetected = (text: string, formatName: string) => {
    const newItem: SavedBarcodeItem = {
      id: Math.random().toString(36).substring(2, 9),
      title: `Kamera_${formatName}_${Date.now()}.png`,
      text: text,
      format: 'code128',
      formatName: formatName,
      dataUrl: '',
      createdAt: new Date().toLocaleTimeString('tr-TR'),
      filePath: 'Kamera Tarayıcı',
    };
    handleAddSavedBarcode(newItem);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-black">
      {/* Top Header Bar */}
      <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur sticky top-0 z-40 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-black font-bold shadow-lg shadow-emerald-950/60">
              <TerminalIcon className="w-5 h-5 text-neutral-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold font-mono text-white tracking-tight">
                  Barkod Ustası CLI
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  v2.5.0
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-mono">
                Barkod Oluşturucu & Okuyucu Konsol Çözümü
              </p>
            </div>
          </div>

          {/* Center Mode Switcher Tabs */}
          <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-mono">
            <button
              onClick={() => setViewMode('terminal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'terminal'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>Konsol (CLI)</span>
            </button>

            <button
              onClick={() => setViewMode('visual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'visual'
                  ? 'bg-cyan-600 text-white font-semibold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Görsel Stüdyo</span>
            </button>

            <button
              onClick={() => setViewMode('split')}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-amber-600 text-white font-semibold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Konsol ve Görsel Arayüz Yan Yana"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Bölünmüş Ekran</span>
            </button>
          </div>

          {/* Right Action Badges */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCliOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono border border-neutral-700 transition cursor-pointer"
              title="Bağımsız Node.js barcode-cli.js kodunu görüntüle & indir"
            >
              <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>barcode-cli.js</span>
            </button>

            {/* Enes Öztürk Signature Badge */}
            <SignatureBadge onOpenDetails={() => setIsSignatureOpen(true)} compact={true} />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col">
        {/* Banner with Techniques Summary */}
        <div className="mb-4">
          <SignatureBadge onOpenDetails={() => setIsSignatureOpen(true)} compact={false} />
        </div>

        {/* Dynamic Views */}
        <div className="flex-1 min-h-[580px]">
          {viewMode === 'terminal' && (
            <div className="h-[620px] sm:h-[680px]">
              <ConsoleTerminal
                onOpenSignature={() => setIsSignatureOpen(true)}
                onOpenCliScript={() => setIsCliOpen(true)}
                onOpenCamera={() => setIsCameraOpen(true)}
                savedBarcodes={savedBarcodes}
                onAddSavedBarcode={handleAddSavedBarcode}
              />
            </div>
          )}

          {viewMode === 'visual' && (
            <div className="h-full">
              <VisualStudio
                onOpenCli={() => setIsCliOpen(true)}
                onOpenSignature={() => setIsSignatureOpen(true)}
                onOpenCamera={() => setIsCameraOpen(true)}
                savedBarcodes={savedBarcodes}
                onAddSavedBarcode={handleAddSavedBarcode}
                onDeleteSavedBarcode={handleDeleteSavedBarcode}
              />
            </div>
          )}

          {viewMode === 'split' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[680px]">
              <ConsoleTerminal
                onOpenSignature={() => setIsSignatureOpen(true)}
                onOpenCliScript={() => setIsCliOpen(true)}
                onOpenCamera={() => setIsCameraOpen(true)}
                savedBarcodes={savedBarcodes}
                onAddSavedBarcode={handleAddSavedBarcode}
              />
              <VisualStudio
                onOpenCli={() => setIsCliOpen(true)}
                onOpenSignature={() => setIsSignatureOpen(true)}
                onOpenCamera={() => setIsCameraOpen(true)}
                savedBarcodes={savedBarcodes}
                onAddSavedBarcode={handleAddSavedBarcode}
                onDeleteSavedBarcode={handleDeleteSavedBarcode}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-neutral-900/60 py-3 px-4 text-xs font-mono text-neutral-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>3. Parti Motorlar: <strong>bwip-js</strong> & <strong>@zxing/library</strong></span>
            <span className="text-neutral-600">•</span>
            <span>Dosyaya Yazma (Native File System) & Okuma Aktif</span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-300">
            <span>Tasarım ve Kodlama:</span>
            <strong className="text-amber-300">Enes Öztürk</strong>
            <span>[El Emeği & Dolu Dolu]</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <SignatureModal isOpen={isSignatureOpen} onClose={() => setIsSignatureOpen(false)} />
      <CliModal isOpen={isCliOpen} onClose={() => setIsCliOpen(false)} />
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onDetected={handleCameraDetected}
      />
    </div>
  );
}
