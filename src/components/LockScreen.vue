<template>
  <div class="lock-screen" :style="wallpaperStyle">
    <div class="lock-overlay"></div>
    <section class="lock-card">
      <div class="lock-icon" aria-hidden="true">🔒</div>
      <p class="lock-label">Daily Grind 已锁定</p>
      <h1>{{ auth.email }}</h1>
      <p v-if="!auth.online" class="network-warning">网络已断开。恢复网络后才能验证密码并解锁。</p>
      <p v-else>输入登录密码重新验证身份。</p>
      <form @submit.prevent="unlock">
        <input v-model="password" type="password" autocomplete="current-password" placeholder="登录密码" :disabled="!auth.online || submitting" autofocus />
        <button class="primary-button" type="submit" :disabled="!auth.online || !password || submitting">
          {{ submitting ? '验证中…' : '解锁' }}
        </button>
      </form>
      <button class="lock-signout" type="button" @click="signOut">退出此账号</button>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const password = ref('')
const submitting = ref(false)
const wallpaperStyle = computed(() => auth.wallpaperUrl ? { backgroundImage: `url(${auth.wallpaperUrl})` } : {})

async function unlock() {
  submitting.value = true
  try {
    await auth.unlock(password.value)
    password.value = ''
  } catch (error) {
    ElMessage.error(error.message || '解锁失败。')
  } finally {
    submitting.value = false
  }
}

function signOut() {
  void auth.signOut('locked-signout')
}
</script>

<style scoped>
.lock-screen { position: fixed; z-index: 9999; inset: 0; display: grid; place-items: center; padding: 24px; background: radial-gradient(circle at 20% 20%, rgba(255,139,97,.38), transparent 38%), linear-gradient(145deg, #172238, #263e5e 55%, #643b46); background-position: center; background-size: cover; }
.lock-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(7,16,31,.38), rgba(7,16,31,.72)); backdrop-filter: blur(3px); }
.lock-card { position: relative; width: min(430px, 100%); padding: 32px; text-align: center; color: #fff; border: 1px solid rgba(255,255,255,.2); border-radius: 28px; background: rgba(12,24,43,.72); box-shadow: 0 30px 80px rgba(0,0,0,.34); backdrop-filter: blur(20px); }
.lock-icon { font-size: 2rem; }
.lock-label { margin: 12px 0 6px; color: rgba(255,255,255,.72); font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.lock-card h1 { margin: 0; font-size: 1.35rem; word-break: break-all; }
.lock-card > p:not(.lock-label) { color: rgba(255,255,255,.76); }
.network-warning { color: #ffd19c !important; }
.lock-card form { display: grid; gap: 12px; margin-top: 22px; }
.lock-card input { height: 46px; padding: 0 14px; color: #fff; border: 1px solid rgba(255,255,255,.24); border-radius: 13px; outline: none; background: rgba(255,255,255,.1); }
.lock-card input::placeholder { color: rgba(255,255,255,.55); }
.lock-signout { margin-top: 18px; color: rgba(255,255,255,.75); border: 0; background: transparent; cursor: pointer; }
</style>
