import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
export const useUserStore = defineStore('user', () => {
    const token = ref(localStorage.getItem('accessToken') || '');
    const profile = ref(null);
    async function login(username, password) {
        const res = await axios.post('/api/v1/auth/login', { username, password });
        token.value = res.data.accessToken;
        localStorage.setItem('accessToken', res.data.accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.accessToken}`;
        await loadProfile();
    }
    async function loadProfile() {
        const res = await axios.get('/api/v1/auth/profile');
        profile.value = res.data;
    }
    function logout() {
        token.value = '';
        profile.value = null;
        localStorage.removeItem('accessToken');
    }
    return { token, profile, login, loadProfile, logout };
});
