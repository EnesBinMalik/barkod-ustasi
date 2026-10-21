import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Camera, X, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { playScannerBeep } from '../services/soundEffects';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (resultText: string, formatName: string) => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onDetected,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [detectedItem, setDetectedItem] = useState<{ text: string; format: string } | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopScanning();
      return;
    }

    const reader = new BrowserMultiFormatReader();
    codeReaderRef.current = reader;

    // List video devices
    reader
      .listVideoInputDevices()
      .then((videoDevices) => {
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          // Prefer back/environment camera if available
          const backCam = videoDevices.find((d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('arka'));
          setSelectedDeviceId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
        }
      })
      .catch((err) => {
        setError(`Kamera listesi alınamadı: ${err.message || err}`);
      });

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedDeviceId && videoRef.current) {
      startScanning(selectedDeviceId);
    }
  }, [isOpen, selectedDeviceId]);

  const startScanning = async (deviceId: string) => {
    if (!codeReaderRef.current || !videoRef.current) return;
    try {
      setError(null);
      setScanning(true);
      setDetectedItem(null);

      await codeReaderRef.current.decodeFromVideoDevice(
        deviceId || null,
        videoRef.current,
        (result, err) => {
          if (result) {
            playScannerBeep();
            const text = result.getText();
            const format = result.getBarcodeFormat() ? String(result.getBarcodeFormat()) : 'Bilinmeyen Format';
            setDetectedItem({ text, format });

            // Stop scanner and notify parent after brief feedback
            setTimeout(() => {
              stopScanning();
              onDetected(text, format);
              onClose();
            }, 600);
          }
        }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kamera başlatılamadı';
      setError(`Kamera hatası: ${msg}. Tarayıcınızın kamera iznini kontrol ediniz.`);
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch {
        // Ignore reset errors
      }
    }
    setScanning(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-100 font-mono text-sm">Canlı Barkod / QR Tarayıcı</h3>
              <p className="text-[11px] text-neutral-400 font-mono">Kamerayı barkoda doğru tutunuz</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanning();
              onClose();
            }}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Selector */}
        {devices.length > 1 && (
          <div className="mt-3 flex items-center gap-2 text-xs font-mono">
            <span className="text-neutral-400">Kamera:</span>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="flex-1 bg-neutral-900 border border-neutral-700 text-neutral-200 rounded px-2 py-1 focus:outline-none"
            >
              {devices.map((d, idx) => (
                <option key={d.deviceId || idx} value={d.deviceId}>
                  {d.label || `Kamera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Video Viewport */}
        <div className="relative mt-4 aspect-video bg-black rounded-xl overflow-hidden border border-neutral-800 flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Scanner Overlay Laser Line */}
          {scanning && !detectedItem && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-3/4 h-2/3 border-2 border-emerald-500/60 rounded-lg relative overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                {/* Laser animation */}
                <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-bounce" />
                <div className="absolute bottom-1 right-1 text-[9px] font-mono text-emerald-400 bg-black/60 px-1 rounded">
                  Okunuyor...
                </div>
              </div>
            </div>
          )}

          {/* Detected feedback overlay */}
          {detectedItem && (
            <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2 animate-pulse" />
              <div className="text-emerald-300 font-bold font-mono text-sm">Barkod Algılandı!</div>
              <div className="text-xs text-neutral-200 font-mono mt-1 break-all bg-black/50 px-3 py-1 rounded max-w-full">
                {detectedItem.text}
              </div>
              <div className="text-[10px] text-emerald-400/80 font-mono mt-1">Format: {detectedItem.format}</div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="absolute inset-0 bg-black/90 p-4 flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
              <p className="text-xs text-red-300 font-mono">{error}</p>
              <button
                onClick={() => selectedDeviceId && startScanning(selectedDeviceId)}
                className="mt-3 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tekrar Dene</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-4 flex items-center justify-between text-xs font-mono text-neutral-400">
          <span className="text-[11px]">Enes Öztürk ZXing Tarama Motoru</span>
          <button
            onClick={() => {
              stopScanning();
              onClose();
            }}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs transition cursor-pointer"
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  );
};
