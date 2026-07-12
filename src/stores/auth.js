import { defineStore } from 'pinia'
import client from '../api/client'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('foresight_token') || null,
    userId: localStorage.getItem('foresight_user_id') || null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
  },
  actions: {
    async register(email, password, name) {
      const { data } = await client.post('/auth/register', { email, password, name })
      this._setSession(data)
    },
    async login(email, password) {
      const { data } = await client.post('/auth/login', { email, password })
      this._setSession(data)
    },
    async loginWithGoogle(idToken) {
      const { data } = await client.post('/auth/google', { id_token: idToken })
      this._setSession(data)
    },
    _setSession(data) {
      this.token = data.token
      this.userId = data.user_id
      localStorage.setItem('foresight_token', data.token)
      localStorage.setItem('foresight_user_id', data.user_id)
    },
    logout() {
      this.token = null
      this.userId = null
      localStorage.removeItem('foresight_token')
      localStorage.removeItem('foresight_user_id')
    },
  },
})
