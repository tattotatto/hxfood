<template>
  <div class="users">
    <div class="page-header">
      <h2>用户管理</h2>
      <button class="btn-primary" @click="openCreateModal">新建用户</button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <table v-else>
      <thead>
        <tr>
          <th>用户名</th>
          <th>姓名</th>
          <th>手机号</th>
          <th>所属组织</th>
          <th>角色</th>
          <th>状态</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="list.length === 0">
          <td colspan="8" class="empty">暂无数据</td>
        </tr>
        <tr v-for="user in list" :key="user.id">
          <td>{{ user.username }}</td>
          <td>{{ user.realName }}</td>
          <td>{{ user.phone }}</td>
          <td>{{ user.org?.name || '-' }}</td>
          <td>{{ user.role?.name || '-' }}</td>
          <td>
            <span :class="['status-tag', user.status === 'active' ? 'status-active' : 'status-inactive']">
              {{ user.status === 'active' ? '启用' : '禁用' }}
            </span>
          </td>
          <td>{{ formatDate(user.createdAt) }}</td>
          <td>
            <button class="btn-action" @click="openEditModal(user)">编辑</button>
            <button class="btn-action btn-danger" @click="handleDelete(user.id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 新建/编辑 弹窗 -->
    <div v-if="modalVisible" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <h3>{{ editingUser ? '编辑用户' : '新建用户' }}</h3>
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label>用户名</label>
            <input v-model="form.username" type="text" required />
          </div>
          <div class="form-group">
            <label>姓名</label>
            <input v-model="form.realName" type="text" required />
          </div>
          <div class="form-group">
            <label>密码</label>
            <input v-model="form.password" type="password" :required="!editingUser" :placeholder="editingUser ? '留空则不修改' : ''" />
          </div>
          <div class="form-group">
            <label>手机号</label>
            <input v-model="form.phone" type="text" />
          </div>
          <div class="form-group">
            <label>所属组织</label>
            <select v-model="form.orgId">
              <option value="">请选择组织</option>
              <option v-for="org in mockOrgs" :key="org.id" :value="org.id">{{ org.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>角色</label>
            <select v-model="form.roleId">
              <option value="">请选择角色</option>
              <option v-for="role in mockRoles" :key="role.id" :value="role.id">{{ role.name }}</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="closeModal">取消</button>
            <button type="submit" class="btn-primary">{{ editingUser ? '保存' : '创建' }}</button>
          </div>
        </form>
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

const modalVisible = ref(false)
const editingUser = ref<any>(null)
const form = ref({
  username: '',
  realName: '',
  password: '',
  phone: '',
  orgId: '',
  roleId: '',
})

const mockUsers = [
  { id: '1', username: 'admin', realName: '系统管理员', phone: '13800000001', org: { id: '1', name: '总部' }, role: { id: '1', name: '超级管理员' }, status: 'active', createdAt: '2025-01-01T00:00:00Z' },
  { id: '2', username: 'store01', realName: '张三', phone: '13800000002', org: { id: '2', name: '朝阳门店' }, role: { id: '2', name: '店长' }, status: 'active', createdAt: '2025-03-15T00:00:00Z' },
  { id: '3', username: 'cook01', realName: '李四', phone: '13800000003', org: { id: '3', name: '中央厨房' }, role: { id: '3', name: '生产主管' }, status: 'inactive', createdAt: '2025-06-01T00:00:00Z' },
]

const mockOrgs = [
  { id: '1', name: '总部' },
  { id: '2', name: '朝阳门店' },
  { id: '3', name: '中央厨房' },
]

const mockRoles = [
  { id: '1', name: '超级管理员' },
  { id: '2', name: '店长' },
  { id: '3', name: '生产主管' },
]

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/users')
    list.value = res.data.items || res.data.list || res.data || []
  } catch (e: any) {
    list.value = mockUsers
    if (e.message && e.message !== 'Request failed') {
      error.value = e.message || '加载失败'
    }
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editingUser.value = null
  form.value = { username: '', realName: '', password: '', phone: '', orgId: '', roleId: '' }
  modalVisible.value = true
}

function openEditModal(user: any) {
  editingUser.value = user
  form.value = {
    username: user.username,
    realName: user.realName,
    password: '',
    phone: user.phone || '',
    orgId: user.org?.id || '',
    roleId: user.role?.id || '',
  }
  modalVisible.value = true
}

function closeModal() {
  modalVisible.value = false
  editingUser.value = null
}

async function handleSubmit() {
  try {
    if (editingUser.value) {
      await api.put(`/users/${editingUser.value.id}`, form.value)
    } else {
      await api.post('/users', form.value)
    }
    closeModal()
    await fetchData()
  } catch (e: any) {
    alert(e.message || '操作失败')
  }
}

async function handleDelete(id: string) {
  if (!confirm('确定删除该用户吗？')) return
  try {
    await api.delete(`/users/${id}`)
    await fetchData()
  } catch (e: any) {
    alert(e.message || '删除失败')
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.users { max-width: 1200px; }
h2 { font-size: 20px; margin-bottom: 16px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-header h2 { margin-bottom: 0; }

.btn-primary {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}
.btn-primary:hover { opacity: 0.9; }

.btn-action {
  padding: 4px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  margin-right: 8px;
}
.btn-action:hover { border-color: #667eea; color: #667eea; }
.btn-danger { color: #ff4d4f; border-color: #ff4d4f; }
.btn-danger:hover { background: #ff4d4f; color: #fff; }

table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
th { background: #fafafa; font-weight: 600; }

.status-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.status-active { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
.status-inactive { background: #fff2f0; color: #ff4d4f; border: 1px solid #ffccc7; }

.loading, .error { text-align: center; padding: 40px; color: #999; }
.error { color: #ff4d4f; }
.empty { text-align: center; color: #999; }

/* Modal */
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.modal-card {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  width: 480px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}
.modal-card h3 { font-size: 18px; margin-bottom: 24px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-size: 14px; color: #333; }
.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}
.form-group input:focus,
.form-group select:focus { border-color: #667eea; outline: none; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
.btn-cancel {
  padding: 8px 20px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
}
.btn-cancel:hover { border-color: #667eea; color: #667eea; }
</style>
