<template>
  <el-card class="toolbar-card" shadow="never">
    <div class="toolbar">
      <div class="today-copy">
        <p class="toolbar-label">当前时间</p>
        <div class="today-date" aria-label="今天日期">
          <span class="date-highlight">{{ todayDateParts.year }} 年</span>
          <span class="date-highlight">{{ todayDateParts.month }} 月</span>
          <span>{{ todayDateParts.day }} 日</span>
        </div>
      </div>

      <label class="date-jump">
        <span>跳转日期</span>
        <el-date-picker
          :model-value="dateInput"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="选择日期"
          @update:model-value="$emit('jump-date', $event)"
        />
      </label>
    </div>
  </el-card>
</template>

<script setup>
defineProps({
  todayDateParts: Object,
  dateInput: String,
})

defineEmits([
  'jump-date',
])
</script>

<style scoped>
.toolbar-card {
  border-radius: 28px;
  border: 1px solid var(--border);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--brand-soft) 32%, var(--panel)), var(--panel) 54%),
    var(--panel);
  box-shadow: var(--shadow);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 20px;
  flex-wrap: wrap;
}

.toolbar-label,
.date-jump span {
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

.date-jump {
  display: grid;
  gap: 8px;
  min-width: 240px;
}

:deep(.el-input__wrapper) {
  min-height: 42px;
  border-radius: 14px;
  background: var(--surface);
  box-shadow: 0 0 0 1px var(--border) inset;
}

@media (max-width: 640px) {
  .today-date {
    font-size: 1.6rem;
  }

  .date-jump {
    width: 100%;
  }
}
</style>
