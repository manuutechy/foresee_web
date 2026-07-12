<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import client from '../api/client'
import { useAuthStore } from '../stores/auth'
import { useWalletStore } from '../stores/wallet'
import Icon from '../components/Icon.vue'

const router = useRouter()
const auth = useAuthStore()
const wallet = useWalletStore()

const me = ref(null)
const predictions = ref([])

const totalStaked = computed(() => predictions.value.reduce((s, p) => s + p.amount, 0))
const activeBets = computed(() => predictions.value.filter((p) => p.status === 'open' || p.status === 'locked').length)
const marketsWon = computed(() =>
  predictions.value.filter((p) => p.status === 'resolved' && p.resolved_outcome === p.side).length
)
const resolvedCount = computed(() => predictions.value.filter((p) => p.status === 'resolved').length)
const winRate = computed(() => resolvedCount.value ? Math.round((marketsWon.value / resolvedCount.value) * 100) : 0)

const initial = computed(() => (me.value?.name || me.value?.email || '?').trim().charAt(0).toUpperCase())

function logout() {
  auth.logout()
  router.push('/')
}

onMounted(async () => {
  const [{ data: meData }] = await Promise.all([
    client.get('/auth/me'),
    wallet.fetchBalance(),
    client.get('/wallet/predictions').then((r) => (predictions.value = r.data)),
  ])
  me.value = meData
})
</script>

<template>
  <div class="page page-narrow">
    <div v-if="me" class="profile-head surface-raised">
      <div class="avatar">{{ initial }}</div>
      <div class="profile-id">
        <h1 class="profile-name">{{ me.name || 'Predictor' }}</h1>
        <p class="profile-email">{{ me.email }}</p>
        <span v-if="me.mpesa_phone_number" class="profile-mpesa"><Icon name="phone" :size="12" /> {{ me.mpesa_phone_number }}</span>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-tile tile-gold">
        <Icon name="wallet" :size="20" class="stat-icon" />
        <span class="stat-value">KES {{ wallet.balance.toLocaleString() }}</span>
        <span class="stat-label">Balance</span>
      </div>
      <div class="stat-tile tile-blue">
        <Icon name="target" :size="20" class="stat-icon" />
        <span class="stat-value">{{ activeBets }}</span>
        <span class="stat-label">Active bets</span>
      </div>
      <div class="stat-tile tile-green">
        <Icon name="trophy" :size="20" class="stat-icon" />
        <span class="stat-value">{{ marketsWon }}</span>
        <span class="stat-label">Markets won</span>
      </div>
      <div class="stat-tile tile-purple">
        <Icon name="flame" :size="20" class="stat-icon" />
        <span class="stat-value">{{ winRate }}%</span>
        <span class="stat-label">Win rate</span>
      </div>
      <div class="stat-tile tile-orange">
        <Icon name="trending-up" :size="20" class="stat-icon" />
        <span class="stat-value">KES {{ totalStaked.toLocaleString() }}</span>
        <span class="stat-label">Total staked</span>
      </div>
      <div class="stat-tile tile-teal">
        <Icon name="ballot" :size="20" class="stat-icon" />
        <span class="stat-value">{{ predictions.length }}</span>
        <span class="stat-label">Predictions</span>
      </div>
    </div>

    <div class="profile-actions">
      <router-link to="/create" class="action-row action-highlight surface-raised">
        <span><Icon name="rocket" :size="16" /> Create a market</span><span class="chev">→</span>
      </router-link>
      <router-link to="/wallet" class="action-row surface-raised">
        <span><Icon name="card" :size="16" /> Wallet &amp; transactions</span><span class="chev">→</span>
      </router-link>
      <router-link to="/predictions" class="action-row surface-raised">
        <span><Icon name="target" :size="16" /> My predictions</span><span class="chev">→</span>
      </router-link>
      <router-link to="/notifications" class="action-row surface-raised">
        <span><Icon name="bell" :size="16" /> Notifications</span><span class="chev">→</span>
      </router-link>
    </div>

    <button class="logout-btn" @click="logout">Log out</button>
  </div>
</template>

<style scoped>
.profile-head { display: flex; align-items: center; gap: 16px; padding: 20px; margin-bottom: 20px; }
.avatar {
  width: 64px; height: 64px; border-radius: 20px; flex-shrink: 0;
  background: var(--brand); color: white;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.8rem; font-weight: 900;
  box-shadow: 0 4px 0 var(--brand-edge);
}
.profile-name { font-size: 1.4rem; font-weight: 900; margin: 0; }
.profile-email { font-size: 0.85rem; color: var(--ink-muted); margin: 2px 0 0; font-weight: 700; }
.profile-mpesa { font-size: 0.8rem; color: var(--ink-muted); font-weight: 700; }

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 22px;
}
@media (min-width: 640px) { .stat-grid { grid-template-columns: repeat(3, 1fr); } }
.stat-tile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 16px;
  border-radius: var(--radius-md);
  border: 2px solid;
  border-bottom-width: 4px;
}
.stat-icon { margin-bottom: 4px; }
.stat-value { font-size: 1.25rem; font-weight: 900; letter-spacing: -0.02em; }
.stat-label { font-size: 0.72rem; font-weight: 800; color: var(--ink-muted); text-transform: uppercase; letter-spacing: 0.03em; }
.tile-gold { background: var(--gold-tint); border-color: var(--gold-edge); }
.tile-blue { background: var(--accent-tint); border-color: oklch(80% 0.07 245); }
.tile-green { background: var(--yes-tint); border-color: oklch(82% 0.09 150); }
.tile-purple { background: var(--purple-tint); border-color: oklch(82% 0.07 300); }
.tile-orange { background: var(--orange-tint); border-color: oklch(82% 0.08 55); }
.tile-teal { background: var(--teal-tint); border-color: oklch(82% 0.06 195); }

.profile-actions { display: flex; flex-direction: column; gap: 10px; margin-bottom: 22px; }
.action-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 15px 18px; text-decoration: none; color: var(--ink);
  font-weight: 800; font-size: 0.95rem;
}
.action-row > span:first-child { display: inline-flex; align-items: center; gap: 8px; }
.chev { color: var(--ink-faint); }
.action-highlight { background: var(--brand-tint); border-color: var(--gold-edge); color: var(--brand); }

.logout-btn {
  width: 100%;
  padding: 13px;
  border-radius: var(--radius-sm);
  border: 2px solid var(--border);
  border-bottom-width: 4px;
  background: var(--surface);
  color: var(--no);
  font-family: inherit;
  font-weight: 900;
  font-size: 0.95rem;
  cursor: pointer;
}
.logout-btn:active { transform: translateY(2px); }
</style>
