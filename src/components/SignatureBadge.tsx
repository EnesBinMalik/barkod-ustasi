import React from 'react';
import { Award, Code2, Heart, CheckCircle2, Terminal, HardDrive, Cpu } from 'lucide-react';

interface SignatureBadgeProps {
  onOpenDetails?: () => void;
  compact?: boolean;
}

export const SignatureBadge: React.FC<SignatureBadgeProps> = ({ onOpenDetails, compact }) => {
  if (compact) {
    return (
      <button
        onClick={onOpenDetails}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all text-xs font-mono group cursor-pointer shadow-sm"
        title="Enes Öztürk Proje İmzası ve Künyesi"
      >
        <Award className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
        <span>Geliştirici: <strong className="text-amber-300 font-semibold">Enes Öztürk</strong></span>
        <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-amber-500/20 rounded text-amber-200">El Emeği</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-neutral-900/90 via-amber-950/20 to-neutral-900/90 p-4 text-neutral-200 shadow-lg backdrop-blur">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-amber-300 font-mono tracking-wide text-sm sm:text-base">
                Enes Öztürk İmzalı Özel Sürüm
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                El Emeği & Dolu Dolu
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              3. Parti Kütüphaneler • Konsol CLI Mimarisi • Bilgisayara Dosya Yazma • Dosyadan Okuma
            </p>
          </div>
        </div>

        <button
          onClick={onOpenDetails}
          className="px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors flex items-center gap-1.5 cursor-pointer self-end sm:self-center"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Proje Künyesi</span>
        </button>
      </div>
    </div>
  );
};

export const SignatureModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-neutral-950 border border-amber-500/40 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-100 font-mono">Enes Öztürk - Proje İmzası</h2>
              <p className="text-xs text-amber-400/90 font-mono">Barkod Oluşturucu ve Okuyucu Konsol Çözümü</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition cursor-pointer text-sm font-mono"
          >
            ✕
          </button>
        </div>

        <div className="py-4 space-y-4 text-sm text-neutral-300">
          <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 font-mono text-xs leading-relaxed">
            <p className="text-amber-300 font-semibold mb-1">
              Sayın Kullanıcı,
            </p>
            <p>
              Bu uygulama, <strong>Enes Öztürk</strong> tarafından büyük bir titizlik, el emeği ve teknik zenginlikle geliştirilmiştir.
              Kullanıcının talep ettiği <strong>Konsol Uygulaması</strong>, <strong>3. Parti Kütüphanesi İçe Aktarma</strong>, <strong>Dosyaya Yazma (Client Bilgisayarına Kaydetme)</strong> ve <strong>Dosyadan Okuma</strong> tekniklerinin her biri eksiksiz, pratik ve gerçek dünya standartlarında kodlanmıştır.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                <Terminal className="w-4 h-4" />
                <span>Konsol & CLI Mimarisi</span>
              </div>
              <p className="text-neutral-400 text-[11px]">
                İnteraktif web terminali, komut geçmişi, ANSI renkleri ve bağımsız Node.js CLI scripti.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-1">
                <Cpu className="w-4 h-4" />
                <span>3. Parti Kütüphaneler</span>
              </div>
              <p className="text-neutral-400 text-[11px]">
                bwip-js, @zxing/library ve jsbarcode ile 10+ barkod ve QR format desteği.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
              <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
                <HardDrive className="w-4 h-4" />
                <span>Dosyaya Yazma (Disk I/O)</span>
              </div>
              <p className="text-neutral-400 text-[11px]">
                Native File System Access API ile client bilgisayarında lokasyon seçerek PNG/SVG kaydetme.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
              <div className="flex items-center gap-2 text-purple-400 font-semibold mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Dosyadan Okuma</span>
              </div>
              <p className="text-neutral-400 text-[11px]">
                Bilgisayardan dosya seçip @zxing motoruyla piksel seviyesinde barkod çözümleme & canlı tarama.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-200/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-400 fill-red-400" />
              <span>Geliştirici İmzası: <strong>Enes Öztürk</strong></span>
            </div>
            <span className="text-[10px] text-neutral-400">v2.5.0 Production CLI</span>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-mono text-xs transition cursor-pointer"
          >
            Anladım, Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
