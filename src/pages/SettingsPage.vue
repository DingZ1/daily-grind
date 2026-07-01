<template>
  <DefaultLayout>
    <main class="settings-shell">
      <section class="settings-heading">
        <p>设置</p>
        <h1>数据与口径</h1>
      </section>

      <StoragePanel
        :storage="store.storage"
        @create-file="createDataFile"
        @open-file="openDataFile"
        @delete-file="deleteDataFile"
      />

      <section class="settings-grid">
        <article class="settings-card">
          <div class="card-head">
            <p>工作口径</p>
            <h2>标准工作时间</h2>
          </div>
          <div class="controls controls-three">
            <label class="control-item">
              <span>标准上班</span>
              <el-time-select
                :model-value="store.settings.workdayStart"
                start="06:00"
                step="00:30"
                end="12:00"
                @update:model-value="updateSetting('workdayStart', $event)"
              />
            </label>
            <label class="control-item">
              <span>标准下班</span>
              <el-time-select
                :model-value="store.settings.workdayEnd"
                start="16:00"
                step="00:30"
                end="22:00"
                @update:model-value="updateSetting('workdayEnd', $event)"
              />
            </label>
            <div class="control-item">
              <span>基准工时</span>
              <div class="readonly-value">
                {{ store.settings.workdayStart }} - {{ store.settings.workdayEnd }}
              </div>
            </div>
          </div>
        </article>

        <article class="settings-card">
          <div class="card-head">
            <p>界面</p>
            <h2>主题模式</h2>
          </div>
          <label class="control-item">
            <span>当前主题</span>
            <el-select :model-value="theme" @update:model-value="setTheme">
              <el-option label="跟随系统" value="auto" />
              <el-option label="浅色" value="light" />
              <el-option label="柔和" value="soft" />
              <el-option label="暗色" value="dark" />
            </el-select>
          </label>
        </article>
      </section>

      <el-dialog
        v-model="jsonPreviewOpen"
        title="打开 JSON 文件"
        width="min(760px, 92vw)"
        class="json-preview-dialog"
        append-to-body
        destroy-on-close
        :close-on-click-modal="false"
        :close-on-press-escape="true"
        @closed="clearJsonPreview"
      >
        <div v-if="pendingJsonPreview" class="json-preview">
          <p class="json-preview-tip">
            确认后会自动合并当前缓存和这个 JSON 文件，并把它作为后续同步文件。
          </p>
          <dl class="json-preview-meta">
            <template v-for="item in jsonPreviewMeta" :key="item.label">
              <dt>{{ item.label }}</dt>
              <dd>{{ item.value }}</dd>
            </template>
          </dl>
          <div class="json-preview-content">
            <p>迁移后 JSON 预览</p>
            <pre>{{ pendingJsonPreview.rawText }}</pre>
          </div>
        </div>
        <template #footer>
          <button
            class="ghost-button"
            type="button"
            :disabled="confirmingJsonOpen"
            @click="jsonPreviewOpen = false"
          >
            取消
          </button>
          <button
            class="primary-button"
            type="button"
            :disabled="confirmingJsonOpen"
            @click="confirmOpenDataFile"
          >
            {{ confirmingJsonOpen ? '正在合并...' : '确认合并并打开' }}
          </button>
        </template>
      </el-dialog>

      <el-dialog
        v-model="deleteJsonOpen"
        title="解除 JSON 绑定"
        width="min(520px, 92vw)"
        class="delete-json-dialog"
        append-to-body
        destroy-on-close
        :close-on-click-modal="false"
        :close-on-press-escape="true"
      >
        <div class="delete-json-content">
          <p class="delete-json-title">确认解除当前 JSON 文件绑定吗？</p>
          <p>
            这不会删除电脑上的 JSON 文件，只会让当前应用不再自动写入
            <strong>{{ boundFileLabel }}</strong>。
          </p>
          <p>
            当前数据仍会保存在本应用缓存中，之后也可以重新打开同一个 JSON 文件继续共享。
          </p>
        </div>
        <template #footer>
          <button
            class="ghost-button"
            type="button"
            :disabled="deletingJson"
            @click="deleteJsonOpen = false"
          >
            取消
          </button>
          <button
            class="danger-button"
            type="button"
            :disabled="deletingJson"
            @click="confirmDeleteDataFile"
          >
            {{ deletingJson ? '正在解除...' : '确认解除绑定' }}
          </button>
        </template>
      </el-dialog>
    </main>
  </DefaultLayout>
</template>

<script setup>
import { computed, ref, shallowRef } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import StoragePanel from '../components/StoragePanel.vue'
import { useTheme } from '../composables/useTheme'
import { useOvertimeStore } from '../stores/overtime'

const store = useOvertimeStore()
const { theme, setTheme } = useTheme()

const jsonPreviewOpen = ref(false)
const pendingJsonPreview = shallowRef(null)
const confirmingJsonOpen = ref(false)
const deleteJsonOpen = ref(false)
const deletingJson = ref(false)

