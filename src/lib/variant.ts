import { hash32 } from './seed';
import { getAttribution } from './attribution';

export type Variant = 'A' | 'B';

const KEY = 'sl_variant';

export function getVariant(userKey: string): Variant {
  // 1) URL attribution override
  const attr = getAttribution();
  if (attr?.variant === 'A' || attr?.variant === 'B') return attr.variant;

  // 2) stored
  const stored = (localStorage.getItem(KEY) ?? '') as Variant;
  if (stored === 'A' || stored === 'B') return stored;

  // 3) deterministic bucket
  const h = hash32(userKey);
  const v: Variant = h % 2 === 0 ? 'A' : 'B';
  localStorage.setItem(KEY, v);
  return v;
}

export function setVariant(v: Variant) {
  localStorage.setItem(KEY, v);
}
