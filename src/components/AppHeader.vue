<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ensureSession, session, signOut } from '../stores/session';
import { toast } from './toast';

const router = useRouter();
const dark = ref(false);

function applyTheme(value: boolean): void {
  dark.value = value;
  document.documentElement.dataset.theme = value ? 'dark' : 'light';
  try {
    localStorage.setItem('jiyan.theme', value ? 'dark' : 'light');
  } catch {
    /* private mode */
  }
}

onMounted(async () => {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem('jiyan.theme');
  } catch {
    stored = null;
  }
  applyTheme(stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
  await ensureSession();
});

async function logout(): Promise<void> {
  await signOut();
  toast('已退出登录', 'success');
  await router.push('/');
}
</script>

<template>
  <header class="app-header">
    <div class="header-inner">
      <RouterLink to="/" class="brand">
        <img src="/favicon.svg" alt="" width="26" height="26" />
        <span class="brand-name">极验云</span>
        <span class="brand-sub">JiYan Cloud</span>
      </RouterLink>

      <nav class="nav">
        <RouterLink to="/" class="nav-link">首页</RouterLink>
        <RouterLink to="/card" class="nav-link">卡密工具</RouterLink>
        <RouterLink to="/cloud" class="nav-link">云控面板</RouterLink>
        <a class="nav-link" href="https://jiyan.xn--0try77c6um82w.cn/docs.html" target="_blank" rel="noopener">接口文档</a>
      </nav>

      <div class="header-actions">
        <button class="icon-button" type="button" :aria-label="dark ? '切换到浅色' : '切换到深色'" @click="applyTheme(!dark)">
          <svg v-if="!dark" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" /></svg>
          <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></svg>
        </button>
        <template v-if="session.user">
          <span class="user-chip" :title="session.user.email || session.user.username">{{ session.user.display_name || session.user.username }}</span>
          <button class="text-button" type="button" @click="logout">退出</button>
        </template>
        <RouterLink v-else class="button button--small" :to="{ name: 'login', query: { next: '/cloud' } }">登录</RouterLink>
      </div>
    </div>
  </header>
</template>
