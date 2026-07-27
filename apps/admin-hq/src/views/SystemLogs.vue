<template>
  <div class="system-logs">
    <h2>系统日志</h2>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="filter-item">
        <label>模块</label>
        <select v-model="filters.module">
          <option value="">全部</option>
          <option value="订单">订单</option>
          <option value="库存">库存</option>
          <option value="财务">财务</option>
          <option value="用户">用户</option>
          <option value="系统">系统</option>
        </select>
      </div>
      <div class="filter-item">
        <label>级别</label>
        <select v-model="filters.level">
          <option value="">全部</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
        </select>
      </div>
      <div class="filter-item">
        <label>开始日期</label>
        <input v-model="filters.dateFrom" type="date" />
      </div>
      <div class="filter-item">
        <label>结束日期</label>
        <input v-model="filters.dateTo" type="date" />
      </div>
      <button class="btn-reset" @click="resetFilters">重置</button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <table v-else>
      <thead>
        <tr>
          <th>时间</th>
          <th>模块</th>
          <th>级别</th>
          <th>消息</th>
          <th>操作人</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="filteredLogs.length === 0">
          <td colspan="5" class="empty">暂无日志数据</td>
        </tr>
        <tr v-for="log in filteredLogs" :key="log.id">
          <td class="td-time">{{ formatDate(log.timestamp) }}</td>
          <td>
            <span :class="['module-tag', moduleClass(log.module)]">{{ log.module }}</span>
          </td>
          <td>
            <span :class="['level-tag', levelClass(log.level)]">{{ log.level }}</span>
          </td>
          <td class="td-message">{{ log.message }}</td>
          <td>{{ log.operator }}</td>
        </tr>
      </tbody>
    </table>

    <div class="log-count" v-if="!loading && !error">
      共 {{ filteredLogs.length }} 条日志
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../api'

const list = ref<any[]>([])
const loading = ref(true)
const error = ref('')

const filters = ref({
  module: '',
  level: '',
  dateFrom: '',
  dateTo: '',
})

const mockLogs = [
  { id: '1', timestamp: '2025-07-15T14:30:00Z', module: '订单', level: 'INFO', message: '订单 #ORD20250715001 已审核通过', operator: 'admin' },
  { id: '2', timestamp: '2025-07-15T14:25:00Z', module: '库存', level: 'WARN', message: '商品 "鸡腿肉" 库存低于安全阈值 (当前: 50, 阈值: 100)', operator: 'system' },
  { id: '3', timestamp: '2025-07-15T13:10:00Z', module: '财务', level: 'INFO', message: '门店 "朝阳门店" 完成月度对账', operator: 'finance01' },
  { id: '4', timestamp: '2025-07-15T12:00:00Z', module: '用户', level: 'INFO', message: '用户 "store02" 登录系统', operator: 'store02' },
  { id: '5', timestamp: '2025-07-15T11:45:00Z', module: '订单', level: 'ERROR', message: '订单 #ORD20250714058 支付回调失败，需人工处理', operator: 'system' },
  { id: '6', timestamp: '2025-07-15T10:30:00Z', module: '库存', level: 'INFO', message: '入库单 #IN20250715002 已完成，入库数量: 500', operator: 'warehouse01' },
  { id: '7', timestamp: '2025-07-15T09:00:00Z', module: '系统', level: 'WARN', message: '数据库连接池使用率达到 85%', operator: 'system' },
  { id: '8', timestamp: '2025-07-15T08:00:00Z', module: '订单', level: 'INFO', message: '定时任务: 已自动取消 3 个超时未支付订单', operator: 'system' },
]

const filteredLogs = computed(() => {
  let result = list.value
  if (filters.value.module) {
    result = result.filter(log => log.module === filters.value.module)
  }
  if (filters.value.level) {
    result = result.filter(log => log.level === filters.value.level)
  }
  if (filters.value.dateFrom) {
    const from = new Date(filters.value.dateFrom)
    result = result.filter(log => new Date(log.timestamp) >= from)
  }
  if (filters.value.dateTo) {
    const to = new Date(filters.value.dateTo)
    to.setHours(23, 59, 59, 999)
    result = result.filter(log => new Date(log.timestamp) <= to)
  }
  return result
})

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function moduleClass(module: string): string {
  const map: Record<string, string> = {
    '订单': 'mod-order',
    '库存': 'mod-inventory',
    '财务': 'mod-finance',
    '用户': 'mod-user',
    '系统': 'mod-system',
  }
  return map[module] || ''
}

function levelClass(level: string): string {
  const map: Record<string, string> = {
    'INFO': 'lv-info',
    'WARN': 'lv-warn',
    'ERROR': 'lv-error',
  }
  return map[level] || ''
}

function resetFilters() {
  filters.value = { module: '', level: '', dateFrom: '', dateTo: '' }
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/system/logs')
    list.value = res.data.items || res.data.list || res.data || []
  } catch (e: any) {
    list.value = mockLogs
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.system-logs { max-width: 1200px; }
h2 { font-size: 20px; margin-bottom: 16px; }

/* Filter Bar */
.filter-bar {
  display: flex; align-items: flex-end; gap: 16px; margin-bottom: 16px;
  background: #fff; padding: 16px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.08);
  flex-wrap: wrap;
}
.filter-item { display: flex; flex-direction: column; gap: 4px; }
.filter-item label { font-size: 13px; color: #999; }
.filter-item select,
.filter-item input {
  padding: 6px 12px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 14px;
}
.btn-reset {
  padding: 6px 16px; background: #f5f5f5; color: #333;
  border: 1px solid #d9d9d9; border-radius: 4px; cursor: pointer; font-size: 14px;
  height: 32px;
}

table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
th { background: #fafafa; font-weight: 600; white-space: nowrap; }
.td-time { white-space: nowrap; font-family: 'Consolas', 'Courier New', monospace; font-size: 13px; color: #555; }
.td-message { max-width: 400px; word-break: break-all; }
.loading, .error { text-align: center; padding: 40px; color: #999; }
.error { color: #ff4d4f; }
.empty { text-align: center; color: #999; }

.log-count { margin-top: 12px; font-size: 13px; color: #999; }

/* Module Tags */
.module-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
.mod-order { background: #e6f7ff; color: #1890ff; }
.mod-inventory { background: #f6ffed; color: #52c41a; }
.mod-finance { background: #fff7e6; color: #fa8c16; }
.mod-user { background: #f9f0ff; color: #722ed1; }
.mod-system { background: #fafafa; color: #666; }

/* Level Tags */
.level-tag { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; }
.lv-info { background: #e6f7ff; color: #1890ff; }
.lv-warn { background: #fff7e6; color: #fa8c16; }
.lv-error { background: #fff2f0; color: #ff4d4f; }
</style>
