<template>
  <section class="attendance-summary-card">
    <div class="attendance-head">
      <div>
        <p class="attendance-eyebrow">本月考勤</p>
        <h3>{{ monthLabel }}</h3>
      </div>
      <span>{{ summary.trackedDayCount }} 天打卡记录</span>
    </div>

    <div class="attendance-metrics">
      <article class="metric-item">
        <span>免费迟到次数</span>
        <strong>{{ summary.freeLateCount }}/{{ summary.freeLateLimit }}</strong>
      </article>
      <article class="metric-item">
        <span>付费迟到次数</span>
        <strong>{{ summary.paidLateCount }} 次</strong>
      </article>
      <article class="metric-item">
        <span>迟到扣款</span>
        <strong>¥{{ summary.lateFineAmount }}</strong>
      </article>
      <article class="metric-item leave-metric">
        <div class="metric-label-row">
          <span>请假时长</span>
          <button
            class="detail-link"
            type="button"
            :disabled="!summary.leaveRecords.length"
            @click="leaveDialogOpen = true"
          >
            查看
          </button>
        </div>
        <strong>{{ formatAttendanceHours(summary.leaveHours) }}</strong>
      </article>
    </div>

    <p class="attendance-note">
      根据当前浏览月份中已保存的工作日/调休打卡记录动态计算，不会写入 JSON。
    </p>

    <el-dialog
      v-model="leaveDialogOpen"
      title="请假明细"
      width="min(680px, 92vw)"
      append-to-body
      destroy-on-close
    >
      <el-empty
        v-if="!summary.leaveRecords.length"
        description="这个月没有请假记录"
        :image-size="88"
      />
      <div v-else class="leave-detail-list">
        <div
          v-for="record in summary.leaveRecords"
          :key="record.date"
          class="leave-detail-row"
        >
          <div>
            <strong>{{ record.date }}</strong>
            <span>{{ record.dayKindLabel }}</span>
          </div>
          <div>
            <strong>{{ formatAttendanceHours(record.hours) }}</strong>
            <span>{{ formatRanges(record.ranges) }}</span>
          </div>
        </div>
      </div>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import {
  buildMonthlyAttendanceSummary,
  formatAttendanceHours,
} from '../utils/attendanceSummary'

const props = defineProps({
  records: {
    type: Array,
    default: () => [],
  },
  referenceDate: String,
  settings: Object,
})

const leaveDialogOpen = ref(false)
const monthLabel = computed(() => dayjs(props.referenceDate).format('YYYY年M月'))
const summary = computed(() => buildMonthlyAttendanceSummary({
  records: props.records,
  referenceDate: props.referenceDate,
  settings: props.settings,
}))

function formatRanges(ranges) {
  return ranges
    .map((range) => `${range.startTime}-${range.endTime}`)
    .join('、')
}
</script>

<style scoped>
.attendance-summary-card {
  --attendance-primary-text: color-mix(in srgb, var(--text) 42%, transparent);
  --attendance-secondary-text: color-mix(in srgb, var(--muted) 38%, transparent);
  --attendance-link-text: color-mix(in srgb, var(--brand) 48%, transparent);
  --attendance-card-surface: color-mix(in srgb, var(--surface) 68%, transparent);

  display: grid;
  gap: 18px;
  padding: 22px;
  color: var(--attendance-primary-text);
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--panel);
  box-shadow: var(--shadow);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.attendance-summary-card:hover,
.attendance-summary-card:focus-within {
  --attendance-primary-text: var(--text);
  --attendance-secondary-text: color-mix(in srgb, var(--muted) 70%, var(--text));
  --attendance-link-text: var(--brand);
  --attendance-card-surface: var(--surface);

  border-color: color-mix(in srgb, var(--brand) 24%, var(--border));
  box-shadow: 0 18px 44px color-mix(in srgb, var(--brand) 10%, transparent), var(--shadow);
}

.attendance-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.attendance-head h3,
.attendance-head span,
.attendance-eyebrow,
.attendance-note {
  margin: 0;
}

.attendance-head h3 {
  margin-top: 6px;
  color: var(--attendance-primary-text);
  font-size: 1.35rem;
}

.attendance-head span,
.attendance-eyebrow,
.attendance-note,
.metric-item span,
.leave-detail-row span {
  color: var(--attendance-secondary-text);
}

.attendance-head > span {
  color: var(--attendance-secondary-text);
  font-size: 0.9rem;
  font-weight: 700;
}

.attendance-eyebrow {
  color: color-mix(in srgb, var(--brand) 42%, var(--attendance-primary-text));
  font-size: 0.88rem;
  font-weight: 800;
}

.attendance-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.metric-item {
  display: grid;
  gap: 8px;
  min-height: 98px;
  padding: 16px;
  border-radius: 18px;
  color: var(--attendance-primary-text);
  background: var(--attendance-card-surface);
  border: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  transition: background 0.2s ease, border-color 0.2s ease;
}

.metric-item strong {
  color: var(--attendance-primary-text);
  font-size: 1.55rem;
}

.metric-label-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.detail-link {
  border: 0;
  padding: 0;
  color: var(--attendance-link-text);
  font-weight: 800;
  background: transparent;
  cursor: pointer;
}

.detail-link:disabled {
  color: var(--attendance-secondary-text);
  cursor: not-allowed;
  opacity: 0.58;
}

.attendance-note {
  color: var(--attendance-secondary-text);
  line-height: 1.7;
}

.leave-detail-list {
  display: grid;
  gap: 10px;
}

.leave-detail-row {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 14px;
  padding: 14px 16px;
  color: var(--attendance-primary-text);
  border-radius: 14px;
  background: var(--attendance-card-surface);
}

.leave-detail-row strong {
  color: var(--attendance-primary-text);
}

.attendance-summary-card h3,
.attendance-summary-card span,
.attendance-summary-card strong,
.attendance-summary-card p,
.attendance-summary-card button,
.leave-detail-row {
  transition: color 0.2s ease, opacity 0.2s ease;
}

.leave-detail-row > div {
  display: grid;
  gap: 5px;
}

@media (max-width: 980px) {
  .attendance-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .attendance-head,
  .leave-detail-row {
    grid-template-columns: 1fr;
  }

  .attendance-head {
    display: grid;
  }

  .attendance-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
