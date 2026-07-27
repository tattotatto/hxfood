<template>
  <div class="supplier-shipments">
    <h2>发货管理</h2>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <table v-else>
      <thead>
        <tr>
          <th>发货单号</th>
          <th>关联采购单</th>
          <th>产品</th>
          <th>数量</th>
          <th>状态</th>
          <th>创建日期</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="shipments.length === 0">
          <td colspan="7" class="empty">暂无数据</td>
        </tr>
        <tr v-for="s in shipments" :key="s.id">
          <td>{{ s.shipmentNo }}</td>
          <td>{{ s.poNo }}</td>
          <td>{{ s.productName }}</td>
          <td>{{ s.quantity }}</td>
          <td>
            <span class="status-tag" :class="'status-' + s.status">
              {{ statusMap[s.status] || s.status }}
            </span>
          </td>
          <td>{{ s.createdAt }}</td>
          <td>
            <button
              v-if="s.status === 'pending'"
              class="btn btn-ship"
              @click="handleMarkShipped(s)"
            >标记发货</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '../api'

const shipments = ref<any[]>([])
const loading = ref(true)
const error = ref('')

const statusMap: Record<string, string> = {
  pending: '待发货',
  in_transit: '运输中',
  delivered: '已送达',
}

const mockShipments = [
  { id: '1', shipmentNo: 'SH20250715001', poNo: 'PO20250714002', productName: '面粉', quantity: '1000kg', status: 'pending', createdAt: '2025-07-15' },
  { id: '2', shipmentNo: 'SH20250714001', poNo: 'PO20250713003', productName: '食用油', quantity: '200桶', status: 'in_transit', createdAt: '2025-07-14' },
  { id: '3', shipmentNo: 'SH20250713001', poNo: 'PO20250712004', productName: '调味料套装', quantity: '50箱', status: 'delivered', createdAt: '2025-07-13' },
  { id: '4', shipmentNo: 'SH20250715002', poNo: 'PO20250715001', productName: '鸡腿肉', quantity: '500kg', status: 'pending', createdAt: '2025-07-15' },
]

async function handleMarkShipped(shipment: any) {
  try {
    await api.post(`/supplier/shipments/${shipment.id}/ship`)
    shipment.status = 'in_transit'
  } catch (e: any) {
    alert(e.message || '操作失败')
  }
}

onMounted(async () => {
  try {
    const res = await api.get('/supplier/shipments')
    shipments.value = res.data.items || res.data.list || res.data || []
  } catch {
    shipments.value = mockShipments
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.supplier-shipments { max-width: 1200px; }
h2 { font-size: 20px; margin-bottom: 16px; }
table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
th { background: #fafafa; font-weight: 600; }
.loading, .error { text-align: center; padding: 40px; color: #999; }
.error { color: #ff4d4f; }
.empty { text-align: center; color: #999; }
.status-tag { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 12px; }
.status-pending { background: #fff7e6; color: #faad14; }
.status-in_transit { background: #e6f7ff; color: #1890ff; }
.status-delivered { background: #f6ffed; color: #52c41a; }
.btn { padding: 4px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; color: #fff; }
.btn-ship { background: linear-gradient(135deg, #667eea, #764ba2); }
</style>
