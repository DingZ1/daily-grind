<template>
  <div class="layout-shell">
    <header class="app-header">
      <RouterLink class="brand-link" to="/">
        <span class="brand-mark">DG</span>
        <span>Daily Grind</span>
      </RouterLink>
      <nav class="app-nav" aria-label="主导航">
        <RouterLink to="/">主页</RouterLink>
        <RouterLink to="/settings">设置</RouterLink>
      </nav>
    </header>
    <slot />
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.layout-shell {
  min-height: 100vh;
  padding: 24px;
}

.app-header {
  position: sticky;
  z-index: 10;
  top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  max-width: 1480px;
  margin: 0 auto 22px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: color-mix(in srgb, var(--panel) 88%, transparent);
  box-shadow: var(--shadow);
  backdrop-filter: blur(16px);
}

.brand-link,
.app-nav a {
  text-decoration: none;
}

.brand-link {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
  font-weight: 900;
}

.brand-mark {
  display: inline-grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 12px;
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  font-size: 0.82rem;
  letter-spacing: 0.04em;
}

.app-nav {
  display: inline-flex;
  gap: 6px;
  padding: 4px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface) 82%, transparent);
}

.app-nav a {
  min-width: 72px;
  padding: 9px 14px;
  border-radius: 11px;
  color: var(--muted);
  font-weight: 800;
  text-align: center;
}

.app-nav a.router-link-active {
  color: #fff;
  background: linear-gradient(90deg, var(--brand), var(--brand-strong));
}

@media (max-width: 720px) {
  .layout-shell {
    padding: 16px;
  }

  .app-header {
    position: static;
    align-items: stretch;
    flex-direction: column;
  }

  .app-nav,
  .app-nav a {
    width: 100%;
  }
}
</style>
