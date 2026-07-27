<template>
  <div class="analytics">
    <h2>数据分析</h2>

    <!-- Stats Cards -->
    <div class="stats-grid" v-if="!loading">
      <div class="stat-card">
        <div class="stat-number">{{ summary.totalOrders }}</div>
        <div class="stat-label">本月订单数</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">&yen;{{ summary.totalAmountYuan }}</div>
        <div class="stat-label">本月销售额</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ summary.activeStores }}</div>
        <div class="stat-label">活跃门店</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">&yen;{{ summary.avgPerStore }}</div>
        <div class="stat-label">店均销售额</div>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-if="!loading && error" class="error">{{ error }}</div>

    <!-- Section 1: Order Trend -->
    <div v-if="!loading && !error" class="section">
      <div class="section-header">订单趋势（近30天）</div>
      <div class="section-body">
        <div class="bar-chart">
          <div class="bar-wrapper" v-for="item in orderTrend" :key="item.date">
            <div class="bar-value">{{ item.count }}</div>
            <div class="bar" :style="{ height: (item.count / maxOrderCount * 100) + '%' }"></div>
            <div class="bar-label">{{ item.date.substring(5) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: Hot SKU Ranking -->
    <div v-if="!loading && !error" class="section">
      <div class="section-header">热销商品排行</div>
      <div class="section-body">
        <div class="horizontal-bars">
          <div class="h-bar-row" v-for="(item, idx) in hotSkus" :key="idx">
            <span class="h-bar-rank">#{{ idx + 1 }}</span>
            <span class="h-bar-name">{{ item.name }}</span>
            <div class="h-bar-track">
              <div class="h-bar-fill" :style="{ width: (item.count / maxSkuCount * 100) + '%' }"></div>
            </div>
            <span class="h-bar-value">{{ item.count }}</span>
          </div>
        </div>
        <div v-if="hotSkus.length === 0" class="empty-tip">暂无数据</div>
      </div>
    </div>

    <!-- Section 3: Store Sales Ranking -->
    <div v-if="!loading && !error" class="section">
      <div class="section-header">门店销售排行</div>
      <div class="section-body">
        <div class="horizontal-bars">
          <div class="h-bar-row" v-for="(item, idx) in storeRanking" :key="idx">
            <span class="h-bar-rank">#{{ idx + 1 }}</span>
            <span class="h-bar-name">{{ item.name }}</span>
            <div class="h-bar-track">
              <div class="h-bar-fill" :style="{ width: (item.orderCount / maxStoreOrderCount * 100) + '%' }"></div>
            </div>
            <span class="h-bar-value">&yen;{{ item.amount }}</span>
          </div>
        </div>
        <div v-if="storeRanking.length === 0" class="empty-tip">暂无数据</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../api'

const loading = ref(true)
const error = ref('')

interface Summary {
  totalOrders: number
  totalAmountYuan: string
  activeStores: number
  avgPerStore: string
}

const summary = ref<Summary>({
  totalOrders: 0,
  totalAmountYuan: '0.00',
  activeStores: 0,
  avgPerStore: '0.00',
})

const orderTrend = ref<{ date: string; count: number; amount: string }[]>([])
const hotSkus = ref<{ name: string; count: number }[]>([])
const storeRanking = ref<{ name: string; orderCount: number; amount: string }[]>([])

const maxOrderCount = computed(() => {
  if (orderTrend.value.length === 0) return 1
  return Math.max(...orderTrend.value.map((o) => o.count), 1)
})

const maxSkuCount = computed(() => {
  if (hotSkus.value.length === 0) return 1
  return Math.max(...hotSkus.value.map((s) => s.count), 1)
})

const maxStoreOrderCount = computed(() => {
  if (storeRanking.value.length === 0) return 1
  return Math.max(...storeRanking.value.map((s) => s.orderCount), 1)
})

onMounted(async () => {
  try {
    const [summaryRes, trendRes, skusRes, rankingRes] = await Promise.all([
      api.get('/analytics/summary').catch(() => ({ data: null })),
      api.get('/analytics/order-trend').catch(() => ({ data: [] })),
      api.get('/analytics/hot-skus').catch(() => ({ data: [] })),
      api.get('/analytics/store-ranking').catch(() => ({ data: [] })),
    ])

    if (summaryRes.data) {
      summary.value = summaryRes.data
    }
    if (trendRes.data && Array.isArray(trendRes.data)) {
      orderTrend.value = trendRes.data
    }
    if (skusRes.data && Array.isArray(skusRes.data)) {
      hotSkus.value = skusRes.data
    }
    if (rankingRes.data && Array.isArray(rankingRes.data)) {
      storeRanking.value = rankingRes.data
    }
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.analytics { max-width: 1200px; }
h2 { font-size: 20px; margin-bottom: 24px; }

/* Stats Cards */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.stat-number { font-size: 36px; font-weight: 700; color: #1a1a2e; }
.stat-label { font-size: 14px; color: #999; margin-top: 8px; }
.stat-up { color: #52c41a; }

.loading, .error { text-align: center; padding: 40px; color: #999; }
.error { color: #ff4d4f; }

/* Section */
.section { background: #fff; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.08); margin-bottom: 24px; overflow: hidden; }
.section-header {
  padding: 14px 20px; font-size: 15px; font-weight: 600; color: #fff;
  background: linear-gradient(135deg, #667eea, #764ba2);
}
.section-body { padding: 24px; }

.empty-tip { text-align: center; color: #999; padding: 20px; font-size: 14px; }

/* Vertical Bar Chart */
.bar-chart { display: flex; align-items: flex-end; justify-content: space-around; height: 240px; padding-top: 16px; }
.bar-wrapper { display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; justify-content: flex-end; }
.bar-value { font-size: 13px; color: #666; margin-bottom: 6px; font-weight: 500; }
.bar {
  width: 48px; background: linear-gradient(180deg, #667eea, #764ba2);
  border-radius: 4px 4px 0 0; min-height: 4px; transition: height .3s;
}
.bar-label { font-size: 13px; color: #999; margin-top: 8px; }

/* Horizontal Bars */
.horizontal-bars { display: flex; flex-direction: column; gap: 12px; }
.h-bar-row { display: flex; align-items: center; gap: 12px; }
.h-bar-rank { font-size: 14px; font-weight: 700; color: #667eea; min-width: 28px; }
.h-bar-name { font-size: 14px; color: #333; min-width: 100px; }
.h-bar-track { flex: 1; height: 24px; background: #f5f5f5; border-radius: 4px; overflow: hidden; }
.h-bar-fill {
  height: 100%; border-radius: 4px;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transition: width .3s;
}
.h-bar-value { font-size: 14px; font-weight: 600; color: #333; min-width: 80px; text-align: right; }
</style>
