<template>
  <section class="calendar-panel">
    <div class="calendar-toolbar">
      <label class="month-picker">
        <span>浏览月份</span>
        <el-date-picker
          :model-value="monthInput"
          type="month"
          value-format="YYYY-MM"
          placeholder="选择月份"
          @update:model-value="$emit('jump-month', $event)"
        />
      </label>
      <div class="month-actions">
        <el-button round @click="$emit('previous-month')">上个月</el-button>
        <el-button type="primary" round @click="$emit('next-month')">下个月</el-button>
      </div>
    </div>

    <header class="calendar-head">
      <span v-for="weekday in weekdays" :key="weekday">{{ weekday }}</span>
    </header>
    <div class="calendar-grid">
      <DayCell
        v-for="cell in cells"
        :key="cell.date"
        :cell="cell"
        :day-kind="getDayKind(cell.date)"
        :record="records[cell.date]"
        :is-selected="selectedDate === cell.date"
        @select="$emit('select-date', cell.date)"
      />
    </div>
  </section>
</template>

<script setup>
import DayCell from './DayCell.vue'
import { getDayKind } from '../utils/holiday'

defineProps({
  cells: Array,
  selectedDate: String,
  records: Object,
  monthInput: String,
})

defineEmits([
  'select-date',
  'previous-month',
  'next-month',
  'jump-month',
])

const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
</script>

<style scoped>
.calendar-panel {
  padding: 20px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 28px;
  box-shadow: var(--shadow);
}

.calendar-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.month-picker {
  display: grid;
  gap: 8px;
  min-width: 220px;
}

.month-picker span {
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 600;
}

.month-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

:deep(.el-input__wrapper) {
  min-height: 42px;
  border-radius: 14px;
  background: var(--surface);
  box-shadow: 0 0 0 1px var(--border) inset;
}

.calendar-head {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
  color: var(--muted);
  font-size: 0.92rem;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 960px) {
  .calendar-toolbar {
    align-items: stretch;
  }

  .month-picker {
    flex: 1 1 220px;
  }

  .calendar-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .calendar-head {
    display: none;
  }
}

@media (max-width: 580px) {
  .calendar-toolbar {
    display: grid;
  }

  .month-picker {
    min-width: 0;
  }

  .month-actions :deep(.el-button) {
    flex: 1;
  }

  .calendar-grid {
    grid-template-columns: 1fr;
  }
}
</style>
