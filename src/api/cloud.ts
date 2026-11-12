import { envCall } from './env';
import { ApiError } from '../lib/http';

export interface AppSummary {
  id: number | string;
  app_id?: string;
  app_name: string;
  status?: string;
}

export interface CloudFeature {
  key: string;
  label: string;
  type: 'toggle' | 'range' | 'select' | 'button';
  default?: unknown;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
}

export interface CloudState {
  app: { id: number; name: string; owner: string };
  features: CloudFeature[];
  global: { mode: string; values: Record<string, unknown> };
  stats: { total: number; online: number; independent: number };
  commands: unknown[];
  expires_at: number;
}

export interface CloudSession {
  appId: number;
  csrf: string;
}

export async function listApps(): Promise<AppSummary[]> {
  const data = await envCall<{ list?: AppSummary[]; apps?: AppSummary[] } | AppSummary[]>('get_apps', { page: 1, limit: 100 });
  if (Array.isArray(data)) return data;
  return data.list ?? data.apps ?? [];
}

/**
 * Ask the backend for a short-lived panel link, then open that link once to
 * establish the panel session cookie and read the CSRF token. The link itself
 * is generated server-side; this client never hard-codes panel routes.
 */
export async function openPanel(appId: number | string): Promise<CloudSession> {
  const issued = await envCall<{ url: string }>('open_cloud_control', { app_id: appId });
  if (!issued?.url) throw new ApiError('未能获取云控面板链接');

  const url = new URL(issued.url, location.href);
  if (url.host !== location.host) {
    throw new ApiError('云控面板需与官方站点同域部署，当前站点不匹配');
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), { credentials: 'include', cache: 'no-store' });
  } catch {
    throw new ApiError('云控面板加载失败，请检查网络');
  }
  const html = await response.text();
  const match = html.match(/window\.JY_CLOUD=(\{[\s\S]*?\});<\/script>/);
  if (!match) {
    throw new ApiError(response.status === 403 ? '面板链接已失效，请重新打开' : '面板初始化失败，请稍后重试', response.status);
  }
  let boot: { csrf?: string; app?: { id?: number } };
  try {
    boot = JSON.parse(match[1]) as { csrf?: string; app?: { id?: number } };
  } catch {
    throw new ApiError('面板初始化数据异常，请稍后重试');
  }
  if (!boot.csrf || !boot.app?.id) throw new ApiError('面板初始化数据不完整');
  return { appId: boot.app.id, csrf: boot.csrf };
}

interface CloudEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export async function panelCall<T = unknown>(session: CloudSession, action: string, payload: Record<string, unknown> = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api/env/cloud-control.php', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ...payload, app_id: session.appId, action, csrf: session.csrf }),
    });
  } catch {
    throw new ApiError('网络异常，请检查网络后重试');
  }
  let body: CloudEnvelope<T> | null = null;
  try {
    body = (await response.json()) as CloudEnvelope<T>;
  } catch {
    body = null;
  }
  if (!response.ok || !body?.success) {
    throw new ApiError(body?.message || `云控请求失败（HTTP ${response.status}）`, response.status);
  }
  return body.data as T;
}

export const loadState = (session: CloudSession) => panelCall<CloudState>(session, 'state');

export function setValue(session: CloudSession, key: string, value: unknown, duration = 0) {
  return panelCall(session, 'set_value', { key, value, duration });
}

export function releaseValue(session: CloudSession, key: string) {
  return panelCall(session, 'release_value', { key });
}

export function executeButton(session: CloudSession, key: string, requestId: string, ttl = 300) {
  return panelCall<{ id: number; total: number; pending: number }>(session, 'execute', {
    key,
    request_id: requestId,
    ttl,
  });
}
