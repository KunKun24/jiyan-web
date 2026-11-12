/**
 * Public ENV transport used by the JiYan user-facing endpoints.
 *
 * The gateway accepts a JSON envelope:
 *   { developer_username: <uid>, data: <hex> }
 * where `data` is a byte-wise XOR/offset encoding of an urlencoded query
 * string. It is an encoding/obfuscation layer, not a cryptographic
 * primitive: never put secrets in the payload, and always use TLS.
 *
 * Public tools (card query/unbind) are dispatched without a login session;
 * account-bound actions rely on the HttpOnly session cookie set by login.
 */

export const PUBLIC_UID = 'JiYan';

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: false });

function utf8(text: string): Uint8Array {
  return encoder.encode(text);
}

/** PHP: sum(ord(byte) * (i+1)) % 100 */
export function keyHash(uid: string): number {
  const bytes = utf8(uid);
  let h = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    h = (h + bytes[i] * (i + 1)) % 100;
  }
  return h;
}

function toHex(byte: number): string {
  return byte.toString(16).padStart(2, '0');
}

/** Encode an urlencoded query string into the transport hex form. */
export function encode(plain: string, uid: string = PUBLIC_UID): string {
  const key = utf8(uid);
  if (key.length === 0) return '';
  const kh = keyHash(uid);
  const bytes = utf8(plain);
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    const k = key[(i + kh) % key.length];
    out += toHex(((bytes[i] ^ k) + kh + i) % 256);
  }
  return out;
}

/** Decode the response hex form back into the JSON string. */
export function decode(hex: string, uid: string = PUBLIC_UID): string {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  if (!clean || clean.length % 2 !== 0) return '';
  const key = utf8(uid);
  if (key.length === 0) return '';
  const kh = keyHash(uid);
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    const idx = i / 2;
    const code = Number.parseInt(clean.slice(i, i + 2), 16);
    let orig = code - kh - idx;
    while (orig < 0) orig += 256;
    orig %= 256;
    out[idx] = orig ^ key[(idx + kh) % key.length];
  }
  return decoder.decode(out);
}

/** Build the gateway request body for an action. */
export function envelope(action: string, params: Record<string, unknown> = {}, uid: string = PUBLIC_UID): { developer_username: string; data: string } {
  const query = new URLSearchParams();
  query.set('action', action);
  for (const [name, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    query.set(name, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
  }
  return { developer_username: uid, data: encode(query.toString(), uid) };
}