const boundFileLabel = computed(() => store.storage.filePath || store.storage.fileName || '当前 JSON 文件')
const jsonPreviewMeta = computed(() => {
  if (!pendingJsonPreview.value) return []

  const items = [
    {
      label: '文件名',
      value: pendingJsonPreview.value.fileName,
    },
    {
      label: '保存时间',
      value: pendingJsonPreview.value.savedAt
        ? dayjs(pendingJsonPreview.value.savedAt).format('YYYY-MM-DD HH:mm:ss')
        : '未知',
    },
    {
      label: '记录数量',
      value: `${pendingJsonPreview.value.recordCount} 条`,
    },
    {
      label: '季度目标',
      value: `${pendingJsonPreview.value.quarterTargetCount} 个`,
    },
    {
      label: '数据版本',
      value: pendingJsonPreview.value.version || '未知',
    },
  ]

  if (pendingJsonPreview.value.filePath) {
    items.splice(1, 0, {
      label: '文件位置',
      value: pendingJsonPreview.value.filePath,
    })
  }

  return items
})

function isCanceledAction(error) {
  return error?.name === 'AbortError' || error === 'cancel' || error === 'close'
}

function updateSetting(field, value) {
  if (!value) return
  store.updateSettings({ [field]: value })
}

async function createDataFile() {
  try {
    const result = await store.createStorageFile()
    ElMessage.success(`已保存到 ${result.fileName}`)
  } catch (error) {
    if (isCanceledAction(error)) return
    ElMessage.error(error.message || '创建 JSON 数据文件失败。')
  }
}

async function openDataFile() {
  try {
    pendingJsonPreview.value = await store.previewStorageFile()
    jsonPreviewOpen.value = true
  } catch (error) {
    if (isCanceledAction(error)) return
    ElMessage.error(error.message || '打开 JSON 数据文件失败。')
  }
}

async function confirmOpenDataFile() {
  if (!pendingJsonPreview.value) return

  confirmingJsonOpen.value = true
  try {
    const result = await store.openStorageFile(pendingJsonPreview.value)
    pendingJsonPreview.value = null
    jsonPreviewOpen.value = false
    ElMessage.success(`已合并并打开 ${result.fileName}`)
  } catch (error) {
    if (isCanceledAction(error)) return
    ElMessage.error(error.message || '打开 JSON 数据文件失败。')
  } finally {
    confirmingJsonOpen.value = false
  }
}

function clearJsonPreview() {
  pendingJsonPreview.value = null
}

async function deleteDataFile() {
  if (!store.storage.fileName) {
    ElMessage.warning('当前还没有绑定 JSON 文件。')
    return
  }

  deleteJsonOpen.value = true
}

async function confirmDeleteDataFile() {
  deletingJson.value = true
  try {
    await store.disconnectStorageFile()
    deleteJsonOpen.value = false
    ElMessage.success('已解除 JSON 绑定，当前数据仍保留在应用缓存中。')
  } catch (error) {
    ElMessage.error(error.message || '解除 JSON 绑定失败。')
  } finally {
    deletingJson.value = false
  }
}
</script>

<style scoped>
.settings-shell {
  display: grid;
  gap: 22px;
}

.settings-heading {
  display: grid;
  gap: 6px;
}

.settings-heading p,
.card-head p,
.control-item span,
.json-preview-tip,
.json-preview-content p {
  color: var(--muted);
}

.settings-heading p,
.card-head p {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.settings-heading h1,
.card-head h2 {
  margin: 0;
  color: var(--text);
}

.settings-heading h1 {
  font-size: clamp(1.8rem, 4vw, 2.5rem);
}

.settings-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
  gap: 18px;
}

.settings-card {
  display: grid;
  gap: 18px;
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--panel);
  box-shadow: var(--shadow);
}

.card-head {
  display: grid;
  gap: 6px;
}

.controls {
  display: grid;
  gap: 14px;
}

.controls-three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.control-item {
  display: grid;
  gap: 8px;
}

.readonly-value {
  min-height: 42px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-radius: 14px;
  color: var(--text);
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  box-shadow: 0 0 0 1px var(--border) inset;
}

:deep(.el-input__wrapper),
:deep(.el-select__wrapper) {
  min-height: 42px;
  border-radius: 14px;
  background: var(--surface);
  box-shadow: 0 0 0 1px var(--border) inset;
}

.json-preview {
  display: grid;
  gap: 16px;
}

.json-preview-tip {
  margin: 0;
  line-height: 1.7;
}

.json-preview-meta {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 10px 14px;
  margin: 0;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--brand-soft) 32%, transparent);
}

.json-preview-meta dt {
  color: var(--muted);
}

.json-preview-meta dd {
  min-width: 0;
  margin: 0;
  color: var(--text);
  font-weight: 700;
  word-break: break-all;
}

.json-preview-content {
  display: grid;
  gap: 8px;
}

.json-preview-content p {
  margin: 0;
}

.json-preview-content pre {
  max-height: 320px;
  margin: 0;
  padding: 14px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #f8fafc;
  color: #172033;
  font-size: 0.82rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

:global(.json-preview-dialog .el-dialog__footer),
:global(.delete-json-dialog .el-dialog__footer) {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.delete-json-content {
  display: grid;
  gap: 10px;
  color: var(--muted);
  line-height: 1.7;
}

.delete-json-content p {
  margin: 0;
}

.delete-json-content strong {
  color: var(--text);
  word-break: break-all;
}

.delete-json-title {
  color: var(--text);
  font-size: 1rem;
  font-weight: 800;
}

@media (max-width: 980px) {
  .settings-grid,
  .controls-three {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .json-preview-meta {
    grid-template-columns: 1fr;
  }
}
</style>
