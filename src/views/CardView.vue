<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { queryCard, unbindCard, type CardInfo, type QueryScope } from '../api/public';
import { maskCard } from '../lib/format';
import { toast } from '../components/toast';

const route = useRoute();
const scope: QueryScope = {
  code: typeof route.query.c === 'string' ? route.query.c : undefined,
  appKey: typeof route.query.app === 'string' ? route.query.app : undefined,
};
const scoped = Boolean(scope.code || scope.appKey);

const cardKey = ref('');
const info = ref<CardInfo | null>(null);
const busy = ref(false);
const error = ref('');

const unbindOpen = ref(false);
const deviceId = ref('');
const unbindBusy = ref(false);
const unbindError = ref('');

const bound = computed(() => Boolean(info.value && info.value['绑定状态'].includes('已绑定')));

const rows = computed(() => {
  if (!info.value) return [];
  const i = info.value;
  return [
    ['所属应用', `${i.app_name}（${i.app_status}）`],
    ['应用 ID', i.app_id],
    ['卡密状态', i.state],
    ['卡密类型', i.type],
    ['绑定状态', i['绑定状态']],
    ['绑定设备', i['绑定设备'] || '—'],
    ['到期时间', i['到期时间']],
    ['剩余时长', i['剩余时长']],
    ['在线', i['在线'] ? '在线' : '离线'],
    ['可绑定设备', `${i.max_devices} 台`],
    ['今日可解绑', i['今日可解绑']],
    ['解绑冷却', i['解绑冷却']],
    ['解绑扣减', i['解绑扣减']],
  ] as const;
});

async function query(): Promise<void> {
  error.value = '';
  const key = cardKey.value.trim();
  if (!key) {
    error.value = '请输入卡密';
    return;
  }
  busy.value = true;
  try {
    info.value = await queryCard(key, scope);
  } catch (e) {
    info.value = null;
    error.value = e instanceof Error ? e.message : '查询失败，请稍后重试';
  } finally {
    busy.value = false;
  }
}

function openUnbind(): void {
  unbindError.value = '';
  deviceId.value = '';
  unbindOpen.value = true;
}

async function submitUnbind(): Promise<void> {
  unbindError.value = '';
  const device = deviceId.value.trim();
  if (!device) {
    unbindError.value = '请输入新的机器码';
    return;
  }
  if (!info.value) return;
  unbindBusy.value = true;
  try {
    const result = await unbindCard(info.value.card_no, device, info.value.app_id);
    toast(`解绑成功，剩余次数：${result['剩余解绑次数']}`, 'success', 3600);
    unbindOpen.value = false;
    await query();
  } catch (e) {
    unbindError.value = e instanceof Error ? e.message : '解绑失败，请稍后重试';
  } finally {
    unbindBusy.value = false;
  }
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <span class="eyebrow">卡密工具</span>
      <h1>查询与解绑</h1>
      <p class="muted">输入卡密查看状态、到期时间与绑定设备，绑定异常时可以在这里解绑。</p>
    </header>

    <section class="glass-card tool">
      <form class="tool-form" @submit.prevent="query">
        <label class="field field--grow">
          <span>卡密</span>
          <input v-model="cardKey" :disabled="Boolean(scope.code)" autocomplete="off" spellcheck="false" placeholder="请输入完整卡密" />
        </label>
        <button class="button" type="submit" :disabled="busy">{{ busy ? '查询中…' : '查询' }}</button>
      </form>
      <p v-if="scoped" class="hint">当前链接已锁定应用范围，查询只在该应用内生效。</p>
      <p v-if="error" class="form-error">{{ error }}</p>
    </section>

    <section v-if="info" class="glass-card result">
      <header class="result-head">
        <div>
          <p class="eyebrow">查询结果</p>
          <h2>{{ maskCard(info.card_no) }}</h2>
        </div>
        <div class="result-pills">
          <span class="pill" :class="info['在线'] ? 'pill--ok' : 'pill--muted'">{{ info['在线'] ? '在线' : '离线' }}</span>
          <span class="pill" :class="info['是否过期'] ? 'pill--bad' : 'pill--ok'">{{ info['是否过期'] ? '已过期' : '有效' }}</span>
        </div>
      </header>

      <dl class="kv">
        <div v-for="[label, value] in rows" :key="label" class="kv-row">
          <dt>{{ label }}</dt>
          <dd>{{ value }}</dd>
        </div>
      </dl>

      <div class="result-actions">
        <button v-if="bound" class="button button--danger" type="button" @click="openUnbind">解绑设备</button>
        <span v-else class="hint">当前未绑定设备，无需解绑。</span>
      </div>
    </section>

    <div v-if="unbindOpen" class="modal-mask" @click.self="unbindOpen = false">
      <section class="glass-card modal" role="dialog" aria-modal="true" aria-labelledby="unbind-title">
        <h2 id="unbind-title">确认解绑</h2>
        <p class="muted">
          解绑会清除当前设备绑定，并按应用规则扣减次数或时长。
          输入要绑定的新机器码后继续。
        </p>
        <label class="field">
          <span>新的机器码</span>
          <input v-model="deviceId" autocomplete="off" spellcheck="false" placeholder="请输入设备机器码" />
        </label>
        <p v-if="unbindError" class="form-error">{{ unbindError }}</p>
        <div class="modal-actions">
          <button class="button button--quiet" type="button" :disabled="unbindBusy" @click="unbindOpen = false">取消</button>
          <button class="button button--danger" type="button" :disabled="unbindBusy" @click="submitUnbind">
            {{ unbindBusy ? '处理中…' : '确认解绑' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
