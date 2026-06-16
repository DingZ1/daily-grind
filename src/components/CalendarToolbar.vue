<template>
  <el-card class="toolbar-card" shadow="never">
    <div class="toolbar">
      <div class="toolbar-top">
        <div class="hero-copy">
          <p class="toolbar-label">当前视图</p>
          <strong>{{ monthLabel }}</strong>
          <p class="toolbar-subtitle">快速切月、定位日期、调整公司口径，都集中在这里。</p>
        </div>
        <div class="toolbar-actions">
          <el-button round @click="$emit('previous-month')">上个月</el-button>
          <el-button type="primary" round @click="$emit('next-month')">下个月</el-button>
        </div>
      </div>

      <div class="quick-strip">
        <div class="quick-chip">
          <span>浏览月份</span>
          <strong>{{ monthInput }}</strong>
        </div>
        <div class="quick-chip">
          <span>当前日期</span>
          <strong>{{ dateInput }}</strong>
        </div>
        <div class="quick-chip">
          <span>基准工时</span>
          <strong>{{ settings.workdayStart }} - {{ settings.workdayEnd }}</strong>
        </div>
      </div>

      <div class="controls-panel">
        <div class="control-group">
          <p class="group-title">日期定位</p>
          <div class="controls controls-two">
            <div class="control-item">
              <span>跳转月份</span>
              <el-date-picker
                :model-value="monthInput"
                type="month"
                value-format="YYYY-MM"
                placeholder="选择月份"
                @update:model-value="$emit('jump-month', $event)"
              />
            </div>
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
          <div class="controls controls-three">
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
            <div class="control-item theme-item">
              <span>主题模式</span>
              <el-select :model-value="theme" @update:model-value="$emit('change-theme', $event)">
                <el-option label="跟随系统" value="auto" />
                <el-option label="浅色" value="light" />
                <el-option label="暗色" value="dark" />
              </el-select>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
defineProps({
  monthLabel: String,
  monthInput: String,
  dateInput: String,
  settings: Object,
  theme: String,
})

const emit = defineEmits([
  'previous-month',
  'next-month',
  'jump-month',
  'jump-date',
  'update-settings',
  'change-theme',
])

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
  gap: 18px;
}

.toolbar-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}

.hero-copy strong {
  display: block;
  font-size: 2rem;
  line-height: 1.05;
}

.toolbar-label,
.control-item span,
.group-title,
.toolbar-subtitle,
.quick-chip span {
  color: var(--muted);
  font-size: 0.88rem;
}

.toolbar-label {
  margin: 0 0 6px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
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

.quick-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.quick-chip {
  padding: 14px 16px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 92%, transparent);
}

.quick-chip span,
.quick-chip strong {
  display: block;
}

.quick-chip strong {
  margin-top: 6px;
  font-size: 1rem;
  color: var(--text);
}

.controls-panel {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.35fr);
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

.controls-two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.controls-three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.control-item {
  display: grid;
  gap: 8px;
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

@media (max-width: 1180px) {
  .controls-panel {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .quick-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .controls-three {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .hero-copy strong {
    font-size: 1.6rem;
  }

  .quick-strip,
  .controls-two,
  .controls-three {
    grid-template-columns: 1fr;
  }

  .toolbar-actions {
    width: 100%;
  }

  .toolbar-actions :deep(.el-button) {
    flex: 1;
  }
}
</style>
