<template>
  <section class="charts-grid">
    <el-card class="chart-card" shadow="never">
      <template #header>
        <div class="card-head">
          <div>
            <h3>本月日加班趋势</h3>
            <p>按天查看当前月份的有效加班时长变化。</p>
          </div>
          <el-tag round effect="plain">Trend</el-tag>
        </div>
      </template>
      <el-empty v-if="!monthlyRecords.length" description="这个月还没有记录" :image-size="88" />
      <div v-else class="chart trend-chart">
        <div class="chart-scale">
          <span>{{ maxTrendHours.toFixed(1) }}h</span>
          <span>{{ midTrendHours.toFixed(1) }}h</span>
          <span>0h</span>
        </div>
        <svg class="trend-svg" viewBox="0 0 320 220" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="rgba(255, 127, 80, 0.34)" />
              <stop offset="100%" stop-color="rgba(255, 127, 80, 0.02)" />
            </linearGradient>
          </defs>
          <path class="grid-line" d="M 20 20 H 300" />
          <path class="grid-line" d="M 20 110 H 300" />
          <path class="grid-line" d="M 20 200 H 300" />
          <path class="area-path" :d="trendAreaPath" fill="url(#trend-fill)" />
          <path class="line-path" :d="trendLinePath" />
          <circle
            v-for="point in trendPoints"
            :key="point.key"
            class="point-dot"
            :cx="point.x"
            :cy="point.y"
            r="4"
          />
        </svg>
        <div class="trend-axis">
          <span v-for="point in trendPoints" :key="point.key">{{ point.label }}</span>
        </div>
      </div>
    </el-card>
    <el-card class="chart-card" shadow="never">
      <template #header>
        <div class="card-head">
          <div>
            <h3>季度月度对比</h3>
            <p>查看当前季度三个月的累计时长分布。</p>
          </div>
          <el-tag round effect="plain" type="success">Quarter</el-tag>
        </div>
      </template>
      <div class="chart bars-chart">
        <div v-for="item in monthlyBuckets" :key="item.label" class="bar-item">
          <div class="bar-track">
            <div class="bar-fill" :style="{ height: `${item.percent}%` }"></div>
          </div>
          <strong>{{ item.total.toFixed(1) }}h</strong>
          <span>{{ item.label }}</span>
        </div>
      </div>
    </el-card>
    <el-card class="chart-card" shadow="never">
      <template #header>
        <div class="card-head">
          <div>
            <h3>记录类型分布</h3>
            <p>工作日与周末/节假日加班占比一眼看清。</p>
          </div>
          <el-tag round effect="plain" type="warning">Mix</el-tag>
        </div>
      </template>
      <el-empty v-if="!records.length" description="还没有记录可分析" :image-size="88" />
      <div v-else class="chart donut-layout">
        <div class="donut-shell">
          <svg viewBox="0 0 160 160" class="donut-chart" aria-hidden="true">
            <circle class="donut-track" cx="80" cy="80" r="56" />
            <circle
              class="donut-segment workday"
              cx="80"
              cy="80"
              r="56"
              :stroke-dasharray="`${workdayDash} ${circumference}`"
              stroke-dashoffset="0"
            />
            <circle
              class="donut-segment weekend"
              cx="80"
              cy="80"
              r="56"
              :stroke-dasharray="`${weekendDash} ${circumference}`"
              :stroke-dashoffset="`${-workdayDash}`"
            />
          </svg>
          <div class="donut-center">
            <strong>{{ totalTypeHours.toFixed(1) }}h</strong>
            <span>累计时长</span>
          </div>
        </div>
        <div class="legend-list">
          <div class="legend-item">
            <span class="legend-dot workday"></span>
            <div>
              <strong>工作日</strong>
              <p>{{ typeStats.workday.toFixed(1) }}h / {{ workdayPercent.toFixed(1) }}%</p>
            </div>
          </div>
          <div class="legend-item">
            <span class="legend-dot weekend"></span>
            <div>
              <strong>周末/节假日</strong>
              <p>{{ typeStats.weekend.toFixed(1) }}h / {{ weekendPercent.toFixed(1) }}%</p>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import dayjs from 'dayjs'

const props = defineProps({
  records: Array,
  referenceDate: String,
})

const monthlyRecords = computed(() => {
  const month = dayjs(props.referenceDate).format('YYYY-MM')
  return props.records.filter((record) => record.date.startsWith(month))
})

const maxTrendHours = computed(() => {
  const max = Math.max(...monthlyRecords.value.map((record) => record.overtimeHours), 1)
  return Number(max.toFixed(1))
})

const midTrendHours = computed(() => Number((maxTrendHours.value / 2).toFixed(1)))

const trendPoints = computed(() => {
  const items = monthlyRecords.value
  if (!items.length) return []

  if (items.length === 1) {
    const only = items[0]
    const y = 200 - (only.overtimeHours / maxTrendHours.value) * 180

    return [
      {
        key: only.date,
        label: only.date.slice(8),
        x: 160,
        y,
      },
    ]
  }

  return items.map((record, index) => {
    const x = 20 + (280 / (items.length - 1)) * index
    const ratio = maxTrendHours.value ? record.overtimeHours / maxTrendHours.value : 0
    const y = 200 - ratio * 180

    return {
      key: record.date,
      label: record.date.slice(8),
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
    }
  })
})

const trendLinePath = computed(() => {
  if (!trendPoints.value.length) return ''

  return trendPoints.value
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
})

