import { computed } from 'vue'
import { getQuarterTargetHours, getQuarterInfo } from '../utils/date'
import { useOvertimeStore } from '../stores/overtime'

export function useQuarterStats(referenceDate) {
  const store = useOvertimeStore()

  const targetHours = computed(() => getQuarterTargetHours(referenceDate.value))
  const completedHours = computed(() => Number(store.getQuarterTotals(referenceDate.value).toFixed(1)))
  const remainingHours = computed(() => Number(Math.max(targetHours.value - completedHours.value, 0).toFixed(1)))
  const completionRate = computed(() => {
    if (!targetHours.value) return 0
    return Math.min(100, Number(((completedHours.value / targetHours.value) * 100).toFixed(1)))
  })
  const quarterInfo = computed(() => getQuarterInfo(referenceDate.value))

  return {
    targetHours,
    completedHours,
    remainingHours,
    completionRate,
    quarterInfo,
  }
}
