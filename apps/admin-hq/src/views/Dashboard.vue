<template>
  <div class="dashboard">
    <h2>工作台</h2>
    <div class="stats-grid" v-if="!loading">
      <div class="stat-card">
        <div class="stat-number">{{ stats.todayOrders }}</div>
        <div class="stat-label">今日订单</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.pendingApproval }}</div>
        <div class="stat-label">待审核</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.totalStores }}</div>
        <div class="stat-label">门店总数</div>
      </div>
    </div>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-if="!loading && error" class="error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../api'

const stats = ref({ todayOrders: 0, pendingApproval: 0, totalStores: 0 })
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const res = await api.get('/dashboard/stats')
    stats.value = res.data
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.dashboard { max-width: 1200px; }
h2 { font-size: 20px; margin-bottom: 24px; }
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.stat-card { background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.stat-number { font-size: 36px; font-weight: 700; color: #1a1a2e; }
.stat-label { font-size: 14px; color: #999; margin-top: 8px; }
.loading, .error { text-align: center; padding: 40px; color: #999; }
.error { color: #ff4d4f; }
</style>
