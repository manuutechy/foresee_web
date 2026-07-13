<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import client, { mediaUrl } from '../api/client'
import { useWalletStore } from '../stores/wallet'
import { useAuthStore } from '../stores/auth'
import { categoryColorClass, categoryAccentVar } from '../composables/useCategoryColor'
import OddsChart from '../components/OddsChart.vue'
import Icon from '../components/Icon.vue'

const QUICK_AMOUNTS = [100, 500, 1000, 5000]

const route = useRoute()
const router = useRouter()
const wallet = useWalletStore()
const auth = useAuthStore()

// Fee rates come from the server config; the breakdown is never shown to the
// customer (it's baked silently into the projected payout).
const cfg = ref({ platform_fee_rate: 0.05, creator_reward_rate: 0.05, min_stake: 100 })
const market = ref(null)
const history = ref([])
const side = ref(null)
const optionId = ref(null)
const amount = ref('')
const placing = ref(false)
const error = ref('')
const success = ref(false)
const lastStakeAmount = ref(0)
const lastStakeLabel = ref('')
let ws = null

const isMultiChoice = computed(() => market.value?.market_type === 'multiple_choice')

// Community evidence
const evidence = ref([])
const showEvidenceForm = ref(false)
const evForm = ref({ proposed_outcome: 'yes', proposed_option_id: '', evidence_url: '', note: '' })
const evSubmitting = ref(false)
const evError = ref('')
const evSuccess = ref(false)

async function load() {
  const { data } = await client.get(`/markets/${route.params.id}`)
  market.value = data
}

async function loadHistory() {
  const { data } = await client.get(`/markets/${route.params.id}/history`)
  history.value = data
}

async function loadEvidence() {
  const { data } = await client.get(`/markets/${route.params.id}/evidence`)
  evidence.value = data
}

async function submitEvidence() {
  if (!auth.isAuthenticated) {
    router.push({ name: 'auth', query: { redirect: route.fullPath } })
    return
  }
  evError.value = ''
  evSuccess.value = false
  if (!evForm.value.evidence_url.trim()) {
    evError.value = 'Please add a link to your evidence.'
    return
  }
  if (isMultiChoice.value && !evForm.value.proposed_option_id) {
    evError.value = 'Please choose which option won.'
    return
  }
  evSubmitting.value = true
  try {
    await client.post(`/markets/${route.params.id}/evidence`, evForm.value)
    evSuccess.value = true
    evForm.value = { proposed_outcome: 'yes', proposed_option_id: '', evidence_url: '', note: '' }
    showEvidenceForm.value = false
    await loadEvidence()
  } catch (e) {
    evError.value = e.response?.data?.error || 'Failed to submit evidence'
  } finally {
    evSubmitting.value = false
  }
}

function connectWs() {
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/^http/, 'ws')
  ws = new WebSocket(`${base}/ws/markets/${route.params.id}`)
  ws.onmessage = (event) => {
    const update = JSON.parse(event.data)
    if (!market.value) return
    if (update.options) {
      market.value.options = update.options
      market.value.participant_count = update.participant_count
    } else {
      market.value.yes_pool = update.yes_pool
      market.value.no_pool = update.no_pool
      market.value.yes_probability = update.yes_probability
      market.value.participant_count = update.participant_count
      history.value = [...history.value, { time: new Date().toISOString(), yes_probability: update.yes_probability }]
    }
  }
}

const noProbability = computed(() => market.value ? 1 - market.value.yes_probability : 0)

// Total cut removed from the losing pool before winners split it: platform fee,
// plus the creator reward on community-made markets. Applied silently.
const effectiveCut = computed(() => {
  const base = cfg.value.platform_fee_rate
  return market.value?.is_community ? base + cfg.value.creator_reward_rate : base
})

