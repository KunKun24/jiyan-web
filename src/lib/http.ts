export class ApiError extends Error {
  constructor(message: string, readonly status = 0, readonly code = '') {
    super(message);
    this.name = 'ApiError';
  }
}

const JSON_HEADERS = { Accept: 'application/json' };

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function describe(status: number, body: unknown): string {
  if (body && typeof body === 'object' && 'message' in body && typeof (body as { message: unknown }).message === 'string') {
    return (body as { message: string }).message;
  }
  if (typeof body === 'string' && body.trim()) return body.trim().slice(0, 200);
  if (status === 429) return '请求过于频繁，请稍后再试';
  return `请求失败（HTTP ${status}）`;
}

export async function postJson<T>(url: string, payload: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { ...JSON_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError('网络异常，请检查网络后重试');
  }
  const body = await readBody(response);
  if (!response.ok) throw new ApiError(describe(response.status, body), response.status);
  return body as T;
}

export async function postForm<T>(url: string, data: Record<string, string>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { ...JSON_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams(data).toString(),
    });
  } catch {
    throw new ApiError('网络异常，请检查网络后重试');
  }
  const body = await readBody(response);
  if (!response.ok) throw new ApiError(describe(response.status, body), response.status);
  return body as T;
}

export async function getJson<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', headers: JSON_HEADERS });
  } catch {
    throw new ApiError('网络异常，请检查网络后重试');
  }
  const body = await readBody(response);
  if (!response.ok) throw new ApiError(describe(response.status, body), response.status);
  return body as T;
}

export async function getText(url: string): Promise<{ status: number; text: string; finalUrl: string }> {
  let response: Response;
  try {
    response = await fetch(url, { credentials: 'include', cache: 'no-store', redirect: 'follow' });
  } catch {
    throw new ApiError('网络异常，请检查网络后重试');
  }
  return { status: response.status, text: await response.text(), finalUrl: response.url };
}
