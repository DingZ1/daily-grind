<template>
  <section
    class="quarter-summary"
    :class="{
      'is-expanded': !collapsed,
      'is-complete': isComplete,
    }"
  >
    <button
      class="summary-toggle"
      type="button"
      :aria-expanded="String(!collapsed)"
      :aria-label="toggleLabel"
      @click="collapsed = !collapsed"
    >
      <span class="summary-title">
        <span class="eyebrow">{{ quarterLabel }}</span>
      </span>

      <span class="toggle-icon" aria-hidden="true"></span>
    </button>

    <div class="sprint-progress">
      <span class="progress-meta">
        <span>{{ progressText }}</span>
        <strong>{{ completionRate.toFixed(1) }}%</strong>
      </span>
      <span class="progress-track" role="progressbar" :aria-valuenow="completionRate" aria-valuemin="0" aria-valuemax="100">
        <span class="progress-fill" :style="{ width: progressWidth }"></span>
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
            <span>季度目标</span>
            <strong>{{ formatHours(targetHours) }}h</strong>
            <p>{{ targetSourceText }}</p>
          </div>
          <div class="detail-metric">
            <span>自动目标</span>
            <strong>{{ formatHours(autoTargetHours) }}h</strong>
            <p>按季度工作日 × 1.36 计算</p>
          </div>
          <div class="detail-metric">
            <span>当前状态</span>
            <strong>{{ statusText }}</strong>
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
            <span>目标设置</span>
            <strong>{{ targetModeText }}</strong>
            <p>当前设置会随数据一起保存到 daily-grind-data.json。</p>
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
            <el-button round plain :disabled="!hasCustomTarget" @click="restoreAutoTarget">恢复自动目标</el-button>
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
})

const emit = defineEmits(['update-target', 'clear-target'])

const collapsed = ref(true)
const targetDraft = ref(0)

const isComplete = computed(() => props.completionRate >= 100)
const progressWidth = computed(() => `${Math.min(Math.max(props.completionRate, 0), 100)}%`)
const progressText = computed(() => (
  `${formatHours(props.completedHours)}h / ${formatHours(props.targetHours)}h，剩余 ${formatHours(props.remainingHours)}h`
))
const toggleLabel = computed(() => (
  `${props.quarterLabel} ${collapsed.value ? '展开季度详情' : '收起季度详情'}`
))
const targetModeText = computed(() => (props.hasCustomTarget ? '手动目标' : '自动目标'))
const targetSourceText = computed(() => (
  props.hasCustomTarget ? `手动设置为 ${formatHours(props.customTargetHours)}h` : '按季度工作日 × 1.36 自动计算'
))
const statusText = computed(() => (isComplete.value ? '已达标' : '冲刺中'))

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

.summary-toggle {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  gap: 18px;
  align-items: center;
  width: 100%;
  padding: 0;
  color: var(--text);
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.summary-toggle:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand) 54%, transparent);
  outline-offset: 6px;
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
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 92%, transparent);
}

.toggle-icon::after {
  content: '';
  position: absolute;
  left: 9px;
  top: 8px;
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--muted);
  border-bottom: 2px solid var(--muted);
  transform: rotate(45deg);
  transition: transform 0.2s ease, top 0.2s ease;
}

.is-expanded .toggle-icon::after {
  top: 11px;
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
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--track-bg);
}

.progress-fill {
  display: block;
  position: relative;
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

  .summary-toggle {
    gap: 10px 12px;
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
}
</style>
