<template>
  <section class="summary-grid">
    <article class="summary-card overview-card">
      <div class="overview-head">
        <div>
          <p class="eyebrow">{{ quarterLabel }}</p>
          <h1>季度加班进度</h1>
        </div>
        <div class="status-badge">
          <span>完成率</span>
          <strong>{{ completionRate.toFixed(1) }}%</strong>
        </div>
      </div>

      <p class="hero-copy">只统计你真实录入且满足规则的有效加班时长，方便快速判断本季度是否还差补录。</p>

      <div class="progress-panel">
        <div class="progress-meta">
          <span>进度条</span>
          <strong>{{ completedHours.toFixed(1) }}h / {{ targetHours.toFixed(1) }}h</strong>
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${completionRate}%` }"></div>
        </div>
      </div>

      <div class="overview-foot">
        <div class="foot-item">
          <span>当前状态</span>
          <strong>{{ completionRate >= 100 ? '已达标' : '继续补录' }}</strong>
        </div>
        <div class="foot-item">
          <span>剩余缺口</span>
          <strong>{{ remainingHours.toFixed(1) }}h</strong>
        </div>
      </div>
    </article>

    <article class="summary-card metric-card target-card">
      <span class="metric-label">季度目标</span>
      <strong>{{ targetHours.toFixed(1) }}h</strong>
      <p>按季度工作日 × 1.36 自动计算</p>
    </article>

    <article class="summary-card metric-card completed-card">
      <span class="metric-label">已完成</span>
      <strong>{{ completedHours.toFixed(1) }}h</strong>
      <p>只累计满足规则的有效加班</p>
    </article>

    <article class="summary-card metric-card remaining-card">
      <span class="metric-label">剩余时长</span>
      <strong>{{ remainingHours.toFixed(1) }}h</strong>
      <p>还需要补齐的季度目标缺口</p>
    </article>
  </section>
</template>

<script setup>
defineProps({
  quarterLabel: String,
  targetHours: Number,
  completedHours: Number,
  remainingHours: Number,
  completionRate: Number,
})
</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: 1.5fr repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  position: relative;
  overflow: hidden;
  padding: 22px;
  border-radius: 24px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, transparent), var(--panel)),
    var(--panel);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.overview-card {
  display: grid;
  gap: 18px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--brand) 18%, transparent), transparent 28%),
    linear-gradient(135deg, color-mix(in srgb, var(--brand-soft) 38%, var(--panel)), var(--panel));
}

.overview-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.eyebrow,
.metric-label,
.hero-copy,
.progress-meta span,
.foot-item span,
.metric-card p,
.status-badge span {
  color: var(--muted);
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 0.84rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.overview-card h1 {
  margin: 0;
  font-size: 1.85rem;
  line-height: 1.05;
}

.hero-copy {
  margin: 0;
  max-width: 40ch;
  line-height: 1.65;
}

.status-badge {
  min-width: 116px;
  padding: 12px 14px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 92%, transparent);
}

.status-badge span,
.status-badge strong {
  display: block;
}

.status-badge strong {
  margin-top: 6px;
  font-size: 1.3rem;
}

.progress-panel {
  padding: 16px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface) 84%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}

.progress-meta strong {
  font-size: 0.98rem;
}

.progress-track {
  height: 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface) 72%, #18243c);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--brand), var(--brand-strong));
  box-shadow: 0 0 18px color-mix(in srgb, var(--brand) 36%, transparent);
}

.overview-foot {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.foot-item {
  padding: 14px 16px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
}

.foot-item span,
.foot-item strong {
  display: block;
}

.foot-item strong {
  margin-top: 8px;
  font-size: 1.02rem;
}

.metric-card {
  display: grid;
  align-content: start;
  gap: 10px;
}

.metric-card strong {
  font-size: 2.1rem;
  line-height: 1;
}

.metric-card p {
  margin: 0;
  line-height: 1.6;
}

.target-card::after,
.completed-card::after,
.remaining-card::after {
  content: '';
  position: absolute;
  right: -18px;
  top: -18px;
  width: 88px;
  height: 88px;
  border-radius: 22px;
  transform: rotate(18deg);
  opacity: 0.55;
}

.target-card::after {
  background: color-mix(in srgb, var(--brand) 13%, transparent);
}

.completed-card::after {
  background: color-mix(in srgb, #2ec4b6 16%, transparent);
}

.remaining-card::after {
  background: color-mix(in srgb, #f6bd60 18%, transparent);
}

@media (max-width: 1180px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .overview-card {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .summary-grid,
  .overview-foot {
    grid-template-columns: 1fr;
  }

  .overview-head {
    flex-direction: column;
  }

  .status-badge {
    min-width: 0;
    width: 100%;
  }
}
</style>
