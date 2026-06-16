<template>
  <div class="layout-shell">
    <slot />
  </div>
</template>

<style scoped>
.layout-shell {
  min-height: 100vh;
  padding: 24px;
}

@media (max-width: 720px) {
  .layout-shell {
    padding: 16px;
  }
}
</style>
