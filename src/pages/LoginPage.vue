<template>
  <AuthShell title="欢迎回来" subtitle="登录后继续管理你的加班记录。">
    <form class="auth-form" @submit.prevent="submit">
      <label>邮箱<input v-model.trim="email" type="email" autocomplete="email" required /></label>
      <label>密码<input v-model="password" type="password" autocomplete="current-password" required /></label>
      <button class="primary-button" type="submit" :disabled="submitting">
        {{ submitting ? '登录中…' : '登录' }}
      </button>
    </form>
    <div class="auth-links">
      <router-link to="/register">创建账号</router-link>
      <router-link to="/forgot-password">忘记密码？</router-link>
    </div>
  </AuthShell>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AuthShell from '../components/AuthShell.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const email = ref('')
const password = ref('')
const submitting = ref(false)

async function submit() {
  submitting.value = true
  try {
    await auth.signIn(email.value, password.value)
    await router.replace(String(route.query.redirect || '/'))
  } catch (error) {
    ElMessage.error(error.message || '登录失败。')
  } finally {
    submitting.value = false
  }
}
</script>
