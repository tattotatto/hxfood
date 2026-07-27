<template>
  <div class="production">
    <h2>生产管理</h2>

    <!-- Toolbar -->
    <div class="toolbar">
      <select v-model="filterStatus" @change="fetchData">
        <option value="">全部状态</option>
        <option value="pending_production">待生产</option>
        <option value="in_production">生产中</option>
        <option value="partially_produced">部分完成</option>
        <option value="produced">已完成</option>
      </select>
      <button class="btn-create" @click="openCreate">+ 创建生产工单</button>
    </div>

    <!-- Loading/Error -->
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <!-- Table -->
    <table v-else>
      <thead>
        <tr>
          <th>订单号</th>
          <th>门店</th>
          <th>金额</th>
          <th>生产状态</th>
          <th>商品数</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="list.length === 0">
          <td colspan="7" class="empty">暂无生产工单</td>
        </tr>
        <tr v-for="item in list" :key="item.id">
          <td>{{ item.orderNo }}</td>
          <td>{{ item.store?.name || '-' }}</td>
          <td>&yen;{{ (item.totalAmount / 100).toFixed(2) }}</td>
          <td><span class="tag" :class="statusTag(item.orderStatus)">{{ statusLabel(item.orderStatus) }}</span></td>
          <td>{{ item.orderItems?.length || 0 }} 种</td>
          <td>{{ formatTime(item.createdAt) }}</td>
          <td class="actions">
            <button
              v-if="item.orderStatus === 'pending_production'"
              class="btn-action btn-start"
              @click="handleStart(item.id)"
            >开始生产</button>
            <button
              v-if="item.orderStatus === 'in_production' || item.orderStatus === 'partially_produced'"
              class="btn-action btn-complete"
              @click="openCompleteDialog(item)"
            >完成入库</button>
            <button class="btn-action btn-view" @click="viewDetail(item)">查看</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Pagination -->
    <div class="pagination" v-if="total > pageSize">
      <button :disabled="page <= 1" @click="page--; fetchData()">上一页</button>
      <span>第 {{ page }} / {{ Math.ceil(total / pageSize) }} 页</span>
      <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++; fetchData()">下一页</button>
    </div>

    <!-- Create Modal -->
    <div class="modal-mask" v-if="showCreate" @click.self="showCreate = false">
      <div class="modal">
        <h3>创建生产工单</h3>
        <div class="form-group">
          <label>关联订单</label>
          <select v-model="createForm.orderId">
            <option value="">请选择订单</option>
            <option v-for="o in approvedOrders" :key="o.id" :value="o.id">
              {{ o.orderNo }} - {{ o.store?.name || '' }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>生产仓库</label>
          <select v-model="createForm.warehouseId">
            <option value="">请选择仓库</option>
            <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>备注</label>
          <textarea v-model="createForm.notes" rows="2" placeholder="选填"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showCreate = false">取消</button>
          <button class="btn-submit" :disabled="creating" @click="handleCreate">{{ creating ? '创建中...' : '创建' }}</button>
        </div>
      </div>
    </div>

    <!-- Complete Modal -->
    <div class="modal-mask" v-if="showComplete" @click.self="showComplete = false">
      <div class="modal">
        <h3>生产完成入库</h3>
        <p>订单号: {{ completeTarget?.orderNo }}</p>
        <div class="form-group">
          <label>入库仓库</label>
          <select v-model="completeForm.warehouseId">
            <option value="">请选择仓库</option>
            <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>
        </div>
        <div class="form-group" v-if="completeItems.length > 0">
          <label>入库商品</label>
          <div class="item-row" v-for="(it, idx) in completeItems" :key="idx">
            <span class="item-name">{{ it.skuName || it.skuCode }}</span>
            <input v-model="it.lotNo" type="text" placeholder="批次号" class="lot-input" />
            <input v-model="it.quantity" type="number" :min="0" placeholder="数量" class="qty-input" />
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showComplete = false">取消</button>
          <button class="btn-submit" :disabled="completing" @click="handleComplete">{{ completing ? '入库中...' : '确认入库' }}</button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div class="modal-mask" v-if="showDetail" @click.self="showDetail = false">
      <div class="modal modal-detail">
        <h3>生产工单详情</h3>
        <div class="detail-grid" v-if="detailOrder">
          <div class="detail-row"><span>订单号</span><span>{{ detailOrder.orderNo }}</span></div>
          <div class="detail-row"><span>状态</span><span>{{ statusLabel(detailOrder.orderStatus) }}</span></div>
          <div class="detail-row"><span>门店</span><span>{{ detailOrder.store?.name || '-' }}</span></div>
          <div class="detail-row"><span>金额</span><span>&yen;{{ ((detailOrder.totalAmount || 0) / 100).toFixed(2) }}</span></div>
          <div class="detail-row"><span>创建时间</span><span>{{ formatTime(detailOrder.createdAt) }}</span></div>
        </div>
        <div v-if="detailOrder?.orderItems?.length > 0" style="margin-top:12px">
          <div style="font-weight:600;font-size:14px;margin-bottom:8px">商品明细</div>
          <div class="detail-row" v-for="it in detailOrder.orderItems" :key="it.id">
            <span>{{ it.sku?.skuCode || it.skuId }}</span>
            <span>x{{ it.quantity }}</span>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showDetail = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../api'

// ── List State ──
const list = ref<any[]>([])
const filterStatus = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const loading = ref(true)
const error = ref('')

// ── Create State ──
const showCreate = ref(false)
const creating = ref(false)
const createForm = ref({ orderId: '', warehouseId: '', notes: '' })
const approvedOrders = ref<any[]>([])
const warehouses = ref<any[]>([])

// ── Complete State ──
const showComplete = ref(false)
const completing = ref(false)
const completeTarget = ref<any>(null)
const completeForm = ref({ warehouseId: '' })
const completeItems = ref<any[]>([])

// ── Detail State ──
const showDetail = ref(false)
const detailOrder = ref<any>(null)

// ── Lifecycle ──
onMounted(() => {
  fetchData()
  fetchWarehouses()
})

// ── Data Fetching ──
async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const params: any = { page: page.value, pageSize }
    if (filterStatus.value) params.status = filterStatus.value
    const res = await api.get('/production/orders', { params })
    list.value = res.data.items || res.data.list || []
    total.value = res.data.total || 0
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function fetchWarehouses() {
  try {
    const res = await api.get('/organizations', { params: { orgType: 'warehouse' } })
    warehouses.value = res.data.items || res.data.list || []
  } catch { /* ignore */ }
}

async function fetchApprovedOrders() {
  try {
    const res = await api.get('/orders', { params: { status: 'approved,pending_production', pageSize: 100 } })
    approvedOrders.value = res.data.items || res.data.list || []
  } catch { /* ignore */ }
}

// ── Create ──
function openCreate() {
  showCreate.value = true
  fetchApprovedOrders()
}

async function handleCreate() {
  if (!createForm.value.orderId) {
    alert('请选择订单')
    return
  }
  creating.value = true
  try {
    await api.post('/production/orders', {
      orderId: createForm.value.orderId,
      warehouseId: createForm.value.warehouseId || undefined,
      notes: createForm.value.notes || undefined,
    })
    showCreate.value = false
    createForm.value = { orderId: '', warehouseId: '', notes: '' }
    fetchData()
  } catch (e: any) {
    alert(e.response?.data?.message || '创建失败')
  } finally {
    creating.value = false
  }
}

// ── Start ──
async function handleStart(orderId: string) {
  if (!confirm('确定开始生产该订单吗？')) return
  try {
    await api.post(`/production/orders/${orderId}/start`)
    fetchData()
  } catch (e: any) {
    alert(e.response?.data?.message || '操作失败')
  }
}

// ── Complete ──
function openCompleteDialog(item: any) {
  completeTarget.value = item
  completeForm.value = { warehouseId: '' }
  completeItems.value = (item.orderItems || []).map((it: any) => ({
    skuId: it.skuId || it.id,
    skuName: it.sku?.skuCode || it.skuId,
    skuCode: it.sku?.skuCode || '',
    lotNo: '',
    quantity: it.quantity,
  }))
  showComplete.value = true
}

async function handleComplete() {
  if (!completeForm.value.warehouseId) {
    alert('请选择入库仓库')
    return
  }
  const items = completeItems.value
    .filter((it) => it.quantity > 0 && it.lotNo)
    .map((it) => ({ skuId: it.skuId, lotNo: it.lotNo, quantity: Number(it.quantity) }))
  if (items.length === 0) {
    alert('请填写入库商品批次号和数量')
    return
  }
  completing.value = true
  try {
    await api.post('/production/complete', {
      orderId: completeTarget.value.id,
      warehouseId: completeForm.value.warehouseId,
      items,
    })
    showComplete.value = false
    fetchData()
  } catch (e: any) {
    alert(e.response?.data?.message || '入库失败')
  } finally {
    completing.value = false
  }
}

// ── Detail ──
async function viewDetail(item: any) {
  try {
    const res = await api.get(`/orders/${item.id}`)
    detailOrder.value = res.data
    showDetail.value = true
  } catch (e: any) {
    alert(e.response?.data?.message || '加载详情失败')
  }
}

// ── Helpers ──
function statusLabel(s: string) {
  const map: any = {
    pending_production: '待生产', in_production: '生产中',
    partially_produced: '部分完成', produced: '已完成',
    pending_approval: '待审核', approved: '已审核',
  }
  return map[s] || s
}

function statusTag(s: string) {
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
</script>

<style scoped>
.production { max-width: 1200px; }
h2 { font-size: 20px; margin-bottom: 16px; }
h3 { font-size: 18px; margin-bottom: 16px; }

.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.toolbar select { padding: 6px 12px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 14px; }
.btn-create { padding: 8px 20px; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 600; }

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

.actions { display: flex; gap: 6px; }
.btn-action { padding: 4px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; }
.btn-start { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; }
.btn-complete { background: #52c41a; color: #fff; }
.btn-view { background: #f0f0f0; color: #333; }

.pagination { display: flex; align-items: center; gap: 16px; margin-top: 16px; justify-content: center; }
.pagination button { padding: 6px 16px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; cursor: pointer; }
.pagination button:disabled { opacity: .5; cursor: not-allowed; }

/* Modal */
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; border-radius: 12px; padding: 24px; width: 520px; max-height: 80vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,.12); }
.modal-detail { width: 460px; }

.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 14px; color: #333; margin-bottom: 6px; font-weight: 500; }
.form-group select,
.form-group input,
.form-group textarea { width: 100%; padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
.form-group textarea { resize: vertical; }

.item-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f5f5f5; }
.item-name { flex: 1; font-size: 14px; color: #555; }
.lot-input { width: 100px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
.qty-input { width: 70px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; text-align: center; font-size: 14px; }

.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.btn-submit { padding: 8px 24px; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 600; }
.btn-submit:disabled { opacity: .5; cursor: not-allowed; }
.btn-cancel { background: #f0f0f0; color: #333; padding: 8px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }

.detail-grid { margin-bottom: 16px; }
.detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f5f5f5; font-size: 14px; }
.detail-row span:first-child { color: #999; }
</style>
