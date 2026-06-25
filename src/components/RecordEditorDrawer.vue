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
      <span class="drawer-state-label">{{ hasRecord ? '编辑记录' : '新增记录' }}</span>
    </div>

    <section v-if="showAttendanceSegments" class="attendance-card">
      <div class="attendance-head">
        <div>
          <h3>当天打卡记录</h3>
          <p>记录正常出勤和请假间隔，不参与加班时长计算。</p>
        </div>
        <el-button size="small" round @click="addAttendanceSegment">添加分段</el-button>
      </div>

      <div v-if="localForm.attendanceSegments.length" class="attendance-list">
        <div
          v-for="(segment, index) in localForm.attendanceSegments"
          :key="index"
          class="attendance-row"
        >
          <el-input
            v-model="segment.startTime"
            maxlength="5"
            placeholder="开始打卡，如 08:50"
          />
          <el-input
            v-model="segment.endTime"
            maxlength="5"
            placeholder="结束打卡，如 18:00"
          />
          <el-button type="danger" text @click="removeAttendanceSegment(index)">删除</el-button>
        </div>
      </div>
      <p v-else class="attendance-empty">暂无打卡分段，可点击“添加分段”记录当天出勤。</p>
    </section>

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
        <el-form-item label="加班开始时间">
          <el-time-select
            v-model="localForm.startTime"
            start="08:30"
            step="00:30"
            end="24:00"
            placeholder="选择加班开始时间"
          />
        </el-form-item>
        <el-form-item label="加班结束时间">
          <el-time-select
            v-model="localForm.endTime"
            :min-time="localForm.startTime || undefined"
            start="08:30"
            step="00:30"
            end="24:00"
            placeholder="选择加班结束时间"
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
import { ElMessage } from 'element-plus'
import { DAY_KIND_LABELS } from '../constants/rules'
import { buildOvertimePreviewText, explainOvertime } from '../utils/overtime'
import {
  createDefaultAttendanceSegments,
  isAttendanceDay,
  validateAttendanceSegments,
} from '../utils/attendance'

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
  attendanceSegments: [],
  note: '',
})
const showAttendanceSegments = computed(() => isAttendanceDay(props.dayKind))

watch(
  () => [
    props.open,
    props.record,
    props.dayKind,
    props.settings?.workdayStart,
    props.settings?.workdayEnd,
  ],
  () => {
    if (!props.open) return
    localForm.startTime = props.record?.startTime || (props.dayKind === 'workday' || props.dayKind === 'makeup-workday' ? '19:00' : '08:30')
    localForm.endTime = props.record?.endTime || (props.dayKind === 'workday' || props.dayKind === 'makeup-workday' ? '20:30' : '18:00')
    localForm.attendanceSegments = getInitialAttendanceSegments()
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

function cloneAttendanceSegments(segments) {
  return segments.map((segment) => ({
    startTime: segment.startTime,
    endTime: segment.endTime,
  }))
}

function getInitialAttendanceSegments() {
  if (!showAttendanceSegments.value) return []
  if (props.record) {
    return cloneAttendanceSegments(props.record.attendanceSegments || [])
  }

  return createDefaultAttendanceSegments({
    dayKind: props.dayKind,
    settings: props.settings,
  })
}

function addAttendanceSegment() {
  localForm.attendanceSegments.push({
    startTime: '',
    endTime: '',
  })
}

function removeAttendanceSegment(index) {
  localForm.attendanceSegments.splice(index, 1)
}

function handleSubmit() {
  const attendanceValidation = showAttendanceSegments.value
    ? validateAttendanceSegments(localForm.attendanceSegments)
    : { valid: true, segments: [] }

  if (!attendanceValidation.valid) {
    ElMessage.warning(attendanceValidation.message)
    return
  }

  emit('save', {
    date: props.date,
    dayKind: props.dayKind,
    startTime: localForm.startTime,
    endTime: localForm.endTime,
    attendanceSegments: attendanceValidation.segments,
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

.drawer-state-label {
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.4;
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

.attendance-card {
  display: grid;
  gap: 14px;
  margin-top: 18px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: color-mix(in srgb, var(--surface) 82%, transparent);
}

.attendance-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.attendance-head h3,
.attendance-head p,
.attendance-empty {
  margin: 0;
}

.attendance-head h3 {
  font-size: 1rem;
}

.attendance-head p,
.attendance-empty {
  margin-top: 6px;
  color: var(--muted);
  line-height: 1.6;
}

.attendance-list {
  display: grid;
  gap: 10px;
}

.attendance-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
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
  .time-grid,
  .attendance-row {
    grid-template-columns: 1fr;
  }

  .attendance-head {
    display: grid;
  }
}
</style>
