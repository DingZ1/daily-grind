import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from './pages/HomePage.vue'
import LoginPage from './pages/LoginPage.vue'
import RegisterPage from './pages/RegisterPage.vue'
import ForgotPasswordPage from './pages/ForgotPasswordPage.vue'
import ResetPasswordPage from './pages/ResetPasswordPage.vue'
import { useAuthStore } from './stores/auth'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomePage, meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: LoginPage, meta: { publicOnly: true } },
    { path: '/register', name: 'register', component: RegisterPage, meta: { publicOnly: true } },
    { path: '/forgot-password', name: 'forgot-password', component: ForgotPasswordPage, meta: { publicOnly: true } },
    { path: '/reset-password', name: 'reset-password', component: ResetPasswordPage },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.initializeAuth()

  if (auth.recoveryMode && to.name !== 'reset-password') {
    return { name: 'reset-password' }
  }
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.publicOnly && auth.isAuthenticated) {
    return { name: 'home' }
  }
})

export default router
