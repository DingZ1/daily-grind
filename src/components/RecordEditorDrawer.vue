<template>
  <el-drawer
    :model-value="open"
    size="460px"
    class="record-drawer"
    :with-header="false"
    destroy-on-close
    @close="$emit('close')"
  >
    <div class="drawer-header">
      <div>
        <p class="eyebrow">{{ dayKindLabel }}</p>
        <h2>{{ date }}</h2>
      </div>
      <el-tag round effect="plain">{{ hasRecord ? '编辑记录' : '新增记录' }}</el-tag>
    </div>

    <el-alert class="drawer-alert" type="info" :closable="false" show-icon>
      <template #title>
        工作日从 19:00 后开始记加班，所有日期都会扣除 12:00-13:30 和 18:00-19:00。
      </template>
    </el-alert>

    <el-alert v-if="restNotice" class="drawer-alert rest-alert" type="warning" :closable="false" show-icon>
      <template #title>
        {{ restNotice }}
      </template>
    </el-alert>

    <el-form label-position="top" class="drawer-form" @submit.prevent="handleSubmit">
      <div class="time-grid">
        <el-form-item label="开始时间">
          <el-time-select
            v-model="localForm.startTime"
            start="08:30"
            step="00:30"
            end="24:00"
            placeholder="选择开始时间"
          />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-time-select
            v-model="localForm.endTime"
            :min-time="localForm.startTime || undefined"
            start="08:30"
            step="00:30"
            end="24:00"
            placeholder="选择结束时间"
          />
        </el-form-item>
      </div>

      <el-form-item label="备注">
        <el-input
          v-model="localForm.note"
          type="textarea"
          :rows="4"
          resize="none"
          placeholder="比如：项目提测、联调、周末值班"
        />
      </el-form-item>

      <div class="preview-card">
        <span>系统计算结果</span>
        <strong>{{ previewHours.toFixed(1) }}h</strong>
        <p>{{ previewHint }}</p>
      </div>

      <div class="drawer-actions">
        <el-button v-if="hasRecord" type="danger" plain round @click="$emit('remove', date)">删除记录</el-button>
        <el-button type="primary" round native-type="submit">保存记录</el-button>
      </div>
    </el-form>
  </el-drawer>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { DAY_KIND_LABELS } from '../constants/rules'
import { buildOvertimePreviewText, explainOvertime } from '../utils/overtime'

const props = defineProps({
  open: Boolean,
  date: String,
  dayKind: String,
  settings: Object,
  record: Object,
})

const emit = defineEmits(['close', 'save', 'remove'])

const localForm = reactive({
  startTime: '19:00',
  endTime: '20:30',
  note: '',
})

watch(
  () => [props.open, props.record, props.dayKind],
  () => {
    if (!props.open) return
    localForm.startTime = props.record?.startTime || (props.dayKind === 'workday' || props.dayKind === 'makeup-workday' ? '19:00' : '08:30')
    localForm.endTime = props.record?.endTime || (props.dayKind === 'workday' || props.dayKind === 'makeup-workday' ? '20:30' : '18:00')
    localForm.note = props.record?.note || ''
  },
  { immediate: true }
)

const dayKindLabel = computed(() => DAY_KIND_LABELS[props.dayKind] || '')
const hasRecord = computed(() => Boolean(props.record))
const previewDetails = computed(() => {
  return explainOvertime({
    dayKind: props.dayKind,
    startTime: localForm.startTime,
    endTime: localForm.endTime,
    settings: props.settings,
  })
})
const previewHours = computed(() => previewDetails.value.normalizedHours)
const previewHint = computed(() => buildOvertimePreviewText(previewDetails.value))
const restNotice = computed(() => {
  if (!previewDetails.value.overlaps.length) return ''
  return `已自动扣除：${previewDetails.value.overlaps.map((item) => item.label).join('、')}`
})

function handleSubmit() {
  emit('save', {
    date: props.date,
    dayKind: props.dayKind,
    startTime: localForm.startTime,
    endTime: localForm.endTime,
    note: localForm.note,
  })
}
</script>

<style scoped>
:deep(.record-drawer .el-drawer) {
  background: var(--panel);
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.drawer-header h2,
.eyebrow {
  margin: 0;
}

.eyebrow,
.preview-card p {
  color: var(--muted);
}

.drawer-alert {
  margin: 18px 0 22px;
}

.rest-alert {
  margin-top: -8px;
}

.drawer-form {
  display: grid;
  gap: 18px;
}

.time-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

:deep(.el-form-item) {
  margin-bottom: 0;
}

:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  border-radius: 16px;
  background: var(--surface);
  box-shadow: 0 0 0 1px var(--border) inset;
}

.preview-card {
  position: relative;
  overflow: hidden;
  padding: 16px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--brand-soft) 58%, var(--panel));
  border: 1px solid color-mix(in srgb, var(--brand) 18%, var(--border));
}

.preview-card::after {
  content: '';
  position: absolute;
  inset: auto -20% -36px auto;
  width: 120px;
  height: 120px;
  background: radial-gradient(circle, color-mix(in srgb, var(--brand) 30%, transparent), transparent 70%);
}

.preview-card strong {
  display: block;
  margin: 8px 0;
  font-size: 1.8rem;
}

.drawer-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

@media (max-width: 640px) {
  .time-grid {
    grid-template-columns: 1fr;
  }
}
</style>
