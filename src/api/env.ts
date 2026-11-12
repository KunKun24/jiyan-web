import { envelope, decode, PUBLIC_UID } from '../lib/envproto';
import { ApiError } from '../lib/http';

interface EnvelopeResponse {
  success: boolean;
  message: string;
  data: unknown;
}

const ENDPOINT = '/api/env/api.php';

/**
 * Call a user-facing ENV action. The gateway answers with a hex-encoded JSON
 * envelope; transport-level failures use the plain `JiYan_Error` prefix.
 */
export async function envCall<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(envelope(action, params, PUBLIC_UID)),
    });
  } catch {
    throw new ApiError('网络异常，请检查网络后重试');
  }

  const raw = (await response.text()).trim();
  if (raw.startsWith('JiYan_Error')) {
    throw new ApiError(raw.slice('JiYan_Error'.length).trim() || '请求失败', response.status);
  }
  if (!raw) throw new ApiError('服务器无响应，请稍后重试', response.status);
  if (response.status === 401) throw new ApiError('登录状态已失效，请重新登录', 401);

  const plain = decode(raw, PUBLIC_UID);
  if (!plain) throw new ApiError('响应解析失败，请刷新后重试', response.status);

  let payload: EnvelopeResponse;
  try {
    payload = JSON.parse(plain) as EnvelopeResponse;
  } catch {
    throw new ApiError('响应格式异常，请稍后重试', response.status);
  }
  if (!payload.success) throw new ApiError(payload.message || '请求失败', response.status);
  return payload.data as T;
}
