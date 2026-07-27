<template>
  <div class="purchase-orders">
    <h2>采购订单管理</h2>

    <div class="toolbar">
      <select v-model="statusFilter">
        <option value="">全部</option>
        <option value="pending">待确认</option>
        <option value="confirmed">已确认</option>
        <option value="shipping">配送中</option>
        <option value="delivered">已送达</option>
        <option value="denied">已拒绝</option>
      </select>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <table v-else>
      <thead>
        <tr>
          <th>采购单号</th>
          <th>产品名称</th>
          <th>数量</th>
          <th>单位</th>
          <th>金额</th>
          <th>状态</th>
          <th>下单日期</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="filteredList.length === 0">
          <td colspan="8" class="empty">暂无数据</td>
        </tr>
        <tr v-for="po in filteredList" :key="po.id">
          <td>{{ po.poNo }}</td>
          <td>{{ po.productName }}</td>
          <td>{{ po.quantity }}</td>
          <td>{{ po.unit }}</td>
          <td>&yen;{{ po.totalAmount.toLocaleString() }}</td>
          <td>
            <span class="status-tag" :class="'status-' + po.status">
              {{ statusMap[po.status] || po.status }}
            </span>
          </td>
          <td>{{ po.orderDate }}</td>
          <td class="actions">
            <button
              v-if="po.status === 'pending'"
              class="btn btn-confirm"
              @click="handleConfirm(po)"
            >确认</button>
            <button
              v-if="po.status === 'pending'"
              class="btn btn-deny"
              @click="handleDeny(po)"
            >拒绝</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '../api'

const list = ref<any[]>([])
const statusFilter = ref('')
const loading = ref(true)
const error = ref('')

const statusMap: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  shipping: '配送中',
  delivered: '已送达',
  denied: '已拒绝',
}

const mockPOs = [
  { id: '1', poNo: 'PO20250715001', productName: '鸡腿肉', quantity: 500, unit: 'kg', status: 'pending', orderDate: '2025-07-15', totalAmount: 12500 },
  { id: '2', poNo: 'PO20250714002', productName: '面粉', quantity: 1000, unit: 'kg', status: 'confirmed', orderDate: '2025-07-14', totalAmount: 5000 },
  { id: '3', poNo: 'PO20250713003', productName: '食用油', quantity: 200, unit: '桶', status: 'shipping', orderDate: '2025-07-13', totalAmount: 16000 },
  { id: '4', poNo: 'PO20250712004', productName: '调味料套装', quantity: 50, unit: '箱', status: 'delivered', orderDate: '2025-07-12', totalAmount: 7500 },
  { id: '5', poNo: 'PO20250711005', productName: '蔬菜包', quantity: 300, unit: 'kg', status: 'pending', orderDate: '2025-07-11', totalAmount: 6000 },
  { id: '6', poNo: 'PO20250710006', productName: '冷冻牛肉', quantity: 200, unit: 'kg', status: 'denied', orderDate: '2025-07-10', totalAmount: 28000 },
]

const filteredList = computed(() => {
  if (!statusFilter.value) return list.value
  return list.value.filter((po: any) => po.status === statusFilter.value)
})

async function handleConfirm(po: any) {
  try {
    await api.post(`/purchase-orders/${po.id}/confirm`)
    po.status = 'confirmed'
  } catch (e: any) {
    alert(e.message || '操作失败')
  }
}

async function handleDeny(po: any) {
  try {
    await api.post(`/purchase-orders/${po.id}/deny`)
    po.status = 'denied'
  } catch (e: any) {
    alert(e.message || '操作失败')
  }
}

onMounted(async () => {
  try {
    const res = await api.get('/purchase-orders')
    list.value = res.data.items || res.data.list || res.data || []
  } catch {
    list.value = mockPOs
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.purchase-orders { max-width: 1200px; }
h2 { font-size: 20px; margin-bottom: 16px; }
.toolbar { margin-bottom: 16px; }
.toolbar select { padding: 6px 12px; border: 1px solid #d9d9d9; border-radius: 4px; }
table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
th { background: #fafafa; font-weight: 600; }
.loading, .error { text-align: center; padding: 40px; color: #999; }
.error { color: #ff4d4f; }
.empty { text-align: center; color: #999; }
.actions { display: flex; gap: 8px; }
.status-tag { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 12px; }
.status-pending { background: #fff7e6; color: #faad14; }
.status-confirmed { background: #e6f7ff; color: #1890ff; }
.status-shipping { background: #f0f5ff; color: #722ed1; }
.status-delivered { background: #f6ffed; color: #52c41a; }
.status-denied { background: #fff1f0; color: #ff4d4f; }
.btn { padding: 4px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; color: #fff; }
.btn-confirm { background: linear-gradient(135deg, #667eea, #764ba2); }
.btn-deny { background: #ff4d4f; }
</style>
