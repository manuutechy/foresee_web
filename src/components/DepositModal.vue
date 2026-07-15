<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import client from '../api/client'
import { useWalletStore } from '../stores/wallet'

const DEPOSIT_PRESETS = [50, 100, 200, 500, 1000]
const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 90000

const props = defineProps({
  open: { type: Boolean, default: false },
  initialAmount: { type: [Number, String], default: '' },
  reason: { type: String, default: '' }, // optional context line, e.g. "You need KES 150 more to place this stake."
})
const emit = defineEmits(['update:open', 'deposited'])

const wallet = useWalletStore()

const phoneNumber = ref('')
const hasSavedPhone = ref(false)
const amount = ref('')
const submitting = ref(false)
const feedback = ref('')
const depositFeeRate = ref(0.03)

const depositFee = computed(() => {
  const n = Number(amount.value)
  return n > 0 ? Math.round(n * depositFeeRate.value * 100) / 100 : 0
})
const depositCharge = computed(() => {
  const n = Number(amount.value)
  return n > 0 ? Math.round((n + depositFee.value) * 100) / 100 : 0
})

// null | 'waiting' | 'success' | 'failed' | 'timeout'
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
      emit('deposited', result)
      return
    }
    if (result.status === 'failed') {
      depositResult.value = result
      depositState.value = 'failed'
      return
    }
  } catch { /* transient error — keep polling */ }
  pollTimer = setTimeout(() => pollDeposit(checkoutRequestId), POLL_INTERVAL_MS)
}

function close() {
  stopPolling()
  depositState.value = null
  depositResult.value = null
  feedback.value = ''
  emit('update:open', false)
}

async function submit() {
  submitting.value = true
  feedback.value = ''
  try {
    const { data } = await wallet.deposit(phoneNumber.value, Number(amount.value))
    hasSavedPhone.value = true
    depositState.value = 'waiting'
    depositResult.value = null
    pollDeadline = Date.now() + POLL_TIMEOUT_MS
    pollDeposit(data.checkout_request_id)
  } catch (e) {
    feedback.value = e.response?.data?.error || 'Something went wrong'
  } finally {
    submitting.value = false
  }
}

// Prefill phone + fee rate + suggested amount each time the modal opens.
watch(() => props.open, async (isOpen) => {
  if (!isOpen) return
  depositState.value = null
  depositResult.value = null
  feedback.value = ''
  amount.value = props.initialAmount || ''
  try {
    const { data } = await client.get('/auth/me')
    if (data.mpesa_phone_number) {
      hasSavedPhone.value = true
      phoneNumber.value = data.mpesa_phone_number
    }
  } catch { /* let them type it in */ }
  try {
    const { data: cfg } = await client.get('/config')
    depositFeeRate.value = cfg.deposit_fee_rate
  } catch { /* keep default */ }
})

onBeforeUnmount(stopPolling)
</script>

