<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import {
  executeButton,
  listApps,
  loadState,
  openPanel,
  releaseValue,
  setValue,
  type AppSummary,
  type CloudFeature,
  type CloudSession,
  type CloudState,
} from '../api/cloud';
import { formatDateTime, randomRequestId } from '../lib/format';
import { toast } from '../components/toast';

const apps = ref<AppSummary[]>([]);
const appsLoading = ref(true);
const appsError = ref('');

const session = ref<CloudSession | null>(null);
const state = ref<CloudState | null>(null);
const panelLoading = ref(false);
const panelError = ref('');

const drafts = reactive<Record<string, unknown>>({});
const durations = reactive<Record<string, number>>({});
const busyKey = ref('');

function defaultValue(feature: CloudFeature): unknown {
  if (feature.default !== undefined) return feature.default;
  if (feature.type === 'toggle') return false;
  if (feature.type === 'range') return feature.min ?? 0;
  if (feature.type === 'select') return feature.options?.[0]?.value ?? '';
  return null;
}

function seedDrafts(next: CloudState): void {
  for (const feature of next.features) {
    const value = next.global.values?.[feature.key];
    drafts[feature.key] = value ?? defaultValue(feature);
    durations[feature.key] = 0;
  }
}

async function loadApps(): Promise<void> {
  appsLoading.value = true;
  appsError.value = '';
  try {
    apps.value = await listApps();
  } catch (e) {
    appsError.value = e instanceof Error ? e.message : '应用列表加载失败';
  } finally {
    appsLoading.value = false;
  }
}

async function refresh(): Promise<void> {
  if (!session.value) return;
  panelLoading.value = true;
  panelError.value = '';
  try {
    state.value = await loadState(session.value);
    seedDrafts(state.value);
  } catch (e) {
    panelError.value = e instanceof Error ? e.message : '云控状态加载失败';
  } finally {
    panelLoading.value = false;
  }
}

async function open(app: AppSummary): Promise<void> {
  panelError.value = '';
  panelLoading.value = true;
  try {
    session.value = await openPanel(app.id);
    await refresh();
  } catch (e) {
    session.value = null;
    panelError.value = e instanceof Error ? e.message : '云控面板打开失败';
  } finally {
    panelLoading.value = false;
  }
}

function close(): void {
  session.value = null;
  state.value = null;
}

async function save(feature: CloudFeature): Promise<void> {
  if (!session.value) return;
  busyKey.value = feature.key;
  try {
    await setValue(session.value, feature.key, drafts[feature.key], Number(durations[feature.key]) || 0);
    toast(`「${feature.label}」已保存`, 'success');
    await refresh();
  } catch (e) {
    toast(e instanceof Error ? e.message : '保存失败', 'error');
  } finally {
    busyKey.value = '';
  }
}

async function reset(feature: CloudFeature): Promise<void> {
  if (!session.value) return;
  busyKey.value = feature.key;
  try {
    await releaseValue(session.value, feature.key);
    toast(`「${feature.label}」已恢复默认`, 'success');
    await refresh();
  } catch (e) {
    toast(e instanceof Error ? e.message : '操作失败', 'error');
  } finally {
    busyKey.value = '';
  }
}

async function run(feature: CloudFeature): Promise<void> {
  if (!session.value) return;
  busyKey.value = feature.key;
  try {
    const result = await executeButton(session.value, feature.key, randomRequestId(24), 300);
    toast(`已下发：${result.total} 个客户端，待确认 ${result.pending}`, 'success', 3600);
  } catch (e) {
    toast(e instanceof Error ? e.message : '下发失败', 'error');
  } finally {
    busyKey.value = '';
  }
}

onMounted(loadApps);
</script>

