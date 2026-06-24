<template>
  <button
    type="button"
    class="day-cell"
    :class="{
      outside: !cell.isCurrentMonth,
      selected: isSelected,
      holiday: dayKind === 'holiday',
      weekend: dayKind === 'weekend',
      makeup: dayKind === 'makeup-workday',
      filled: record && record.overtimeHours > 0,
      invalid: record && record.status === 'invalid',
    }"
    @click="$emit('select')"
  >
    <div class="day-header">
      <span>{{ cell.day }}</span>
      <small>{{ statusLabel }}</small>
    </div>
    <div class="hours" v-if="record">
      <strong>{{ record.overtimeHours.toFixed(1) }}h</strong>
      <span>{{ record.startTime }} - {{ record.endTime }}</span>
      <em v-if="record.status === 'invalid'">不足 1 小时，不计入</em>
    </div>
    <div v-else class="empty-tip">{{ emptyTip }}</div>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { DAY_KIND_LABELS } from '../constants/rules'
import { getHolidayLabel } from '../utils/holiday'

const props = defineProps({
  cell: Object,
  dayKind: String,
  record: Object,
  isSelected: Boolean,
})

const emptyTip = computed(() => {
  return props.dayKind === 'holiday' ? '+ 节假日记录' : '+ 记录'
})

const statusLabel = computed(() => {
  if (props.record?.status === 'invalid') {
    return '未计入'
  }

  const holidayLabel = getHolidayLabel(props.cell.date)
  return holidayLabel || DAY_KIND_LABELS[props.dayKind] || ''
})
</script>

<style scoped>
.day-cell {
  min-height: 122px;
  padding: 14px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.day-cell:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--brand) 30%, var(--border));
}

.day-cell.outside {
  opacity: 0.45;
}

.day-cell.selected {
  border-color: var(--brand);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand) 24%, transparent);
}

.day-cell.weekend,
.day-cell.holiday {
  background: color-mix(in srgb, var(--warning) 10%, var(--panel));
}

.day-cell.makeup {
  background: color-mix(in srgb, var(--brand) 10%, var(--panel));
}

.day-cell.filled {
  background: linear-gradient(180deg, var(--panel), color-mix(in srgb, var(--brand-soft) 56%, var(--panel)));
}

.day-cell.invalid {
  background: linear-gradient(180deg, var(--panel), color-mix(in srgb, var(--warning-soft) 42%, var(--panel)));
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.day-header small,
.hours span,
.hours em,
.empty-tip {
  color: var(--muted);
}

.hours {
  display: grid;
  gap: 6px;
  margin-top: 26px;
}

.hours strong {
  font-size: 1.25rem;
}

.hours em {
  font-style: normal;
  font-size: 0.82rem;
}

.empty-tip {
  margin-top: 28px;
}
</style>
