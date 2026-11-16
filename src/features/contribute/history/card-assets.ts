import paraLogo from '../account/para-logo.svg';

/** Para's logo in the band, at the SVG's own 97.77 by 64 shape, centred on the band's 132. */
export const LOGO = { width: 110, height: 72, y: 30 };

/** The weights the card draws in, loaded before drawing so the canvas does not fall back. */
export async function loadSummaryFonts(): Promise<void> {
  await Promise.all(
    ['500', '700', '800'].map((weight) => document.fonts.load(`${weight} 32px 'SN Pro'`)),
  ).catch(() => undefined);
}

/** Para's logo (its file is purple) filled white for the band, or null when it does not load. */
export async function loadWhiteLogo(): Promise<HTMLCanvasElement | null> {
  const image = new Image();
  image.src = paraLogo;
  const canvas = document.createElement('canvas');
  canvas.width = 2 * LOGO.width; // twice the drawn size, to stay sharp
  canvas.height = 2 * LOGO.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  try {
    await image.decode();
  } catch {
    return null;
  }
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}
