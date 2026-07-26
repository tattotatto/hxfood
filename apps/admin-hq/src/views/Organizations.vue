<template>
  <div class="organizations">
    <h2>门店管理</h2>

    <div class="toolbar">
      <select v-model="orgTypeFilter" @change="onFilterChange">
        <option value="">全部类型</option>
        <option value="headquarters">总部</option>
        <option value="central_kitchen">中央厨房</option>
        <option value="franchise_store">加盟门店</option>
        <option value="supplier">供应商</option>
        <option value="warehouse">仓库</option>
      </select>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <table v-else>
      <thead>
        <tr>
          <th>门店名称</th>
          <th>类型</th>
          <th>负责人</th>
          <th>联系电话</th>
          <th>账户余额</th>
          <th>地址</th>
          <th>状态</th>
          <th>创建时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="list.length === 0">
          <td colspan="8" class="empty">暂无门店数据</td>
        </tr>
        <tr v-for="item in list" :key="item.id">
          <td>{{ item.name }}</td>
          <td>{{ orgTypeLabel(item.orgType) }}</td>
          <td>{{ item.contactName || '-' }}</td>
          <td>{{ item.contactPhone || '-' }}</td>
          <td>
            <template v-if="item.storeAccount">
              &yen;{{ (Number(item.storeAccount.balance) / 100).toFixed(2) }}
            </template>
            <template v-else>-</template>
          </td>
          <td>{{ item.address?.detail || item.address || '-' }}</td>
          <td>{{ item.status }}</td>
          <td>{{ formatDate(item.createdAt) }}</td>
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
const orgTypeFilter = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const loading = ref(true)
const error = ref('')

const orgTypeLabels: Record<string, string> = {
  headquarters: '总部',
  central_kitchen: '中央厨房',
  franchise_store: '加盟门店',
  supplier: '供应商',
  warehouse: '仓库',
}

function orgTypeLabel(type: string): string {
  return orgTypeLabels[type] || type || '-'
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const params: any = {}
    if (orgTypeFilter.value) params.orgType = orgTypeFilter.value
    const res = await api.get('/organizations', { params })
    const data = res.data
    // API returns array directly (not paginated wrapper)
    if (Array.isArray(data)) {
      list.value = data
      total.value = data.length
    } else {
      list.value = data.items || data.list || []
      total.value = data.total || 0
    }
  } catch (e: any) {
    error.value = e.response?.data?.message || e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function onFilterChange() {
  page.value = 1
  fetchData()
}

onMounted(fetchData)
</script>

<style scoped>
.organizations { max-width: 1200px; }
h2 { font-size: 20px; margin-bottom: 16px; }
.toolbar { margin-bottom: 16px; }
.toolbar select { padding: 6px 12px; border: 1px solid #d9d9d9; border-radius: 4px; }
table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
th { background: #fafafa; font-weight: 600; white-space: nowrap; }
.loading, .error { text-align: center; padding: 40px; color: #999; }
.error { color: #ff4d4f; }
.empty { text-align: center; color: #999; }
.pagination { display: flex; align-items: center; gap: 16px; margin-top: 16px; justify-content: center; }
.pagination button { padding: 6px 16px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; cursor: pointer; }
.pagination button:disabled { opacity: .5; cursor: not-allowed; }
</style>
