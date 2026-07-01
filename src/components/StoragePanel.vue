<template>
  <section class="storage-panel">
    <div class="storage-copy">
      <div class="storage-heading">
        <span class="storage-status-pill" :class="`is-${statusTone}`">
          <span class="status-dot" aria-hidden="true"></span>
          {{ statusBadgeText }}
        </span>
        <el-tooltip content="如何永久保存数据？" placement="top">
          <button
            class="storage-help-link"
            type="button"
            aria-label="如何永久保存数据？"
            @click="helpOpen = true"
          >
            <el-icon>
              <QuestionFilled />
            </el-icon>
            <span>保存说明</span>
          </button>
        </el-tooltip>
      </div>
      <h3>{{ statusTitle }}</h3>
      <p>{{ statusDescription }}</p>
      <p v-if="storage.error" class="storage-error">{{ storage.error }}</p>
    </div>

    <div class="storage-actions">
      <button
        :class="hasFile ? 'ghost-button storage-created-button' : 'primary-button'"
        type="button"
        :disabled="isBusy || !storage.supported || hasFile"
        @click="$emit('create-file')"
      >
        {{ hasFile ? 'JSON 已绑定' : '新建 JSON 文件' }}
      </button>
      <button
        class="ghost-button"
        type="button"
        :disabled="isBusy || !storage.supported"
        @click="$emit('open-file')"
      >
        打开 JSON 文件
      </button>
      <button
        class="ghost-button"
        type="button"
        :disabled="isBusy || !hasFile"
        @click="$emit('delete-file')"
      >
        解除绑定
      </button>
    </div>

    <el-dialog
      v-model="helpOpen"
      title="如何永久保存数据？"
      width="min(560px, 92vw)"
      class="storage-help-dialog"
      append-to-body
      destroy-on-close
      :close-on-press-escape="true"
    >
      <div class="storage-help-content">
        <p>
          新建或打开 JSON 文件后，之后保存记录会自动写入这份文件；桌面端和支持文件访问的网页端可以绑定同一个文件。
        </p>
        <ol>
          <li>首次使用：点击“新建 JSON 文件”，选择一个安全的位置保存。</li>
          <li>已有备份：点击“打开 JSON 文件”，确认预览后自动合并并绑定。</li>
          <li>日常使用：保存记录、导入数据、修改设置后会自动同步，无需手动同步。</li>
          <li>不再绑定：点击“解除绑定”，不会删除电脑上的文件。</li>
        </ol>
      </div>
      <template #footer>
        <button class="primary-button" type="button" @click="helpOpen = false">知道了</button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { QuestionFilled } from '@element-plus/icons-vue'

const props = defineProps({
  storage: {
    type: Object,
    required: true,
  },
})

defineEmits([
  'create-file',
  'open-file',
  'delete-file',
])

const isBusy = computed(() => props.storage.status === 'checking' || props.storage.status === 'syncing')
const hasFile = computed(() => Boolean(props.storage.fileName))
const helpOpen = ref(false)
const isDesktop = computed(() => props.storage.kind === 'desktop')
const fileLabel = computed(() => props.storage.filePath || props.storage.fileName)

const statusTone = computed(() => {
  if (!props.storage.supported || props.storage.status === 'unsupported') return 'muted'
  if (props.storage.status === 'ready') return 'ready'
  if (props.storage.status === 'syncing' || props.storage.status === 'checking') return 'busy'
  if (props.storage.status === 'needs-permission' || props.storage.status === 'error') return 'warning'
  return 'muted'
})

const statusBadgeText = computed(() => {
  if (!props.storage.supported || props.storage.status === 'unsupported') return isDesktop.value ? '仅应用缓存' : '仅浏览器缓存'
  if (props.storage.status === 'checking') return '检查中'
  if (props.storage.status === 'syncing') return '同步中'
  if (props.storage.status === 'ready') return isDesktop.value ? '桌面 JSON 已绑定' : '网页 JSON 已绑定'
  if (props.storage.status === 'needs-permission') return '需要授权'
  if (props.storage.status === 'error') return '同步异常'
  return '未绑定 JSON'
})

const statusTitle = computed(() => {
  if (!props.storage.supported || props.storage.status === 'unsupported') {
    return isDesktop.value ? '当前使用应用缓存' : '当前使用浏览器缓存'
  }

  if (props.storage.status === 'checking') return '正在检查数据文件'
  if (props.storage.status === 'syncing') return '正在同步 JSON 文件'
  if (props.storage.status === 'ready') return `已绑定 ${fileLabel.value}`
  if (props.storage.status === 'needs-permission') return `需要重新打开 ${fileLabel.value}`
  if (props.storage.status === 'error') return 'JSON 文件同步异常'
  return isDesktop.value ? '当前使用应用缓存' : '当前使用浏览器缓存'
})

