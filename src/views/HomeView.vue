<script setup lang="ts">
const features = [
  { title: '卡密验证', text: '卡密生成、设备绑定、解绑与到期管理，全流程走 API。' },
  { title: '云控面板', text: '远程调整客户端功能开关、数值与下拉选项，实时下发。' },
  { title: '云更新', text: '应用模块热更新，按文件 MD5 比对，只拉取变化内容。' },
  { title: '同行识别', text: '识别同进程模块与在线状态，为运营提供真实数据。' },
];

const steps = [
  { title: '创建应用', text: '在控制台创建应用，拿到 App ID、API Key 与签名密钥。' },
  { title: '下载对接包', text: '按平台选择 C++ 或 Android DEX 对接包，参考示例接入。' },
  { title: '上线验证', text: '接入后即可在控制台看到请求、在线与卡密数据。' },
];
</script>

<template>
  <div class="page">
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">开放前端 · 用户端控制台</span>
        <h1>把验证接进产品，<br /><span class="gradient-text">只需要一个 SDK。</span></h1>
        <p class="hero-text">
          卡密校验、设备绑定、云控下发与云更新，一套接口搞定。
          这个仓库是用户端前端的完整实现：官网、卡密工具、云控面板。
        </p>
        <div class="hero-actions">
          <RouterLink class="button" to="/card">查询卡密</RouterLink>
          <RouterLink class="button button--ghost" to="/cloud">打开云控面板</RouterLink>
          <a class="button button--quiet" href="https://jiyan.xn--0try77c6um82w.cn/docs.html" target="_blank" rel="noopener">阅读接口文档</a>
        </div>
        <p class="hero-note">纯前端 · 不含管理后台 · 不含服务端代码与任何密钥</p>
      </div>
      <div class="hero-art" aria-hidden="true">
        <div class="card-orbit">
          <div class="orbit-card orbit-card--back" />
          <div class="orbit-card orbit-card--front">
            <div class="orbit-top"><span>JIYAN</span><span>CLOUD</span></div>
            <div class="orbit-amount">2.0</div>
            <div class="orbit-bottom"><span>CARD · ONLINE</span><span>**** 0000</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>用户端能做什么</h2>
        <p>所有能力都由公开接口提供，前端只负责交互。</p>
      </div>
      <div class="grid grid--4">
        <article v-for="item in features" :key="item.title" class="glass-card feature">
          <span class="feature-dot" />
          <h3>{{ item.title }}</h3>
          <p>{{ item.text }}</p>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>三步接入</h2>
        <p>从创建应用到上线，通常不超过半天。</p>
      </div>
      <ol class="steps">
        <li v-for="(step, index) in steps" :key="step.title" class="glass-card step">
          <span class="step-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <div>
            <h3>{{ step.title }}</h3>
            <p>{{ step.text }}</p>
          </div>
        </li>
      </ol>
    </section>

    <section class="section">
      <div class="glass-card boundary">
        <div>
          <h2>开源边界</h2>
          <p>本仓库只包含用户端页面；管理后台、服务端与签名密钥不在开源范围内。</p>
        </div>
        <ul>
          <li>官网首页与介绍</li>
          <li>卡密查询 / 解绑工具</li>
          <li>云控面板（用户端）</li>
          <li>登录与会话处理</li>
        </ul>
      </div>
    </section>
  </div>
</template>
