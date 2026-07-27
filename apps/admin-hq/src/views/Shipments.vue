<template>
  <div class="shipments">
    <h2>发货管理</h2>

    <!-- Toolbar -->
    <div class="toolbar">
      <select v-model="filterStatus" @change="fetchData">
        <option value="">全部状态</option>
        <option value="pending">待发货</option>
        <option value="shipped">已发货</option>
        <option value="in_transit">运输中</option>
        <option value="partially_received">部分签收</option>
        <option value="received">已签收</option>
        <option value="cancelled">已取消</option>
      </select>
      <button class="btn-create" @click="openCreate">+ 新建发货单</button>
    </div>

    <!-- Loading/Error -->
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <!-- Table -->
    <table v-else>
      <thead>
        <tr>
          <th>发货单号</th>
          <th>关联订单</th>
          <th>发货仓库</th>
          <th>收货门店</th>
          <th>承运方</th>
          <th>运单号</th>
          <th>状态</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="list.length === 0">
          <td colspan="9" class="empty">暂无发货单</td>
        </tr>
        <tr v-for="item in list" :key="item.id">
          <td>{{ item.shipmentNo }}</td>
          <td>{{ item.order?.orderNo || '-' }}</td>
          <td>{{ item.fromWarehouse?.name || '-' }}</td>
          <td>{{ item.toStore?.name || '-' }}</td>
          <td>{{ item.carrier || '-' }}</td>
          <td>{{ item.trackingNo || '-' }}</td>
          <td><span class="tag" :class="statusTag(item.status)">{{ statusLabel(item.status) }}</span></td>
          <td>{{ formatTime(item.createdAt) }}</td>
          <td class="actions">
            <button
              v-if="item.trackingNo"
              class="btn-action btn-track"
              @click="openTrack(item)"
            >物流</button>
            <button
              v-if="item.status === 'pending'"
              class="btn-action btn-ship"
              @click="openShipDialog(item)"
            >发货</button>
            <button
              v-if="item.status === 'pending'"
              class="btn-action btn-cancel"
              @click="handleCancel(item.id)"
            >取消</button>
            <button
              v-else
              class="btn-action btn-view"
              @click="viewDetail(item)"
            >查看</button>
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
        <h3>新建发货单</h3>
        <div class="form-group">
          <label>关联订单</label>
          <select v-model="createForm.orderId" @change="onOrderChange">
            <option value="">请选择订单</option>
            <option v-for="o in availableOrders" :key="o.id" :value="o.id">
              {{ o.orderNo }} - {{ o.store?.name || '' }} ({{ statusLabel(o.orderStatus) }})
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>发货仓库</label>
          <select v-model="createForm.fromWarehouseId">
            <option value="">请选择仓库</option>
            <option v-for="w in warehouses" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>
        </div>
        <div class="form-group" v-if="orderItems.length > 0">
          <label>发货商品</label>
          <div class="item-row" v-for="it in orderItems" :key="it.skuId">
            <span class="item-name">{{ it.skuName || it.skuId }}</span>
            <input
              type="number"
              v-model="it.shipQty"
              :max="it.maxQty"
              :min="0"
              placeholder="0"
              class="qty-input"
            />
            <span class="item-max">/ {{ it.maxQty }}</span>
          </div>
        </div>
        <div class="form-group">
          <label>承运方</label>
          <input v-model="createForm.carrier" type="text" placeholder="选填" />
        </div>
        <div class="form-group">
          <label>运单号</label>
          <input v-model="createForm.trackingNo" type="text" placeholder="选填" />
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

    <!-- Ship Dialog -->
    <div class="modal-mask" v-if="showShip" @click.self="showShip = false">
      <div class="modal">
        <h3>确认发货</h3>
        <p>发货单号: {{ shipTarget?.shipmentNo }}</p>
        <div class="form-group">
          <label>承运方</label>
          <input v-model="shipForm.carrier" type="text" placeholder="选填" />
        </div>
        <div class="form-group">
          <label>运单号</label>
          <input v-model="shipForm.trackingNo" type="text" placeholder="选填" />
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showShip = false">取消</button>
          <button class="btn-submit" :disabled="shipping" @click="handleShip">{{ shipping ? '发货中...' : '确认发货' }}</button>
        </div>
      </div>
    </div>

    <!-- Track Dialog -->
    <div class="modal-mask" v-if="showTrack" @click.self="showTrack = false">
      <div class="modal">
        <h3>物流查询</h3>
        <p class="track-info">物流查询功能预留，当前单号: {{ trackTarget?.trackingNo }}</p>
        <div class="form-group">
          <label>运单号</label>
          <input v-model="trackInput" type="text" placeholder="输入运单号查询" />
        </div>
        <p v-if="trackQueryMsg" class="track-msg">{{ trackQueryMsg }}</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showTrack = false">关闭</button>
          <button class="btn-submit" @click="mockTrack">查询</button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div class="modal-mask" v-if="showDetail" @click.self="showDetail = false">
      <div class="modal modal-detail">
        <h3>发货单详情</h3>
        <div class="detail-grid" v-if="detailShipment">
          <div class="detail-row"><span>发货单号</span><span>{{ detailShipment.shipmentNo }}</span></div>
          <div class="detail-row"><span>状态</span><span>{{ statusLabel(detailShipment.status) }}</span></div>
          <div class="detail-row"><span>订单号</span><span>{{ detailShipment.order?.orderNo || '-' }}</span></div>
          <div class="detail-row"><span>发货仓库</span><span>{{ detailShipment.fromWarehouse?.name || '-' }}</span></div>
          <div class="detail-row"><span>收货门店</span><span>{{ detailShipment.toStore?.name || '-' }}</span></div>
          <div class="detail-row"><span>承运方</span><span>{{ detailShipment.carrier || '-' }}</span></div>
          <div class="detail-row"><span>运单号</span><span>{{ detailShipment.trackingNo || '-' }}</span></div>
          <div class="detail-row"><span>发货时间</span><span>{{ formatTime(detailShipment.shippedAt) }}</span></div>
          <div class="detail-row"><span>创建时间</span><span>{{ formatTime(detailShipment.createdAt) }}</span></div>
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
const createForm = ref({
  orderId: '',
  fromWarehouseId: '',
  carrier: '',
  trackingNo: '',
  notes: '',
})
const availableOrders = ref<any[]>([])
const warehouses = ref<any[]>([])
const orderItems = ref<any[]>([])

