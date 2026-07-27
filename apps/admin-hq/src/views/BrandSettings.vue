<template>
  <div class="brand-settings">
    <h2>品牌设置</h2>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <div v-else class="settings-card">
      <form @submit.prevent="handleSave">
        <div class="form-group">
          <label>品牌名称</label>
          <input v-model="form.name" type="text" required />
        </div>

        <div class="form-group">
          <label>Logo URL</label>
          <input v-model="form.logo" type="text" placeholder="https://example.com/logo.png" />
          <div v-if="form.logo" class="logo-preview">
            <img :src="form.logo" alt="Logo 预览" @error="logoError = true" v-if="!logoError" />
            <span v-else class="logo-error">图片加载失败，请检查链接</span>
          </div>
        </div>

        <div class="form-group">
          <label>品牌描述</label>
          <textarea v-model="form.description" rows="3"></textarea>
        </div>

        <div class="form-group">
          <label>加盟条件</label>
          <textarea v-model="form.conditions" rows="5" placeholder="每行一个条件"></textarea>
        </div>

        <div class="form-group">
          <label>加盟费用（元）</label>
          <input v-model.number="form.fee" type="number" min="0" step="1000" />
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-save">保存设置</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../api'

const loading = ref(true)
const error = ref('')
const logoError = ref(false)

const form = ref({
  name: '',
  logo: '',
  description: '',
  conditions: '',
  fee: 0,
})

const mockData = {
  name: '核销食',
  logo: '',
  description: '高品质食品连锁品牌',
  conditions: '1. 具备合法经营资质\n2. 拥有合适的经营场所\n3. 认同品牌经营理念',
  fee: 50000,
}

async function fetchSettings() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/brand/settings')
    const data = res.data
    form.value = {
      name: data.name || '',
      logo: data.logo || '',
      description: data.description || '',
      conditions: data.conditions || '',
      fee: data.fee || 0,
    }
  } catch (e: any) {
    form.value = { ...mockData }
    if (e.message && e.message !== 'Request failed') {
      error.value = e.message || '加载失败'
    }
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  try {
    await api.put('/brand/settings', form.value)
    alert('保存成功')
  } catch (e: any) {
    alert(e.message || '保存失败')
  }
}

onMounted(() => {
  fetchSettings()
})
</script>

<style scoped>
.brand-settings { max-width: 720px; }
h2 { font-size: 20px; margin-bottom: 24px; }

.loading, .error { text-align: center; padding: 40px; color: #999; }
.error { color: #ff4d4f; }

.settings-card {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .08);
}

.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 6px; font-size: 14px; color: #333; font-weight: 500; }
.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  font-family: inherit;
}
.form-group input:focus,
.form-group textarea:focus { border-color: #667eea; outline: none; }
.form-group textarea { resize: vertical; }

.logo-preview {
  margin-top: 12px;
  padding: 16px;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  text-align: center;
  background: #fafafa;
}
.logo-preview img {
  max-width: 200px;
  max-height: 120px;
  object-fit: contain;
}
.logo-error { color: #999; font-size: 13px; }

.form-actions { margin-top: 28px; display: flex; justify-content: flex-end; }

.btn-save {
  padding: 10px 32px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  font-size: 15px;
  cursor: pointer;
}
.btn-save:hover { opacity: 0.9; }
</style>
