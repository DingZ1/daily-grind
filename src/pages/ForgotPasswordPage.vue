<template>
  <AuthShell title="重置密码" subtitle="我们会向你的邮箱发送安全重置链接。">
    <form v-if="!sent" class="auth-form" @submit.prevent="submit">
      <label>邮箱<input v-model.trim="email" type="email" autocomplete="email" required /></label>
      <button class="primary-button" type="submit" :disabled="submitting">
        {{ submitting ? '发送中…' : '发送重置邮件' }}
      </button>
    </form>
    <p v-else class="auth-message">若该邮箱已注册，你将收到密码重置邮件。</p>
    <div class="auth-links"><router-link to="/login">返回登录</router-link></div>
  </AuthShell>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import AuthShell from '../components/AuthShell.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const email = ref('')
const submitting = ref(false)
const sent = ref(false)

async function submit() {
  submitting.value = true
  try {
    await auth.sendPasswordReset(email.value)
    sent.value = true
  } catch (error) {
    ElMessage.error(error.message || '发送失败。')
  } finally {
    submitting.value = false
  }
}
</script>
