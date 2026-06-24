<template>
  <section class="storage-panel">
    <div class="storage-copy">
      <div class="storage-label-row">
        <el-tooltip content="如何永久保存数据？" placement="top">
          <button
            class="storage-help-button"
            type="button"
            aria-label="如何永久保存数据？"
            @click="helpOpen = true"
          >
            <el-icon>
              <QuestionFilled />
            </el-icon>
          </button>
        </el-tooltip>
        <p class="storage-label">数据保存</p>
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
        {{ hasFile ? '已新建 JSON' : '新建 JSON 文件' }}
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
        删除 JSON
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
          新建或打开 JSON 文件后，之后保存记录会自动写入这份文件；即使浏览器缓存被清理，也可以通过“打开 JSON 文件”恢复。
        </p>
        <ol>
          <li>首次使用：点击“新建 JSON 文件”，选择一个安全的位置保存。</li>
          <li>已有备份：点击“打开 JSON 文件”，确认预览后加载并绑定。</li>
          <li>日常使用：保存记录、导入数据、修改设置后会自动同步，无需手动同步。</li>
          <li>不再绑定：点击“删除 JSON”，只解除绑定，不会删除电脑上的文件。</li>
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

const statusTitle = computed(() => {
  if (!props.storage.supported || props.storage.status === 'unsupported') {
    return '当前使用浏览器缓存'
  }

  if (props.storage.status === 'checking') return '正在检查数据文件'
  if (props.storage.status === 'syncing') return '正在同步 JSON 文件'
  if (props.storage.status === 'ready') return `已绑定 ${props.storage.fileName}`
  if (props.storage.status === 'needs-permission') return `需要重新打开 ${props.storage.fileName}`
  if (props.storage.status === 'error') return 'JSON 文件同步异常'
  return '当前使用浏览器缓存'
})

const statusDescription = computed(() => {
  if (!props.storage.supported || props.storage.status === 'unsupported') {
    return '当前浏览器不支持直接读写本机文件，数据会保存在浏览器缓存中，请继续使用 Excel 导出或 Excel/CSV 导入备份。'
  }

  if (props.storage.status === 'ready') {
    return props.storage.lastSyncedAt
      ? `已同步到本机 JSON 文件，最近同步时间：${props.storage.lastSyncedAt}`
      : '已从本机 JSON 文件加载数据，后续修改会自动同步。'
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

  return '建议新建或打开一个 JSON 文件作为主备份；浏览器缓存只用于快速启动和兜底恢复。'
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

.storage-label-row {
  display: flex;
  gap: 7px;
  align-items: center;
  margin: 0 0 6px;
}

.storage-help-button {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--brand-strong);
  background: color-mix(in srgb, var(--brand-soft) 55%, transparent);
  border: 1px solid color-mix(in srgb, var(--brand) 36%, var(--border));
  border-radius: 50%;
  cursor: pointer;
}

.storage-help-button:hover,
.storage-help-button:focus-visible {
  color: #fff;
  background: var(--brand-strong);
  outline: none;
}

.storage-label,
.storage-copy p {
  color: var(--muted);
}

.storage-label {
  margin: 0;
  font-size: 0.84rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.storage-copy h3 {
  margin: 0;
  color: var(--text);
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
