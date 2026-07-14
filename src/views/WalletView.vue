<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useWalletStore } from '../stores/wallet'
import client from '../api/client'

const DEPOSIT_PRESETS = [50, 100, 200, 500, 1000]
const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 90000

const wallet = useWalletStore()
const mode = ref(null) // null | 'deposit' | 'withdraw'
const phoneNumber = ref('')
const hasSavedPhone = ref(false)
const amount = ref('')
const submitting = ref(false)
const feedback = ref('')
const withdrawalFeeRate = ref(0.01)
const depositFeeRate = ref(0.03)

// Deposit tracking: the amount typed is exactly what lands in the wallet —
// the fee is charged on top via M-Pesa, not deducted from it.
const depositFee = computed(() => {
  const n = Number(amount.value)
  return n > 0 ? Math.round(n * depositFeeRate.value * 100) / 100 : 0
})
const depositCharge = computed(() => {
  const n = Number(amount.value)
  return n > 0 ? Math.round((n + depositFee.value) * 100) / 100 : 0
})

// Withdrawals: the amount typed is what lands in M-Pesa; the fee is deducted
// from the Foresee balance on top of that.
const withdrawalFee = computed(() => {
  const n = Number(amount.value)
  return n > 0 ? Math.round(n * withdrawalFeeRate.value * 100) / 100 : 0
})
const totalDebit = computed(() => {
  const n = Number(amount.value)
  return n > 0 ? Math.round((n + withdrawalFee.value) * 100) / 100 : 0
})

// Deposit waiting screen: null | 'waiting' | 'success' | 'failed' | 'timeout'
const depositState = ref(null)
const depositResult = ref(null)
let pollTimer = null
let pollDeadline = 0

function stopPolling() {
  if (pollTimer) clearTimeout(pollTimer)
  pollTimer = null
}

async function pollDeposit(checkoutRequestId) {
  if (Date.now() > pollDeadline) {
    depositState.value = 'timeout'
    return
  }
  try {
    const result = await wallet.depositStatus(checkoutRequestId)
    if (result.status === 'completed') {
      depositResult.value = result
      depositState.value = 'success'
      await wallet.fetchBalance()
      await wallet.fetchTransactions()
      return
    }
    if (result.status === 'failed') {
      depositResult.value = result
      depositState.value = 'failed'
      return
    }
  } catch { /* keep polling — a transient error here shouldn't stop the wait */ }
  pollTimer = setTimeout(() => pollDeposit(checkoutRequestId), POLL_INTERVAL_MS)
}

function closeDepositOverlay() {
  stopPolling()
  depositState.value = null
  depositResult.value = null
}

function retryDeposit() {
  closeDepositOverlay()
}

async function submit() {
  submitting.value = true
  feedback.value = ''
  try {
    if (mode.value === 'deposit') {
      const { data } = await wallet.deposit(phoneNumber.value, Number(amount.value))
      hasSavedPhone.value = true
      depositState.value = 'waiting'
      depositResult.value = null
      pollDeadline = Date.now() + POLL_TIMEOUT_MS
      pollDeposit(data.checkout_request_id)
    } else {
      const { data } = await wallet.withdraw(phoneNumber.value, Number(amount.value))
      feedback.value = data.status === 'flagged'
        ? 'Withdrawal submitted for review — you will be notified once approved.'
        : 'Withdrawal approved and on its way.'
      amount.value = ''
      hasSavedPhone.value = true
      await wallet.fetchBalance()
      await wallet.fetchTransactions()
    }
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
    withdrawalFeeRate.value = cfg.withdrawal_fee_rate
    depositFeeRate.value = cfg.deposit_fee_rate
  } catch { /* keep the defaults shown */ }
})

