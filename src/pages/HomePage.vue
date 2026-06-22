<template>
  <DefaultLayout>
    <main class="page-shell">
      <QuarterSummary
        :quarter-label="quarterLabel"
        :target-hours="targetHours"
        :completed-hours="completedHours"
        :remaining-hours="remainingHours"
        :completion-rate="completionRate"
      />

      <CalendarToolbar
        :month-label="monthLabel"
        :month-input="monthInput"
        :date-input="selectedDate"
        :settings="store.settings"
        :theme="theme"
        @previous-month="previousMonth"
        @next-month="nextMonth"
        @jump-month="jumpToMonth"
        @jump-date="jumpToDate"
        @update-settings="store.updateSettings"
        @change-theme="setTheme"
      />

      <section class="content-grid">
        <OvertimeCalendar
          :cells="monthCells"
          :selected-date="selectedDate"
          :records="store.records"
          @select-date="openEditor"
        />
        <aside class="info-panel">
          <article class="spotlight-card">
            <p class="spotlight-label">选中日期</p>
            <h3>{{ selectedDate }}</h3>
            <p>{{ selectedStatusText }}</p>
            <button class="primary-button" type="button" @click="openEditor(selectedDate)">编辑这一天</button>
          </article>
          <article class="tip-card">
            <h3>当前口径</h3>
            <ul>
              <li>工作日从 19:00 后开始记加班。</li>
              <li>周末和工作日都扣除 12:00-13:30、18:00-19:00。</li>
              <li>少于 1 小时无效，之后按 0.5 小时向下累计。</li>
              <li>没有录入就不算加班，也不会自动补数据。</li>
            </ul>
          </article>
          <article class="tip-card">
            <h3>节假日策略</h3>
            <p>当前内置的是 2026 年国务院办公厅放假调休数据。后续如果接自动更新，只需要替换 holidayService 的数据来源。</p>
          </article>
        </aside>
      </section>

      <StatsCharts :records="quarterRecords" :reference-date="selectedDate" />
      <RecordTable
        :records="quarterRecords"
        @export-records="exportQuarterRecords"
        @import-records="importRecords"
      />

      <RecordEditorDrawer
        :open="editorOpen"
        :date="selectedDate"
        :day-kind="selectedDayKind"
        :settings="store.settings"
        :record="selectedRecord"
        @close="editorOpen = false"
        @save="saveRecord"
        @remove="removeRecord"
      />
    </main>
  </DefaultLayout>
</template>

<script setup>
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import QuarterSummary from '../components/QuarterSummary.vue'
import CalendarToolbar from '../components/CalendarToolbar.vue'
import OvertimeCalendar from '../components/OvertimeCalendar.vue'
import RecordEditorDrawer from '../components/RecordEditorDrawer.vue'
import RecordTable from '../components/RecordTable.vue'
import { useOvertimeStore } from '../stores/overtime'
import { useCalendar } from '../composables/useCalendar'
import { useQuarterStats } from '../composables/useQuarterStats'
import { useTheme } from '../composables/useTheme'
import { getDayKind } from '../utils/holiday'
import { downloadRecordsCsv, parseRecordsCsv } from '../services/recordTransfer'

const StatsCharts = defineAsyncComponent(() => import('../components/StatsCharts.vue'))

const store = useOvertimeStore()
store.initialize()

const {
  viewMonth,
  selectedDate,
  monthCells,
  previousMonth,
  nextMonth,
  jumpToMonth,
} = useCalendar()

const { theme, setTheme } = useTheme()
const { targetHours, completedHours, remainingHours, completionRate, quarterInfo } = useQuarterStats(selectedDate)
const editorOpen = ref(false)

