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
      <div class="stat-card">
        <div class="stat-number">{{ stats.pendingApplications }}</div>
        <div class="stat-label">待审核加盟申请</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ stats.awaitingPayment }}</div>
        <div class="stat-label">待缴费加盟</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">&yen;{{ stats.monthlyRecharge }}</div>
        <div class="stat-label">本月充值</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" :class="{ 'stat-warn': stats.overdueCount > 0 }">{{ stats.overdueCount }}</div>
        <div class="stat-label">逾期应收</div>
      </div>
    </div>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-if="!loading && error" class="error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../api'

const stats = ref({
  todayOrders: 0,
  pendingApproval: 0,
  totalStores: 0,
  pendingApplications: 0,
  awaitingPayment: 0,
  monthlyRecharge: '0.00',
  overdueCount: 0,
})
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const [dashRes, pendingRes, paymentRes, finStatsRes] = await Promise.all([
      api.get('/dashboard/stats'),
      api.get('/franchise/applications', { params: { status: 'submitted', pageSize: 1 } }),
      api.get('/franchise/applications', { params: { status: 'approved', pageSize: 1 } }),
      api.get('/finance/reconciliation/stats').catch(() => ({ data: { monthlyRecharge: 0, overdueCount: 0 } })),
    ])
    stats.value = {
      todayOrders: dashRes.data.todayOrders || 0,
      pendingApproval: dashRes.data.pendingApproval || 0,
      totalStores: dashRes.data.totalStores || 0,
      pendingApplications: pendingRes.data.total || 0,
      awaitingPayment: paymentRes.data.total || 0,
      monthlyRecharge: (finStatsRes.data.monthlyRecharge / 100).toFixed(2) || '0.00',
      overdueCount: finStatsRes.data.overdueCount || 0,
    }
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
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stat-card { background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.stat-number { font-size: 36px; font-weight: 700; color: #1a1a2e; }
.stat-label { font-size: 14px; color: #999; margin-top: 8px; }
.stat-warn { color: #ff4d4f; }
.loading, .error { text-align: center; padding: 40px; color: #999; }
.error { color: #ff4d4f; }
</style>