<template>
  <div class="page">
    <header class="page-head">
      <span class="eyebrow">用户端控制台</span>
      <h1>云控面板</h1>
      <p class="muted">远程调整客户端功能值与开关，保存后按在线状态分发到客户端。</p>
    </header>

    <section v-if="!session" class="glass-card tool">
      <div v-if="appsLoading" class="hint">正在加载应用…</div>
      <p v-else-if="appsError" class="form-error">{{ appsError }}</p>
      <template v-else>
        <div v-if="!apps.length" class="empty-state">
          <p>当前账号还没有应用。</p>
          <p class="hint">请先在官网控制台创建应用，再回来打开云控面板。</p>
        </div>
        <ul v-else class="app-list">
          <li v-for="app in apps" :key="app.id" class="app-row">
            <div>
              <strong>{{ app.app_name }}</strong>
              <span class="muted"> · ID {{ app.app_id ?? app.id }}</span>
            </div>
            <button class="button button--small" type="button" :disabled="panelLoading" @click="open(app)">打开面板</button>
          </li>
        </ul>
      </template>
      <p v-if="panelError" class="form-error">{{ panelError }}</p>
    </section>

    <template v-else>
      <section class="glass-card panel-head">
        <div>
          <p class="eyebrow">云控面板</p>
          <h2>{{ state?.app.name || '加载中…' }}</h2>
          <p class="hint" v-if="state">链接有效期至 {{ formatDateTime(state.expires_at) }}</p>
        </div>
        <div class="panel-actions">
          <button class="button button--quiet button--small" type="button" :disabled="panelLoading" @click="refresh">刷新</button>
          <button class="button button--ghost button--small" type="button" @click="close">切换应用</button>
        </div>
      </section>

      <p v-if="panelError" class="form-error">{{ panelError }}</p>

      <section v-if="state" class="stats">
        <div class="glass-card stat"><span>在线客户端</span><strong>{{ state.stats.online }}</strong></div>
        <div class="glass-card stat"><span>累计客户端</span><strong>{{ state.stats.total }}</strong></div>
        <div class="glass-card stat"><span>独立控制</span><strong>{{ state.stats.independent }}</strong></div>
        <div class="glass-card stat"><span>功能项</span><strong>{{ state.features.length }}</strong></div>
      </section>

      <section v-if="state" class="feature-grid">
        <article v-for="feature in state.features" :key="feature.key" class="glass-card feature-card">
          <header class="feature-head">
            <div>
              <h3>{{ feature.label }}</h3>
              <code>{{ feature.key }}</code>
            </div>
            <span class="pill pill--muted">{{ feature.type }}</span>
          </header>

          <div class="feature-body">
            <button
              v-if="feature.type === 'toggle'"
              class="switch"
              type="button"
              :class="{ 'switch--on': Boolean(drafts[feature.key]) }"
              :aria-pressed="Boolean(drafts[feature.key])"
              @click="drafts[feature.key] = !drafts[feature.key]"
            >
              <span />
            </button>

            <input
              v-else-if="feature.type === 'range'"
              v-model.number="drafts[feature.key]"
              class="input"
              type="number"
              :min="feature.min"
              :max="feature.max"
              :step="feature.step || 1"
            />

            <select v-else-if="feature.type === 'select'" v-model="drafts[feature.key]" class="input">
              <option v-for="option in feature.options" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>

            <p v-else class="hint">一次性指令，点击后由在线客户端执行。</p>
          </div>

          <footer class="feature-foot">
            <template v-if="feature.type !== 'button'">
              <label class="duration">
                <span>有效秒数（0 为长期）</span>
                <input v-model.number="durations[feature.key]" class="input input--small" type="number" min="0" max="31536000" step="60" />
              </label>
              <div class="row-actions">
                <button class="button button--small" type="button" :disabled="busyKey === feature.key" @click="save(feature)">保存并下发</button>
                <button class="text-button" type="button" :disabled="busyKey === feature.key" @click="reset(feature)">恢复默认</button>
              </div>
            </template>
            <div v-else class="row-actions">
              <button class="button button--small" type="button" :disabled="busyKey === feature.key" @click="run(feature)">执行一次</button>
            </div>
          </footer>
        </article>
      </section>

      <p v-if="state && !state.features.length" class="hint">该应用还没有登记云控功能项。</p>
    </template>
  </div>
</template>
