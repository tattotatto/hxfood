<template>
  <div class="orders">
    <h2>订单管理</h2>

    <!-- Toolbar -->
    <div class="toolbar">
      <select v-model="filterStatus" @change="fetchData">
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="pending_approval">待审核</option>
        <option value="approved">已审核</option>
        <option value="pending_production">待生产</option>
        <option value="in_production">生产中</option>
        <option value="partially_produced">部分完成</option>
        <option value="produced">已完成</option>
        <option value="partially_shipped">部分发货</option>
        <option value="shipped">已发货</option>
        <option value="received">已收货</option>
        <option value="cancelled">已取消</option>
      </select>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <table v-else>
      <thead>
        <tr>
          <th>订单号</th>
          <th>门店</th>
          <th>金额</th>
          <th>状态</th>
          <th>生产状态</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="list.length === 0">
          <td colspan="7" class="empty">暂无订单</td>
        </tr>
        <tr v-for="item in list" :key="item.id">
          <td>{{ item.orderNo }}</td>
          <td>{{ item.organization?.name || item.store?.name || '-' }}</td>
          <td>&yen;{{ ((item.totalAmount || 0) / 100).toFixed(2) }}</td>
          <td><span class="tag" :class="statusTag(item.orderStatus || item.status)">{{ statusLabel(item.orderStatus || item.status) }}</span></td>
          <td><span class="tag" :class="prodTag(item.orderStatus || item.status)">{{ prodLabel(item.orderStatus || item.status) }}</span></td>
          <td>{{ formatTime(item.createdAt) }}</td>
          <td class="actions">
            <button class="approve" v-if="(item.orderStatus || item.status) === 'pending_approval'" @click="handleApprove(item.id)">通过</button>
            <button class="reject" v-if="(item.orderStatus || item.status) === 'pending_approval'" @click="handleReject(item.id)">驳回</button>
            <router-link :to="'/shipments?orderId=' + item.id" class="link-shipment">发货单</router-link>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="pagination" v-if="total > pageSize">
      <button :disabled="page <= 1" @click="page--; fetchData()">上一页</button>
      <span>第 {{ page }} / {{ Math.ceil(total / pageSize) }} 页</span>
      <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++; fetchData()">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../api'

const list = ref<any[]>([])
const filterStatus = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const loading = ref(true)
const error = ref('')

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const params: any = { page: page.value, pageSize }
    if (filterStatus.value) params.status = filterStatus.value
    const res = await api.get('/orders', { params })
    list.value = res.data.items || res.data.list || []
    total.value = res.data.total || 0
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function handleApprove(id: string) {
  try {
    await api.post(`/orders/${id}/approve`)
    fetchData()
  } catch (e: any) {
    alert(e.response?.data?.message || '操作失败')
  }
}

async function handleReject(id: string) {
  const reason = prompt('请输入驳回原因')
  if (!reason) return
  try {
    await api.post(`/orders/${id}/reject`, { reason })
    fetchData()
  } catch (e: any) {
    alert(e.response?.data?.message || '操作失败')
  }
}

function statusLabel(s: string) {
  const map: any = {
    draft: '草稿', pending_approval: '待审核', approved: '已审核', rejected: '已驳回',
    pending_production: '待生产', in_production: '生产中', partially_produced: '部分完成',
    produced: '已完成', partially_shipped: '部分发货', shipped: '已发货',
    received: '已收货', cancelled: '已取消',
  }
  return map[s] || s
}

function statusTag(s: string) {
  const map: any = {
    pending_approval: 'tag-warning', approved: 'tag-info', pending_production: 'tag-warning',
    in_production: 'tag-info', partially_produced: 'tag-primary', produced: 'tag-success',
    partially_shipped: 'tag-primary', shipped: 'tag-primary', received: 'tag-success',
    cancelled: 'tag-danger', rejected: 'tag-danger',
  }
  return map[s] || ''
}

function prodLabel(s: string) {
  const prodStatuses = ['pending_production', 'in_production', 'partially_produced', 'produced']
  if (prodStatuses.includes(s)) return statusLabel(s)
  if (['approved', 'pending_approval'].includes(s)) return '未开始'
  if (['partially_shipped', 'shipped', 'received'].includes(s)) return '已完成'
  return '-'
}

function prodTag(s: string) {
  const map: any = {
    pending_production: 'tag-warning', in_production: 'tag-info',
    partially_produced: 'tag-primary', produced: 'tag-success',
  }
  return map[s] || ''
}

function formatTime(t: string) {
  if (!t) return '-'
  return t.substring(0, 16).replace('T', ' ')
}

onMounted(fetchData)
</script>

<style scoped>
.orders { max-width: 1200px; }
h2 { font-size: 20px; margin-bottom: 16px; }

.toolbar { margin-bottom: 16px; }
.toolbar select { padding: 6px 12px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 14px; }

table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
th { background: #fafafa; font-weight: 600; }
.loading, .error { text-align: center; padding: 40px; color: #999; }
.error { color: #ff4d4f; }
.empty { text-align: center; color: #999; }

.tag { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.tag-warning { background: #fff7e6; color: #fa8c16; }
.tag-info { background: #e6fffb; color: #13c2c2; }
.tag-primary { background: #e6f0ff; color: #667eea; }
.tag-success { background: #f6ffed; color: #52c41a; }
.tag-danger { background: #fff2f0; color: #ff4d4f; }

.actions { display: flex; gap: 8px; align-items: center; }
.approve { background: #52c41a; color: #fff; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; }
.reject { background: #ff4d4f; color: #fff; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; }
.link-shipment { color: #667eea; text-decoration: none; font-size: 13px; padding: 4px 8px; background: #f0f0ff; border-radius: 4px; }
.link-shipment:hover { background: #e0e0ff; }

.pagination { display: flex; align-items: center; gap: 16px; margin-top: 16px; justify-content: center; }
.pagination button { padding: 6px 16px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; cursor: pointer; }
.pagination button:disabled { opacity: .5; cursor: not-allowed; }
</style>
