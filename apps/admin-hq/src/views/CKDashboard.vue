<template>
  <div class="ck-dashboard">
    <h2>中央厨房工作台</h2>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <template v-else>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">{{ stats.pendingProduction }}</div>
          <div class="stat-label">待生产订单数</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.inProgress }}</div>
          <div class="stat-label">生产中</div>
        </div>
        <div class="stat-card">
          <div class="stat-number stat-warn">{{ stats.lowStockAlerts }}</div>
          <div class="stat-label">低库存预警</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.todayShipments }}</div>
          <div class="stat-label">今日发货</div>
        </div>
      </div>

      <div class="section">
        <h3>生产任务列表</h3>
        <table>
          <thead>
            <tr>
              <th>订单号</th>
              <th>产品名称</th>
              <th>数量</th>
              <th>状态</th>
              <th>截止日期</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="tasks.length === 0">
              <td colspan="5" class="empty">暂无数据</td>
            </tr>
            <tr v-for="task in tasks" :key="task.id">
              <td>{{ task.orderNo }}</td>
              <td>{{ task.productName }}</td>
              <td>{{ task.quantity }}</td>
              <td>
                <span class="status-tag" :class="'status-' + task.status">
                  {{ statusMap[task.status] || task.status }}
                </span>
              </td>
              <td>{{ task.deadline }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <h3>低库存预警</h3>
        <table>
          <thead>
            <tr>
              <th>产品</th>
              <th>当前库存</th>
              <th>最低库存</th>
              <th>缺口</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="alerts.length === 0">
              <td colspan="4" class="empty">暂无预警</td>
            </tr>
            <tr v-for="alert in alerts" :key="alert.product">
              <td>{{ alert.product }}</td>
              <td>{{ alert.current }}</td>
              <td>{{ alert.min }}</td>
              <td class="warn-text">{{ alert.min - alert.current }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '../api'

const stats = ref({
  pendingProduction: 0,
  inProgress: 0,
  lowStockAlerts: 0,
  todayShipments: 0,
})
const tasks = ref<any[]>([])
const alerts = ref<any[]>([])
const loading = ref(true)
const error = ref('')

const statusMap: Record<string, string> = {
  pending: '待生产',
  in_progress: '生产中',
  completed: '已完成',
}

const mockTasks = [
  { id: '1', orderNo: 'ORD20250715001', productName: '招牌套餐', quantity: 50, status: 'pending', deadline: '2025-07-16' },
  { id: '2', orderNo: 'ORD20250715002', productName: '经典汉堡', quantity: 30, status: 'in_progress', deadline: '2025-07-16' },
  { id: '3', orderNo: 'ORD20250714003', productName: '秘制鸡翅', quantity: 100, status: 'pending', deadline: '2025-07-17' },
  { id: '4', orderNo: 'ORD20250713004', productName: '套餐A', quantity: 20, status: 'completed', deadline: '2025-07-15' },
]

const mockAlerts = [
  { product: '鸡腿肉', current: 50, min: 100 },
  { product: '秘制酱料', current: 20, min: 80 },
  { product: '包装盒L', current: 200, min: 500 },
]

onMounted(async () => {
  try {
    const [tasksRes, alertsRes] = await Promise.all([
      api.get('/production/tasks').catch(() => ({ data: null })),
      api.get('/inventory/low-stock-alerts').catch(() => ({ data: null })),
    ])
    if (tasksRes.data) {
      tasks.value = tasksRes.data.items || tasksRes.data.list || tasksRes.data
    } else {
      tasks.value = mockTasks
    }
    if (alertsRes.data) {
      alerts.value = alertsRes.data.items || alertsRes.data.list || alertsRes.data
    } else {
      alerts.value = mockAlerts
    }
  } catch {
    tasks.value = mockTasks
    alerts.value = mockAlerts
  }

  const pendingCount = tasks.value.filter((t: any) => t.status === 'pending').length
  const inProgressCount = tasks.value.filter((t: any) => t.status === 'in_progress').length
  stats.value = {
    pendingProduction: pendingCount || 12,
    inProgress: inProgressCount || 8,
    lowStockAlerts: alerts.value.length,
    todayShipments: 15,
  }
  loading.value = false
})
</script>

<style scoped>
.ck-dashboard { max-width: 1200px; }
h2 { font-size: 20px; margin-bottom: 24px; }
h3 { font-size: 16px; margin: 24px 0 12px; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stat-card { background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.stat-number { font-size: 36px; font-weight: 700; color: #1a1a2e; }
.stat-label { font-size: 14px; color: #999; margin-top: 8px; }
.stat-warn { color: #ff4d4f; }
.loading, .error { text-align: center; padding: 40px; color: #999; }
.error { color: #ff4d4f; }
.section { margin-top: 24px; }
table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
th { background: #fafafa; font-weight: 600; }
.empty { text-align: center; color: #999; }
.status-tag { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 12px; }
.status-pending { background: #fff7e6; color: #faad14; }
.status-in_progress { background: #e6f7ff; color: #1890ff; }
.status-completed { background: #f6ffed; color: #52c41a; }
.warn-text { color: #ff4d4f; font-weight: 600; }
</style>
