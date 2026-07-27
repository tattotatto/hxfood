<template>
  <div class="finance">
    <h2>财务管理</h2>

    <!-- 标签页切换 -->
    <div class="tabs">
      <button :class="['tab', { active: activeTab === 'accounts' }]" @click="activeTab = 'accounts'">账户管理</button>
      <button :class="['tab', { active: activeTab === 'overdue' }]" @click="activeTab = 'overdue'; fetchOverdue()">逾期应收</button>
    </div>

    <!-- 账户管理 -->
    <div v-if="activeTab === 'accounts'">
      <div class="toolbar">
        <button class="btn-primary" @click="showRechargeDialog = true">充值</button>
      </div>

      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <table v-else>
        <thead>
          <tr>
            <th>门店ID</th>
            <th>余额（元）</th>
            <th>信用额度</th>
            <th>冻结金额</th>
            <th>状态</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="accounts.length === 0">
            <td colspan="7" class="empty">暂无账户数据</td>
          </tr>
          <tr v-for="item in accounts" :key="item.storeId || item.id">
            <td>{{ item.storeName || item.name || item.storeId }}</td>
            <td>&yen;{{ item.balance }}</td>
            <td>&yen;{{ item.creditLimit || 0 }}</td>
            <td>&yen;{{ item.frozenAmount || item.frozen || 0 }}</td>
            <td>{{ item.status }}</td>
            <td>{{ item.updatedAt }}</td>
            <td>
              <button class="btn-sm" @click="openRecharge(item)">充值</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 逾期应收 -->
    <div v-if="activeTab === 'overdue'">
      <div class="toolbar">
        <button class="btn-primary" @click="checkOverdue">同步逾期状态</button>
        <span v-if="checkResult" class="check-msg">{{ checkResult }}</span>
      </div>

      <div v-if="overdueLoading" class="loading">加载中...</div>
      <div v-else-if="overdueError" class="error">{{ overdueError }}</div>
      <table v-else>
        <thead>
          <tr>
            <th>门店</th>
            <th>订单号</th>
            <th>应收金额</th>
            <th>已付金额</th>
            <th>到期日</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="overdueList.length === 0">
            <td colspan="6" class="empty">暂无逾期记录</td>
          </tr>
          <tr v-for="item in overdueList" :key="item.id">
            <td>{{ item.store?.name || item.storeId }}</td>
            <td>{{ item.order?.orderNo || item.orderId }}</td>
            <td>&yen;{{ (item.amount / 100).toFixed(2) }}</td>
            <td>&yen;{{ (item.paidAmount / 100).toFixed(2) }}</td>
            <td>{{ item.dueDate }}</td>
            <td>
              <span :class="'tag tag-' + item.status">{{ statusMap[item.status] || item.status }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 充值弹窗 -->
    <div v-if="showRechargeDialog" class="modal-overlay" @click.self="showRechargeDialog = false">
      <div class="modal">
        <h3>账户充值</h3>
        <div class="form-item">
          <label>门店</label>
          <select v-model="rechargeForm.storeId">
            <option value="">请选择门店</option>
            <option v-for="acc in accounts" :key="acc.storeId || acc.id" :value="acc.storeId || acc.id">
              {{ acc.storeName || acc.name || acc.storeId }}
            </option>
          </select>
        </div>
        <div class="form-item">
          <label>充值金额（元）</label>
          <input type="number" v-model="rechargeForm.amountYuan" min="0.01" step="0.01" placeholder="请输入金额" />
        </div>
        <div class="form-item">
          <label>备注</label>
          <input type="text" v-model="rechargeForm.remark" placeholder="选填" />
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showRechargeDialog = false">取消</button>
          <button class="btn-primary" @click="doRecharge" :disabled="recharging">
            {{ recharging ? '充值中...' : '确认充值' }}
          </button>
        </div>
        <div v-if="rechargeMsg" :class="['form-msg', rechargeOk ? 'msg-success' : 'msg-error']">
          {{ rechargeMsg }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../api'

const activeTab = ref('accounts')
const accounts = ref<any[]>([])
const loading = ref(true)
const error = ref('')

// 充值弹窗
const showRechargeDialog = ref(false)
const recharging = ref(false)
const rechargeMsg = ref('')
const rechargeOk = ref(false)
const rechargeForm = ref({ storeId: '', amountYuan: '', remark: '' })

// 逾期应收
const overdueList = ref<any[]>([])
const overdueLoading = ref(false)
const overdueError = ref('')
const checkResult = ref('')

const statusMap: Record<string, string> = {
  pending: '待付',
  partial: '部分付',
  paid: '已付',
  overdue: '已逾期',
}

onMounted(fetchAccounts)

async function fetchAccounts() {
  loading.value = true
  error.value = ''
  try {
    // 尝试获取所有门店账户列表 — 使用门店列表作为数据源
    const res = await api.get('/organizations', { params: { type: 'franchise_store' } })
    const stores = res.data.items || res.data || []
    // 同时尝试获取各门店账户余额
    const accountsData = []
    for (const store of stores) {
      try {
        const accRes = await api.get('/finance/my-account', {
          headers: { 'X-Store-Id': store.id },
        }).catch(() => null)
        if (accRes?.data) {
          accountsData.push({ ...accRes.data, storeName: store.name, storeId: store.id })
        } else {
          accountsData.push({ storeId: store.id, storeName: store.name, balance: '0.00', creditLimit: '0.00', frozenAmount: '0.00', status: 'unknown', updatedAt: '' })
        }
      } catch {
        accountsData.push({ storeId: store.id, storeName: store.name, balance: '0.00', creditLimit: '0.00', frozenAmount: '0.00', status: 'unknown', updatedAt: '' })
      }
    }
    accounts.value = accountsData
  } catch (e: any) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function openRecharge(item: any) {
  rechargeForm.value = {
    storeId: item.storeId || item.id,
    amountYuan: '',
    remark: '',
  }
  rechargeMsg.value = ''
  showRechargeDialog.value = true
}

async function doRecharge() {
  const amountYuan = parseFloat(rechargeForm.value.amountYuan)
  if (!rechargeForm.value.storeId || isNaN(amountYuan) || amountYuan <= 0) {
    rechargeMsg.value = '请选择门店并输入有效金额'
    rechargeOk.value = false
    return
  }
  recharging.value = true
  rechargeMsg.value = ''
  try {
    const amountFen = Math.round(amountYuan * 100)
    await api.post('/payment/recharge', {
      storeId: rechargeForm.value.storeId,
      amountFen,
      remark: rechargeForm.value.remark || undefined,
    })
    rechargeMsg.value = '充值成功'
    rechargeOk.value = true
    showRechargeDialog.value = false
    await fetchAccounts()
  } catch (e: any) {
    rechargeMsg.value = e.response?.data?.message || e.message || '充值失败'
    rechargeOk.value = false
  } finally {
    recharging.value = false
  }
}

async function fetchOverdue() {
  overdueLoading.value = true
  overdueError.value = ''
  try {
    const res = await api.get('/finance/receivables/overdue')
    overdueList.value = res.data || []
  } catch (e: any) {
    overdueError.value = e.message || '加载失败'
  } finally {
    overdueLoading.value = false
  }
}

async function checkOverdue() {
  try {
    const res = await api.post('/finance/receivables/check-overdue')
    checkResult.value = `已更新 ${res.data.updated} 条逾期记录，当前逾期总数 ${res.data.overdueCount}`
    await fetchOverdue()
  } catch (e: any) {
    checkResult.value = '同步失败: ' + (e.message || '')
  }
}
</script>

<style scoped>
.finance { max-width: 1200px; }
h2 { font-size: 20px; margin-bottom: 16px; }
.tabs { display: flex; gap: 0; margin-bottom: 16px; border-bottom: 2px solid #f0f0f0; }
.tab { padding: 8px 20px; border: none; background: none; cursor: pointer; font-size: 14px; color: #666; border-bottom: 2px solid transparent; margin-bottom: -2px; }
.tab.active { color: #667eea; border-bottom-color: #667eea; font-weight: 600; }
.toolbar { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.btn-primary { padding: 8px 16px; background: #667eea; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.btn-sm { padding: 4px 10px; background: #667eea; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
.check-msg { font-size: 13px; color: #52c41a; }
table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
th { background: #fafafa; font-weight: 600; }
.loading, .error { text-align: center; padding: 40px; color: #999; }
.error { color: #ff4d4f; }
.empty { text-align: center; color: #999; }
.tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.tag-pending { background: #fff7e6; color: #fa8c16; }
.tag-partial { background: #e6f7ff; color: #1890ff; }
.tag-paid { background: #f6ffed; color: #52c41a; }
.tag-overdue { background: #fff2f0; color: #ff4d4f; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; border-radius: 8px; padding: 24px; width: 420px; box-shadow: 0 4px 12px rgba(0,0,0,.15); }
.modal h3 { margin-bottom: 20px; font-size: 18px; }
.form-item { margin-bottom: 16px; }
.form-item label { display: block; margin-bottom: 6px; font-size: 14px; color: #333; }
.form-item input, .form-item select { width: 100%; padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }
.btn-cancel { padding: 8px 16px; background: #fff; color: #666; border: 1px solid #d9d9d9; border-radius: 4px; cursor: pointer; }
.form-msg { margin-top: 12px; padding: 8px; border-radius: 4px; font-size: 13px; }
.msg-success { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
.msg-error { background: #fff2f0; color: #ff4d4f; border: 1px solid #ffccc7; }
</style>
