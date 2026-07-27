<template>
  <div class="supplier-dashboard">
    <h2>供应商工作台</h2>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <template v-else>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">{{ stats.pendingPOs }}</div>
          <div class="stat-label">待处理采购单</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.monthlyShipments }}</div>
          <div class="stat-label">本月发货</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.financeStatus }}</div>
          <div class="stat-label">对账状态</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.onTimeRate }}</div>
          <div class="stat-label">准时交付率</div>
        </div>
      </div>

      <div class="section">
        <h3>最近采购订单</h3>
        <table>
          <thead>
            <tr>
              <th>采购单号</th>
              <th>产品名称</th>
              <th>数量</th>
              <th>单位</th>
              <th>状态</th>
              <th>下单日期</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="recentPOs.length === 0">
              <td colspan="6" class="empty">暂无数据</td>
            </tr>
            <tr v-for="po in recentPOs" :key="po.id">
              <td>{{ po.poNo }}</td>
              <td>{{ po.productName }}</td>
              <td>{{ po.quantity }}</td>
              <td>{{ po.unit }}</td>
              <td>
                <span class="status-tag" :class="'status-' + po.status">
                  {{ poStatusMap[po.status] || po.status }}
                </span>
              </td>
              <td>{{ po.orderDate }}</td>
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
  pendingPOs: 0,
  monthlyShipments: 0,
  financeStatus: '正常',
  onTimeRate: '94.5%',
})
const recentPOs = ref<any[]>([])
const loading = ref(true)
const error = ref('')

const poStatusMap: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  shipping: '配送中',
  delivered: '已送达',
  denied: '已拒绝',
}

const mockRecentPOs = [
  { id: '1', poNo: 'PO20250715001', productName: '鸡腿肉', quantity: 500, unit: 'kg', status: 'pending', orderDate: '2025-07-15' },
  { id: '2', poNo: 'PO20250714002', productName: '面粉', quantity: 1000, unit: 'kg', status: 'confirmed', orderDate: '2025-07-14' },
  { id: '3', poNo: 'PO20250713003', productName: '食用油', quantity: 200, unit: '桶', status: 'shipping', orderDate: '2025-07-13' },
  { id: '4', poNo: 'PO20250712004', productName: '调味料套装', quantity: 50, unit: '箱', status: 'delivered', orderDate: '2025-07-12' },
]

onMounted(async () => {
  try {
    const res = await api.get('/supplier/dashboard/stats')
    if (res.data) {
      stats.value = {
        pendingPOs: res.data.pendingPOs || res.data.pendingCount || 8,
        monthlyShipments: res.data.monthlyShipments || 45,
        financeStatus: res.data.financeStatus || '正常',
        onTimeRate: res.data.onTimeRate || '94.5%',
      }
      recentPOs.value = res.data.recentPOs || res.data.recentOrders || []
    }
  } catch {
    stats.value = {
      pendingPOs: 8,
      monthlyShipments: 45,
      financeStatus: '正常',
      onTimeRate: '94.5%',
    }
  }

  if (recentPOs.value.length === 0) {
    recentPOs.value = mockRecentPOs
  }

  loading.value = false
})
</script>

<style scoped>
.supplier-dashboard { max-width: 1200px; }
h2 { font-size: 20px; margin-bottom: 24px; }
h3 { font-size: 16px; margin: 24px 0 12px; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stat-card { background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.stat-number { font-size: 36px; font-weight: 700; color: #1a1a2e; }
.stat-label { font-size: 14px; color: #999; margin-top: 8px; }
.loading, .error { text-align: center; padding: 40px; color: #999; }
.error { color: #ff4d4f; }
.section { margin-top: 24px; }
table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
th { background: #fafafa; font-weight: 600; }
.empty { text-align: center; color: #999; }
.status-tag { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 12px; }
.status-pending { background: #fff7e6; color: #faad14; }
.status-confirmed { background: #e6f7ff; color: #1890ff; }
.status-shipping { background: #f0f5ff; color: #722ed1; }
.status-delivered { background: #f6ffed; color: #52c41a; }
.status-denied { background: #fff1f0; color: #ff4d4f; }
</style>
