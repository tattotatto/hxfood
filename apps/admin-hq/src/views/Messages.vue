<template>
  <div class="messages">
    <h2>消息管理</h2>

    <div class="toolbar">
      <button class="btn-primary" @click="openCreateModal">+ 新建模板</button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <table v-else>
      <thead>
        <tr>
          <th>模板标题</th>
          <th>类型</th>
          <th>状态</th>
          <th>更新时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="list.length === 0">
          <td colspan="5" class="empty">暂无消息模板</td>
        </tr>
        <tr v-for="item in list" :key="item.id">
          <td>{{ item.title }}</td>
          <td>
            <span :class="['type-tag', typeClass(item.type)]">{{ item.type }}</span>
          </td>
          <td>
            <span :class="['status-tag', item.status === '启用' ? 'status-active' : 'status-inactive']">
              {{ item.status }}
            </span>
          </td>
          <td>{{ formatDate(item.updatedAt) }}</td>
          <td class="actions">
            <button class="btn-send" @click="openSendModal(item)">发送</button>
            <button
              class="btn-small"
              @click="toggleStatus(item)"
            >
              {{ item.status === '启用' ? '停用' : '启用' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Send Modal -->
    <div v-if="sendModalVisible" class="modal-overlay" @click.self="closeSendModal">
      <div class="modal">
        <div class="modal-header">
          <h3>发送消息 - {{ currentTemplate?.title }}</h3>
          <span class="modal-close" @click="closeSendModal">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>发送方式</label>
            <select v-model="sendForm.targetType">
              <option value="all">全部</option>
              <option value="store">按门店</option>
            </select>
          </div>
          <div class="form-group" v-if="sendForm.targetType === 'store'">
            <label>选择门店</label>
            <select v-model="sendForm.storeId">
              <option value="">请选择门店</option>
              <option value="store1">朝阳门店</option>
              <option value="store2">海淀门店</option>
              <option value="store3">总部直营店</option>
              <option value="store4">丰台门店</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeSendModal">取消</button>
          <button class="btn-submit" @click="confirmSend">确认发送</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../api'

const list = ref<any[]>([])
const loading = ref(true)
const error = ref('')

const sendModalVisible = ref(false)
const currentTemplate = ref<any>(null)
const sendForm = ref({
  targetType: 'all',
  storeId: '',
})

const mockMessages = [
  { id: '1', title: '新品上线通知模板', type: '促销活动', status: '启用', updatedAt: '2025-07-01T10:00:00Z' },
  { id: '2', title: '订单发货提醒', type: '订单提醒', status: '启用', updatedAt: '2025-06-28T14:00:00Z' },
  { id: '3', title: '系统维护公告', type: '系统通知', status: '停用', updatedAt: '2025-06-15T09:00:00Z' },
  { id: '4', title: '会员日优惠通知', type: '促销活动', status: '启用', updatedAt: '2025-07-10T16:30:00Z' },
  { id: '5', title: '加盟政策更新', type: '系统通知', status: '启用', updatedAt: '2025-07-12T11:00:00Z' },
]

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function typeClass(type: string): string {
  const map: Record<string, string> = {
    '系统通知': 'type-system',
    '促销活动': 'type-promo',
    '订单提醒': 'type-order',
  }
  return map[type] || ''
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/messages/templates')
    list.value = res.data.items || res.data.list || res.data || []
  } catch (e: any) {
    list.value = mockMessages
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  alert('新建模板功能（Mock）')
}

function openSendModal(template: any) {
  currentTemplate.value = template
  sendForm.value = { targetType: 'all', storeId: '' }
  sendModalVisible.value = true
}

function closeSendModal() {
  sendModalVisible.value = false
  currentTemplate.value = null
}

function confirmSend() {
  if (sendForm.value.targetType === 'store' && !sendForm.value.storeId) {
    alert('请选择门店')
    return
  }
  const target = sendForm.value.targetType === 'all' ? '全部用户' : sendForm.value.storeId
  alert(`消息 "${currentTemplate.value?.title}" 已发送至: ${target}`)
  closeSendModal()
}

function toggleStatus(item: any) {
  const newStatus = item.status === '启用' ? '停用' : '启用'
  const action = newStatus === '启用' ? '启用' : '停用'
  if (confirm(`确认${action}该模板？`)) {
    item.status = newStatus
  }
}

onMounted(fetchData)
</script>

<style scoped>
.messages { max-width: 1200px; }
h2 { font-size: 20px; margin-bottom: 16px; }
.toolbar { margin-bottom: 16px; }
.btn-primary {
  padding: 8px 20px; color: #fff; border: none; border-radius: 4px; cursor: pointer;
  background: linear-gradient(135deg, #667eea, #764ba2);
  font-size: 14px;
}
table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
th { background: #fafafa; font-weight: 600; }
.loading, .error { text-align: center; padding: 40px; color: #999; }
.error { color: #ff4d4f; }
.empty { text-align: center; color: #999; }
.actions { display: flex; gap: 8px; }

.btn-send {
  padding: 4px 12px; background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;
}
.btn-small {
  padding: 4px 12px; background: #f5f5f5; color: #333; border: 1px solid #d9d9d9;
  border-radius: 4px; cursor: pointer; font-size: 13px;
}

.type-tag { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: 500; }
.type-system { background: #e6f7ff; color: #1890ff; }
.type-promo { background: #fff7e6; color: #fa8c16; }
.type-order { background: #f6ffed; color: #52c41a; }

.status-tag { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: 500; }
.status-active { background: #f6ffed; color: #52c41a; }
.status-inactive { background: #fafafa; color: #999; }

/* Modal */
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal {
  background: #fff; border-radius: 8px; width: 500px; max-width: 90vw; box-shadow: 0 4px 24px rgba(0,0,0,.15);
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px; border-bottom: 1px solid #f0f0f0;
}
.modal-header h3 { margin: 0; font-size: 16px; }
.modal-close { font-size: 22px; cursor: pointer; color: #999; line-height: 1; }
.modal-close:hover { color: #333; }
.modal-body { padding: 24px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 0 24px 24px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-size: 14px; color: #333; }
.form-group select {
  width: 100%; padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 4px;
  font-size: 14px; box-sizing: border-box;
}
.btn-cancel {
  padding: 8px 20px; background: #f5f5f5; color: #333; border: 1px solid #d9d9d9;
  border-radius: 4px; cursor: pointer; font-size: 14px;
}
.btn-submit {
  padding: 8px 20px; color: #fff; border: none; border-radius: 4px; cursor: pointer;
  background: linear-gradient(135deg, #667eea, #764ba2); font-size: 14px;
}
</style>
