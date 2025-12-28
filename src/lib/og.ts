export type OgType = 'daily' | 'chemistry';

export function ogImageUrl(t: OgType) {
  const base = (import.meta.env.VITE_OG_BASE_URL as string) || '';
  const fallback = (import.meta.env.VITE_OG_IMAGE_URL as string) || '';
  if (!base.trim()) return fallback;

  const clean = base.replace(/\/$/, '');
  return `${clean}/${t}.png`;
}
