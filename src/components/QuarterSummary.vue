<template>
  <section
    class="quarter-summary"
    :class="{
      'is-expanded': !collapsed,
      'is-complete': isComplete,
    }"
  >
    <header class="summary-header">
      <span class="summary-title">
        <span class="eyebrow">季度查询</span>
        <strong>{{ quarterLabel }}</strong>
      </span>

      <div class="summary-actions" aria-label="查询季度">
        <div class="period-switcher">
          <button class="year-step" type="button" aria-label="上一年" @click="shiftYear(-1)">
            <span aria-hidden="true">&lt;</span>
          </button>
          <span class="year-value">{{ queryYear }} 年</span>
          <button class="year-step" type="button" aria-label="下一年" @click="shiftYear(1)">
            <span aria-hidden="true">&gt;</span>
          </button>

          <span class="switcher-divider" aria-hidden="true"></span>

          <button
            v-for="quarter in quarters"
            :key="quarter.value"
            class="quarter-button"
            :class="{ 'is-active': queryQuarter === quarter.value }"
            type="button"
            :aria-pressed="String(queryQuarter === quarter.value)"
            @click="selectQuarter(quarter.value)"
          >
            {{ quarter.label }}
          </button>
        </div>

        <button
          class="summary-toggle"
          type="button"
          :aria-expanded="String(!collapsed)"
          :aria-label="toggleLabel"
          @click="collapsed = !collapsed"
        >
          <span>{{ collapsed ? '详情' : '收起' }}</span>
          <span class="toggle-icon" aria-hidden="true"></span>
        </button>
      </div>
    </header>

    <div class="sprint-progress">
      <span class="progress-meta">
        <span>{{ progressText }}</span>
        <strong>{{ completionRate.toFixed(1) }}%</strong>
      </span>
      <span
        class="progress-track"
        :class="{ 'has-rated-marker': showRatedMarker }"
        role="progressbar"
        :aria-valuenow="completionRate"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuetext="progressText"
      >
        <span class="progress-fill" :style="{ width: progressWidth }"></span>
        <span
          v-if="showRatedMarker"
          class="rated-marker"
          :class="{ 'is-overflow': ratedMarkerOverflow }"
          :style="{ left: ratedMarkerPosition }"
          aria-hidden="true"
        >
          <span class="rated-marker-label">{{ ratedMarkerLabel }}</span>
        </span>
      </span>
      <span v-if="ratedMarkerOverflow" class="progress-note">
        额定时长超过计划时长，分割线显示在满格位置。
      </span>
    </div>

    <div
      class="summary-fold"
      :class="{ 'is-open': !collapsed }"
      :aria-hidden="String(collapsed)"
      :inert="collapsed"
    >
      <div class="summary-detail">
        <div class="detail-metrics">
          <div class="detail-metric">
            <span>{{ hasCustomTarget ? '计划时长' : '进度满格' }}</span>
            <strong>{{ formatHours(targetHours) }}h</strong>
            <p>{{ targetSourceText }}</p>
          </div>
          <div class="detail-metric">
            <span>额定时长</span>
            <strong>{{ formatHours(autoTargetHours) }}h</strong>
            <p>按季度工作日 × 1.36 计算</p>
          </div>
          <div class="detail-metric">
            <span>实际时长</span>
            <strong>{{ formatHours(completedHours) }}h</strong>
            <p>只累计满足规则的有效加班</p>
          </div>
          <div class="detail-metric">
            <span>完成率</span>
            <strong>{{ completionRate.toFixed(1) }}%</strong>
            <p>剩余 {{ formatHours(remainingHours) }}h</p>
          </div>
        </div>

        <div class="target-editor">
          <div class="editor-copy">
            <span>计划设置</span>
            <strong>{{ targetModeText }}</strong>
            <p>设置后，季度进度满格按计划时长计算，并随数据一起保存。</p>
          </div>
          <div class="target-controls">
            <el-input-number
              v-model="targetDraft"
              :min="0"
              :step="0.5"
              :precision="1"
              controls-position="right"
              @change="commitTarget"
            />
            <el-button round plain :disabled="!hasCustomTarget" @click="restoreAutoTarget">恢复按额定时长</el-button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  quarterLabel: {
    type: String,
    default: '',
  },
  queryYear: {
    type: Number,
    default: 0,
  },
  queryQuarter: {
    type: Number,
    default: 1,
  },
  autoTargetHours: {
    type: Number,
    default: 0,
  },
  targetHours: {
    type: Number,
    default: 0,
  },
  customTargetHours: {
    type: Number,
    default: null,
  },
  hasCustomTarget: {
    type: Boolean,
    default: false,
  },
  completedHours: {
    type: Number,
    default: 0,
  },
  remainingHours: {
    type: Number,
    default: 0,
  },
  completionRate: {
    type: Number,
    default: 0,
  },
  ratedMarkerRate: {
    type: Number,
    default: null,
  },
  ratedMarkerOverflow: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['change-quarter', 'update-target', 'clear-target'])