const monthLabel = computed(() => viewMonth.value.format('YYYY 年 M 月'))
const monthInput = computed(() => viewMonth.value.format('YYYY-MM'))
const quarterLabel = computed(() => `${quarterInfo.value.year} 年 Q${quarterInfo.value.quarter}`)
const selectedDayKind = computed(() => getDayKind(selectedDate.value))
const selectedRecord = computed(() => store.getRecordByDate(selectedDate.value))
const selectedStatusText = computed(() => {
  if (!selectedRecord.value) {
    return '这一天还没有录入记录，不会自动计入任何加班时长。'
  }

  if (selectedRecord.value.status === 'invalid') {
    return '已录入，但不足 1 小时，目前不会计入季度统计。'
  }

  return `已计入 ${selectedRecord.value.overtimeHours.toFixed(1)} 小时，继续保持。`
})
const quarterRecords = computed(() => {
  const start = quarterInfo.value.start
  const end = quarterInfo.value.end

  return store.recordList.filter((record) => {
    const current = dayjs(record.date)
    return (current.isAfter(start) || current.isSame(start, 'day')) &&
      (current.isBefore(end) || current.isSame(end, 'day'))
  })
})

watch(selectedDate, (value) => {
  const targetMonth = dayjs(value).startOf('month')
  if (!targetMonth.isSame(viewMonth.value, 'month')) {
    viewMonth.value = targetMonth
  }
})

function openEditor(date) {
  selectedDate.value = date
  editorOpen.value = true
}

function jumpToDate(date) {
  if (!date) return
  selectedDate.value = date
}

function saveRecord(form) {
  store.saveRecord(form)
  editorOpen.value = false
}

function removeRecord(date) {
  store.removeRecord(date)
  editorOpen.value = false
}

function exportQuarterRecords() {
  const filename = `daily-grind-${quarterInfo.value.year}-Q${quarterInfo.value.quarter}-records.csv`
  downloadRecordsCsv(quarterRecords.value, filename)
  ElMessage.success('CSV 导出成功。')
}

function importRecords(file) {
  const reader = new FileReader()

  reader.onload = () => {
    try {
      const rows = parseRecordsCsv(String(reader.result || ''))
      const result = store.importRecords(rows)
      const summary = [
        `新增 ${result.created} 条`,
        `更新 ${result.updated} 条`,
        `跳过 ${result.skipped} 条`,
      ].join('，')

      if (!result.created && !result.updated && result.skipped) {
        ElMessage.error(`导入失败：${summary}`)
        return
      }

      ElMessage.success(`导入完成：${summary}`)
    } catch (error) {
      ElMessage.error(error.message || '导入失败。')
    }
  }

  reader.onerror = () => {
    ElMessage.error('读取文件失败。')
  }

  reader.readAsText(file, 'utf-8')
}
</script>

<style scoped>
.page-shell {
  display: grid;
  gap: 22px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(320px, 0.9fr);
  gap: 18px;
}

.info-panel {
  display: grid;
  gap: 16px;
}

.spotlight-card,
.tip-card {
  padding: 22px;
  background: var(--panel);
  border-radius: 24px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.spotlight-card {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--brand) 22%, transparent), transparent 34%),
    linear-gradient(135deg, color-mix(in srgb, var(--brand-soft) 54%, var(--panel)), var(--panel));
}

.spotlight-card::after {
  content: '';
  position: absolute;
  right: -32px;
  top: -32px;
  width: 140px;
  height: 140px;
  border-radius: 28px;
  transform: rotate(24deg);
  background: color-mix(in srgb, var(--brand-strong) 10%, transparent);
}

.spotlight-card h3,
.spotlight-label {
  margin: 0;
}

.spotlight-label {
  color: var(--muted);
  font-size: 0.88rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.spotlight-card h3 {
  margin-top: 8px;
  font-size: 1.5rem;
}

.spotlight-card p {
  position: relative;
  z-index: 1;
  color: var(--muted);
  line-height: 1.7;
}

.spotlight-card .primary-button {
  position: relative;
  z-index: 1;
}

.tip-card h3 {
  margin: 0 0 12px;
}

.tip-card ul {
  margin: 0;
  padding-left: 18px;
  color: var(--muted);
  line-height: 1.7;
}

.tip-card p {
  color: var(--muted);
  line-height: 1.7;
}

@media (max-width: 1180px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
