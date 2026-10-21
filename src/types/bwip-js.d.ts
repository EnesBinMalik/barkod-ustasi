declare module 'bwip-js' {
  export interface ToCanvasOptions {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    width?: number;
    includetext?: boolean;
    textxalign?: 'left' | 'center' | 'right' | 'justify';
    barcolor?: string;
    backgroundcolor?: string;
    rotate?: 'N' | 'R' | 'L' | 'I';
    paddingwidth?: number;
    paddingheight?: number;
    [key: string]: unknown;
  }

  export function toCanvas(
    canvas: HTMLCanvasElement | string,
    options: ToCanvasOptions,
    callback?: (err?: Error | string | null, canvas?: HTMLCanvasElement) => void
  ): HTMLCanvasElement;

  export function toSVG(options: ToCanvasOptions): string;

  export function toBuffer(
    options: ToCanvasOptions,
    callback: (err?: Error | string | null, buffer?: Buffer) => void
  ): void;

  const bwipjs: {
    toCanvas: typeof toCanvas;
    toSVG: typeof toSVG;
    toBuffer: typeof toBuffer;
  };

  export default bwipjs;
}
