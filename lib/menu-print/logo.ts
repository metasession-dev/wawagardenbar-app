/**
 * @requirement REQ-113 - Printable A4 menu
 * @requirement SRS REQ-MENUMGT-011
 *
 * Browser-only: loads the logo once, downscales it to 600 px wide (the
 * source is 2551×2004, which would bloat the PDF past NFR-2's 2 MB), and
 * derives a greyscale copy for the black & white template. Any failure
 * returns null and the menu renders without a logo.
 */

export interface MenuLogos {
  color: string;
  grayscale: string;
}

const LOGO_WIDTH_PX = 600;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

export async function loadMenuLogos(
  src = '/logo.png'
): Promise<MenuLogos | null> {
  try {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = LOGO_WIDTH_PX;
    canvas.height = Math.round(
      (LOGO_WIDTH_PX * img.naturalHeight) / img.naturalWidth
    );
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const color = canvas.toDataURL('image/png');

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = image.data;
    for (let i = 0; i < px.length; i += 4) {
      const grey = Math.round(
        0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
      );
      px[i] = grey;
      px[i + 1] = grey;
      px[i + 2] = grey;
    }
    ctx.putImageData(image, 0, 0);
    const grayscale = canvas.toDataURL('image/png');

    return { color, grayscale };
  } catch (error) {
    console.warn('Menu print: logo unavailable, printing without it.', error);
    return null;
  }
}
