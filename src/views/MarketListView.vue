<script setup>
import { ref, computed, onMounted } from 'vue'
import client, { mediaUrl } from '../api/client'
import RingGauge from '../components/RingGauge.vue'
import TrendingBanner from '../components/TrendingBanner.vue'
import HeroCarousel from '../components/HeroCarousel.vue'
import { categoryColorClass, categoryAccentVar } from '../composables/useCategoryColor'
import { useSearchStore } from '../stores/search'
import { marketPath } from '../composables/useMarketSlug'
import Icon from '../components/Icon.vue'

const PLATFORM_FEE_RATE = 0.05
const URGENT_THRESHOLD_MS = 2 * 3_600_000

const search = useSearchStore()
const markets = ref([])
const activeCategory = ref('all')
const activeZone = ref('all')
const loading = ref(true)

const categories = computed(() => {
  const unique = [...new Set(markets.value.map((m) => m.category))].sort()
  return ['all', ...unique]
})

const zones = computed(() => {
  const unique = [...new Set(markets.value.map((m) => m.zone))].sort()
  return ['all', ...unique]
})

const filteredMarkets = computed(() => {
  const q = search.query.trim().toLowerCase()
  return markets.value.filter((m) => {
    const matchesCategory = activeCategory.value === 'all' || m.category === activeCategory.value
    const matchesZone = activeZone.value === 'all' || m.zone === activeZone.value
    const matchesSearch = !q || m.question.toLowerCase().includes(q)
    return matchesCategory && matchesZone && matchesSearch
  })
})

async function loadMarkets() {
  loading.value = true
  const { data } = await client.get('/markets')
  markets.value = data
  loading.value = false
}

function initials(category) {
  return category.trim().charAt(0).toUpperCase()
}

function timeToLock(lockAt) {
  const diffMs = new Date(lockAt) - new Date()
  if (diffMs <= 0) return 'locking now'
  const hours = Math.floor(diffMs / 3_600_000)
  if (hours >= 24) return `${Math.floor(hours / 24)}d left`
  if (hours >= 1) return `${hours}h left`
  return `${Math.floor(diffMs / 60_000)}m left`
}

function isUrgent(lockAt) {
  return new Date(lockAt) - new Date() <= URGENT_THRESHOLD_MS
}

function multiplier(sidePool, oppositePool) {
  if (sidePool <= 0) return null
  return 1 + (oppositePool * (1 - PLATFORM_FEE_RATE)) / sidePool
}

onMounted(loadMarkets)
</script>

