import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ImageService {
  /**
   * Converte qualquer imagem que o navegador consiga ler (WebP, AVIF, PNG...) em JPEG,
   * reduzindo o maior lado para `maxSize`. O Ollama só decodifica JPEG/PNG/BMP/GIF.
   * Retorna o base64 sem o prefixo `data:`.
   */
  toJpegBase64(dataUrl: string, maxSize = 1280, quality = 0.85): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas indisponível'));
          return;
        }
        // Fundo branco para imagens com transparência (JPEG não tem canal alfa).
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1] ?? '');
      };
      img.onerror = () => reject(new Error('Formato de imagem não suportado'));
      img.src = dataUrl;
    });
  }
}
