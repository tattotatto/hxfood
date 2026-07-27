<template>
  <div class="roles">
    <h2>角色管理</h2>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <div v-else class="roles-layout">
      <!-- 左侧角色列表 -->
      <div class="role-panel">
        <div class="panel-title">角色列表</div>
        <div
          v-for="role in roles"
          :key="role.id"
          :class="['role-card', { 'role-card--active': selectedRole?.id === role.id }]"
          @click="selectRole(role)"
        >
          <div class="role-name">{{ role.name }}</div>
          <div class="role-desc">{{ role.description }}</div>
        </div>
      </div>

      <!-- 右侧权限矩阵 -->
      <div class="perm-panel" v-if="selectedRole">
        <div class="panel-title">{{ selectedRole.name }} - 权限设置</div>
        <table class="perm-table">
          <thead>
            <tr>
              <th>资源</th>
              <th>查看</th>
              <th>创建</th>
              <th>编辑</th>
              <th>删除</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="perm in permissions" :key="perm.resource">
              <td class="col-resource">{{ perm.label }}</td>
              <td><input type="checkbox" v-model="perm.actions.read" /></td>
              <td><input type="checkbox" v-model="perm.actions.create" /></td>
              <td><input type="checkbox" v-model="perm.actions.update" /></td>
              <td><input type="checkbox" v-model="perm.actions.delete" /></td>
            </tr>
          </tbody>
        </table>
        <div class="perm-actions">
          <button class="btn-primary" @click="savePermissions">保存权限</button>
        </div>
      </div>

      <div v-else class="perm-panel perm-placeholder">
        <p>请从左侧选择一个角色查看权限</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../api'

const roles = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const selectedRole = ref<any>(null)
const permissions = ref<any[]>([])

const mockRoles = [
  { id: '1', name: '超级管理员', description: '系统最高权限' },
  { id: '2', name: '运营主管', description: '负责日常运营管理' },
  { id: '3', name: '财务专员', description: '负责财务对账' },
  { id: '4', name: '仓库管理员', description: '负责库存和仓库' },
]

const mockPermissions = [
  { resource: 'products', label: '商品管理', actions: { read: true, create: true, update: true, delete: false } },
  { resource: 'orders', label: '订单管理', actions: { read: true, create: false, update: true, delete: false } },
  { resource: 'stores', label: '门店管理', actions: { read: true, create: true, update: true, delete: false } },
  { resource: 'franchise', label: '加盟审核', actions: { read: true, create: false, update: true, delete: false } },
  { resource: 'finance', label: '财务管理', actions: { read: true, create: false, update: false, delete: false } },
  { resource: 'inventory', label: '库存管理', actions: { read: true, create: true, update: true, delete: false } },
  { resource: 'production', label: '生产管理', actions: { read: true, create: false, update: false, delete: false } },
  { resource: 'shipments', label: '发货管理', actions: { read: true, create: false, update: false, delete: false } },
  { resource: 'users', label: '用户管理', actions: { read: false, create: false, update: false, delete: false } },
  { resource: 'roles', label: '角色管理', actions: { read: false, create: false, update: false, delete: false } },
]

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

async function fetchRoles() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/roles')
    roles.value = res.data.items || res.data.list || res.data || []
  } catch (e: any) {
    roles.value = mockRoles
    if (e.message && e.message !== 'Request failed') {
      error.value = e.message || '加载失败'
    }
  } finally {
    loading.value = false
  }
}

async function selectRole(role: any) {
  selectedRole.value = role
  try {
    const res = await api.get(`/roles/${role.id}/permissions`)
    permissions.value = res.data || []
  } catch {
    permissions.value = deepClone(mockPermissions)
  }
}

async function savePermissions() {
  if (!selectedRole.value) return
  const payload = permissions.value.map(p => ({
    resource: p.resource,
    label: p.label,
    actions: { ...p.actions },
  }))
  try {
    await api.put(`/roles/${selectedRole.value.id}/permissions`, { permissions: payload })
    alert('权限保存成功')
  } catch (e: any) {
    alert(e.message || '保存失败')
  }
}

onMounted(() => {
  fetchRoles()
})
</script>

<style scoped>
.roles { max-width: 1200px; }
h2 { font-size: 20px; margin-bottom: 24px; }

.loading, .error { text-align: center; padding: 40px; color: #999; }
.error { color: #ff4d4f; }

.roles-layout { display: flex; gap: 24px; align-items: flex-start; }

/* 左侧角色面板 */
.role-panel {
  width: 240px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .08);
}
.panel-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; color: #333; }

.role-card {
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.role-card:hover { border-color: #667eea; background: #f9f7ff; }
.role-card--active { border-color: #667eea; background: #f0edff; }
.role-name { font-size: 14px; font-weight: 600; color: #1a1a2e; }
.role-desc { font-size: 12px; color: #999; margin-top: 4px; }

/* 右侧权限面板 */
.perm-panel {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .08);
}
.perm-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: #999;
  font-size: 15px;
}

.perm-table { width: 100%; border-collapse: collapse; }
.perm-table th,
.perm-table td {
  padding: 10px 16px;
  text-align: center;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
}
.perm-table th { background: #fafafa; font-weight: 600; color: #666; }
.perm-table td.col-resource { text-align: left; font-weight: 500; }
.perm-table input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; accent-color: #667eea; }

.perm-actions { margin-top: 24px; display: flex; justify-content: flex-end; }

.btn-primary {
  padding: 8px 24px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}
.btn-primary:hover { opacity: 0.9; }
</style>
