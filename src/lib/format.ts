export function maskCard(card: string): string {
  const s = String(card || '');
  if (s.length <= 6) return s;
  return `${s.slice(0, 3)}${'*'.repeat(Math.min(10, s.length - 6))}${s.slice(-3)}`;
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0 秒';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return [d ? `${d} 天` : '', h ? `${h} 小时` : '', !d && m ? `${m} 分钟` : ''].filter(Boolean).join(' ') || '不足 1 分钟';
}

export function randomRequestId(length = 24): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export function formatDateTime(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '' || value === 0) return '—';
  const ms = typeof value === 'number' ? (value > 1e12 ? value : value * 1000) : Date.parse(String(value).replace(' ', 'T'));
  if (Number.isNaN(ms)) return String(value);
  return new Date(ms).toLocaleString('zh-CN', { hour12: false });
}
