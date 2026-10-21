import bwipjs, { ToCanvasOptions } from 'bwip-js';
import { BrowserMultiFormatReader } from '@zxing/library';
import { BarcodeGenerateOptions, ReadBarcodeResult, BarcodeFormatType } from '../types/barcode';

// Cache reader instance
const codeReader = new BrowserMultiFormatReader();

/**
 * Normalizes input text for specific barcode types (e.g. EAN13 checksum calculation)
 */
export function normalizeBarcodeText(format: BarcodeFormatType, text: string): string {
  const trimmed = text.trim();
  if (format === 'ean13') {
    // Only digits
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 12) {
      // Calculate 13th digit (checksum)
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const d = parseInt(digits[i], 10);
        sum += i % 2 === 0 ? d : d * 3;
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      return digits + checkDigit;
    }
    return digits.slice(0, 13);
  }

  if (format === 'ean8') {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 7) {
      let sum = 0;
      for (let i = 0; i < 7; i++) {
        const d = parseInt(digits[i], 10);
        sum += i % 2 === 0 ? d * 3 : d;
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      return digits + checkDigit;
    }
    return digits.slice(0, 8);
  }

  if (format === 'upca') {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 11) {
      let sum = 0;
      for (let i = 0; i < 11; i++) {
        const d = parseInt(digits[i], 10);
        sum += i % 2 === 0 ? d * 3 : d;
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      return digits + checkDigit;
    }
    return digits.slice(0, 12);
  }

  return trimmed;
}

/**
 * Generates barcode using bwip-js onto a canvas and returns DataURL and SVG string
 */
export async function generateBarcode(
  options: BarcodeGenerateOptions
): Promise<{ dataUrl: string; svgText: string; width: number; height: number; correctedText: string }> {
  const correctedText = normalizeBarcodeText(options.format, options.text);
  if (!correctedText) {
    throw new Error('Barkod üretmek için bir metin veya rakam girilmelidir.');
  }

  // Create an offscreen canvas
  const canvas = document.createElement('canvas');

  // Strip '#' from hex colors if present
  const barcolor = (options.barColor || '#000000').replace('#', '');
  const backgroundcolor = (options.bgColor || '#ffffff').replace('#', '');

  const bwipOptions: ToCanvasOptions = {
    bcid: options.format,
    text: correctedText,
    scale: options.scale || 3,
    height: options.height || 12,
    includetext: options.includeText ?? true,
    textxalign: 'center',
    barcolor: barcolor,
    backgroundcolor: backgroundcolor,
    rotate: options.rotate || 'N',
    paddingwidth: 10,
    paddingheight: 10,
  };

  return new Promise((resolve, reject) => {
    try {
      bwipjs.toCanvas(canvas, bwipOptions, (err?: Error | string | null) => {
        if (err) {
          const errMsg = typeof err === 'string' ? err : err.message || 'Barkod çizilemedi';
          reject(new Error(errMsg));
          return;
        }

        const dataUrl = canvas.toDataURL('image/png');

        // Also generate SVG for vector export
        let svgText = '';
        try {
          svgText = bwipjs.toSVG({
            ...bwipOptions,
          });
        } catch {
          svgText = '';
        }

        resolve({
          dataUrl,
          svgText,
          width: canvas.width,
          height: canvas.height,
          correctedText,
        });
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Barkod üretimi başarısız oldu.';
      reject(new Error(msg));
    }
  });
}

/**
 * Reads and decodes a barcode from an Image URL, Blob, or File using @zxing/library
 */
export async function readBarcode(source: string | File | Blob): Promise<ReadBarcodeResult> {
  const timestamp = new Date().toLocaleTimeString('tr-TR');
  let imageUrl = '';
  let fileName = 'bilinmeyen_dosya';

  if (typeof source === 'string') {
    imageUrl = source;
  } else {
    fileName = (source as File).name || 'secilen_barkod.png';
    imageUrl = URL.createObjectURL(source);
  }

  try {
    const result = await codeReader.decodeFromImageUrl(imageUrl);

    return {
      success: true,
      text: result.getText(),
      formatName: result.getBarcodeFormat() ? String(result.getBarcodeFormat()) : 'Bilinmeyen Format',
      timestamp,
      rawBytesLength: result.getRawBytes() ? result.getRawBytes().length : undefined,
      fileName,
      previewUrl: imageUrl,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Görselde okunabilir bir barkod bulunamadı.';
    return {
      success: false,
      error: errorMsg,
      timestamp,
      fileName,
      previewUrl: imageUrl,
    };
  }
}

/**
 * Native File System Access API - Saves directly to user's selected PC folder/path if supported
 * Otherwise falls back to automatic download
 */
export async function saveFileToClientDisk(
  blob: Blob,
  suggestedFileName: string,
  fileExtension: 'png' | 'svg' | 'txt' = 'png'
): Promise<{ success: boolean; filePath?: string; method: 'native-picker' | 'download' }> {
  const mimeTypes: Record<string, string> = {
    png: 'image/png',
    svg: 'image/svg+xml',
    txt: 'text/plain',
  };

  // Try Native File System Access API (Chromium, Edge, Opera, Chrome)
  const windowWithPicker = window as unknown as {
    showSaveFilePicker?: (opts: {
      suggestedName?: string;
      types?: Array<{
        description: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<{
      name: string;
      createWritable: () => Promise<{
        write: (data: Blob) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  };

  if (typeof windowWithPicker.showSaveFilePicker === 'function') {
    try {
      const handle = await windowWithPicker.showSaveFilePicker({
        suggestedName: suggestedFileName,
        types: [
          {
            description: `${fileExtension.toUpperCase()} Dosyası`,
            accept: {
              [mimeTypes[fileExtension] || 'application/octet-stream']: [`.${fileExtension}`],
            },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();

      return {
        success: true,
        filePath: handle.name,
        method: 'native-picker',
      };
    } catch (e: unknown) {
      // If user aborted or error, fall through to download anchor
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error('Dosya kaydetme işlemi kullanıcı tarafından iptal edildi.');
      }
    }
  }

  // Fallback: standard anchor download
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = suggestedFileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return {
    success: true,
    filePath: suggestedFileName,
    method: 'download',
  };
}

/**
 * Converts a data URL to a Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
