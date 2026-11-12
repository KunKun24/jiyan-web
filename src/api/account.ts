import { getJson, postForm } from '../lib/http';

export interface AccountUser {
  username: string;
  display_name: string;
  email?: string;
  role?: string;
  balance?: string;
  card_balance?: string;
  vip_expire?: string | null;
  must_change_password?: boolean;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

const BASE = '/api/账号接口入口.php';

export async function login(account: string, password: string): Promise<AccountUser> {
  const result = await postForm<Envelope<AccountUser>>(`${BASE}?action=login`, { account, password });
  return result.data;
}

export async function me(): Promise<AccountUser | null> {
  try {
    const result = await getJson<Envelope<AccountUser>>(`${BASE}?action=me`);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await postForm<Envelope<unknown>>(`${BASE}?action=logout`, {});
  } catch {
    /* a stale session is fine */
  }
}
