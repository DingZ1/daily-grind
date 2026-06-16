import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import { getMonthMatrix } from '../utils/date'

export function useCalendar() {
  const viewMonth = ref(dayjs().startOf('month'))
  const selectedDate = ref(dayjs().format('YYYY-MM-DD'))

  const monthCells = computed(() => getMonthMatrix(viewMonth.value))

  function previousMonth() {
    viewMonth.value = viewMonth.value.subtract(1, 'month')
  }

  function nextMonth() {
    viewMonth.value = viewMonth.value.add(1, 'month')
  }

  function jumpToMonth(value) {
    viewMonth.value = dayjs(`${value}-01`)
  }

  return {
    viewMonth,
    selectedDate,
    monthCells,
    previousMonth,
    nextMonth,
    jumpToMonth,
  }
}
