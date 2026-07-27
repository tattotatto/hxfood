<template>
  <div class="warehouses">
    <h2>仓库管理</h2>

    <div class="toolbar">
      <button class="btn-primary" @click="openCreateModal">+ 新建仓库</button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <table v-else>
      <thead>
        <tr>
          <th>仓库名称</th>
          <th>类型</th>
          <th>所属组织</th>
          <th>地址</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="list.length === 0">
          <td colspan="6" class="empty">暂无仓库数据</td>
        </tr>
        <tr v-for="item in list" :key="item.id">
          <td>{{ item.name }}</td>
          <td>{{ item.type }}</td>
          <td>{{ item.org?.name || '-' }}</td>
          <td>{{ item.address }}</td>
          <td>
            <span :class="['status-tag', item.status === 'active' ? 'status-active' : 'status-inactive']">
              {{ item.status === 'active' ? '启用' : '停用' }}
            </span>
          </td>
          <td>
            <button class="btn-danger-sm" @click="handleDelete(item.id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Create Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>新建仓库</h3>
          <span class="modal-close" @click="closeModal">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>仓库名称</label>
            <input v-model="form.name" type="text" placeholder="请输入仓库名称" />
          </div>
          <div class="form-group">
            <label>仓库类型</label>
            <select v-model="form.type">
              <option value="">请选择类型</option>
              <option value="总部仓">总部仓</option>
              <option value="中央厨房仓">中央厨房仓</option>
              <option value="门店仓">门店仓</option>
              <option value="供应商仓">供应商仓</option>
            </select>
          </div>
          <div class="form-group">
            <label>所属组织</label>
            <select v-model="form.orgId">
              <option value="">请选择组织</option>
              <option value="1">总部</option>
              <option value="2">中央厨房</option>
              <option value="3">朝阳门店</option>
              <option value="4">食材供应商A</option>
            </select>
          </div>
          <div class="form-group">
            <label>地址</label>
            <textarea v-model="form.address" rows="3" placeholder="请输入仓库地址"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeModal">取消</button>
          <button class="btn-submit" @click="handleCreate">确认创建</button>
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

const showModal = ref(false)
const form = ref({
  name: '',
  type: '',
  orgId: '',
  address: '',
})

const mockWarehouses = [
  { id: '1', name: '总部中心仓', type: '总部仓', org: { name: '总部' }, address: '北京市朝阳区XX路100号', status: 'active' },
  { id: '2', name: '中央厨房原料仓', type: '中央厨房仓', org: { name: '中央厨房' }, address: '北京市大兴区YY路200号', status: 'active' },
  { id: '3', name: '朝阳门店仓', type: '门店仓', org: { name: '朝阳门店' }, address: '北京市朝阳区ZZ路300号', status: 'active' },
  { id: '4', name: '供应商中转仓', type: '供应商仓', org: { name: '食材供应商A' }, address: '河北省廊坊市AA路50号', status: 'inactive' },
]

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/inventory/warehouses')
    list.value = res.data.items || res.data.list || res.data || []
  } catch (e: any) {
    // Fallback to mock data if API unavailable
    list.value = mockWarehouses
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  form.value = { name: '', type: '', orgId: '', address: '' }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function handleCreate() {
  if (!form.value.name || !form.value.type || !form.value.orgId || !form.value.address) {
    alert('请填写完整信息')
    return
  }
  try {
    await api.post('/inventory/warehouses', {
      name: form.value.name,
      type: form.value.type,
      orgId: form.value.orgId,
      address: form.value.address,
    })
    closeModal()
    fetchData()
  } catch (e: any) {
    // Mock: add locally
    const newId = String(Date.now())
    const orgMap: Record<string, string> = { '1': '总部', '2': '中央厨房', '3': '朝阳门店', '4': '食材供应商A' }
    list.value = [...list.value, {
      id: newId,
      name: form.value.name,
      type: form.value.type,
      org: { name: orgMap[form.value.orgId] || '-' },
      address: form.value.address,
      status: 'active',
    }]
    closeModal()
  }
}

async function handleDelete(id: string) {
  if (!confirm('确认删除该仓库？')) return
  try {
    await api.delete(`/inventory/warehouses/${id}`)
    list.value = list.value.filter(item => item.id !== id)
  } catch (e: any) {
    // Mock: remove locally
    list.value = list.value.filter(item => item.id !== id)
  }
}

onMounted(fetchData)
</script>

<style scoped>
.warehouses { max-width: 1200px; }
h2 { font-size: 20px; margin-bottom: 16px; }
.toolbar { margin-bottom: 16px; }
.btn-primary {
  padding: 8px 20px; color: #fff; border: none; border-radius: 4px; cursor: pointer;
  background: linear-gradient(135deg, #667eea, #764ba2);
  font-size: 14px;
}
.btn-danger-sm {
  padding: 4px 12px; background: #ff4d4f; color: #fff; border: none;
  border-radius: 4px; cursor: pointer; font-size: 13px;
}
table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
th { background: #fafafa; font-weight: 600; }
.loading, .error { text-align: center; padding: 40px; color: #999; }
.error { color: #ff4d4f; }
.empty { text-align: center; color: #999; }

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
.form-group input,
.form-group select,
.form-group textarea {
  width: 100%; padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 4px;
  font-size: 14px; box-sizing: border-box;
}
.form-group textarea { resize: vertical; }
.btn-cancel {
  padding: 8px 20px; background: #f5f5f5; color: #333; border: 1px solid #d9d9d9;
  border-radius: 4px; cursor: pointer; font-size: 14px;
}
.btn-submit {
  padding: 8px 20px; color: #fff; border: none; border-radius: 4px; cursor: pointer;
  background: linear-gradient(135deg, #667eea, #764ba2); font-size: 14px;
}
</style>
