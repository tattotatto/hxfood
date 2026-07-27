<template>
  <div class="reconciliation">
    <h2>月度对账</h2>

    <!-- 生成对账 -->
    <div class="toolbar">
      <div class="period-selector">
        <label>选择月份：</label>
        <input type="month" v-model="period" />
        <button class="btn-primary" @click="generate" :disabled="generating">
          {{ generating ? '生成中...' : '生成对账' }}
        </button>
      </div>
      <div class="filters">
        <select v-model="filterStatus">
          <option value="">全部状态</option>
          <option value="pending">待确认</option>
          <option value="confirmed">已确认</option>
          <option value="disputed">有差异</option>
        </select>
      </div>
    </div>

    <div v-if="generateMsg" :class="['msg', generateSuccess ? 'msg-success' : 'msg-error']">
      {{ generateMsg }}
    </div>

    <!-- 对账列表 -->
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <table v-else>
      <thead>
        <tr>
          <th>门店</th>
          <th>对账期间</th>
          <th>期初余额</th>
          <th>充值</th>
          <th>支出</th>
          <th>退款</th>
          <th>期末余额</th>
          <th>预期期末</th>
          <th>差异</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="items.length === 0">
          <td colspan="11" class="empty">暂无对账记录</td>
        </tr>
        <tr v-for="item in items" :key="item.id" :class="{ 'row-diff': item.hasDifference }">
          <td>{{ item.storeName }}</td>
          <td>{{ item.period }}</td>
          <td>&yen;{{ item.openingBalance }}</td>
          <td>&yen;{{ item.totalRecharge }}</td>
          <td>&yen;{{ item.totalSpent }}</td>
          <td>&yen;{{ item.totalRefund }}</td>
          <td>&yen;{{ item.closingBalance }}</td>
          <td>&yen;{{ item.expectedClose }}</td>
          <td :class="item.hasDifference ? 'text-danger' : 'text-success'">
            {{ item.hasDifference ? '¥' + item.difference : '0.00' }}
          </td>
          <td>
            <span :class="'tag tag-' + item.status">
              {{ statusMap[item.status] || item.status }}
            </span>
          </td>
          <td>
            <button v-if="item.status === 'pending'" class="btn-sm" @click="confirm(item.id)">
              确认
            </button>
            <span v-else class="text-muted">--</span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 分页 -->
    <div class="pagination" v-if="total > pageSize">
      <button :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
      <span>第 {{ page }} / {{ totalPages }} 页</span>
      <button :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../api'

const period = ref(new Date().toISOString().substring(0, 7))
const filterStatus = ref('')
const items = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const generating = ref(false)
const generateMsg = ref('')
const generateSuccess = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)

const statusMap: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  disputed: '有差异',
}

async function generate() {
  generating.value = true
  generateMsg.value = ''
  try {
    const res = await api.post('/finance/reconciliation/generate', { period: period.value })
    generateMsg.value = `成功生成 ${res.data.generated} 条对账记录`
    generateSuccess.value = true
    await fetchList()
  } catch (e: any) {
    generateMsg.value = e.response?.data?.message || e.message || '生成失败'
    generateSuccess.value = false
  } finally {
    generating.value = false
  }
}

async function fetchList() {
  loading.value = true
  error.value = ''
  try {
    const params: any = { page: page.value, pageSize: pageSize.value }
    if (filterStatus.value) params.status = filterStatus.value
    const res = await api.get('/finance/reconciliations', { params })
    items.value = res.data.items || []
    total.value = res.data.total || 0
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function confirm(id: string) {
  try {
    await api.post(`/finance/reconciliation/${id}/confirm`)
    await fetchList()
  } catch (e: any) {
    alert(e.response?.data?.message || e.message || '确认失败')
  }
}

function changePage(p: number) {
  page.value = p
  fetchList()
}

onMounted(fetchList)
</script>

<style scoped>
.reconciliation { max-width: 1400px; }
h2 { font-size: 20px; margin-bottom: 16px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
.period-selector { display: flex; align-items: center; gap: 8px; }
.period-selector label { font-size: 14px; }
.period-selector input { padding: 6px 10px; border: 1px solid #d9d9d9; border-radius: 4px; }
.filters select { padding: 6px 10px; border: 1px solid #d9d9d9; border-radius: 4px; }
.btn-primary { padding: 8px 16px; background: #667eea; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.btn-sm { padding: 4px 12px; background: #52c41a; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
.msg { padding: 8px 16px; border-radius: 4px; margin-bottom: 16px; font-size: 14px; }
.msg-success { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
.msg-error { background: #fff2f0; color: #ff4d4f; border: 1px solid #ffccc7; }
table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #f0f0f0; font-size: 13px; white-space: nowrap; }
th { background: #fafafa; font-weight: 600; }
.loading, .error { text-align: center; padding: 40px; color: #999; }
.error { color: #ff4d4f; }
.empty { text-align: center; color: #999; }
.row-diff { background: #fffbe6; }
.text-danger { color: #ff4d4f; font-weight: 600; }
.text-success { color: #52c41a; }
.text-muted { color: #ccc; }
.tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.tag-pending { background: #fff7e6; color: #fa8c16; }
.tag-confirmed { background: #f6ffed; color: #52c41a; }
.tag-disputed { background: #fff2f0; color: #ff4d4f; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 16px; }
.pagination button { padding: 6px 12px; border: 1px solid #d9d9d9; background: #fff; border-radius: 4px; cursor: pointer; }
.pagination button:disabled { opacity: .4; cursor: not-allowed; }
.pagination span { font-size: 14px; color: #666; }
</style>
