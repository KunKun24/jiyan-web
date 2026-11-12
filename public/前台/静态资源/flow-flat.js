/* 极验全球业务态势 · 平面版（Canvas 2D 等距圆柱投影）
 * 与球面共用同一份真实数据与视觉参数；不使用 WebGL。
 */
const BASE_COLOR = '#237bb7';
const ACTIVE_COLOR = '#42c8f5';
const HEAD_COLOR = '#b9f3ff';
const SOURCE_COLOR = '#58d5ff';
const TARGET_COLOR = '#347cae';
const BASE_OPACITY = 0.17;
const TRAIL_LENGTH = 0.1;
const EMIT = 0.32, ARRIVE = 0.12, FADE = 0.55;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hsl = (h, s, l) => `hsl(${h}, ${s * 100}%, ${l * 100}%)`;

class FlatRoute {
  constructor(line, source, target) {
    this.line = line;
    this.source = source;
    this.target = target;
    this.state = 'IDLE';
    this.time = 0;
    this.progress = 0;
    const [from, to] = line.coords;
    this.from = { lon: Number(from[0]), lat: Number(from[1]) };
    this.to = { lon: Number(to[0]), lat: Number(to[1]) };
    const weight = Number(line.weight) || 0;
    this.speed = 0.85 + weight * 0.6;
    this.duration = clamp(2.35 + this.span() * 0.0012, 2.7, 4.4) / this.speed;
  }
  span() {
    const dx = Math.abs(this.to.lon - this.from.lon) * 4;
    const dy = Math.abs(this.to.lat - this.from.lat) * 6;
    return Math.sqrt(dx * dx + dy * dy) + 120;
  }
  start() {
    if (this.state !== 'IDLE') return false;
    this.state = 'EMIT'; this.time = 0; this.progress = 0;
    this.source?.emit?.();
    return true;
  }
  reset() { this.state = 'IDLE'; this.time = 0; this.progress = 0; }
  update(dt) {
    if (this.state === 'IDLE') return;
    this.time += dt;
    if (this.state === 'EMIT') { if (this.time >= EMIT) { this.state = 'TRAVEL'; this.time = 0; } return; }
    if (this.state === 'TRAVEL') {
      const p = clamp(this.time / this.duration, 0, 1);
      this.progress = p * p * (3 - 2 * p);
      if (p >= 1) { this.target?.impact?.(); this.state = 'FADE'; this.time = 0; }
      return;
    }
    if (this.state === 'FADE' && this.time >= ARRIVE + FADE) this.reset();
  }
  alpha() {
    if (this.state === 'IDLE') return 0;
    if (this.state === 'EMIT') return clamp(this.time / EMIT, 0, 1);
    if (this.state === 'TRAVEL') return 1;
    return clamp(1 - (this.time - ARRIVE) / FADE, 0, 1);
  }
}

