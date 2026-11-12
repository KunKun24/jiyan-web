<script setup lang="ts">
import AppHeader from './components/AppHeader.vue';
import ToastHost from './components/ToastHost.vue';
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <main class="app-main">
      <RouterView />
    </main>
    <footer class="app-footer">
      <div class="footer-inner">
        <span>© 2026 极验云 · JiYan Cloud</span>
        <nav>
          <a href="https://jiyan.xn--0try77c6um82w.cn/docs.html" target="_blank" rel="noopener">接口文档</a>
          <RouterLink to="/card">卡密工具</RouterLink>
          <RouterLink to="/cloud">云控面板</RouterLink>
        </nav>
        <span class="footer-note">本仓库不包含管理后台</span>
      </div>
    </footer>
    <ToastHost />
  </div>
</template>