const collapsed = ref(true)
const targetDraft = ref(0)
const quarters = [
  { label: 'Q1', value: 1 },
  { label: 'Q2', value: 2 },
  { label: 'Q3', value: 3 },
  { label: 'Q4', value: 4 },
]

const isComplete = computed(() => props.completionRate >= 100)
const progressWidth = computed(() => `${Math.min(Math.max(props.completionRate, 0), 100)}%`)
const showRatedMarker = computed(() => (
  props.hasCustomTarget && Number.isFinite(props.ratedMarkerRate)
))
const ratedMarkerPosition = computed(() => (
  `${Math.min(Math.max(props.ratedMarkerRate || 0, 0), 100)}%`
))
const ratedMarkerLabel = computed(() => `额定 ${formatHours(props.autoTargetHours)}h`)
const progressText = computed(() => {
  if (props.hasCustomTarget) {
    return [
      `实际 ${formatHours(props.completedHours)}h / 计划 ${formatHours(props.targetHours)}h`,
      `额定 ${formatHours(props.autoTargetHours)}h`,
      `剩余 ${formatHours(props.remainingHours)}h`,
    ].join('，')
  }

  return `实际 ${formatHours(props.completedHours)}h / 额定 ${formatHours(props.targetHours)}h，剩余 ${formatHours(props.remainingHours)}h`
})
const toggleLabel = computed(() => (
  `${props.quarterLabel} ${collapsed.value ? '展开季度详情' : '收起季度详情'}`
))
const targetModeText = computed(() => (props.hasCustomTarget ? '手动计划' : '按额定时长'))
const targetSourceText = computed(() => (
  props.hasCustomTarget ? `手动设置计划为 ${formatHours(props.customTargetHours)}h` : '未设置计划，满格按额定时长'
))

watch(
  () => props.targetHours,
  (targetHours) => {
    targetDraft.value = Number(Number(targetHours || 0).toFixed(1))
  },
  { immediate: true },
)

function formatHours(value) {
  return Number(value || 0).toFixed(1)
}

function selectQuarter(quarter) {
  emitQuarterChange(props.queryYear, quarter)
}

function shiftYear(delta) {
  emitQuarterChange(props.queryYear + delta, props.queryQuarter)
}

function emitQuarterChange(year, quarter) {
  const numericYear = Number(year)
  const numericQuarter = Number(quarter)

  if (!Number.isInteger(numericYear) || numericQuarter < 1 || numericQuarter > 4) {
    return
  }

  emit('change-quarter', {
    year: numericYear,
    quarter: numericQuarter,
  })
}

function commitTarget(value) {
  const numericHours = Number(value)

  if (!Number.isFinite(numericHours) || numericHours < 0) {
    targetDraft.value = Number(Number(props.targetHours || 0).toFixed(1))
    return
  }

  emit('update-target', Number(numericHours.toFixed(1)))
}

function restoreAutoTarget() {
  emit('clear-target')
}
</script>

<style scoped>
.quarter-summary {
  display: grid;
  gap: 0;
  padding: 18px;
  overflow: hidden;
  border-radius: 24px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--surface) 94%, transparent), var(--panel)),
    var(--panel);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.summary-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.summary-toggle {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 10px 0 14px;
  color: var(--text);
  font-weight: 700;
  background: color-mix(in srgb, var(--surface) 86%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  border-radius: 999px;
  cursor: pointer;
}

.summary-toggle:hover {
  color: var(--brand);
  background: color-mix(in srgb, var(--brand-soft) 38%, var(--surface));
  border-color: color-mix(in srgb, var(--brand) 34%, var(--border));
}

.period-switcher {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 40px;
  padding: 4px;
  border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface) 82%, transparent);
  box-shadow: 0 1px 0 color-mix(in srgb, #fff 72%, transparent) inset;
}

.year-step,
.quarter-button {
  height: 32px;
  color: var(--muted);
  font-weight: 800;
  background: transparent;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}

.year-step {
  width: 32px;
  font-size: 0.9rem;
}

.year-value {
  min-width: 76px;
  padding: 0 6px;
  color: var(--text);
  font-weight: 800;
  text-align: center;
  white-space: nowrap;
}

