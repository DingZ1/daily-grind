<template>
  <div v-if="!auth.configured" class="configuration-error">
    <div>
      <p class="eyebrow">Daily Grind</p>
      <h1>Supabase 尚未配置</h1>
      <p>请在本地环境或 GitHub Pages 构建变量中设置以下内容：</p>
      <code>VITE_SUPABASE_URL</code>
      <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>
      <p>配置步骤和数据库迁移说明请查看 README。</p>
    </div>
  </div>
  <template v-else>
    <router-view />
    <LockScreen v-if="auth.isAuthenticated && auth.locked" />
  </template>
</template>

<script setup>
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LockScreen from './components/LockScreen.vue'
import { useAuthStore } from './stores/auth'
import { useOvertimeStore } from './stores/overtime'

const auth = useAuthStore()
const overtime = useOvertimeStore()
const router = useRouter()
const route = useRoute()

watch(() => auth.isAuthenticated, (authenticated) => {
  if (!authenticated) {
    overtime.clearUserState()
    if (route.meta.requiresAuth) void router.replace({ name: 'login' })
  }
})
</script>

<style scoped>
.configuration-error {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.configuration-error > div {
  width: min(620px, 100%);
  padding: 32px;
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--panel);
  box-shadow: var(--shadow);
}

.configuration-error h1 {
  margin: 8px 0 14px;
}

.configuration-error p {
  color: var(--muted);
}

.configuration-error code {
  display: block;
  margin: 8px 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--surface);
}

.eyebrow {
  margin: 0;
  color: var(--brand) !important;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
</style>