export class FlatRenderer {
  constructor(host, options = {}) {
    this.host = host;
    this.hue = Number(options.hue) || 210;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'jy-globe-flat-canvas';
    this.canvas.setAttribute('aria-label', '全球业务态势平面图');
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:none;touch-action:pan-y';
    host.append(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.nodes = []; this.routes = []; this.source = null;
    this.disabled = new Set();
    this.masks = null;
    this.landCache = null;
    this.intensityCache = null;
    this.cursor = 0; this.cooldown = 0.2; this.elapsed = 0;
    this.width = 0; this.height = 0; this.dpr = 1;
    this.visible = false;
  }
  setMasks(masks) { this.masks = masks; this.landCache = null; this.intensityCache = null; }
  setHue(hue) { this.hue = hue; this.landCache = null; this.intensityCache = null; }
  setFilters(disabled) { this.disabled = disabled; }
  setData({ nodes, routes, source }) {
    this.nodes = nodes || [];
    this.sourceNode = source || null;
    this.source = source ? { emit() {}, impact() {} } : null;
    this.routes = (routes || []).map((r) => new FlatRoute(r.line || r, r.source || null, r.target));
    this.flatSource = source;
    this.cursor = 0;
    this.cooldown = 0.2;
  }
  show(on) {
    this.visible = !!on;
    this.canvas.style.display = on ? 'block' : 'none';
  }
  resize() {
    const rect = this.host.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (this.width === rect.width && this.height === rect.height && this.dpr === dpr) return true;
    this.width = rect.width; this.height = rect.height; this.dpr = dpr;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.landCache = null; this.intensityCache = null;
    return true;
  }
  projection() {
    const w = this.width, h = this.height;
    const mapW = Math.min(w * 0.96, h * 1.94);
    const mapH = mapW / 2;
    return { x: (w - mapW) / 2, y: (h - mapH) / 2 + mapH * 0.02, w: mapW, h: mapH };
  }
  project(lon, lat) {
    const p = this.projection();
    return [p.x + ((lon + 180) / 360) * p.w, p.y + ((90 - lat) / 180) * p.h];
  }
  buildLand() {
    if (this.landCache || !this.masks) return this.landCache;
    const p = this.projection();
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(p.w * this.dpr));
    c.height = Math.max(1, Math.round(p.h * this.dpr));
    const ctx = c.getContext('2d');
    ctx.drawImage(this.masks.land, 0, 0, c.width, c.height);
    this.landCache = c;
    return c;
  }
  buildIntensity() {
    if (this.intensityCache || !this.masks) return this.intensityCache;
    const p = this.projection();
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(p.w * this.dpr));
    c.height = Math.max(1, Math.round(p.h * this.dpr));
    const ctx = c.getContext('2d');
    ctx.drawImage(this.masks.intensity, 0, 0, c.width, c.height);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = hsl(this.hue, 0.88, 0.46);
    ctx.fillRect(0, 0, c.width, c.height);
    this.intensityCache = c;
    return c;
  }
  drawGrid(p) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = hsl(this.hue, 0.58, 0.17);
    ctx.globalAlpha = 0.055;
    ctx.lineWidth = 1;
    for (let lon = -180; lon <= 180; lon += 15) {
      const [x] = this.project(lon, 0);
      ctx.beginPath(); ctx.moveTo(x, p.y); ctx.lineTo(x, p.y + p.h); ctx.stroke();
    }
    for (let lat = -75; lat <= 75; lat += 15) {
      const [, y] = this.project(0, lat);
      ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x + p.w, y); ctx.stroke();
    }
    ctx.restore();
  }
  drawRoutes(p) {
    const ctx = this.ctx;
    for (const route of this.routes) {
      if (this.disabled.has(route.target?.data?.key)) continue;
      const a = this.project(route.from.lon, route.from.lat);
      const b = this.project(route.to.lon, route.to.lat);
      const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const lift = Math.max(18, Math.min(route.span() * 0.22, p.h * 0.42));
      const cx = (a[0] + b[0]) / 2;
      const cy = Math.min(a[1], b[1]) - lift;
      const quad = (t) => {
        const it = 1 - t;
        return [it * it * a[0] + 2 * it * t * cx + t * t * b[0], it * it * a[1] + 2 * it * t * cy + t * t * b[1]];
      };
      ctx.save();
      ctx.strokeStyle = BASE_COLOR;
      ctx.globalAlpha = BASE_OPACITY;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(cx, cy, b[0], b[1]); ctx.stroke();
      ctx.globalAlpha = 1;
      const alpha = route.alpha();
      if (alpha > 0.01) {
        const head = route.progress;
        const from = Math.max(0, head - TRAIL_LENGTH);
        const steps = 26;
        for (let i = 0; i < steps; i++) {
          const t0 = from + ((head - from) * i) / steps;
          const t1 = from + ((head - from) * (i + 1)) / steps;
          const p0 = quad(t0), p1 = quad(t1);
          const ramp = (i + 1) / steps;
          ctx.strokeStyle = ACTIVE_COLOR;
          ctx.globalAlpha = alpha * ramp * 0.72;
          ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
        }
        const hp = quad(head);
        const g = ctx.createRadialGradient(hp[0], hp[1], 0, hp[0], hp[1], 7);
        g.addColorStop(0, HEAD_COLOR);
        g.addColorStop(0.45, 'rgba(185,243,255,.55)');
        g.addColorStop(1, 'rgba(185,243,255,0)');
        ctx.globalAlpha = alpha;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(hp[0], hp[1], 7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      void dist;
    }
  }
  drawNode(node, isSource, x, y, scale = 1) {
    const ctx = this.ctx;
    const r = (isSource ? 13 : 7) * scale;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6);
    const base = isSource ? SOURCE_COLOR : TARGET_COLOR;
    glow.addColorStop(0, isSource ? 'rgba(88,213,255,.95)' : 'rgba(52,124,174,.85)');
    glow.addColorStop(0.35, isSource ? 'rgba(56,188,233,.36)' : 'rgba(43,113,157,.24)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = isSource ? 'rgba(114,219,255,.85)' : 'rgba(57,127,174,.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = isSource ? '#F8FDFF' : '#C8E9F7';
    ctx.beginPath(); ctx.arc(x, y, isSource ? r * 0.4 : r * 0.38, 0, Math.PI * 2); ctx.fill();
    void base;
  }
  drawLabel(text, x, y, isSource, alpha) {
    const ctx = this.ctx;
    const font = `${isSource ? 600 : 500} ${isSource ? 13 : 12}px "PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.save();
    ctx.font = font;
    const w = Math.min(140, ctx.measureText(text).width + 16);
    const h = isSource ? 24 : 21;
    const bx = x - w / 2;
    const by = y - h - 10;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = isSource ? 'rgba(5,34,72,.92)' : 'rgba(4,24,52,.82)';
    ctx.strokeStyle = isSource ? 'rgba(62,174,226,.78)' : 'rgba(44,105,154,.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, w, h, 3); else ctx.rect(bx, by, w, h);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = isSource ? '#f4fbff' : '#c4d6e7';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, by + h / 2 + 0.5);
    ctx.restore();
  }
  render(dt) {
    if (!this.visible) return;
    if (!this.resize()) return;
    const ctx = this.ctx;
    const p = this.projection();
    this.elapsed += dt;
    ctx.clearRect(0, 0, this.width, this.height);
    const land = this.buildLand();
    const intensity = this.buildIntensity();
    if (land) ctx.drawImage(land, p.x, p.y, p.w, p.h);
    if (intensity) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55;
      ctx.drawImage(intensity, p.x, p.y, p.w, p.h);
      ctx.restore();
    }
    this.drawGrid(p);
    this.cooldown -= dt;
    for (const route of this.routes) route.update(dt);
    const limit = this.width < 760 ? 1 : this.width < 1180 ? 2 : 3;
    const active = this.routes.filter((r) => r.state !== 'IDLE').length;
    if (this.cooldown <= 0 && active < limit && this.routes.length) {
      for (let i = 0; i < this.routes.length; i++) {
        const idx = (this.cursor + i) % this.routes.length;
        if (!this.disabled.has(this.routes[idx].target?.data?.key) && this.routes[idx].start()) {
          this.cursor = (idx + 1) % this.routes.length;
          this.cooldown = 0.72 + Math.random() * (1.08 - 0.72);
          break;
        }
      }
    }
    this.drawRoutes(p);
    const boxes = [];
    const list = [];
    if (this.flatSource) list.push({ data: this.flatSource, source: true });
    for (const n of this.nodes) if (!this.disabled.has(n.data.key)) list.push({ data: n.data, source: false });
    list.sort((a, b) => (b.data.count || 0) - (a.data.count || 0));
    for (const item of list) {
      const [x, y] = this.project(Number(item.data.lon), Number(item.data.lat));
      if (x < p.x - 2 || x > p.x + p.w + 2 || y < p.y - 2 || y > p.y + p.h + 2) continue;
      const pulse = 1 + Math.sin(this.elapsed * (item.source ? 2 : 1.2)) * (item.source ? 0.08 : 0.05);
      this.drawNode(item.data, item.source, x, y, pulse);
      const text = item.source ? (item.data.label || '主服务器') : item.data.name;
      ctx.save(); ctx.font = `${item.source ? 600 : 500} ${item.source ? 13 : 12}px "PingFang SC","Microsoft YaHei",sans-serif`;
      const lw = Math.min(140, ctx.measureText(text).width + 16);
      const lh = item.source ? 24 : 21;
      ctx.restore();
      const box = { left: x - lw / 2, right: x + lw / 2, top: y - lh - 10, bottom: y - 10 };
      const overlap = boxes.some((b) => box.left < b.right && box.right > b.left && box.top < b.bottom && box.bottom > b.top);
      boxes.push(box);
    }
  }
  dispose() {
    this.canvas.remove();
    this.landCache = null;
    this.intensityCache = null;
  }
}

export default FlatRenderer;