.switcher-divider {
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background: color-mix(in srgb, var(--border) 90%, transparent);
}

.quarter-button {
  min-width: 40px;
  padding: 0 12px;
}

.year-step:hover,
.quarter-button:hover,
.quarter-button.is-active {
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
}

.summary-toggle:focus-visible,
.year-step:focus-visible,
.quarter-button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand) 54%, transparent);
  outline-offset: 3px;
}

.summary-title {
  min-width: 180px;
}

.summary-title strong {
  display: block;
  margin-top: 4px;
  color: var(--text);
  font-size: 1.45rem;
  line-height: 1.15;
}

.summary-toggle:focus-visible {
  outline-offset: 4px;
}

.summary-title,
.detail-metric span,
.detail-metric strong,
.editor-copy span,
.editor-copy strong {
  display: block;
}

.eyebrow,
.progress-meta span,
.detail-metric span,
.detail-metric p,
.editor-copy span,
.editor-copy p {
  color: var(--muted);
}

.eyebrow {
  font-size: 0.84rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.toggle-icon {
  position: relative;
  width: 16px;
  height: 16px;
  color: var(--muted);
  transition: color 0.18s ease;
}

.toggle-icon::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 3px;
  width: 7px;
  height: 7px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg);
  transition: transform 0.2s ease, top 0.2s ease;
}

.summary-toggle:hover .toggle-icon {
  color: var(--brand);
}

.is-expanded .toggle-icon::after {
  top: 6px;
  transform: rotate(225deg);
}

.sprint-progress {
  display: grid;
  gap: 8px;
  width: 100%;
  margin-top: 14px;
  padding: 0;
  color: var(--text);
  text-align: left;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  font-size: 0.9rem;
}

.progress-meta strong {
  white-space: nowrap;
}

.progress-track {
  display: block;
  position: relative;
  height: 12px;
  margin-top: 4px;
  overflow: visible;
  border-radius: 999px;
  background: var(--track-bg);
}

.progress-track.has-rated-marker {
  margin-top: 12px;
  margin-bottom: 22px;
}

.progress-fill {
  display: block;
  position: relative;
  z-index: 1;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--brand), var(--brand-strong));
  box-shadow: 0 0 18px color-mix(in srgb, var(--brand) 34%, transparent);
  transition: width 0.32s ease;
}

.progress-fill::before,
.progress-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.progress-fill::before {
  width: calc(100% + 36px);
  background: repeating-linear-gradient(
    120deg,
    rgba(255, 255, 255, 0.28) 0 10px,
    transparent 10px 22px
  );
}

.progress-fill::after {
  width: 44%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.42), transparent);
  transform: translateX(-120%);
}

.quarter-summary:not(.is-complete) .progress-fill::before {
  animation: sprint-stripes 0.75s linear infinite;
}

.quarter-summary:not(.is-complete) .progress-fill::after {
  animation: sprint-glow 1.35s ease-in-out infinite;
}

.is-complete .progress-fill {
  background: linear-gradient(90deg, var(--accent), var(--accent-strong));
  box-shadow: 0 0 16px color-mix(in srgb, var(--accent) 30%, transparent);
}

.is-complete .progress-fill::before,
.is-complete .progress-fill::after {
  display: none;
}

.rated-marker {
  position: absolute;
  top: -10px;
  bottom: -8px;
  z-index: 2;
  width: 2px;
  transform: translateX(-50%);
  pointer-events: none;
}

.rated-marker::before {
  content: '';
  position: absolute;
  left: 50%;
  top: -8px;
  width: 0;
  height: 0;
  border-left: 9px solid transparent;
  border-right: 9px solid transparent;
  border-top: 10px solid color-mix(in srgb, var(--warning) 58%, var(--text));
  transform: translateX(-50%);
}

.rated-marker::after {
  content: '';
  position: absolute;
  top: 6px;
  bottom: 8px;
  left: 50%;
  width: 2px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--warning) 70%, var(--text));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--surface) 82%, transparent);
  transform: translateX(-50%);
}

.rated-marker-label {
  position: absolute;
  left: 50%;
  top: calc(100% + 4px);
  padding: 3px 7px;
  color: var(--text);
  font-size: 0.76rem;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
  border: 1px solid color-mix(in srgb, var(--warning) 44%, var(--border));
  border-radius: 999px;
  background: color-mix(in srgb, var(--warning-soft) 72%, var(--surface));
  transform: translateX(-50%);
}

.rated-marker.is-overflow .rated-marker-label {
  right: 0;
  left: auto;
  transform: none;
}

