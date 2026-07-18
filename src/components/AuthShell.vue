<template>
  <main class="auth-page">
    <section class="auth-card">
      <div class="auth-brand">
        <p>Daily Grind</p>
        <h1>{{ title }}</h1>
        <span>{{ subtitle }}</span>
      </div>
      <slot />
    </section>
  </main>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
})
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.auth-card {
  width: min(440px, 100%);
  padding: 30px;
  border: 1px solid var(--border);
  border-radius: 28px;
  background: color-mix(in srgb, var(--panel) 94%, transparent);
  box-shadow: var(--shadow);
  backdrop-filter: blur(18px);
}

.auth-brand {
  margin-bottom: 24px;
}

.auth-brand p {
  margin: 0;
  color: var(--brand-strong);
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.auth-brand h1 {
  margin: 8px 0;
  font-size: 1.8rem;
}

.auth-brand span {
  color: var(--muted);
  line-height: 1.6;
}

:deep(.auth-form) {
  display: grid;
  gap: 16px;
}

:deep(.auth-form label) {
  display: grid;
  gap: 7px;
  color: var(--text);
  font-weight: 700;
}

:deep(.auth-form input) {
  width: 100%;
  height: 46px;
  padding: 0 14px;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 13px;
  outline: none;
  background: var(--surface);
}

:deep(.auth-form input:focus) {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 15%, transparent);
}

:deep(.auth-form button) {
  width: 100%;
}

:deep(.auth-links) {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
  font-size: 0.92rem;
}

:deep(.auth-links a) {
  color: var(--brand-strong);
  text-decoration: none;
}

:deep(.auth-message) {
  margin: 14px 0 0;
  padding: 12px;
  border-radius: 12px;
  color: var(--muted);
  background: var(--brand-soft);
}
</style>
