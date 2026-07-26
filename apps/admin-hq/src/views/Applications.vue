<template>
  <div class="applications">
    <h2>加盟审核</h2>

    <div class="toolbar">
      <select v-model="statusFilter" @change="onFilterChange">
        <option value="">全部</option>
        <option value="submitted">待审核</option>
        <option value="under_review">审核中</option>
        <option value="approved">已通过</option>
        <option value="payment_confirmed">已确认缴费</option>
        <option value="activated">已激活</option>
        <option value="rejected">已驳回</option>
        <option value="cancelled">已取消</option>
      </select>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <table v-else>
      <thead>
        <tr>
          <th>申请人</th>
          <th>门店名称</th>
          <th>联系电话</th>
          <th>城市</th>
          <th>投资预算</th>
          <th>状态</th>
          <th>申请时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="list.length === 0">
          <td colspan="8" class="empty">暂无申请</td>
        </tr>
        <tr v-for="item in list" :key="item.id">
          <td>{{ item.applicantName || '-' }}</td>
          <td>{{ item.storeName || '-' }}</td>
          <td>{{ item.applicantPhone || '-' }}</td>
          <td>{{ item.city || '-' }}</td>
          <td>
            <template v-if="item.investmentBudget">
              &yen;{{ Number(item.investmentBudget).toLocaleString() }}
            </template>
            <template v-else>-</template>
          </td>
          <td>
            <span :class="'status-tag status-' + item.status">{{ statusLabel(item.status) }}</span>
          </td>
          <td>{{ formatDate(item.createdAt) }}</td>
          <td class="actions">
            <!-- submitted: Start Review -->
            <template v-if="item.status === 'submitted'">
              <button v-if="expandedAppId !== item.id" class="btn btn-primary" @click="startReview(item.id)">开始审核</button>
              <template v-else>
                <button class="btn btn-success" @click="handleApprove(item.id)">通过</button>
                <template v-if="rejectingAppId === item.id">
                  <textarea v-model="rejectReason" class="reject-reason" placeholder="请输入驳回原因"></textarea>
                  <button class="btn btn-danger" :disabled="!rejectReason" @click="handleReject(item.id)">确认驳回</button>
                  <button class="btn btn-default" @click="cancelReject()">取消</button>
                </template>
                <button v-else class="btn btn-danger" @click="showRejectInput(item.id)">驳回</button>
              </template>
            </template>

            <!-- under_review: Approve + Reject with reason textarea -->
            <template v-else-if="item.status === 'under_review'">
              <button class="btn btn-success" @click="handleApprove(item.id)">通过</button>
              <template v-if="rejectingAppId === item.id">
                <textarea v-model="rejectReason" class="reject-reason" placeholder="请输入驳回原因"></textarea>
                <button class="btn btn-danger" :disabled="!rejectReason" @click="handleReject(item.id)">确认驳回</button>
                <button class="btn btn-default" @click="cancelReject()">取消</button>
              </template>
              <button v-else class="btn btn-danger" @click="showRejectInput(item.id)">驳回</button>
            </template>

            <!-- approved: Confirm Payment with remark input -->
            <template v-else-if="item.status === 'approved'">
              <template v-if="confirmingAppId === item.id">
                <input v-model="paymentRemark" class="remark-input" placeholder="备注（可选）" />
                <button class="btn btn-primary" @click="handleConfirmPayment(item.id)">确认</button>
                <button class="btn btn-default" @click="cancelConfirmPayment()">取消</button>
              </template>
              <button v-else class="btn btn-purple" @click="showConfirmPayment(item.id)">确认缴费</button>
            </template>

            <!-- payment_confirmed: Activate -->
            <template v-else-if="item.status === 'payment_confirmed'">
              <button class="btn btn-green-dark" @click="handleActivate(item.id)">激活</button>
            </template>

            <!-- terminal statuses: no action -->
            <template v-else>
              <span class="no-action">-</span>
            </template>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="pagination" v-if="total > pageSize">
      <button :disabled="page <= 1" @click="page--; fetchData()">上一页</button>
      <span>第 {{ page }} / {{ Math.ceil(total / pageSize) }} 页（共 {{ total }} 条）</span>
      <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++; fetchData()">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../api'

const list = ref<any[]>([])
const statusFilter = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const loading = ref(true)
const error = ref('')

