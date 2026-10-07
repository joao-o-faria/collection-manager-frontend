import { TestBed } from '@angular/core/testing';
import { ImageService } from './image.service';

describe('ImageService.toJpegBase64', () => {
  let drawn: { w: number; h: number } | null;
  let fillStyle: string | null;
  let failLoad: boolean;
  const originalImage = globalThis.Image;
  const originalCreate = document.createElement.bind(document);

  beforeEach(() => {
    drawn = null;
    fillStyle = null;
    failLoad = false;

    class FakeImage {
      naturalWidth = 4000;
      naturalHeight = 2000;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_: string) {
        queueMicrotask(() => (failLoad ? this.onerror?.() : this.onload?.()));
      }
    }
    (globalThis as any).Image = FakeImage;

    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag !== 'canvas') return originalCreate(tag);
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ({
          set fillStyle(v: string) {
            fillStyle = v;
          },
          fillRect: () => {},
          drawImage: (_img: unknown, _x: number, _y: number, w: number, h: number) => (drawn = { w, h }),
        }),
        toDataURL: (type: string, quality: number) => `data:${type};base64,JPEG-${quality}`,
      };
      return canvas as unknown as HTMLCanvasElement;
    }) as typeof document.createElement);
  });

  afterEach(() => {
    (globalThis as any).Image = originalImage;
    vi.restoreAllMocks();
  });

  function service(): ImageService {
    return TestBed.inject(ImageService);
  }

  it('converte para JPEG reduzindo o maior lado para 1280px', async () => {
    const b64 = await service().toJpegBase64('data:image/webp;base64,AAAA');

    expect(b64).toBe('JPEG-0.85');
    expect(drawn).toEqual({ w: 1280, h: 640 });
    expect(fillStyle).toBe('#ffffff');
  });

  it('não amplia imagens pequenas', async () => {
    (globalThis as any).Image = class extends (globalThis as any).Image {
      naturalWidth = 300;
      naturalHeight = 200;
    };

    await service().toJpegBase64('data:image/png;base64,AAAA');

    expect(drawn).toEqual({ w: 300, h: 200 });
  });

  it('rejeita quando o navegador não consegue ler a imagem', async () => {
    failLoad = true;
    await expect(service().toJpegBase64('data:image/heic;base64,AAAA')).rejects.toThrow();
  });
});
