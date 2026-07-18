<template>
  <section class="account-panel">
    <div>
      <p class="account-label">当前账号</p>
      <strong>{{ auth.email }}</strong>
      <span class="sync-state" :class="`is-${syncTone}`">{{ syncText }}</span>
    </div>
    <div class="account-actions">
      <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="upload" />
      <button class="ghost-button" type="button" :disabled="wallpaperBusy" @click="fileInput?.click()">{{ wallpaperBusy ? '处理中…' : '更换锁屏壁纸' }}</button>
      <button v-if="auth.wallpaperUrl" class="ghost-button" type="button" :disabled="wallpaperBusy" @click="remove">恢复默认壁纸</button>
      <button v-if="['pending', 'error'].includes(store.cloudSync.status)" class="ghost-button" type="button" @click="store.retryPendingSnapshot()">重试同步</button>
      <button class="ghost-button" type="button" @click="auth.lock('manual')">锁屏</button>
      <button class="ghost-button" type="button" @click="logout">退出登录</button>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { useOvertimeStore } from '../stores/overtime'

const auth = useAuthStore()
const store = useOvertimeStore()
const fileInput = ref(null)
const wallpaperBusy = ref(false)
const syncText = computed(() => ({ idle: '尚未同步', loading: '加载云端数据…', synced: '云端已同步', syncing: '正在同步…', pending: '等待同步', offline: '离线暂存', conflict: '发现版本冲突', error: '同步失败' }[store.cloudSync.status] || store.cloudSync.status))
const syncTone = computed(() => store.cloudSync.status === 'synced' ? 'success' : ['conflict', 'error'].includes(store.cloudSync.status) ? 'danger' : 'muted')

async function upload(event) {
  const [file] = event.target.files || []
  event.target.value = ''
  if (!file) return
  wallpaperBusy.value = true
  try {
    await auth.uploadWallpaper(file)
    ElMessage.success('锁屏壁纸已更新。')
  } catch (error) {
    ElMessage.error(error.message || '壁纸上传失败。')
  } finally {
    wallpaperBusy.value = false
  }
}

async function remove() {
  wallpaperBusy.value = true
  try {
    await auth.removeWallpaper()
    ElMessage.success('已恢复默认锁屏壁纸。')
  } catch (error) {
    ElMessage.error(error.message || '操作失败。')
  } finally {
    wallpaperBusy.value = false
  }
}

async function logout() {
  if (['pending', 'offline', 'syncing', 'conflict'].includes(store.cloudSync.status)) {
    try {
      await ElMessageBox.confirm('当前账号还有未同步数据，退出后数据会保留在此设备并在下次登录后重试。确认退出吗？', '退出登录')
    } catch { return }
  }
  await auth.signOut('manual')
}
</script>

<style scoped>
.account-panel { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 20px; border: 1px solid var(--border); border-radius: 20px; background: var(--panel); box-shadow: var(--shadow); }
.account-panel > div:first-child { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.account-label { width: 100%; margin: 0; color: var(--muted); font-size: .82rem; }
.sync-state { padding: 4px 9px; color: var(--muted); border-radius: 999px; background: var(--surface); font-size: .78rem; font-weight: 800; }
.sync-state.is-success { color: var(--accent); }
.sync-state.is-danger { color: #d64550; }
.account-actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.account-actions button { height: 38px; padding: 0 12px; }
@media (max-width: 820px) { .account-panel { align-items: stretch; flex-direction: column; } .account-actions { justify-content: stretch; } .account-actions button { flex: 1 1 140px; } }
</style>
