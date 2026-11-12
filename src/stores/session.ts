import { reactive } from 'vue';
import * as account from '../api/account';

export interface SessionState {
  user: account.AccountUser | null;
  ready: boolean;
  loading: boolean;
}

export const session = reactive<SessionState>({ user: null, ready: false, loading: false });

let inflight: Promise<void> | null = null;

/** Fetch the current session once; safe to call from every guarded route. */
export function ensureSession(): Promise<void> {
  if (session.ready) return Promise.resolve();
  if (inflight) return inflight;
  inflight = account
    .me()
    .then((user) => {
      session.user = user;
      session.ready = true;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function signIn(accountName: string, password: string): Promise<void> {
  session.loading = true;
  try {
    session.user = await account.login(accountName, password);
    session.ready = true;
  } finally {
    session.loading = false;
  }
}

export async function signOut(): Promise<void> {
  await account.logout();
  session.user = null;
  session.ready = true;
}
