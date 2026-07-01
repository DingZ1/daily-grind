<template>
  <router-view />
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useOvertimeStore } from './stores/overtime'
import { useTheme } from './composables/useTheme'

const store = useOvertimeStore()
useTheme()

void store.initialize().catch((error) => {
  ElMessage.error(error.message || '加载数据失败。')
})

function refreshStorageFile() {
  if (document.visibilityState === 'hidden') return
  void store.refreshFromStorageFile()
}

onMounted(() => {
  window.addEventListener('focus', refreshStorageFile)
  document.addEventListener('visibilitychange', refreshStorageFile)
})

onBeforeUnmount(() => {
  window.removeEventListener('focus', refreshStorageFile)
  document.removeEventListener('visibilitychange', refreshStorageFile)
})
</script>