// ── Ship State ──
const showShip = ref(false)
const shipping = ref(false)
const shipTarget = ref<any>(null)
const shipForm = ref({ carrier: '', trackingNo: '' })

// ── Detail State ──
const showDetail = ref(false)
const detailShipment = ref<any>(null)

// ── Track State ──
const showTrack = ref(false)
const trackTarget = ref<any>(null)
const trackInput = ref('')
const trackQueryMsg = ref('')

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
    const res = await api.get('/shipment', { params })
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

async function fetchAvailableOrders() {
  try {
    const res = await api.get('/orders', { params: { status: 'produced,partially_shipped', pageSize: 100 } })
    availableOrders.value = res.data.items || res.data.list || []
  } catch { /* ignore */ }
}

async function onOrderChange() {
  orderItems.value = []
  if (!createForm.value.orderId) return
  try {
    const res = await api.get(`/orders/${createForm.value.orderId}`)
    const order = res.data
    orderItems.value = (order.items || []).map((it: any) => ({
      skuId: it.skuId || it.id,
      skuName: it.skuName || it.skuCode || it.skuId,
      maxQty: it.quantity - (it.shippedQty || 0),
      shipQty: 0,
    }))
  } catch { /* ignore */ }
}

// ── Create ──
function openCreate() {
  showCreate.value = true
  fetchAvailableOrders()
}

async function handleCreate() {
  if (!createForm.value.orderId || !createForm.value.fromWarehouseId) {
    alert('请选择订单和发货仓库')
    return
  }
  const items = orderItems.value
    .filter((it) => it.shipQty > 0)
    .map((it) => ({ skuId: it.skuId, quantity: it.shipQty }))
  if (items.length === 0) {
    alert('请填写发货数量')
    return
  }
  creating.value = true
  try {
    await api.post('/shipment', {
      orderId: createForm.value.orderId,
      fromWarehouseId: createForm.value.fromWarehouseId,
      carrier: createForm.value.carrier || undefined,
      trackingNo: createForm.value.trackingNo || undefined,
      notes: createForm.value.notes || undefined,
      items,
    })
    showCreate.value = false
    resetCreateForm()
    fetchData()
  } catch (e: any) {
    alert(e.response?.data?.message || '创建失败')
  } finally {
    creating.value = false
  }
}

function resetCreateForm() {
  createForm.value = { orderId: '', fromWarehouseId: '', carrier: '', trackingNo: '', notes: '' }
  orderItems.value = []
}

