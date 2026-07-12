<script setup>
import { ref, computed, onMounted } from 'vue'
import client from '../api/client'

const predictions = ref([])
const loading = ref(true)

async function load() {
  loading.value = true
  const { data } = await client.get('/wallet/predictions')
  predictions.value = data
  loading.value = false
}

const active = computed(() => predictions.value.filter((p) => p.status === 'open' || p.status === 'locked'))
const resolved = computed(() => predictions.value.filter((p) => p.status === 'resolved' || p.status === 'voided'))

function pickLabel(p) {
  return p.side ? p.side.toUpperCase() : p.option_label
}

function outcomeLabel(p) {
  if (p.status === 'voided') return 'Voided — refunded'
  if (p.side) {
    if (!p.resolved_outcome) return ''
    return p.resolved_outcome === p.side ? 'Won' : 'Lost'
  }
  if (!p.resolved_option_label) return ''
  return p.resolved_option_label === p.option_label ? 'Won' : 'Lost'
}

onMounted(load)
</script>

<template>
  <div class="page page-narrow">
    <h1 class="title">My Predictions</h1>

    <p v-if="loading" class="hint">Loading…</p>

    <template v-else>
      <h2 class="section-title">Active</h2>
      <p v-if="!active.length" class="hint">No active predictions.</p>
      <div v-for="p in active" :key="p.stake_id" class="surface-raised pred-card">
        <p class="question">{{ p.question }}</p>
        <div class="row">
          <span class="tag">{{ pickLabel(p) }}</span>
          <span class="amount">KES {{ p.amount.toLocaleString() }}</span>
        </div>
      </div>

      <h2 class="section-title">Resolved</h2>
      <p v-if="!resolved.length" class="hint">No resolved predictions yet.</p>
      <div v-for="p in resolved" :key="p.stake_id" class="surface-raised pred-card">
        <p class="question">{{ p.question }}</p>
        <div class="row">
          <span class="tag">{{ pickLabel(p) }}</span>
          <span class="amount">KES {{ p.amount.toLocaleString() }}</span>
          <span class="outcome" :class="{ won: outcomeLabel(p) === 'Won', lost: outcomeLabel(p) === 'Lost' }">
            {{ outcomeLabel(p) }}
          </span>
        </div>
        <a v-if="p.resolution_evidence_url" :href="p.resolution_evidence_url" target="_blank" rel="noopener" class="evidence-link">
          View evidence ↗
        </a>
      </div>
    </template>
  </div>
</template>

<style scoped>
.title { color: var(--accent); margin-bottom: 12px; }
.section-title { font-size: 1rem; margin: 20px 0 10px; }
.hint { color: var(--text-secondary); text-align: center; margin: 12px 0; }
.pred-card { padding: 16px; margin-bottom: 10px; }
.question { font-weight: 600; margin: 0 0 8px; }
.row { display: flex; align-items: center; gap: 10px; }
.amount { font-weight: 700; }
.outcome { margin-left: auto; font-weight: 700; font-size: 0.85rem; }
.outcome.won { color: var(--success); }
.outcome.lost { color: var(--danger); }
.evidence-link { display: block; margin-top: 8px; font-size: 0.8rem; color: var(--text-secondary); }
</style>