onBeforeUnmount(stopPolling)
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

      <label class="field-label">{{ mode === 'withdraw' ? "Amount you'll receive (KES)" : "Amount to add to your wallet (KES)" }}</label>
      <input v-model="amount" type="number" min="1" class="money-input field-input" />

      <div v-if="mode === 'deposit'" class="preset-row">
        <button
          v-for="preset in DEPOSIT_PRESETS"
          :key="preset"
          type="button"
          class="btn-neu preset-btn"
          :class="{ active: Number(amount) === preset }"
          @click="amount = preset"
        >{{ preset }}</button>
      </div>

      <div v-if="mode === 'deposit' && amount" class="fee-breakdown money-display">
        <div class="row">
          <span>Added to your wallet</span>
          <strong>KES {{ Number(amount).toLocaleString() }}</strong>
        </div>
        <div class="row muted">
          <span>Processing fee ({{ (depositFeeRate * 100).toFixed(0) }}%)</span>
          <span>KES {{ depositFee.toLocaleString() }}</span>
        </div>
        <div class="row total">
          <span>You'll be charged via M-Pesa</span>
          <strong>KES {{ depositCharge.toLocaleString() }}</strong>
        </div>
      </div>

      <div v-if="mode === 'withdraw' && amount" class="fee-breakdown money-display">
        <div class="row">
          <span>You'll receive</span>
          <strong>KES {{ Number(amount).toLocaleString() }}</strong>
        </div>
        <div class="row muted">
          <span>Withdrawal fee ({{ (withdrawalFeeRate * 100).toFixed(0) }}%)</span>
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

    <!-- Deposit progress overlay -->
    <div v-if="depositState" class="overlay">
      <div class="surface-raised overlay-card">
        <template v-if="depositState === 'waiting'">
          <div class="spinner" />
          <h3>Check your phone</h3>
          <p class="overlay-text">Enter your M-Pesa PIN to confirm the KES {{ Number(amount).toLocaleString() }} deposit.</p>
        </template>

        <template v-else-if="depositState === 'success'">
          <div class="result-icon success">✓</div>
          <h3>Deposit successful</h3>
          <p class="overlay-text">KES {{ depositResult?.requested_amount?.toLocaleString() }} has been added to your wallet.</p>
          <button class="btn-confirm full-width" @click="closeDepositOverlay">Done</button>
        </template>

        <template v-else-if="depositState === 'failed'">
          <div class="result-icon failed">✕</div>
          <h3>Deposit failed</h3>
          <p class="overlay-text">{{ depositResult?.failure_reason || 'Something went wrong with the payment.' }}</p>
          <div class="overlay-actions">
            <button class="btn-neu action-btn" @click="closeDepositOverlay">Close</button>
            <button class="btn-confirm action-btn" @click="retryDeposit">Try again</button>
          </div>
        </template>

        <template v-else-if="depositState === 'timeout'">
          <div class="result-icon failed">!</div>
          <h3>Still waiting</h3>
          <p class="overlay-text">This is taking longer than expected. Check your phone — the payment may still go through and reflect shortly.</p>
          <button class="btn-neu full-width" @click="closeDepositOverlay">Close</button>
        </template>
      </div>
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

.preset-row { display: flex; gap: 8px; margin: -6px 0 14px; flex-wrap: wrap; }
.preset-btn { flex: 1; min-width: 60px; padding: 10px 6px; font-weight: 700; }
.preset-btn.active { background: var(--accent); color: #fff; }

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 100;
}
.overlay-card {
  width: 100%;
  max-width: 340px;
  padding: 28px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.overlay-text { color: var(--text-secondary); font-size: 0.9rem; margin: 4px 0 14px; }
.overlay-actions { display: flex; gap: 10px; width: 100%; }
.overlay-actions .action-btn { flex: 1; }
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  margin-bottom: 8px;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.result-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  font-weight: 800;
  margin-bottom: 4px;
}
.result-icon.success { background: color-mix(in srgb, var(--success) 18%, transparent); color: var(--success); }
.result-icon.failed { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }
</style>
