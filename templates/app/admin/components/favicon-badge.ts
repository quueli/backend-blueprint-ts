let originalHref: string | null = null;
let baseImage: HTMLImageElement | null = null;

function getIconLink(): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  return link;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function setFaviconBadge(count: number): void {
  if (typeof document === 'undefined') return;
  const link = getIconLink();
  if (originalHref === null) originalHref = link.getAttribute('href') ?? '';

  if (!count || count <= 0) {
    if (originalHref) link.href = originalHref;
    return;
  }

  const label = count > 99 ? '99+' : String(count);
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const draw = () => {
    ctx.clearRect(0, 0, size, size);
    if (baseImage) {
      try {
        ctx.drawImage(baseImage, 0, 0, size, size);
      } catch {
        /* tainted canvas, fall through to backdrop */
      }
    } else {
      ctx.fillStyle = '#111827';
      roundRect(ctx, 0, 0, size, size, 12);
      ctx.fill();
    }

    const r = label.length > 2 ? 24 : 19;
    const cx = size - r;
    const cy = r;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${label.length > 2 ? 24 : 30}px -apple-system, Segoe UI, Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy + 1);

    try {
      link.href = canvas.toDataURL('image/png');
    } catch {
      /* canvas export blocked, leave icon as is */
    }
  };

  if (!baseImage && originalHref && /\.(png|ico|svg|jpe?g|gif)(\?.*)?$/i.test(originalHref)) {
    const img = new Image();
    img.onload = () => {
      baseImage = img;
      draw();
    };
    img.onerror = () => draw();
    img.src = originalHref;
  } else {
    draw();
  }
}
