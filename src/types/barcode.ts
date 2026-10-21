export type BarcodeFormatType =
  | 'code128'
  | 'ean13'
  | 'ean8'
  | 'upca'
  | 'code39'
  | 'qrcode'
  | 'datamatrix'
  | 'pdf417'
  | 'itf14';

export interface BarcodeFormatMeta {
  id: BarcodeFormatType;
  name: string;
  category: '1D (Çizgi Barkod)' | '2D (Kare/Matris)';
  example: string;
  description: string;
  patternNotice?: string;
}

export interface BarcodeGenerateOptions {
  text: string;
  format: BarcodeFormatType;
  includeText?: boolean;
  scale?: number;
  height?: number;
  barColor?: string;
  bgColor?: string;
  rotate?: 'N' | 'R' | 'L' | 'I'; // Normal, Right 90, Left 90, Inverted 180
}

export interface SavedBarcodeItem {
  id: string;
  title: string;
  text: string;
  format: BarcodeFormatType;
  formatName: string;
  dataUrl: string;
  createdAt: string;
  sizeBytes?: number;
  filePath?: string;
  savedToDiskLocation?: string;
}

export interface ReadBarcodeResult {
  success: boolean;
  text?: string;
  formatName?: string;
  timestamp: string;
  rawBytesLength?: number;
  error?: string;
  fileName?: string;
  previewUrl?: string;
}

export const BARCODE_FORMATS: BarcodeFormatMeta[] = [
  {
    id: 'code128',
    name: 'Code 128',
    category: '1D (Çizgi Barkod)',
    example: 'ENES-OZTURK-2026',
    description: 'En yaygın ve esnek çizgi barkod. Harf, rakam ve sembolleri destekler.',
  },
  {
    id: 'ean13',
    name: 'EAN-13 (Perakende)',
    category: '1D (Çizgi Barkod)',
    example: '8690123456789',
    description: 'Türkiye ve dünya çapında market ve perakende ürünlerinde kullanılan 13 haneli standart.',
    patternNotice: 'Tam 12 veya 13 hane rakam gerektirir (869 Türkiye prefiksi ile başlar).',
  },
  {
    id: 'qrcode',
    name: 'QR Kod (2D Quick Response)',
    category: '2D (Kare/Matris)',
    example: 'https://enesozturk.dev/barkod',
    description: 'Web bağlantıları, uzun metinler, iletişim bilgileri için yüksek kapasiteli 2D barkod.',
  },
  {
    id: 'code39',
    name: 'Code 39',
    category: '1D (Çizgi Barkod)',
    example: 'BARKOD39',
    description: 'Savunma sanayi, otomotiv ve stok takibinde sıkça kullanılan alfasayısal kod.',
  },
  {
    id: 'upca',
    name: 'UPC-A',
    category: '1D (Çizgi Barkod)',
    example: '012345678905',
    description: 'Kuzey Amerika perakende standardı (12 haneli rakam).',
    patternNotice: 'Tam 11 veya 12 haneli rakam olmalıdır.',
  },
  {
    id: 'ean8',
    name: 'EAN-8',
    category: '1D (Çizgi Barkod)',
    example: '96385074',
    description: 'Küçük paketler ve sakız/şeker gibi kompakt ürünler için 8 haneli barkod.',
    patternNotice: 'Tam 7 veya 8 haneli rakam olmalıdır.',
  },
  {
    id: 'datamatrix',
    name: 'Data Matrix (2D)',
    category: '2D (Kare/Matris)',
    example: 'ENES-OZTURK-DM',
    description: 'İlaç takip sistemi (İTS) ve mikro elektronik parçalar için kompakt 2D barkod.',
  },
  {
    id: 'pdf417',
    name: 'PDF417 (2D Yığıtlı)',
    category: '2D (Kare/Matris)',
    example: 'TC-KIMLIK-VE-BELGE-KODU-987654',
    description: 'Kimlik kartları, biniş kartları ve resmi belgelerde kullanılan çok satırlı 2D barkod.',
  },
  {
    id: 'itf14',
    name: 'ITF-14 (Koli Barkodu)',
    category: '1D (Çizgi Barkod)',
    example: '18690123456786',
    description: 'Taşıma kolileri ve toptan dağıtım kutuları için 14 haneli oluklu mukavva barkodu.',
    patternNotice: 'Tam 13 veya 14 haneli rakam olmalıdır.',
  },
];