.progress-note {
  color: var(--muted);
  font-size: 0.8rem;
  line-height: 1.5;
}

.summary-fold {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  overflow: hidden;
  transform: translate3d(0, -4px, 0);
  transition:
    grid-template-rows 300ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 180ms ease,
    transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: grid-template-rows, opacity, transform;
}

.summary-fold.is-open {
  grid-template-rows: 1fr;
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.summary-detail {
  display: grid;
  gap: 16px;
  min-height: 0;
  overflow: hidden;
  padding-top: 18px;
}

.detail-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
}

.detail-metric {
  min-width: 0;
  padding: 14px 18px;
}

.detail-metric + .detail-metric {
  border-left: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
}

.detail-metric strong {
  margin-top: 6px;
  font-size: 1.35rem;
  line-height: 1.15;
}

.detail-metric p,
.editor-copy p {
  margin: 6px 0 0;
  line-height: 1.55;
}

.target-editor {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
}

.editor-copy {
  min-width: 180px;
}

.editor-copy strong {
  margin-top: 4px;
  font-size: 1rem;
}

.target-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.target-controls :deep(.el-input-number) {
  width: 180px;
  line-height: 42px;
}

.target-controls :deep(.el-input__wrapper) {
  height: 42px;
  min-height: 42px;
  border-radius: 14px;
  background: var(--surface);
  box-shadow: 0 0 0 1px var(--border) inset;
}

.target-controls :deep(.el-input-number__decrease),
.target-controls :deep(.el-input-number__increase) {
  width: 32px;
  color: var(--muted);
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  border-color: color-mix(in srgb, var(--border) 92%, transparent);
}

.target-controls :deep(.el-button) {
  height: 42px;
  min-width: 128px;
  margin-left: 0;
  border-radius: 14px;
  color: var(--text);
  background: var(--surface);
  border-color: var(--border);
}

.target-controls :deep(.el-button:hover:not(.is-disabled)) {
  color: var(--brand);
  background: color-mix(in srgb, var(--brand-soft) 46%, var(--surface));
  border-color: color-mix(in srgb, var(--brand) 42%, var(--border));
}

.target-controls :deep(.el-button.is-disabled),
.target-controls :deep(.el-button.is-disabled:hover) {
  color: color-mix(in srgb, var(--muted) 64%, transparent);
  background: color-mix(in srgb, var(--surface) 74%, transparent);
  border-color: color-mix(in srgb, var(--border) 74%, transparent);
  cursor: not-allowed;
}

@keyframes sprint-stripes {
  from {
    transform: translateX(-24px);
  }

  to {
    transform: translateX(0);
  }
}

@keyframes sprint-glow {
  0% {
    transform: translateX(-120%);
  }

  60%,
  100% {
    transform: translateX(260%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .progress-fill,
  .toggle-icon::after,
  .summary-fold {
    transition: none;
  }

  .quarter-summary:not(.is-complete) .progress-fill::before,
  .quarter-summary:not(.is-complete) .progress-fill::after {
    animation: none;
  }
}

@media (max-width: 980px) {
  .detail-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .detail-metric:nth-child(3) {
    border-left: 0;
  }

  .detail-metric:nth-child(n + 3) {
    border-top: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  }
}

@media (max-width: 680px) {
  .quarter-summary {
    padding: 16px;
    border-radius: 22px;
  }

  .summary-header,
  .summary-actions {
    align-items: stretch;
  }

  .summary-actions {
    display: grid;
    width: 100%;
    grid-template-columns: 1fr;
  }

  .summary-toggle {
    width: 100%;
  }

  .period-switcher {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
    border-radius: 18px;
  }

  .year-step {
    flex: 0 0 36px;
  }

  .year-value {
    flex: 1 1 120px;
  }

  .switcher-divider {
    display: none;
  }

  .quarter-button {
    flex: 1 1 56px;
  }

  .detail-metrics {
    grid-template-columns: 1fr;
  }

  .detail-metric,
  .detail-metric + .detail-metric,
  .detail-metric:nth-child(n + 3) {
    border-left: 0;
    border-top: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
  }

  .detail-metric:first-child {
    border-top: 0;
  }

  .target-editor {
    align-items: stretch;
    flex-direction: column;
  }

  .target-controls {
    justify-content: stretch;
  }

  .target-controls :deep(.el-input-number),
  .target-controls :deep(.el-button) {
    width: 100%;
  }

  .progress-meta {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .progress-track {
    margin-top: 4px;
  }

  .progress-track.has-rated-marker {
    margin-bottom: 0;
  }

  .rated-marker-label {
    display: none;
  }
}
</style>
