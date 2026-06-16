<template>
  <section class="calendar-panel">
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
})

defineEmits(['select-date'])

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
  .calendar-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .calendar-head {
    display: none;
  }
}

@media (max-width: 580px) {
  .calendar-grid {
    grid-template-columns: 1fr;
  }
}
</style>
