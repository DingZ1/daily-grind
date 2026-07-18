import { defineStore } from 'pinia'
import { getAppRedirectUrl, isSupabaseConfigured, supabase } from '../services/supabase'
import {
  loadLockWallpaper,
  removeLockWallpaper,
  uploadLockWallpaper,
} from '../services/wallpaper'

const IDLE_TIMEOUT = 60 * 60 * 1000
const ACTIVITY_PREFIX = 'daily-grind-last-activity:'

let authSubscription = null
let idleTimer = null
let listenersStarted = false
let lastRecordedAt = 0

export const useAuthStore = defineStore('auth', {
  state: () => ({
    configured: isSupabaseConfigured,
    initialized: false,
    session: null,
    user: null,
    recoveryMode: false,
    locked: false,
    lockReason: '',
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    wallpaperUrl: '',
    signingOut: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
    email: (state) => state.user?.email || '',
  },
  actions: {
    async initializeAuth() {
      if (this.initialized) return
      if (!this.configured) {
        this.initialized = true
        return
      }

      const action = new URLSearchParams(window.location.search).get('auth_action')
      this.recoveryMode = action === 'recovery'

      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      this.applySession(data.session)

      if (!authSubscription) {
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          this.applySession(session)
          if (event === 'PASSWORD_RECOVERY') this.recoveryMode = true
        })
        authSubscription = listener.subscription
      }

      this.startSecurityListeners()
      if (!this.online && this.user) this.lock('offline')
      this.initialized = true
    },
    applySession(session) {
      const previousUserId = this.user?.id
      this.session = session
      this.user = session?.user || null

      if (!this.user) {
        this.locked = false
        this.lockReason = ''
        this.setWallpaperBlob(null)
        return
      }

      if (previousUserId !== this.user.id) {
        this.recordActivity(true)
        void this.refreshWallpaper()
      }
    },
    async signUp(email, password) {
      if (password.length < 8) throw new Error('密码至少需要 8 位。')
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: getAppRedirectUrl() },
      })
      if (error) throw error
      return data
    },
    async signIn(email, password) {
      if (!this.online) throw new Error('当前网络不可用，无法登录。')
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw error
      if (!data.user?.email_confirmed_at) {
        await supabase.auth.signOut({ scope: 'local' })
        throw new Error('请先完成邮箱验证后再登录。')
      }
      this.applySession(data.session)
      this.recordActivity(true)
      return data
    },
    async reauthenticate(password) {
      if (!this.online) throw new Error('恢复网络后才能验证密码并解锁。')
      const { data, error } = await supabase.auth.signInWithPassword({
        email: this.email,
        password,
      })
      if (error) throw new Error('密码验证失败，请重试。')
      if (data.user?.id !== this.user?.id) throw new Error('账号不匹配，无法解锁。')
      this.applySession(data.session)
      return data
    },
    async signOut(reason = 'manual') {
      if (this.signingOut) return
      this.signingOut = true
      try {
        if (supabase) {
          await supabase.auth.signOut({ scope: 'local' })
        }
      } finally {
        this.session = null
        this.user = null
        this.locked = false
        this.lockReason = ''
        this.signingOut = false
        window.dispatchEvent(new CustomEvent('daily-grind:signed-out', { detail: { reason } }))
      }
    },
    async sendPasswordReset(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getAppRedirectUrl('recovery'),
      })
      if (error) throw error
    },
    async updatePassword(password) {
      if (password.length < 8) throw new Error('密码至少需要 8 位。')
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      this.recoveryMode = false
      const url = new URL(window.location.href)
      url.searchParams.delete('auth_action')
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    },
    lock(reason = 'manual') {
      if (!this.user) return
      this.locked = true
      this.lockReason = reason
    },
    async unlock(password) {
      await this.reauthenticate(password)
      this.locked = false
      this.lockReason = ''
      this.recordActivity(true)
      window.dispatchEvent(new CustomEvent('daily-grind:unlocked'))
    },
    recordActivity(force = false) {
      if (!this.user || this.locked) return
      const now = Date.now()
      if (!force && now - lastRecordedAt < 1000) return
      lastRecordedAt = now
      localStorage.setItem(`${ACTIVITY_PREFIX}${this.user.id}`, String(now))
    },
    startIdleMonitor(timeout = IDLE_TIMEOUT) {
      if (idleTimer) clearInterval(idleTimer)
      idleTimer = setInterval(() => {
        if (!this.user) return
        const raw = localStorage.getItem(`${ACTIVITY_PREFIX}${this.user.id}`)
        const lastActivity = Number(raw || Date.now())
        if (Date.now() - lastActivity >= timeout) void this.signOut('idle')
      }, 15000)
    },
    startSecurityListeners() {
      if (listenersStarted) return
      listenersStarted = true
      const activityEvents = ['keydown', 'pointerdown', 'wheel', 'touchstart']
      activityEvents.forEach((event) => window.addEventListener(event, () => this.recordActivity(), { passive: true }))
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.recordActivity()
      })
      window.addEventListener('offline', () => {
        this.online = false
        this.lock('offline')
      })
      window.addEventListener('online', () => {
        this.online = true
      })
      window.addEventListener('daily-grind:connectivity-lost', () => {
        this.online = navigator.onLine
        this.lock('offline')
      })
      this.startIdleMonitor()
    },
    setWallpaperBlob(blob) {
      if (this.wallpaperUrl) URL.revokeObjectURL(this.wallpaperUrl)
      this.wallpaperUrl = blob ? URL.createObjectURL(blob) : ''
    },
    async refreshWallpaper() {
      if (!this.user) return
      const blob = await loadLockWallpaper(this.user.id)
      this.setWallpaperBlob(blob)
    },
    async uploadWallpaper(file) {
      const blob = await uploadLockWallpaper(this.user.id, file)
      this.setWallpaperBlob(blob)
    },
    async removeWallpaper() {
      await removeLockWallpaper(this.user.id)
      this.setWallpaperBlob(null)
    },
  },
})