<template>
  <div class="page">
    <input v-model="search.query" type="search" placeholder="Search markets…" class="search-input mobile-only" />

    <HeroCarousel v-if="markets.length" :markets="markets" />

    <h2 v-if="markets.length" class="section-head">Trending</h2>
    <TrendingBanner v-if="markets.length" :markets="markets" />

    <h2 v-if="markets.length" class="section-head">
      All markets <span class="count">{{ filteredMarkets.length }}</span>
    </h2>

    <div class="filters">
      <div class="filter-row">
        <span class="filter-label">Topic</span>
        <div class="chips">
          <button
            v-for="cat in categories"
            :key="cat"
            class="btn-neu chip"
            :class="{ active: activeCategory === cat }"
            @click="activeCategory = cat"
          >
            {{ cat }}
          </button>
        </div>
      </div>
      <div class="filter-row">
        <span class="filter-label">Zone</span>
        <div class="chips">
          <button
            v-for="z in zones"
            :key="z"
            class="btn-neu chip"
            :class="{ active: activeZone === z }"
            @click="activeZone = z"
          >
            {{ z === 'all' ? 'All Kenya' : z }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="loading" class="hint">Loading markets…</p>
    <p v-else-if="!filteredMarkets.length" class="hint">No open markets match your filters yet.</p>

    <div class="market-grid">
      <router-link
        v-for="(m, i) in filteredMarkets"
        :key="m.id"
        :to="marketPath(m)"
        class="surface-raised market-card"
        :style="{ animationDelay: `${Math.min(i, 8) * 40}ms` }"
      >
        <span v-if="isUrgent(m.lock_at)" class="badge badge-urgent">Ends soon</span>

        <div v-if="m.market_type === 'multiple_choice' && m.options?.length === 2" class="vs-top">
          <div class="vs-side">
            <img v-if="m.options[0].image_url" :src="mediaUrl(m.options[0].image_url)" alt="" class="vs-avatar" :style="{ borderColor: m.options[0].color || 'var(--border)' }" />
            <div v-else class="vs-avatar vs-avatar-fallback" :style="{ background: m.options[0].color || categoryAccentVar(m.category) }">{{ initials(m.options[0].label) }}</div>
            <span class="vs-name">{{ m.options[0].label }}</span>
            <span class="vs-pct">{{ Math.round(m.options[0].probability * 100) }}%</span>
          </div>
          <span class="vs-badge">VS</span>
          <div class="vs-side">
            <img v-if="m.options[1].image_url" :src="mediaUrl(m.options[1].image_url)" alt="" class="vs-avatar" :style="{ borderColor: m.options[1].color || 'var(--border)' }" />
            <div v-else class="vs-avatar vs-avatar-fallback" :style="{ background: m.options[1].color || categoryAccentVar(m.category) }">{{ initials(m.options[1].label) }}</div>
            <span class="vs-name">{{ m.options[1].label }}</span>
            <span class="vs-pct">{{ Math.round(m.options[1].probability * 100) }}%</span>
          </div>
        </div>

        <div class="card-top">
          <img v-if="!(m.market_type === 'multiple_choice' && m.options?.length === 2) && m.image_url" :src="mediaUrl(m.image_url)" alt="" class="thumbnail thumbnail-img" />
          <div v-else-if="!(m.market_type === 'multiple_choice' && m.options?.length === 2)" class="thumbnail" :style="{ background: categoryAccentVar(m.category) }">{{ initials(m.category) }}</div>
          <div class="card-info">
            <div class="card-tags">
              <span class="tag" :class="categoryColorClass(m.category)">{{ m.category }}</span>
              <span class="tag zone-tag"><Icon name="pin" :size="11" /> {{ m.zone }}</span>
            </div>
            <p class="question">{{ m.question }}</p>
          </div>
          <RingGauge v-if="m.market_type !== 'multiple_choice'" :probability="m.yes_probability" :size="68" :stroke="12" />
        </div>

        <div v-if="m.market_type === 'multiple_choice' && m.options?.length !== 2" class="choice-row">
          <div v-for="opt in [...m.options].sort((a, b) => b.probability - a.probability).slice(0, 3)" :key="opt.id" class="choice-pill">
            <span class="choice-label">{{ opt.label }}</span>
            <span class="choice-pct">{{ Math.round(opt.probability * 100) }}%</span>
          </div>
          <span v-if="m.options.length > 3" class="choice-more">+{{ m.options.length - 3 }} more</span>
        </div>

        <div v-else class="odds-row">
          <div class="odds-pill odds-yes">
            <span class="odds-label">YES</span>
            <span class="odds-mult">{{ multiplier(m.yes_pool, m.no_pool)?.toFixed(2) ?? '—' }}×</span>
          </div>
          <div class="odds-pill odds-no">
            <span class="odds-label">NO</span>
            <span class="odds-mult">{{ multiplier(m.no_pool, m.yes_pool)?.toFixed(2) ?? '—' }}×</span>
          </div>
        </div>

        <div class="card-bottom">
          <span class="meta">KES {{ (m.market_type === 'multiple_choice' ? m.options.reduce((s, o) => s + o.pool, 0) : m.yes_pool + m.no_pool).toLocaleString() }} vol · {{ m.participant_count }} trading</span>
          <span class="time-left" :class="{ urgent: isUrgent(m.lock_at) }">{{ timeToLock(m.lock_at) }}</span>
        </div>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.search-input {
  width: 100%;
  padding: 12px 18px;
  border-radius: 999px;
  border: 2px solid var(--border);
  border-bottom-width: 3px;
  background: var(--surface);
  font-family: inherit;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--ink);
  margin-bottom: 16px;
}
.search-input:focus { outline: 3px solid var(--brand-tint); border-color: var(--brand); }

