<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { signIn } from '../stores/session';
import { toast } from '../components/toast';

const route = useRoute();
const router = useRouter();
const account = ref('');
const password = ref('');
const busy = ref(false);
const error = ref('');

async function submit(): Promise<void> {
  error.value = '';
  if (!account.value.trim() || !password.value) {
    error.value = '请输入账号与密码';
    return;
  }
  busy.value = true;
  try {
    await signIn(account.value.trim(), password.value);
    toast('登录成功', 'success');
    const next = typeof route.query.next === 'string' && route.query.next.startsWith('/') ? route.query.next : '/cloud';
    await router.replace(next);
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败，请稍后重试';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="page auth-page">
    <section class="glass-card auth-card">
      <span class="eyebrow">开发者账号</span>
      <h1>登录极验云</h1>
      <p class="muted">使用系统分配的 JiYan_ 账号登录，云控面板需要账号权限。</p>

      <form class="form" @submit.prevent="submit">
        <label class="field">
          <span>账号</span>
          <input v-model="account" autocomplete="username" placeholder="JiYan_xxxxxx" />
        </label>
        <label class="field">
          <span>密码</span>
          <input v-model="password" type="password" autocomplete="current-password" placeholder="请输入密码" />
        </label>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="button button--block" type="submit" :disabled="busy">{{ busy ? '登录中…' : '登录' }}</button>
      </form>

      <p class="auth-foot">忘记密码请在官网使用「找回密码」。</p>
    </section>
  </div>
</template>