// ── Ship ──
function openShipDialog(item: any) {
  shipTarget.value = item
  shipForm.value = { carrier: item.carrier || '', trackingNo: item.trackingNo || '' }
  showShip.value = true
}

async function handleShip() {
  if (!shipTarget.value) return
  shipping.value = true
  try {
    await api.post(`/shipment/${shipTarget.value.id}/ship`, {
      carrier: shipForm.value.carrier || undefined,
      trackingNo: shipForm.value.trackingNo || undefined,
    })
    showShip.value = false
    fetchData()
  } catch (e: any) {
    alert(e.response?.data?.message || '发货失败')
  } finally {
    shipping.value = false
  }
}

// ── Cancel ──
async function handleCancel(id: string) {
  if (!confirm('确定要取消该发货单吗？')) return
  try {
    await api.post(`/shipment/${id}/cancel`)
    fetchData()
  } catch (e: any) {
    alert(e.response?.data?.message || '取消失败')
  }
}

// ── Detail ──
async function viewDetail(item: any) {
  try {
    const res = await api.get(`/shipment/${item.id}`)
    detailShipment.value = res.data
    showDetail.value = true
  } catch (e: any) {
    alert(e.response?.data?.message || '加载详情失败')
  }
}

// ── Track ──
function openTrack(item: any) {
  trackTarget.value = item
  trackInput.value = item.trackingNo || ''
  trackQueryMsg.value = ''
  showTrack.value = true
}

function mockTrack() {
  const no = trackInput.value || trackTarget.value?.trackingNo || ''
  trackQueryMsg.value = `物流查询功能预留，当前单号: ${no}`
}

// ── Helpers ──
function statusLabel(s: string) {
  const map: any = {
    pending: '待发货', shipped: '已发货', in_transit: '运输中',
    partially_received: '部分签收', received: '已签收', cancelled: '已取消',
    pending_approval: '待审核', approved: '已审核', produced: '已生产',
    partially_shipped: '部分发货',
  }
  return map[s] || s
}

function statusTag(s: string) {
  const map: any = {
    pending: 'tag-warning', shipped: 'tag-primary', in_transit: 'tag-info',
    partially_received: 'tag-warning', received: 'tag-success', cancelled: 'tag-danger',
  }
  return map[s] || ''
}

function formatTime(t: string) {
  if (!t) return '-'
  return t.substring(0, 16).replace('T', ' ')
}
</script>

<style scoped>
.shipments { max-width: 1200px; }
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
.tag-primary { background: #e6f0ff; color: #667eea; }
.tag-info { background: #e6fffb; color: #13c2c2; }
.tag-success { background: #f6ffed; color: #52c41a; }
.tag-danger { background: #fff2f0; color: #ff4d4f; }

.actions { display: flex; gap: 6px; }
.btn-action { padding: 4px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; }
.btn-ship { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; }
.btn-track { background: #13c2c2; color: #fff; }
.btn-cancel { background: #ff4d4f; color: #fff; padding: 8px 20px; border: none; border-radius: 4px; cursor: pointer; }
.btn-view { background: #f0f0f0; color: #333; }

.pagination { display: flex; align-items: center; gap: 16px; margin-top: 16px; justify-content: center; }
.pagination button { padding: 6px 16px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; cursor: pointer; }
.pagination button:disabled { opacity: .5; cursor: not-allowed; }

/* Modal */
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; border-radius: 12px; padding: 24px; width: 560px; max-height: 80vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,.12); }
.modal-detail { width: 480px; }

.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-size: 14px; color: #333; margin-bottom: 6px; font-weight: 500; }
.form-group select,
.form-group input,
.form-group textarea { width: 100%; padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
.form-group textarea { resize: vertical; }

.item-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f5f5f5; }
.item-name { flex: 1; font-size: 14px; color: #555; }
.item-max { font-size: 13px; color: #999; }
.qty-input { width: 70px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; text-align: center; font-size: 14px; }

.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.btn-submit { padding: 8px 24px; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 600; }
.btn-submit:disabled { opacity: .5; cursor: not-allowed; }

.detail-grid { margin-bottom: 16px; }
.detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f5f5f5; font-size: 14px; }
.detail-row span:first-child { color: #999; }

.track-info { font-size: 14px; color: #667eea; margin-bottom: 16px; padding: 10px; background: #f6f7ff; border-radius: 4px; }
.track-msg { font-size: 14px; color: #13c2c2; margin-top: 12px; padding: 8px; background: #e6fffb; border-radius: 4px; }
</style>