.filters { margin-bottom: 18px; }
.filter-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.filter-label {
  flex-shrink: 0;
  width: 48px;
  font-size: 0.72rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-faint);
}
.chips { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
.chip { white-space: nowrap; }

.thumbnail {
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 900;
  font-size: 1.1rem;
}
.thumbnail-img { object-fit: cover; background: var(--surface-sunken); }
.hint { color: var(--ink-muted); text-align: center; margin-top: 32px; font-weight: 700; }

.market-grid { display: flex; flex-direction: column; }
.market-card {
  position: relative;
  display: block;
  padding: 16px;
  margin-bottom: 14px;
  text-decoration: none;
  color: inherit;
  animation: card-in 320ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  transition: transform 140ms ease-out, box-shadow 140ms ease-out, border-color 140ms ease-out;
}
@keyframes card-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) { .market-card { animation: none; } }

@media (min-width: 720px) {
  .market-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 18px;
  }
  .market-card { margin-bottom: 0; }
}
/* 3 fat columns on wide screens */
@media (min-width: 1080px) {
  .market-grid { grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .market-card { padding: 22px; }
  .market-card:hover {
    transform: translateY(-3px);
    border-color: var(--brand);
    box-shadow: 0 6px 0 var(--brand-edge);
  }
  .question { font-size: 1.02rem; }
}
.badge {
  position: absolute;
  top: -10px;
  left: 14px;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 0.64rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: var(--urgent);
  color: white;
  box-shadow: 0 2px 0 oklch(50% 0.2 30);
}
.card-top { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 14px; }
.card-info { min-width: 0; flex: 1; }
.card-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.zone-tag { background: var(--surface-sunken); color: var(--ink-muted); }
.question {
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: -0.005em;
  margin: 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.odds-row { display: flex; gap: 8px; margin-bottom: 12px; }
.odds-pill {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 14px;
  border-radius: var(--radius-sm);
  font-weight: 900;
  font-size: 0.85rem;
  border: 2px solid transparent;
}
.odds-yes { background: var(--yes-tint); color: var(--yes); border-color: oklch(85% 0.09 150); }
.odds-no { background: var(--no-tint); color: var(--no); border-color: oklch(88% 0.07 27); }
.choice-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.choice-pill {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: var(--radius-sm);
  background: var(--brand-tint); border: 2px solid transparent;
  font-weight: 800; font-size: 0.8rem;
}
.choice-label { color: var(--ink); max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.choice-pct { color: var(--brand-deep); }
.choice-more { align-self: center; font-size: 0.75rem; font-weight: 700; color: var(--ink-faint); }

.vs-top { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 12px; }
.vs-side { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 0; }
.vs-avatar { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 3px solid var(--border); }
.vs-avatar-fallback { display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 1.2rem; }
.vs-name { font-size: 0.78rem; font-weight: 800; color: var(--ink); text-align: center; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vs-pct { font-size: 0.8rem; font-weight: 900; color: var(--brand-deep); }
.vs-badge {
  flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--ink); color: var(--surface); font-size: 0.62rem; font-weight: 900;
  letter-spacing: 0.02em;
}
.card-bottom { display: flex; justify-content: space-between; align-items: center; }
.meta { font-size: 0.72rem; font-weight: 700; color: var(--ink-muted); }
.time-left { font-size: 0.72rem; font-weight: 900; color: var(--ink-muted); }
.time-left.urgent { color: var(--urgent); }
</style>
