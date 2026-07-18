<template>
  <AuthShell title="创建账号" subtitle="使用邮箱注册，验证后即可登录。">
    <form v-if="!sent" class="auth-form" @submit.prevent="submit">
      <label>邮箱<input v-model.trim="email" type="email" autocomplete="email" required /></label>
      <label>密码<input v-model="password" type="password" autocomplete="new-password" minlength="8" required /></label>
      <label>确认密码<input v-model="confirmation" type="password" autocomplete="new-password" required /></label>
      <button class="primary-button" type="submit" :disabled="submitting">
        {{ submitting ? '注册中…' : '注册' }}
      </button>
    </form>
    <p v-else class="auth-message">验证邮件已发送至 {{ email }}，请完成验证后返回登录。</p>
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
const password = ref('')
const confirmation = ref('')
const submitting = ref(false)
const sent = ref(false)

async function submit() {
  if (password.value !== confirmation.value) {
    ElMessage.error('两次输入的密码不一致。')
    return
  }
  submitting.value = true
  try {
    await auth.signUp(email.value, password.value)
    sent.value = true
  } catch (error) {
    ElMessage.error(error.message || '注册失败。')
  } finally {
    submitting.value = false
  }
}
</script>