const statusDescription = computed(() => {
  if (!props.storage.supported || props.storage.status === 'unsupported') {
    return isDesktop.value
      ? '当前应用无法直接读写本机文件，数据会暂存在应用缓存中。'
      : '当前浏览器不支持直接读写本机文件，数据会保存在浏览器缓存中，请继续使用 Excel 导出或 Excel/CSV 导入备份。'
  }

  if (props.storage.status === 'ready') {
    return props.storage.lastSyncedAt
      ? `已同步到本机 JSON 文件，最近同步时间：${props.storage.lastSyncedAt}`
      : '已从本机 JSON 文件加载数据，桌面端和网页端可通过同一个文件共享。'
  }

  if (props.storage.status === 'needs-permission') {
    return '浏览器还记得这个文件，但需要你通过“打开 JSON 文件”重新选择后才能继续读取和写入。'
  }

  if (props.storage.status === 'error') {
    return '当前数据仍已保存到浏览器缓存。请重新打开 JSON 文件，或删除当前绑定后继续使用浏览器缓存。'
  }

  if (props.storage.status === 'syncing') {
    return '正在写入本机 JSON 文件，同时也会保留浏览器缓存。'
  }

  return '建议新建或打开一个 JSON 文件作为主备份；应用缓存只用于快速启动和兜底恢复。'
})
</script>

<style scoped>
.storage-panel {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  padding: 18px 20px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 24px;
  box-shadow: var(--shadow);
}

.storage-copy {
  min-width: 0;
}

.storage-heading {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 0 0 8px;
  flex-wrap: wrap;
}

.storage-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 28px;
  padding: 0 10px;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 800;
  border: 1px solid color-mix(in srgb, var(--border) 86%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface) 78%, transparent);
}

.storage-status-pill.is-ready {
  color: color-mix(in srgb, var(--accent) 62%, var(--text));
  border-color: color-mix(in srgb, var(--accent) 32%, var(--border));
  background: color-mix(in srgb, var(--accent-soft) 58%, var(--surface));
}

.storage-status-pill.is-busy {
  color: color-mix(in srgb, var(--brand) 62%, var(--text));
  border-color: color-mix(in srgb, var(--brand) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-soft) 54%, var(--surface));
}

.storage-status-pill.is-warning {
  color: color-mix(in srgb, var(--warning) 58%, var(--text));
  border-color: color-mix(in srgb, var(--warning) 36%, var(--border));
  background: color-mix(in srgb, var(--warning-soft) 48%, var(--surface));
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 12%, transparent);
}

.storage-help-link {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  gap: 5px;
  padding: 0 2px;
  color: var(--muted);
  font-size: 0.84rem;
  font-weight: 700;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.storage-help-link:hover,
.storage-help-link:focus-visible {
  color: var(--brand);
  outline: none;
}

.storage-copy p {
  color: var(--muted);
}

.storage-copy h3 {
  margin: 0;
  color: var(--text);
  font-size: 1.08rem;
  line-height: 1.35;
}

.storage-copy p {
  margin: 8px 0 0;
  line-height: 1.6;
}

.storage-error {
  color: #d64550;
}

.storage-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.storage-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.storage-actions .storage-created-button:disabled {
  color: var(--brand-strong);
  border-color: color-mix(in srgb, var(--brand) 38%, var(--border));
  background: color-mix(in srgb, var(--brand-soft) 45%, transparent);
  opacity: 0.9;
}

.storage-help-content {
  display: grid;
  gap: 14px;
  color: var(--muted);
  line-height: 1.75;
}

.storage-help-content p {
  margin: 0;
}

.storage-help-content ol {
  display: grid;
  gap: 10px;
  margin: 0;
  padding-left: 22px;
  color: var(--text);
}

.storage-help-content li::marker {
  color: var(--brand-strong);
  font-weight: 800;
}

:global(.storage-help-dialog .el-dialog__footer) {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 820px) {
  .storage-panel {
    align-items: stretch;
    flex-direction: column;
  }

  .storage-actions {
    justify-content: stretch;
  }

  .storage-actions button {
    flex: 1 1 160px;
  }
}
</style>
