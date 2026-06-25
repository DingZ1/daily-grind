<template>
  <section class="charts-grid">
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
  background: linear-gradient(180deg, var(--accent-strong), var(--accent));
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
  stroke: var(--accent);
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
  background: var(--accent);
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
