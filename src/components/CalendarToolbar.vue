<template>
  <el-card class="toolbar-card" shadow="never">
    <div class="toolbar">
      <div class="toolbar-top">
        <div class="hero-copy">
          <p class="toolbar-label">当前时间</p>
          <div class="today-date" aria-label="今天日期">
            <span class="date-highlight">{{ todayDateParts.year }} 年</span>
            <span class="date-highlight">{{ todayDateParts.month }} 月</span>
            <span>{{ todayDateParts.day }} 日</span>
          </div>
        </div>
        <div class="toolbar-actions">
          <button
            class="toolbar-toggle"
            type="button"
            :aria-expanded="String(!collapsed)"
            :aria-label="collapsed ? '展开视图设置' : '收起视图设置'"
            @click="collapsed = !collapsed"
          >
            <span aria-hidden="true"></span>
          </button>
        </div>
      </div>

      <div
        class="toolbar-fold-shell"
        :class="{ 'is-open': !collapsed }"
        :aria-hidden="String(collapsed)"
        :inert="collapsed"
      >
        <div class="toolbar-fold">
          <p class="toolbar-subtitle">定位日期、调整公司口径，都集中在这里。</p>

          <div class="controls-panel">
            <div class="control-group">
              <p class="group-title">日期定位</p>
              <div class="controls controls-one">
                <div class="control-item">
                  <span>跳转日期</span>
                  <el-date-picker
                    :model-value="dateInput"
                    type="date"
                    value-format="YYYY-MM-DD"
                    placeholder="选择日期"
                    @update:model-value="$emit('jump-date', $event)"
                  />
                </div>
              </div>
            </div>

            <div class="control-group">
              <p class="group-title">公司口径</p>
              <div class="controls controls-four">
                <div class="control-item">
                  <span>标准上班</span>
                  <el-time-select
                    :model-value="settings.workdayStart"
                    start="06:00"
                    step="00:30"
                    end="12:00"
                    @update:model-value="updateField('workdayStart', $event)"
                  />
                </div>
                <div class="control-item">
                  <span>标准下班</span>
                  <el-time-select
                    :model-value="settings.workdayEnd"
                    start="16:00"
                    step="00:30"
                    end="22:00"
                    @update:model-value="updateField('workdayEnd', $event)"
                  />
                </div>
                <div class="control-item baseline-item">
                  <span>基准工时</span>
                  <div class="readonly-value">{{ settings.workdayStart }} - {{ settings.workdayEnd }}</div>
                </div>
                <div class="control-item theme-item">
                  <span>主题模式</span>
                  <el-select :model-value="theme" @update:model-value="$emit('change-theme', $event)">
                    <el-option label="跟随系统" value="auto" />
                    <el-option label="浅色" value="light" />
                    <el-option label="柔和" value="soft" />
                    <el-option label="暗色" value="dark" />
                  </el-select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  todayDateParts: Object,
  dateInput: String,
  settings: Object,
  theme: String,
})

const emit = defineEmits([
  'jump-date',
  'update-settings',
  'change-theme',
])

const collapsed = ref(true)

function updateField(field, value) {
  emit('update-settings', { [field]: value })
}
</script>

<style scoped>
.toolbar-card {
  border-radius: 28px;
  border: 1px solid var(--border);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--brand-soft) 32%, var(--panel)), var(--panel) 38%),
    var(--panel);
  box-shadow: var(--shadow);
}

.toolbar {
  display: grid;
  gap: 0;
}

.toolbar-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}

.toolbar-label,
.control-item span,
.group-title,
.toolbar-subtitle {
  color: var(--muted);
  font-size: 0.88rem;
}

.toolbar-label {
  margin: 0 0 6px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.today-date {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  color: var(--text);
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.15;
}

.date-highlight {
  padding: 2px 8px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--brand-soft) 58%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand) 12%, transparent) inset;
}

.toolbar-subtitle {
  margin: 10px 0 0;
  line-height: 1.6;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.toolbar-toggle {
  position: relative;
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 999px;
  color: var(--muted);
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 92%, transparent);
  cursor: pointer;
}

.toolbar-toggle span {
  position: absolute;
  left: 11px;
  top: 10px;
  width: 10px;
  height: 10px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg);
  transition: transform 0.2s ease, top 0.2s ease;
}

.toolbar-toggle[aria-expanded='true'] span {
  top: 13px;
  transform: rotate(225deg);
}

.toolbar-toggle:hover,
.toolbar-toggle:focus-visible {
  color: var(--brand);
  background: color-mix(in srgb, var(--brand-soft) 44%, var(--surface));
  border-color: color-mix(in srgb, var(--brand) 38%, var(--border));
}

.toolbar-toggle:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand) 54%, transparent);
  outline-offset: 3px;
}

.controls-panel {
  display: grid;
  grid-template-columns: minmax(220px, 0.75fr) minmax(0, 1.7fr);
  gap: 14px;
}

.control-group {
  padding: 16px;
  border-radius: 22px;
  background: color-mix(in srgb, var(--surface) 94%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 92%, transparent);
}

.group-title {
  margin: 0 0 12px;
  font-weight: 600;
}

.controls {
  display: grid;
  gap: 14px;
  align-items: end;
}

.controls-one {
  grid-template-columns: minmax(0, 1fr);
}

.controls-four {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.control-item {
  display: grid;
  gap: 8px;
}

.readonly-value {
  min-height: 42px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-radius: 14px;
  color: var(--text);
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  box-shadow: 0 0 0 1px var(--border) inset;
}

.theme-item {
  min-width: 140px;
}

:deep(.el-input__wrapper),
:deep(.el-select__wrapper) {
  min-height: 42px;
  border-radius: 14px;
  background: var(--surface);
  box-shadow: 0 0 0 1px var(--border) inset;
}

.toolbar-fold-shell {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  overflow: hidden;
  transform: translate3d(0, -4px, 0);
  transition:
    grid-template-rows 320ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 200ms ease,
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: grid-template-rows, opacity, transform;
}

.toolbar-fold-shell.is-open {
  grid-template-rows: 1fr;
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.toolbar-fold {
  display: grid;
  gap: 18px;
  min-height: 0;
  overflow: hidden;
  padding-top: 18px;
}

@media (prefers-reduced-motion: reduce) {
  .toolbar-toggle span,
  .toolbar-fold-shell {
    transition: none;
  }
}

@media (max-width: 1180px) {
  .controls-panel {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .controls-four {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .today-date {
    font-size: 1.6rem;
  }

  .controls-one,
  .controls-four {
    grid-template-columns: 1fr;
  }

  .toolbar-actions {
    width: auto;
    margin-left: auto;
  }

  .toolbar-toggle {
    flex: 0 0 34px;
  }
}
</style>
