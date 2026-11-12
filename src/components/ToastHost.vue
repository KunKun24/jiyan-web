<script setup lang="ts">
import { toasts } from './toast';
</script>

<template>
  <div class="toast-host" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="item in toasts" :key="item.id" class="toast" :class="`toast--${item.kind}`">
        {{ item.text }}
      </div>
    </TransitionGroup>
  </div>
</template>