const expandedAppId = ref<string | null>(null)
const rejectingAppId = ref<string | null>(null)
const rejectReason = ref('')
const confirmingAppId = ref<string | null>(null)
const paymentRemark = ref('')

const statusLabelMap: Record<string, string> = {
  submitted: '待审核',
  under_review: '审核中',
  approved: '已通过',
  payment_confirmed: '已确认缴费',
  activated: '已激活',
  rejected: '已驳回',
  cancelled: '已取消',
}

function statusLabel(status: string): string {
  return statusLabelMap[status] || status
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
    const params: any = { page: page.value, pageSize }
    if (statusFilter.value) params.status = statusFilter.value
    const res = await api.get('/franchise/applications', { params })
    list.value = res.data.items || res.data.list || []
    total.value = res.data.total || 0
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

function startReview(id: string) {
  expandedAppId.value = id
}

function showRejectInput(id: string) {
  rejectingAppId.value = id
  rejectReason.value = ''
}

function cancelReject() {
  rejectingAppId.value = null
  rejectReason.value = ''
  expandedAppId.value = null
}

async function handleApprove(id: string) {
  try {
    await api.post(`/franchise/applications/${id}/review`, { approved: true })
    expandedAppId.value = null
    rejectingAppId.value = null
    fetchData()
  } catch (e: any) {
    alert(e.response?.data?.message || '操作失败')
  }
}

async function handleReject(id: string) {
  if (!rejectReason.value) return
  try {
    await api.post(`/franchise/applications/${id}/review`, {
      approved: false,
      comment: rejectReason.value,
    })
    rejectingAppId.value = null
    rejectReason.value = ''
    expandedAppId.value = null
    fetchData()
  } catch (e: any) {
    alert(e.response?.data?.message || '操作失败')
  }
}

function showConfirmPayment(id: string) {
  confirmingAppId.value = id
  paymentRemark.value = ''
}

function cancelConfirmPayment() {
  confirmingAppId.value = null
  paymentRemark.value = ''
}

async function handleConfirmPayment(id: string) {
  try {
    await api.post(`/franchise/applications/${id}/confirm-payment`, {
      remark: paymentRemark.value || undefined,
    })
    confirmingAppId.value = null
    paymentRemark.value = ''
    fetchData()
  } catch (e: any) {
    alert(e.response?.data?.message || '操作失败')
  }
}

async function handleActivate(id: string) {
  if (!confirm('确认激活该加盟店？激活后将创建门店组织及账户。')) return
  try {
    await api.post(`/franchise/applications/${id}/activate`)
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
.toolbar { margin-bottom: 16px; }
.toolbar select { padding: 6px 12px; border: 1px solid #d9d9d9; border-radius: 4px; }
table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
th { background: #fafafa; font-weight: 600; white-space: nowrap; }
.loading, .error { text-align: center; padding: 40px; color: #999; }
.error { color: #ff4d4f; }
.empty { text-align: center; color: #999; }
.actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.btn {
  display: inline-block; padding: 4px 12px; border: none; border-radius: 4px;
  font-size: 13px; cursor: pointer; white-space: nowrap;
}
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn-primary { background: #1890ff; color: #fff; }
.btn-success { background: #52c41a; color: #fff; }
.btn-danger { background: #ff4d4f; color: #fff; }
.btn-purple { background: #722ed1; color: #fff; }
.btn-green-dark { background: #237804; color: #fff; }
.btn-default { background: #f5f5f5; color: #333; border: 1px solid #d9d9d9; }
.reject-reason { width: 150px; padding: 4px 8px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 13px; resize: vertical; }
.remark-input { width: 120px; padding: 4px 8px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 13px; }
.no-action { color: #ccc; }
.status-tag {
  display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: 500;
}
.status-submitted { background: #e6f7ff; color: #1890ff; }
.status-under_review { background: #fff7e6; color: #fa8c16; }
.status-approved { background: #f6ffed; color: #52c41a; }
.status-payment_confirmed { background: #f9f0ff; color: #722ed1; }
.status-activated { background: #d9f7be; color: #237804; }
.status-rejected { background: #fff2f0; color: #ff4d4f; }
.status-cancelled { background: #fafafa; color: #999; }
.pagination { display: flex; align-items: center; gap: 16px; margin-top: 16px; justify-content: center; }
.pagination button { padding: 6px 16px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; cursor: pointer; }
.pagination button:disabled { opacity: .5; cursor: not-allowed; }
</style>
