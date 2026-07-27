import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

interface UserProfile {
  id: string
  username: string
  realName: string
  phone: string
  orgs: any[]
  currentOrg?: { id: string; name: string; orgType: string }
}

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('accessToken') || '')
  const profile = ref<UserProfile | null>(null)

  const isLoggedIn = computed(() => !!token.value && !!profile.value)

  const currentOrgType = computed(() => {
    return profile.value?.currentOrg?.orgType || 'headquarters'
  })

  const isHeadquarters = computed(() => currentOrgType.value === 'headquarters')
  const isCentralKitchen = computed(() => currentOrgType.value === 'central_kitchen')
  const isSupplier = computed(() => currentOrgType.value === 'supplier')
  const isFranchiseStore = computed(() => currentOrgType.value === 'franchise_store')

  const dashboardRoute = computed(() => {
    const map: Record<string, string> = {
      headquarters: '/dashboard',
      central_kitchen: '/ck-dashboard',
      supplier: '/supplier-dashboard',
    }
    return map[currentOrgType.value] || '/dashboard'
  })

  async function login(username: string, password: string) {
    const res = await axios.post('/api/v1/auth/login', { username, password })
    token.value = res.data.accessToken
    localStorage.setItem('accessToken', res.data.accessToken)
    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.accessToken}`
    await loadProfile()
  }

  async function loadProfile() {
    const res = await axios.get('/api/v1/auth/profile')
    profile.value = res.data
    // Ensure currentOrg exists with a default
    if (profile.value && !profile.value.currentOrg) {
      profile.value.currentOrg = { id: '', name: '', orgType: 'headquarters' }
    }
  }

  function logout() {
    token.value = ''
    profile.value = null
    localStorage.removeItem('accessToken')
  }

  return {
    token,
    profile,
    isLoggedIn,
    currentOrgType,
    isHeadquarters,
    isCentralKitchen,
    isSupplier,
    isFranchiseStore,
    dashboardRoute,
    login,
    loadProfile,
    logout,
  }
})
