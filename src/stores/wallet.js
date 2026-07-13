import { defineStore } from 'pinia'
import client from '../api/client'

export const useWalletStore = defineStore('wallet', {
  state: () => ({
    balance: 0,
    transactions: [],
    loading: false,
  }),
  actions: {
    async fetchBalance() {
      const { data } = await client.get('/wallet/balance')
      this.balance = data.balance
    },
    async fetchTransactions() {
      const { data } = await client.get('/wallet/transactions')
      this.transactions = data
    },
    async deposit(phoneNumber, amount) {
      return client.post('/wallet/deposit', { phone_number: phoneNumber, amount })
    },
    async depositStatus(checkoutRequestId) {
      const { data } = await client.get(`/wallet/deposit/${checkoutRequestId}/status`)
      return data
    },
    async withdraw(phoneNumber, amount) {
      return client.post('/wallet/withdraw', { phone_number: phoneNumber, amount })
    },
  },
})
