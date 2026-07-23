<template>
  <div class="applications">
    <h2>加盟审核</h2>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <table v-else>
      <thead>
        <tr>
          <th>申请人</th>
          <th>门店名称</th>
          <th>联系电话</th>
          <th>申请时间</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="list.length === 0">
          <td colspan="6" class="empty">暂无申请</td>
        </tr>
        <tr v-for="item in list" :key="item.id">
          <td>{{ item.applicantName }}</td>
          <td>{{ item.storeName }}</td>
          <td>{{ item.phone }}</td>
          <td>{{ item.createdAt }}</td>
          <td>{{ item.status }}</td>
          <td class="actions" v-if="item.status === 'pending'">
            <button class="approve" @click="handleApprove(item.id)">通过</button>
            <button class="reject" @click="handleReject(item.id)">驳回</button>
          </td>
          <td v-else>-</td>
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
const page = ref(1)
const pageSize = 20
const total = ref(0)
const loading = ref(true)
const error = ref('')

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/applications', {
      params: { page: page.value, pageSize }
    })
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
    await api.post(`/applications/${id}/approve`)
    fetchData()
  } catch (e: any) {
    alert(e.response?.data?.message || '操作失败')
  }
}

async function handleReject(id: string) {
  const reason = prompt('请输入驳回原因')
  if (!reason) return
  try {
    await api.post(`/applications/${id}/reject`, { reason })
    fetchData()
  } catch (e: any) {
    alert(e.response?.data?.message || '操作失败')
  }
}

onMounted(fetchData)
</script>

<style scoped>
.applications { max-width: 1200px; }
h2 { font-size: 20px; margin-bottom: 16px; }
table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
th { background: #fafafa; font-weight: 600; }
.loading, .error { text-align: center; padding: 40px; color: #999; }
.error { color: #ff4d4f; }
.empty { text-align: center; color: #999; }
.actions { display: flex; gap: 8px; }
.approve { background: #52c41a; color: #fff; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; }
.reject { background: #ff4d4f; color: #fff; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; }
.pagination { display: flex; align-items: center; gap: 16px; margin-top: 16px; justify-content: center; }
.pagination button { padding: 6px 16px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; cursor: pointer; }
.pagination button:disabled { opacity: .5; cursor: not-allowed; }
</style>
