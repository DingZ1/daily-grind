import { computed, watchEffect } from 'vue'
import { useOvertimeStore } from '../stores/overtime'

export function useTheme() {
  const store = useOvertimeStore()

  const activeTheme = computed(() => {
    if (store.theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return store.theme
  })

  watchEffect(() => {
    document.documentElement.dataset.theme = activeTheme.value
  })

  return {
    activeTheme,
    theme: computed(() => store.theme),
    setTheme: store.updateTheme,
  }
}
