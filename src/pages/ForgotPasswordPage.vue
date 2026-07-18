<template>
  <AuthShell title="重置密码" subtitle="我们会向你的邮箱发送安全重置链接。">
    <form class="auth-form" @submit.prevent="submit">
      <label>邮箱<input v-model.trim="email" type="email" autocomplete="email" required /></label>
      <button class="primary-button" type="submit" :disabled="submitting || cooldownSeconds > 0">
        {{ submitButtonText }}
      </button>
      <p v-if="cooldownSeconds > 0" class="auth-cooldown" role="status">
        邮件已发送，{{ cooldownSeconds }} 秒后可以重新发送。请只使用最新一封邮件中的链接。
      </p>
    </form>
    <p v-if="sent" class="auth-message">若该邮箱已注册，你将收到密码重置邮件。</p>
    <div class="auth-links"><router-link to="/login">返回登录</router-link></div>
  </AuthShell>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import AuthShell from '../components/AuthShell.vue'
import { useAuthStore } from '../stores/auth'

const RESET_COOLDOWN_MS = 60 * 1000
const RESET_COOLDOWN_KEY = 'daily-grind-password-reset-available-at'

const auth = useAuthStore()
const email = ref('')
const submitting = ref(false)
const sent = ref(false)
const availableAt = ref(0)
const now = ref(Date.now())
let cooldownTimer = null

const cooldownSeconds = computed(() => Math.max(0, Math.ceil((availableAt.value - now.value) / 1000)))
const submitButtonText = computed(() => {
  if (submitting.value) return '发送中…'
  if (cooldownSeconds.value > 0) return `${cooldownSeconds.value} 秒后可重新发送`
  return sent.value ? '重新发送重置邮件' : '发送重置邮件'
})

function readCooldown() {
  const stored = Number(localStorage.getItem(RESET_COOLDOWN_KEY) || 0)
  availableAt.value = Number.isFinite(stored) ? stored : 0
  now.value = Date.now()
  if (availableAt.value <= now.value) localStorage.removeItem(RESET_COOLDOWN_KEY)
}

function startCooldown() {
  availableAt.value = Date.now() + RESET_COOLDOWN_MS
  now.value = Date.now()
  localStorage.setItem(RESET_COOLDOWN_KEY, String(availableAt.value))
}

function handleStorage(event) {
  if (event.key === RESET_COOLDOWN_KEY) readCooldown()
}

onMounted(() => {
  readCooldown()
  cooldownTimer = window.setInterval(() => {
    now.value = Date.now()
    if (availableAt.value && availableAt.value <= now.value) {
      availableAt.value = 0
      localStorage.removeItem(RESET_COOLDOWN_KEY)
    }
  }, 1000)
  window.addEventListener('storage', handleStorage)
})

onBeforeUnmount(() => {
  if (cooldownTimer) window.clearInterval(cooldownTimer)
  window.removeEventListener('storage', handleStorage)
})

async function submit() {
  readCooldown()
  if (cooldownSeconds.value > 0) {
    ElMessage.warning(`发送过于频繁，请等待 ${cooldownSeconds.value} 秒后再试。`)
    return
  }

  submitting.value = true
  try {
    await auth.sendPasswordReset(email.value)
    sent.value = true
    startCooldown()
  } catch (error) {
    if (/rate limit|too many|seconds|频繁/i.test(error?.message || '')) {
      startCooldown()
      ElMessage.warning('发送过于频繁，请等待 60 秒后再试。')
    } else {
      ElMessage.error(error.message || '发送失败。')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.auth-cooldown {
  margin: -4px 0 0;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.6;
}
</style>