const projectedPayout = computed(() => {
  if (!market.value || !amount.value) return 0
  const stake = Number(amount.value)
  if (isMultiChoice.value) {
    if (!optionId.value) return 0
    const opt = market.value.options.find((o) => o.id === optionId.value)
    if (!opt) return 0
    const winningPool = opt.pool + stake
    const losingPool = market.value.options.reduce((s, o) => s + (o.id === optionId.value ? 0 : o.pool), 0)
    const distributable = losingPool * (1 - effectiveCut.value)
    if (winningPool === 0) return stake
    return stake + distributable * (stake / winningPool)
  }
  if (!side.value) return 0
  const yesPool = market.value.yes_pool + (side.value === 'yes' ? stake : 0)
  const noPool = market.value.no_pool + (side.value === 'no' ? stake : 0)
  const winningPool = side.value === 'yes' ? yesPool : noPool
  const losingPool = side.value === 'yes' ? noPool : yesPool
  const distributable = losingPool * (1 - effectiveCut.value)
  if (winningPool === 0) return stake
  return stake + distributable * (stake / winningPool)
})

function mult(sidePool, oppositePool) {
  if (!sidePool || sidePool <= 0) return null
  return 1 + (oppositePool * (1 - effectiveCut.value)) / sidePool
}
const yesMult = computed(() => market.value ? mult(market.value.yes_pool, market.value.no_pool) : null)
const noMult = computed(() => market.value ? mult(market.value.no_pool, market.value.yes_pool) : null)
const totalPool = computed(() => {
  if (!market.value) return 0
  return isMultiChoice.value ? market.value.options.reduce((s, o) => s + o.pool, 0) : market.value.yes_pool + market.value.no_pool
})
function optionMult(opt) {
  const rest = market.value.options.reduce((s, o) => s + (o.id === opt.id ? 0 : o.pool), 0)
  return mult(opt.pool, rest)
}
const sortedOptions = computed(() => market.value?.options ? [...market.value.options].sort((a, b) => b.probability - a.probability) : [])
const lockDate = computed(() => market.value ? new Date(market.value.lock_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

const showRules = ref(false)
const copied = ref(false)

async function copyLink() {
  await navigator.clipboard.writeText(window.location.href)
  copied.value = true
  setTimeout(() => (copied.value = false), 1600)
}
function shareWhatsApp() {
  const text = encodeURIComponent(`${market.value.question} — predict it on Foresee: ${window.location.href}`)
  window.open(`https://wa.me/?text=${text}`, '_blank')
}
function nativeShare() {
  if (navigator.share) {
    navigator.share({ title: 'Foresee', text: market.value.question, url: window.location.href }).catch(() => {})
  } else {
    copyLink()
  }
}

async function placeStake() {
  if (!auth.isAuthenticated) {
    router.push({ name: 'auth', query: { redirect: route.fullPath } })
    return
  }
  error.value = ''
  success.value = false
  placing.value = true
  try {
    await client.post(`/markets/${route.params.id}/stake`, {
      side: isMultiChoice.value ? undefined : side.value,
      option_id: isMultiChoice.value ? optionId.value : undefined,
      amount: Number(amount.value),
    })
    lastStakeAmount.value = Number(amount.value)
    lastStakeLabel.value = isMultiChoice.value
      ? market.value.options.find((o) => o.id === optionId.value)?.label ?? ''
      : side.value.toUpperCase()
    success.value = true
    amount.value = ''
    await load()
    await loadHistory()
    await wallet.fetchBalance()
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to place stake'
  } finally {
    placing.value = false
  }
}

async function loadConfig() {
  try {
    const { data } = await client.get('/config')
    cfg.value = data
  } catch { /* keep defaults */ }
}

onMounted(async () => {
  await Promise.all([load(), loadHistory(), loadEvidence(), loadConfig()])
  connectWs()
})
onUnmounted(() => ws?.close())
</script>

<template>
  <div v-if="market" class="page detail">
    <button class="btn-neu back-btn" @click="router.push('/')">← Back</button>

    <div class="detail-layout">
      <div class="detail-main">
        <div class="surface-raised header-card">
          <div class="header-top">
            <img v-if="market.image_url" :src="mediaUrl(market.image_url)" alt="" class="thumbnail thumbnail-img" />
            <div v-else class="thumbnail" :style="{ background: categoryAccentVar(market.category) }">
              {{ market.category.trim().charAt(0).toUpperCase() }}
            </div>
            <div class="header-top-info">
              <div class="header-tags">
                <span class="tag" :class="categoryColorClass(market.category)">{{ market.category }}</span>
                <span class="tag zone-tag"><Icon name="pin" :size="11" /> {{ market.zone }}</span>
              </div>
              <p class="question">{{ market.question }}</p>
            </div>
          </div>

          <div class="meta-row">
            <div class="meta-stats">
              <span><Icon name="bar-chart" :size="13" /> KES {{ totalPool.toLocaleString() }}</span>
              <span><Icon name="users" :size="13" /> {{ market.participant_count }}</span>
              <span><Icon name="lock" :size="13" /> {{ lockDate }}</span>
            </div>
            <div class="share-btns">
              <button class="share-icon" :title="copied ? 'Copied!' : 'Copy link'" @click="copyLink">
                <Icon :name="copied ? 'check-circle' : 'link'" :size="15" />
              </button>
              <button class="share-icon wa" title="Share on WhatsApp" @click="shareWhatsApp"><Icon name="message-circle" :size="15" /></button>
              <button class="share-icon" title="Share" @click="nativeShare">↗</button>
            </div>
          </div>

          <div v-if="!isMultiChoice" class="dual-readout">
            <div class="readout">
              <span class="readout-pct text-yes">{{ Math.round(market.yes_probability * 100) }}%</span>
              <span class="readout-label">YES</span>
            </div>
            <div class="readout">
              <span class="readout-pct text-no">{{ Math.round(noProbability * 100) }}%</span>
              <span class="readout-label">NO</span>
            </div>
          </div>
          <div v-else class="option-readout">
            <div v-for="opt in sortedOptions" :key="opt.id" class="option-readout-row">
              <span class="option-readout-label">{{ opt.label }}</span>
              <div class="option-readout-bar-track">
                <div class="option-readout-bar" :style="{ width: Math.round(opt.probability * 100) + '%' }"></div>
              </div>
              <span class="option-readout-pct">{{ Math.round(opt.probability * 100) }}%</span>
            </div>
          </div>

          <OddsChart v-if="!isMultiChoice && history.length" :points="history" />

          <a :href="market.resolution_source" target="_blank" rel="noopener" class="resolution-link">
            Resolution source ↗
          </a>
        </div>

        <!-- Market rules (collapsible) -->
        <div class="surface-raised rules-card">
          <button class="rules-toggle" @click="showRules = !showRules">
            <span><Icon name="clipboard" :size="14" /> Market rules</span>
            <span class="chevron" :class="{ open: showRules }">▾</span>
          </button>
          <div v-if="showRules" class="rules-body">
            <p v-if="!isMultiChoice">This market resolves <strong>YES</strong> if the event in the question happens before it locks on <strong>{{ lockDate }}</strong>, and <strong>NO</strong> otherwise.</p>
            <p v-else>This market resolves to whichever option actually happens, confirmed before it locks on <strong>{{ lockDate }}</strong>.</p>
            <p>Payouts come from a shared pool — your return moves up or down as more people back each option. The winning side splits the losing pool minus a platform fee, and always gets their own stake back.</p>
            <p>The outcome is confirmed against the <a :href="market.resolution_source" target="_blank" rel="noopener">resolution source</a>. Anyone can submit evidence below to help resolve it faster.</p>
          </div>
        </div>

        <!-- Community evidence -->
        <div class="surface-raised evidence-card">
          <div class="evidence-head">
            <div>
              <h3 class="evidence-title"><Icon name="search" :size="16" /> Did this happen?</h3>
              <p class="evidence-sub">Spotted the outcome? Submit proof for an admin to verify.</p>
            </div>
            <button class="btn-brand" @click="showEvidenceForm = !showEvidenceForm">
              {{ showEvidenceForm ? 'Cancel' : 'Submit evidence' }}
            </button>
          </div>

          <div v-if="showEvidenceForm" class="evidence-form">
            <label class="ev-label">What was the outcome?</label>
            <div v-if="!isMultiChoice" class="ev-outcome">
              <button
                class="ev-side"
                :class="{ 'ev-yes': evForm.proposed_outcome === 'yes' }"
                @click="evForm.proposed_outcome = 'yes'"
              >YES</button>
              <button
                class="ev-side"
                :class="{ 'ev-no': evForm.proposed_outcome === 'no' }"
                @click="evForm.proposed_outcome = 'no'"
              >NO</button>
            </div>
            <div v-else class="ev-outcome ev-outcome-wrap">
              <button
                v-for="opt in market.options"
                :key="opt.id"
                class="ev-side"
                :class="{ 'ev-yes': evForm.proposed_option_id === opt.id }"
                @click="evForm.proposed_option_id = opt.id"
              >{{ opt.label }}</button>
            </div>
            <label class="ev-label">Link to evidence</label>
            <input v-model="evForm.evidence_url" type="url" placeholder="https://…" class="money-input ev-input" />
            <label class="ev-label">Note (optional)</label>
            <input v-model="evForm.note" type="text" placeholder="Explain what the link shows" class="money-input ev-input" />
            <button class="btn-confirm full-width" :disabled="evSubmitting" @click="submitEvidence">
              {{ evSubmitting ? 'Submitting…' : 'Submit for review' }}
            </button>
            <p v-if="evError" class="error">{{ evError }}</p>
          </div>
          <p v-if="evSuccess" class="success">Thanks! Your evidence is pending admin review.</p>

          <div v-if="evidence.length" class="evidence-list">
            <div v-for="e in evidence" :key="e.id" class="evidence-item">
              <span class="ev-badge" :class="`ev-status-${e.status}`">{{ e.status }}</span>
              <div class="ev-item-body">
                <span
                  v-if="e.proposed_outcome"
                  class="ev-item-outcome"
                  :class="e.proposed_outcome === 'yes' ? 'text-yes' : 'text-no'"
                >{{ e.proposed_outcome.toUpperCase() }}</span>
                <span v-else class="ev-item-outcome">{{ e.proposed_option_label }}</span>
                <span class="ev-item-by">by {{ e.submitter_name || 'someone' }}</span>
                <a :href="e.evidence_url" target="_blank" rel="noopener" class="ev-item-link">view proof ↗</a>
                <p v-if="e.note" class="ev-item-note">{{ e.note }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-side">
        <div
          v-if="market.status === 'open'"
          class="surface-raised stake-card"
          :class="!isMultiChoice ? (side === 'yes' ? 'stake-card-yes' : side === 'no' ? 'stake-card-no' : '') : (optionId ? 'stake-card-yes' : '')"
        >
          <span
            class="trade-here-tag"
            :class="!isMultiChoice ? (side === 'yes' ? 'tag-yes' : side === 'no' ? 'tag-no' : 'tag-neutral') : (optionId ? 'tag-yes' : 'tag-neutral')"
          >
            Trade here
          </span>
          <p class="trade-question">{{ market.question }}</p>

          <div v-if="!isMultiChoice" class="side-selector">
            <button
              class="side-btn side-yes"
              :class="{ selected: side === 'yes' }"
              @click="side = 'yes'"
            >
              <span class="side-name">YES</span>
              <span class="side-mult">{{ yesMult?.toFixed(2) ?? '—' }}×</span>
            </button>
            <button
              class="side-btn side-no"
              :class="{ selected: side === 'no' }"
              @click="side = 'no'"
            >
              <span class="side-name">NO</span>
              <span class="side-mult">{{ noMult?.toFixed(2) ?? '—' }}×</span>
            </button>
          </div>

          <div v-else class="option-selector">
            <button
              v-for="opt in sortedOptions"
              :key="opt.id"
              class="option-btn"
              :class="{ selected: optionId === opt.id }"
              @click="optionId = opt.id"
            >
              <span class="option-btn-name">{{ opt.label }}</span>
              <span class="option-btn-mult">{{ optionMult(opt)?.toFixed(2) ?? '—' }}×</span>
            </button>
          </div>

          <div class="amount-display money-input">
            <span class="amount-prefix">KES</span>
            <input v-model="amount" type="number" :min="cfg.min_stake" placeholder="0" class="amount-field" />
          </div>
          <p v-if="amount && Number(amount) < cfg.min_stake" class="min-stake-hint">
            Minimum stake is KES {{ cfg.min_stake }}
          </p>

          <div class="quick-amounts">
            <button
              v-for="q in QUICK_AMOUNTS"
              :key="q"
              class="btn-neu quick-chip"
              @click="amount = String(q)"
            >
              KES {{ q.toLocaleString() }}
            </button>
          </div>

          <div v-if="(isMultiChoice ? optionId : side) && amount" class="projection money-display">
            <div class="row">
              <span>You could win</span>
              <strong class="payout-amt">KES {{ projectedPayout.toFixed(2) }}</strong>
            </div>
          </div>

          <button
            v-if="!isMultiChoice"
            class="btn-confirm full-width"
            :class="side === 'yes' ? 'confirm-yes' : side === 'no' ? 'confirm-no' : ''"
            :disabled="!amount || Number(amount) < cfg.min_stake || !side || placing"
            @click="placeStake"
          >
            {{ placing ? 'Placing…' : !side ? 'Select YES or NO' : !auth.isAuthenticated ? 'Log in to stake' : `Confirm ${side.toUpperCase()} stake` }}
          </button>
          <button
            v-else
            class="btn-confirm full-width confirm-yes"
            :disabled="!amount || Number(amount) < cfg.min_stake || !optionId || placing"
            @click="placeStake"
          >
            {{ placing ? 'Placing…' : !optionId ? 'Select a choice' : !auth.isAuthenticated ? 'Log in to stake' : 'Confirm stake' }}
          </button>

          <p v-if="error" class="error">{{ error }}</p>
        </div>
        <div v-else class="surface-raised stake-card closed-notice">
          This market is {{ market.status }}.
        </div>
      </div>
    </div>

    <!-- Trade success overlay -->
    <div v-if="success" class="stake-overlay" @click="success = false">
      <div class="surface-raised stake-overlay-card" @click.stop>
        <div class="stake-success-icon">✓</div>
        <h3>Added to the pool</h3>
        <p class="stake-overlay-text">
          KES {{ lastStakeAmount.toLocaleString() }} on
          <strong>{{ lastStakeLabel }}</strong>
        </p>
        <button class="btn-confirm full-width" @click="success = false">Done</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.back-btn { margin-bottom: 16px; }
.detail-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.header-card { padding: 20px; }
.header-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.header-top-info { min-width: 0; flex: 1; }
.thumbnail {
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 800;
  font-size: 1.1rem;
}
.thumbnail-img { object-fit: cover; background: var(--surface-sunken); }
.question {
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.3;
  margin: 10px 0 16px;
}
.dual-readout {
  display: flex;
  gap: 24px;
  margin-bottom: 14px;
}
.readout { display: flex; flex-direction: column; }
.readout-pct { font-size: 1.45rem; font-weight: 800; line-height: 1; }
.readout-label { font-size: 0.7rem; font-weight: 700; color: var(--ink-muted); margin-top: 4px; }
.text-yes { color: var(--yes); }
.text-no { color: var(--no); }

.option-readout { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.option-readout-row { display: flex; align-items: center; gap: 10px; }
.option-readout-label {
  flex: 0 0 90px; font-size: 0.8rem; font-weight: 800; color: var(--ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.option-readout-bar-track {
  flex: 1; height: 10px; border-radius: 999px; background: var(--surface-sunken); overflow: hidden;
}
.option-readout-bar {
  height: 100%; border-radius: 999px; background: var(--brand);
  transition: width 550ms cubic-bezier(0.16, 1, 0.3, 1);
}
.option-readout-pct { flex: 0 0 36px; text-align: right; font-size: 0.82rem; font-weight: 900; color: var(--ink); }
.resolution-link { display: block; margin-top: 16px; font-size: 0.8rem; color: var(--ink-muted); }
.stake-card {
  padding: 20px;
  border-top: 3px solid var(--border);
}
.stake-card-yes { border-top-color: var(--yes); }
.stake-card-no { border-top-color: var(--no); }
.trade-here-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin-bottom: 10px;
}
.tag-neutral { background: var(--accent-tint); color: var(--accent); }
.tag-yes { background: var(--yes-tint); color: var(--yes); }
.tag-no { background: var(--no-tint); color: var(--no); }
.trade-question {
  font-size: 0.9rem;
  font-weight: 700;
  margin: 0 0 16px;
  line-height: 1.35;
}
.side-selector { display: flex; gap: 10px; margin-bottom: 16px; }
.side-btn {
  flex: 1;
  padding: 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  border: 2px solid var(--border);
  background: var(--surface);
  color: var(--ink-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: background-color 120ms ease-out, color 120ms ease-out, border-color 120ms ease-out;
}
.side-name { font-weight: 800; font-size: 0.95rem; }
.side-mult { font-size: 0.8rem; font-weight: 800; opacity: 0.8; }
.side-yes.selected { background: var(--yes-tint); color: var(--yes); border-color: var(--yes); }
.side-no.selected { background: var(--no-tint); color: var(--no); border-color: var(--no); }

.option-selector { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.option-btn {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 14px; border-radius: var(--radius-sm); cursor: pointer;
  border: 2px solid var(--border); background: var(--surface); color: var(--ink-muted);
  font-family: inherit; font-weight: 800; font-size: 0.9rem;
  transition: background-color 120ms ease-out, color 120ms ease-out, border-color 120ms ease-out;
}
.option-btn-mult { font-size: 0.8rem; font-weight: 800; opacity: 0.8; }
.option-btn.selected { background: var(--brand-tint); color: var(--brand-deep); border-color: var(--brand); }

/* Meta row + share */
.meta-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.meta-stats { display: flex; gap: 14px; font-size: 0.82rem; font-weight: 700; color: var(--ink-muted); }
.share-btns { display: flex; gap: 6px; }
.share-icon {
  width: 34px; height: 34px; border-radius: 10px;
  border: 2px solid var(--border); background: var(--surface);
  font-size: 0.95rem; cursor: pointer; line-height: 1;
}
.share-icon:active { transform: translateY(1px); }
.share-icon.wa { background: var(--yes-tint); border-color: oklch(85% 0.09 150); }

/* Rules */
.rules-card { padding: 4px 20px; margin-top: 16px; }
.rules-toggle {
  width: 100%; display: flex; justify-content: space-between; align-items: center;
  background: none; border: none; padding: 16px 0; cursor: pointer;
  font-family: inherit; font-weight: 800; font-size: 0.95rem; color: var(--ink);
}
.chevron { transition: transform 160ms ease-out; color: var(--ink-faint); }
.chevron.open { transform: rotate(180deg); }
.rules-body { padding: 0 0 16px; }
.rules-body p { font-size: 0.88rem; color: var(--ink-muted); font-weight: 600; line-height: 1.55; margin: 0 0 10px; }
.rules-body a { color: var(--accent); font-weight: 700; }
.amount-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 16px;
  margin-bottom: 14px;
}
.amount-prefix {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ink-faint);
}
.amount-field {
  border: none;
  background: none;
  outline: none;
  font-size: 2rem;
  font-weight: 800;
  color: var(--ink);
  width: 100%;
  text-align: center;
  padding: 0;
}
.amount-field::placeholder { color: var(--ink-faint); }
.min-stake-hint { text-align: center; color: var(--no); font-size: 0.82rem; font-weight: 700; margin: -8px 0 12px; }
.quick-amounts { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; justify-content: center; }
.quick-chip { font-size: 0.8rem; padding: 8px 14px; }
.projection { padding: 14px 16px; margin-bottom: 16px; }
.row { display: flex; justify-content: space-between; align-items: center; padding: 2px 0; font-weight: 700; }
.payout-amt { font-size: 1.15rem; font-weight: 900; color: var(--yes); }
.full-width { width: 100%; }
.confirm-yes { --_face: var(--yes-bright); --_edge: var(--yes-edge); }
.confirm-no { --_face: var(--no-bright); --_edge: var(--no-edge); }
.error { color: var(--no); margin-top: 10px; font-weight: 700; }
.success { color: var(--yes); margin-top: 10px; font-weight: 800; }
.closed-notice { text-align: center; color: var(--ink-muted); }

.stake-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 100;
}
.stake-overlay-card {
  width: 100%;
  max-width: 320px;
  padding: 28px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  animation: stake-pop 0.25s ease-out;
}
@keyframes stake-pop {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
.stake-success-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  font-weight: 800;
  margin-bottom: 4px;
  background: color-mix(in srgb, var(--yes) 18%, transparent);
  color: var(--yes);
}
.stake-overlay-text { color: var(--ink-muted); font-weight: 700; margin: 4px 0 14px; }

/* Evidence card */
.header-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.zone-tag { background: var(--surface-sunken); color: var(--ink-muted); }
.evidence-card { padding: 20px; margin-top: 16px; }
.evidence-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.evidence-title { font-size: 1.05rem; font-weight: 900; margin: 0 0 4px; }
.evidence-sub { font-size: 0.82rem; color: var(--ink-muted); margin: 0; font-weight: 700; }
.evidence-form { margin-top: 16px; display: flex; flex-direction: column; }
.ev-label { font-size: 0.8rem; font-weight: 800; color: var(--ink-muted); margin-bottom: 6px; }
.ev-outcome { display: flex; gap: 10px; margin-bottom: 14px; }
.ev-outcome-wrap { flex-wrap: wrap; }
.ev-side {
  flex: 1; padding: 10px; border-radius: 12px; font-weight: 900; cursor: pointer;
  border: 2px solid var(--border); background: var(--surface); color: var(--ink-muted);
}
.ev-yes { background: var(--yes-tint); color: var(--yes); border-color: var(--yes); }
.ev-no { background: var(--no-tint); color: var(--no); border-color: var(--no); }
.ev-input { width: 100%; padding: 12px 14px; margin-bottom: 14px; font-family: inherit; font-weight: 700; }
.evidence-list { margin-top: 18px; display: flex; flex-direction: column; gap: 12px; }
.evidence-item { display: flex; gap: 12px; align-items: flex-start; padding-top: 12px; border-top: 2px solid var(--border); }
.ev-badge {
  flex-shrink: 0; padding: 3px 10px; border-radius: 999px; font-size: 0.66rem;
  font-weight: 900; text-transform: uppercase;
}
.ev-status-pending { background: var(--gold-tint); color: var(--gold-ink); }
.ev-status-accepted { background: var(--yes-tint); color: var(--yes); }
.ev-status-rejected { background: var(--no-tint); color: var(--no); }
.ev-item-body { min-width: 0; }
.ev-item-outcome { font-weight: 900; margin-right: 8px; }
.ev-item-by { font-size: 0.8rem; color: var(--ink-muted); font-weight: 700; }
.ev-item-link { display: inline-block; margin-left: 8px; font-size: 0.8rem; font-weight: 800; color: var(--accent); }
.ev-item-note { font-size: 0.85rem; color: var(--ink-muted); margin: 6px 0 0; font-weight: 600; }

/* Desktop: chart + info on the left, trade panel sticky on the right. */
@media (min-width: 900px) {
  .detail-layout {
    flex-direction: row;
    align-items: flex-start;
  }
  .detail-main { flex: 1.6; min-width: 0; }
  .detail-side { flex: 1; min-width: 320px; position: sticky; top: 24px; }
}
</style>
