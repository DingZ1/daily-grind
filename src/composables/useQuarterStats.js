import { computed } from 'vue'
import { getQuarterTargetHours, getQuarterInfo, getQuarterKey } from '../utils/date'
import { useOvertimeStore } from '../stores/overtime'

export function useQuarterStats(referenceDate) {
  const store = useOvertimeStore()

  const quarterInfo = computed(() => getQuarterInfo(referenceDate.value))
  const quarterKey = computed(() => getQuarterKey(referenceDate.value))
  const autoTargetHours = computed(() => getQuarterTargetHours(referenceDate.value))
  const customTargetHours = computed(() => {
    const targetHours = store.quarterTargets[quarterKey.value]
    return Number.isFinite(targetHours) ? targetHours : null
  })
  const hasCustomTarget = computed(() => customTargetHours.value !== null)
  const targetHours = computed(() => (
    hasCustomTarget.value ? customTargetHours.value : autoTargetHours.value
  ))
  const completedHours = computed(() => Number(store.getQuarterTotals(referenceDate.value).toFixed(1)))
  const remainingHours = computed(() => Number(Math.max(targetHours.value - completedHours.value, 0).toFixed(1)))
  const completionRate = computed(() => {
    if (targetHours.value <= 0) return 100
    return Math.min(100, Number(((completedHours.value / targetHours.value) * 100).toFixed(1)))
  })
  const ratedMarkerRate = computed(() => {
    if (!hasCustomTarget.value || autoTargetHours.value <= 0) return null
    if (targetHours.value <= 0) return 100

    return Math.min(100, Number(((autoTargetHours.value / targetHours.value) * 100).toFixed(1)))
  })
  const ratedMarkerOverflow = computed(() => (
    hasCustomTarget.value && autoTargetHours.value > targetHours.value
  ))

  return {
    autoTargetHours,
    targetHours,
    customTargetHours,
    hasCustomTarget,
    completedHours,
    remainingHours,
    completionRate,
    ratedMarkerRate,
    ratedMarkerOverflow,
    quarterInfo,
  }
}
