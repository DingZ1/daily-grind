<template>
  <section class="table-card">
    <div class="table-head">
      <div>
        <h3>记录明细</h3>
        <span>{{ records.length }} 条</span>
      </div>
      <div class="table-actions">
        <input
          ref="fileInputRef"
          type="file"
          accept=".xlsx,.xlsm,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          class="file-input"
          @change="handleFileChange"
        />
        <button class="ghost-button" type="button" @click="triggerImport">导入 Excel/CSV</button>
        <button class="primary-button" type="button" @click="$emit('export-records')">导出 Excel</button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>日期</th>
            <th>类型</th>
            <th>时间</th>
            <th>时长</th>
            <th>状态</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in records" :key="record.date">
            <td>{{ record.date }}</td>
            <td>{{ labelMap[record.dayKind] }}</td>
            <td>{{ record.startTime }} - {{ record.endTime }}</td>
            <td>{{ record.overtimeHours.toFixed(1) }}h</td>
            <td>{{ record.status === 'valid' ? '已计入' : '未计入' }}</td>
            <td>{{ record.note || '-' }}</td>
          </tr>
          <tr v-if="!records.length">
            <td colspan="6" class="empty-cell">还没有记录，先从日历里选一天开始。</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { DAY_KIND_LABELS } from '../constants/rules'

defineProps({
  records: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['export-records', 'import-records'])
const labelMap = DAY_KIND_LABELS
const fileInputRef = ref(null)

function triggerImport() {
  fileInputRef.value?.click()
}

function handleFileChange(event) {
  const [file] = event.target.files || []
  if (file) {
    emit('import-records', file)
  }

  event.target.value = ''
}
</script>

<style scoped>
.table-card {
  padding: 20px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 24px;
  box-shadow: var(--shadow);
}

.table-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 12px;
}

.table-head h3,
.table-head span {
  margin: 0;
}

.table-head span {
  display: inline-block;
  margin-top: 6px;
  color: var(--muted);
}

.table-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.file-input {
  display: none;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 12px;
  border-bottom: 1px solid var(--border);
  text-align: left;
}

.empty-cell {
  text-align: center;
  color: var(--muted);
}

@media (max-width: 720px) {
  .table-head {
    flex-direction: column;
    align-items: stretch;
  }

  .table-actions {
    width: 100%;
  }

  .table-actions button {
    flex: 1;
  }
}
</style>