<template>
  <div v-if="open" class="dm-backdrop" @click.self="close">
    <div class="surface-raised dm-card">
      <button class="dm-close" aria-label="Close" @click="close">×</button>

      <template v-if="!depositState">
        <h3 class="dm-title">Top up your wallet</h3>
        <p v-if="reason" class="dm-reason">{{ reason }}</p>

        <template v-if="!hasSavedPhone">
          <label class="field-label">M-Pesa phone number</label>
          <input v-model="phoneNumber" type="tel" placeholder="07XX XXX XXX" class="money-input field-input" />
        </template>
        <div v-else class="saved-phone">
          M-Pesa number: <strong>{{ phoneNumber }}</strong>
          <a href="#" @click.prevent="hasSavedPhone = false">change</a>
        </div>

        <label class="field-label">Amount to add (KES)</label>
        <input v-model="amount" type="number" min="1" class="money-input field-input" />

        <div class="preset-row">
          <button
            v-for="preset in DEPOSIT_PRESETS"
            :key="preset"
            type="button"
            class="btn-neu preset-btn"
            :class="{ active: Number(amount) === preset }"
            @click="amount = preset"
          >{{ preset }}</button>
        </div>

        <div v-if="amount" class="fee-breakdown money-display">
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

        <button class="btn-confirm full-width" :disabled="!phoneNumber || !amount || submitting" @click="submit">
          {{ submitting ? 'Processing…' : 'Send STK push' }}
        </button>
        <p v-if="feedback" class="feedback">{{ feedback }}</p>
      </template>

      <template v-else-if="depositState === 'waiting'">
        <div class="spinner" />
        <h3>Check your phone</h3>
        <p class="dm-text">Enter your M-Pesa PIN to confirm the KES {{ Number(amount).toLocaleString() }} deposit.</p>
      </template>

      <template v-else-if="depositState === 'success'">
        <div class="result-icon success">✓</div>
        <h3>Deposit successful</h3>
        <p class="dm-text">KES {{ depositResult?.requested_amount?.toLocaleString() }} has been added to your wallet.</p>
        <button class="btn-confirm full-width" @click="close">Continue</button>
      </template>

      <template v-else-if="depositState === 'failed'">
        <div class="result-icon failed">✕</div>
        <h3>Deposit failed</h3>
        <p class="dm-text">{{ depositResult?.failure_reason || 'Something went wrong with the payment.' }}</p>
        <div class="dm-actions">
          <button class="btn-neu action-btn" @click="close">Close</button>
          <button class="btn-confirm action-btn" @click="depositState = null">Try again</button>
        </div>
      </template>

      <template v-else-if="depositState === 'timeout'">
        <div class="result-icon failed">!</div>
        <h3>Still waiting</h3>
        <p class="dm-text">This is taking longer than expected. Check your phone — the payment may still go through and reflect shortly.</p>
        <button class="btn-neu full-width" @click="close">Close</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.dm-backdrop {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0, 0, 0, 0.5);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.dm-card {
  position: relative;
  width: 100%; max-width: 360px;
  padding: 28px 24px;
  text-align: center;
  display: flex; flex-direction: column; align-items: stretch; gap: 2px;
}
.dm-close {
  position: absolute; top: 10px; right: 14px;
  background: none; border: none; font-size: 1.6rem; line-height: 1;
  color: var(--ink-faint, #999); cursor: pointer; font-family: inherit;
}
.dm-title { text-align: center; margin: 4px 0 4px; }
.dm-reason { text-align: center; color: var(--ink-muted, var(--text-secondary)); font-size: 0.85rem; font-weight: 700; margin: 0 0 14px; }
.field-label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); text-align: left; }
.field-input { width: 100%; padding: 14px 16px; font-size: 1rem; margin: 8px 0 14px; }
.saved-phone { font-size: 0.9rem; margin-bottom: 14px; text-align: left; }
.saved-phone a { margin-left: 8px; color: var(--accent); text-decoration: none; font-size: 0.8rem; }
.preset-row { display: flex; gap: 8px; margin: -6px 0 14px; flex-wrap: wrap; }
.preset-btn { flex: 1; min-width: 60px; padding: 10px 6px; font-weight: 700; }
.preset-btn.active { background: var(--accent); color: #fff; }
.fee-breakdown { padding: 12px 14px; margin-bottom: 14px; text-align: left; }
.row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 0.88rem; }
.row.muted { color: var(--text-secondary); font-size: 0.8rem; }
.row.total { border-top: 1px solid var(--border); margin-top: 6px; padding-top: 8px; font-weight: 700; }
.full-width { width: 100%; }
.feedback { margin-top: 10px; color: var(--danger, var(--no)); font-size: 0.85rem; }
.dm-text { color: var(--text-secondary); font-size: 0.9rem; margin: 4px 0 14px; text-align: center; }
.dm-actions { display: flex; gap: 10px; width: 100%; }
.dm-actions .action-btn { flex: 1; }
.spinner {
  width: 40px; height: 40px; margin: 0 auto 8px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: dm-spin 0.8s linear infinite;
}
@keyframes dm-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
.result-icon {
  width: 52px; height: 52px; margin: 0 auto 4px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.6rem; font-weight: 800;
}
.result-icon.success { background: color-mix(in srgb, var(--yes, var(--success)) 18%, transparent); color: var(--yes, var(--success)); }
.result-icon.failed { background: color-mix(in srgb, var(--no, var(--danger)) 18%, transparent); color: var(--no, var(--danger)); }
</style>
