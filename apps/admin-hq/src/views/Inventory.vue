<template>
  <div class="inventory">
    <h2>库存管理</h2>
    <div class="toolbar">
      <input v-model="keyword" type="text" placeholder="搜索商品名称..." @keyup.enter="search" />
      <button @click="search">搜索</button>
    </div>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <table v-else>
      <thead>
        <tr>
          <th>商品名称</th>
          <th>SKU</th>
          <th>总库存</th>
          <th>可用库存</th>
          <th>锁定库存</th>
          <th>安全库存</th>
          <th>更新时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="list.length === 0">
          <td colspan="7" class="empty">暂无库存数据</td>
        </tr>
        <tr v-for="item in list" :key="item.id">
          <td>{{ item.productName }}</td>
          <td>{{ item.sku }}</td>
          <td>{{ item.totalStock }}</td>
          <td>{{ item.availableStock }}</td>
          <td>{{ item.lockedStock }}</td>
          <td>{{ item.safetyStock }}</td>
          <td>{{ item.updatedAt }}</td>
        </tr>
      </tbody>
    </table>
    <div class="pagination" v-if="total > pageSize">
      <button :disabled="page <= 1" @click="page--; search()">上一页</button>
      <span>第 {{ page }} / {{ Math.ceil(total / pageSize) }} 页</span>
      <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++; search()">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../api'

const list = ref<any[]>([])
const keyword = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const loading = ref(false)
const error = ref('')

async function search() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/inventory', {
      params: { page: page.value, pageSize, keyword: keyword.value || undefined }
    })
    list.value = res.data.items || res.data.list || []
    total.value = res.data.total || 0
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(search)
</script>

<style scoped>
.inventory { max-width: 1200px; }
h2 { font-size: 20px; margin-bottom: 16px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 16px; }
.toolbar input { flex: 1; max-width: 300px; padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 14px; }
.toolbar button { padding: 8px 20px; background: #1a1a2e; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
th { background: #fafafa; font-weight: 600; }
.loading, .error { text-align: center; padding: 40px; color: #999; }
.error { color: #ff4d4f; }
.empty { text-align: center; color: #999; }
.pagination { display: flex; align-items: center; gap: 16px; margin-top: 16px; justify-content: center; }
.pagination button { padding: 6px 16px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; cursor: pointer; }
.pagination button:disabled { opacity: .5; cursor: not-allowed; }
</style>
