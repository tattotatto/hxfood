<template>
  <div class="finance">
    <h2>财务管理</h2>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <table v-else>
      <thead>
        <tr>
          <th>账户名称</th>
          <th>账户类型</th>
          <th>余额</th>
          <th>冻结金额</th>
          <th>可用余额</th>
          <th>更新时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="accounts.length === 0">
          <td colspan="6" class="empty">暂无账户数据</td>
        </tr>
        <tr v-for="item in accounts" :key="item.id">
          <td>{{ item.name }}</td>
          <td>{{ item.type }}</td>
          <td>&yen;{{ item.balance }}</td>
          <td>&yen;{{ item.frozen }}</td>
          <td>&yen;{{ item.available }}</td>
          <td>{{ item.updatedAt }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../api'

const accounts = ref<any[]>([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const res = await api.get('/finance/accounts')
    accounts.value = res.data || []
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.finance { max-width: 1200px; }
h2 { font-size: 20px; margin-bottom: 16px; }
table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
th { background: #fafafa; font-weight: 600; }
.loading, .error { text-align: center; padding: 40px; color: #999; }
.error { color: #ff4d4f; }
.empty { text-align: center; color: #999; }
</style>
