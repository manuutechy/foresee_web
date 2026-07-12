<script setup>
import { ref, computed, onMounted } from 'vue'
import { useWalletStore } from '../stores/wallet'
import client from '../api/client'

const wallet = useWalletStore()
const mode = ref(null) // null | 'deposit' | 'withdraw'
const phoneNumber = ref('')
const hasSavedPhone = ref(false)
const amount = ref('')
const submitting = ref(false)
const feedback = ref('')
const withdrawalFee = ref(30)

// The amount typed is what lands in the customer's M-Pesa (net); the fee is
// deducted from their Foresee balance on top of that.
const totalDebit = computed(() => {
  const n = Number(amount.value)
  return n > 0 ? n + withdrawalFee.value : 0
})

async function submit() {
  submitting.value = true
  feedback.value = ''
  try {
    if (mode.value === 'deposit') {
      await wallet.deposit(phoneNumber.value, Number(amount.value))
      feedback.value = 'STK push sent — check your phone to complete the deposit.'
    } else {
      const { data } = await wallet.withdraw(phoneNumber.value, Number(amount.value))
      feedback.value = data.status === 'flagged'
        ? 'Withdrawal submitted for review — you will be notified once approved.'
        : 'Withdrawal approved and on its way.'
    }
    amount.value = ''
    hasSavedPhone.value = true
    await wallet.fetchBalance()
    await wallet.fetchTransactions()
  } catch (e) {
    feedback.value = e.response?.data?.error || 'Something went wrong'
  } finally {
    submitting.value = false
  }
}

function typeLabel(type) {
  return { deposit: 'Deposit', withdrawal: 'Withdrawal', stake: 'Stake', payout: 'Payout', fee: 'Fee', refund: 'Refund', adjustment: 'Adjustment' }[type] || type
}

onMounted(async () => {
  await wallet.fetchBalance()
  await wallet.fetchTransactions()
  const { data } = await client.get('/auth/me')
  if (data.mpesa_phone_number) {
    hasSavedPhone.value = true
    phoneNumber.value = data.mpesa_phone_number
  }
  try {
    const { data: cfg } = await client.get('/config')
    withdrawalFee.value = cfg.withdrawal_fee_flat
  } catch { /* keep the default fee shown */ }
})
</script>

<template>
  <div class="page page-narrow">
    <h1 class="title">Wallet</h1>

    <div class="money-display balance-card">
      <span class="balance-label">Available balance</span>
      <span class="balance-amount">KES {{ wallet.balance.toLocaleString() }}</span>
    </div>

    <div class="action-row">
      <button class="btn-confirm action-btn" @click="mode = 'deposit'">Deposit</button>
      <button class="btn-neu action-btn" @click="mode = 'withdraw'">Withdraw</button>
    </div>

    <div v-if="mode" class="surface-raised form-card">
      <h3>{{ mode === 'deposit' ? 'Deposit via M-Pesa' : 'Withdraw to M-Pesa' }}</h3>

      <template v-if="!hasSavedPhone">
        <label class="field-label">M-Pesa phone number</label>
        <input v-model="phoneNumber" type="tel" placeholder="07XX XXX XXX" class="money-input field-input" />
        <p class="phone-hint">We'll remember this for next time.</p>
      </template>
      <template v-else>
        <div class="saved-phone">
          M-Pesa number: <strong>{{ phoneNumber }}</strong>
          <a href="#" @click.prevent="hasSavedPhone = false">change</a>
        </div>
      </template>

      <label class="field-label">{{ mode === 'withdraw' ? "Amount you'll receive (KES)" : 'Amount (KES)' }}</label>
      <input v-model="amount" type="number" min="1" class="money-input field-input" />

      <div v-if="mode === 'withdraw' && amount" class="fee-breakdown money-display">
        <div class="row">
          <span>You'll receive</span>
          <strong>KES {{ Number(amount).toLocaleString() }}</strong>
        </div>
        <div class="row muted">
          <span>Withdrawal fee</span>
          <span>KES {{ withdrawalFee.toLocaleString() }}</span>
        </div>
        <div class="row total">
          <span>Total deducted from balance</span>
          <strong>KES {{ totalDebit.toLocaleString() }}</strong>
        </div>
      </div>

      <button class="btn-confirm full-width" :disabled="!phoneNumber || !amount || submitting" @click="submit">
        {{ submitting ? 'Processing…' : mode === 'deposit' ? 'Send STK push' : 'Request withdrawal' }}
      </button>
      <p v-if="feedback" class="feedback">{{ feedback }}</p>
    </div>

    <h2 class="section-title">Transaction history</h2>
    <div v-for="tx in wallet.transactions" :key="tx.id" class="surface-raised tx-row">
      <span class="tx-type">{{ typeLabel(tx.type) }}</span>
      <span class="tx-amount" :class="{ negative: tx.amount < 0, positive: tx.amount > 0 }">
        {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount.toLocaleString() }}
      </span>
    </div>
    <p v-if="!wallet.transactions.length" class="hint">No transactions yet.</p>
  </div>
</template>

<style scoped>
.title { color: var(--accent); margin-bottom: 16px; }
.balance-card {
  display: flex;
  flex-direction: column;
  padding: 20px;
  margin-bottom: 16px;
}
.balance-label { font-size: 0.85rem; color: var(--text-secondary); }
.balance-amount { font-size: 2rem; font-weight: 800; }
.action-row { display: flex; gap: 12px; margin-bottom: 16px; }
.action-btn { flex: 1; }
.form-card { padding: 20px; margin-bottom: 20px; }
.field-label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
.field-input { width: 100%; padding: 14px 16px; font-size: 1rem; margin: 8px 0 14px; }
.phone-hint { font-size: 0.75rem; color: var(--text-secondary); margin: -4px 0 12px; }
.saved-phone { font-size: 0.9rem; margin-bottom: 14px; }
.saved-phone a { margin-left: 8px; color: var(--accent); text-decoration: none; font-size: 0.8rem; }
.full-width { width: 100%; }
.feedback { margin-top: 10px; color: var(--text-secondary); font-size: 0.85rem; }
.fee-breakdown { padding: 12px 14px; margin-bottom: 14px; }
.row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 0.88rem; }
.row.muted { color: var(--text-secondary); font-size: 0.8rem; }
.row.total { border-top: 1px solid var(--border); margin-top: 6px; padding-top: 8px; font-weight: 700; }
.section-title { font-size: 1rem; margin: 20px 0 10px; }
.tx-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 8px;
}
.tx-amount.positive { color: var(--success); font-weight: 700; }
.tx-amount.negative { color: var(--danger); font-weight: 700; }
.hint { color: var(--text-secondary); text-align: center; margin-top: 20px; }
</style>
