<template>
  <AuthShell title="设置新密码" subtitle="新密码至少需要 8 位。">
    <form class="auth-form" @submit.prevent="submit">
      <label>新密码<input v-model="password" type="password" autocomplete="new-password" minlength="8" required /></label>
      <label>确认密码<input v-model="confirmation" type="password" autocomplete="new-password" required /></label>
      <button class="primary-button" type="submit" :disabled="submitting">
        {{ submitting ? '保存中…' : '保存新密码' }}
      </button>
    </form>
  </AuthShell>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AuthShell from '../components/AuthShell.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const password = ref('')
const confirmation = ref('')
const submitting = ref(false)

async function submit() {
  if (password.value !== confirmation.value) {
    ElMessage.error('两次输入的密码不一致。')
    return
  }
  submitting.value = true
  try {
    await auth.updatePassword(password.value)
    ElMessage.success('密码已更新。')
    await router.replace('/')
  } catch (error) {
    ElMessage.error(error.message || '密码更新失败。')
  } finally {
    submitting.value = false
  }
}
</script>
