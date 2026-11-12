import { envCall } from './env';

export interface CardInfo {
  card_no: string;
  app_id: string;
  app_name: string;
  app_status: string;
  state: string;
  type: string;
  max_devices: number;
  '绑定状态': string;
  '绑定设备': string;
  '到期时间': string;
  '剩余时长': string;
  '是否过期': boolean;
  '在线': boolean;
  '今日可解绑': string;
  '解绑冷却': string;
  '解绑扣减': string;
}

export interface UnbindResult {
  card_no: string;
  app_id: string;
  '到期时间': string;
  '剩余解绑次数': string | number;
}

export interface QueryScope {
  /** Card tools opened with ?c=<short card-code> lock the lookup to one card. */
  code?: string;
  /** Card tools opened with ?app=<app_key> lock the lookup to one app. */
  appKey?: string;
}

function scope(scope: QueryScope): Record<string, string> {
  if (scope.code) return { code: scope.code };
  if (scope.appKey) return { app_key: scope.appKey };
  return {};
}

export function queryCard(cardKey: string, s: QueryScope = {}): Promise<CardInfo> {
  return envCall<CardInfo>('web_card_query', { card_key: cardKey, ...scope(s) });
}

export function unbindCard(cardKey: string, deviceId: string, appId?: string): Promise<UnbindResult> {
  const params: Record<string, string> = { card_key: cardKey, device_id: deviceId };
  if (appId) params.app_id = appId;
  return envCall<UnbindResult>('web_unbind', params);
}
