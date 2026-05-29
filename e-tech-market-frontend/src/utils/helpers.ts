export function formatMoneyVnd(v: number | string): string {
  if (v === null || v === undefined) return '0 đ';
  const n = typeof v === 'number' ? v : Number.parseFloat(v as string);
  if (!Number.isFinite(n)) return `${v} đ`;
  return `${n.toLocaleString('vi-VN')} đ`;
}

export function buildAccountAddressLine(profile: {
  address_line?: string | null;
  ward?: string | null;
  district?: string | null;
  province?: string | null;
}): string {
  if (!profile) return '';
  return [
    profile.address_line,
    profile.ward,
    profile.district,
    profile.province,
  ].filter(Boolean).join(', ');
}

export function calculateEffectivePrice(
  price: number | string,
  discountType?: 'percentage' | 'fixed' | null,
  discountValue?: number | string | null
): number {
  const p = typeof price === 'number' ? price : Number.parseFloat(price as string);
  if (!Number.isFinite(p)) return 0;
  
  if (!discountType || !discountValue) return p;

  const v = typeof discountValue === 'number' ? discountValue : Number.parseFloat(discountValue as string);
  if (!Number.isFinite(v)) return p;

  if (discountType === 'fixed') {
    return Math.max(0, p - v);
  }
  
  if (discountType === 'percentage') {
    return Math.max(0, p * (1 - v / 100));
  }

  return p;
}