const trendAreaPath = computed(() => {
  if (!trendPoints.value.length) return ''

  const first = trendPoints.value[0]
  const last = trendPoints.value[trendPoints.value.length - 1]
  return `${trendLinePath.value} L ${last.x} 200 L ${first.x} 200 Z`
})

const monthlyBuckets = computed(() => {
  const current = dayjs(props.referenceDate)
  const quarter = Math.floor(current.month() / 3)
  const startMonth = quarter * 3
  const totals = [0, 1, 2].map((offset) => {
    const target = current.month(startMonth + offset)
    const monthKey = target.format('YYYY-MM')
    const total = props.records
      .filter((record) => record.date.startsWith(monthKey))
      .reduce((sum, record) => sum + record.overtimeHours, 0)

    return Number(total.toFixed(1))
  })
  const max = Math.max(...totals, 1)

  return [0, 1, 2].map((offset) => {
    const target = current.month(startMonth + offset)
    const total = totals[offset]

    return {
      label: target.format('M月'),
      total,
      percent: Number(((total / max) * 100).toFixed(1)),
    }
  })
})

const typeStats = computed(() => {
  const totals = {
    workday: 0,
    weekend: 0,
  }

  props.records.forEach((record) => {
    if (record.dayKind === 'workday' || record.dayKind === 'makeup-workday') {
      totals.workday += record.overtimeHours
    } else {
      totals.weekend += record.overtimeHours
    }
  })

  return {
    workday: Number(totals.workday.toFixed(1)),
    weekend: Number(totals.weekend.toFixed(1)),
  }
})

const totalTypeHours = computed(() => Number((typeStats.value.workday + typeStats.value.weekend).toFixed(1)))
const workdayPercent = computed(() => totalTypeHours.value ? (typeStats.value.workday / totalTypeHours.value) * 100 : 0)
const weekendPercent = computed(() => totalTypeHours.value ? (typeStats.value.weekend / totalTypeHours.value) * 100 : 0)

const circumference = 2 * Math.PI * 56
const workdayDash = computed(() => (workdayPercent.value / 100) * circumference)
const weekendDash = computed(() => (weekendPercent.value / 100) * circumference)
</script>

<style scoped>
.charts-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.chart-card {
  min-height: 320px;
  border-radius: 24px;
  border: 1px solid var(--border);
  background: var(--panel);
  box-shadow: var(--shadow);
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.card-head h3,
.card-head p {
  margin: 0;
}

.card-head p {
  margin-top: 8px;
  color: var(--muted);
}

.chart {
  min-height: 250px;
}

:deep(.el-card__header) {
  padding-bottom: 0;
  border-bottom: none;
}

:deep(.el-card__body) {
  padding-top: 12px;
}

.trend-chart {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 10px;
}

.chart-scale {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: var(--muted);
  font-size: 0.82rem;
  padding: 8px 0 18px;
}

.trend-svg {
  width: 100%;
  height: 220px;
}

.grid-line {
  fill: none;
  stroke: color-mix(in srgb, var(--border) 95%, transparent);
  stroke-dasharray: 4 6;
}

.line-path {
  fill: none;
  stroke: var(--brand);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.area-path {
  transition: all 0.25s ease;
}

.point-dot {
  fill: #ffffff;
  stroke: var(--brand);
  stroke-width: 3;
}

.trend-axis {
  grid-column: 2;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(18px, 1fr));
  gap: 8px;
  color: var(--muted);
  font-size: 0.8rem;
  text-align: center;
}

.bars-chart {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  padding-top: 16px;
}

.bar-item {
  flex: 1;
  display: grid;
  justify-items: center;
  gap: 10px;
}

.bar-track {
  width: 56px;
  height: 170px;
  display: flex;
  align-items: end;
  padding: 6px;
  border-radius: 24px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--brand-soft) 44%, var(--surface)), var(--surface));
}

.bar-fill {
  width: 100%;
  min-height: 10px;
  border-radius: 18px;
  background: linear-gradient(180deg, #54d3c2, #2ec4b6);
  box-shadow: inset 0 -8px 18px rgba(255, 255, 255, 0.24);
  transition: height 0.35s ease;
}

.bar-item strong {
  font-size: 1rem;
}

.bar-item span {
  color: var(--muted);
}

.donut-layout {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 20px;
  align-items: center;
  padding-top: 8px;
}

.donut-shell {
  position: relative;
  width: 160px;
  height: 160px;
  margin: 0 auto;
}

.donut-chart {
  width: 160px;
  height: 160px;
  transform: rotate(-90deg);
}

.donut-track,
.donut-segment {
  fill: none;
  stroke-width: 16;
}

.donut-track {
  stroke: color-mix(in srgb, var(--border) 90%, transparent);
}

.donut-segment {
  stroke-linecap: round;
}

.donut-segment.workday {
  stroke: var(--brand);
}

.donut-segment.weekend {
  stroke: #2ec4b6;
}

.donut-center {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  text-align: center;
}

.donut-center strong {
  font-size: 1.35rem;
}

.donut-center span,
.legend-item p {
  color: var(--muted);
}

.legend-list {
  display: grid;
  gap: 14px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 18px;
  background: var(--surface);
}

.legend-item strong,
.legend-item p {
  margin: 0;
}

.legend-item p {
  margin-top: 4px;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
}

.legend-dot.workday {
  background: var(--brand);
}

.legend-dot.weekend {
  background: #2ec4b6;
}

@media (max-width: 1080px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .donut-layout {
    grid-template-columns: 1fr;
  }

  .bars-chart {
    gap: 10px;
  }

  .bar-track {
    width: 46px;
  }
}
</style>
