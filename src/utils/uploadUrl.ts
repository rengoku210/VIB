export function resolveUploadUrl(src: string | null | undefined): string {
  const raw = (src || '').trim();
  if (!raw) return '';
  if (raw.startsWith('/uploads/')) return `/api${raw}`;
  if (raw.startsWith('uploads/')) return `/api/${raw}`;
  return raw;
}

export function handleUploadImageError(
  img: HTMLImageElement,
  originalSrc: string | null | undefined,
  onFail?: () => void
): void {
  const raw = (originalSrc || '').trim();
  const match = raw.match(/^(?:\/api)?\/?uploads\/([^?#]+)/);

  if (match && img.dataset.uploadRetried !== '1') {
    img.dataset.uploadRetried = '1';
    const currentSrc = img.getAttribute('src') || '';
    const file = match[1];
    // Retry once against the opposite mount (/uploads <-> /api/uploads) before failing.
    img.src = currentSrc.startsWith('/api/uploads/') ? `/uploads/${file}` : `/api/uploads/${file}`;
    return;
  }

  onFail?.();
}
