<script setup>
import { computed } from 'vue'
import RingGauge from './RingGauge.vue'
import { marketPath } from '../composables/useMarketSlug'
import { mediaUrl } from '../api/client'

const PLATFORM_FEE_RATE = 0.05

const props = defineProps({
  markets: { type: Array, required: true },
})

function poolOf(m) {
  return m.market_type === 'multiple_choice' ? m.options.reduce((s, o) => s + o.pool, 0) : m.yes_pool + m.no_pool
}

// VS (2-option) markets compete for the featured slot alongside binary ones;
// 3+ option markets stay out since there's no clean two-sided hero visual.
const featured = computed(() => {
  const candidates = props.markets.filter((m) => m.market_type !== 'multiple_choice' || m.options?.length === 2)
  if (!candidates.length) return null
  return [...candidates].sort((a, b) => poolOf(b) - poolOf(a))[0]
})

const isVs = computed(() => featured.value?.market_type === 'multiple_choice')
const pool = computed(() => featured.value ? poolOf(featured.value) : 0)

function compact(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(Math.round(n))
}

function multiplier(sidePool, oppositePool) {
  if (sidePool <= 0) return null
  return 1 + (oppositePool * (1 - PLATFORM_FEE_RATE)) / sidePool
}
</script>

<template>
  <router-link v-if="featured" :to="marketPath(featured)" class="hero">
    <div class="hero-body">
      <div class="hero-chips">
        <span class="hero-chip">★ Biggest pool today</span>
        <span class="hero-chip ghost">{{ featured.zone }}</span>
      </div>

      <h1 class="hero-q">{{ featured.question }}</h1>

      <div v-if="!isVs" class="hero-pills">
        <div class="hero-pill">
          <span class="pill-side pill-yes">YES</span>
          <span class="pill-mult">{{ multiplier(featured.yes_pool, featured.no_pool)?.toFixed(2) ?? '—' }}×</span>
        </div>
        <div class="hero-pill">
          <span class="pill-side pill-no">NO</span>
          <span class="pill-mult">{{ multiplier(featured.no_pool, featured.yes_pool)?.toFixed(2) ?? '—' }}×</span>
        </div>
        <span class="hero-poolinfo">KES {{ compact(pool) }} · {{ featured.participant_count }} trading</span>
      </div>
      <div v-else class="hero-poolinfo hero-poolinfo-vs">KES {{ compact(pool) }} · {{ featured.participant_count }} trading</div>

      <span class="hero-trade">Trade this market →</span>
    </div>

    <div v-if="!isVs" class="hero-gauge">
      <RingGauge :probability="featured.yes_probability" :size="132" :stroke="13" track="oklch(88% 0.06 88)" />
      <span class="hero-gauge-cap">chance of yes</span>
    </div>
    <div v-else class="hero-vs">
      <div class="hero-vs-side">
        <img v-if="featured.options[0].image_url" :src="mediaUrl(featured.options[0].image_url)" alt="" class="hero-vs-avatar" :style="{ borderColor: featured.options[0].color || 'var(--gold-ink)' }" />
        <div v-else class="hero-vs-avatar hero-vs-avatar-fallback" :style="{ background: featured.options[0].color || 'var(--brand)' }">{{ featured.options[0].label.charAt(0).toUpperCase() }}</div>
        <span class="hero-vs-name">{{ featured.options[0].label }}</span>
        <span class="hero-vs-pct">{{ Math.round(featured.options[0].probability * 100) }}%</span>
      </div>
      <span class="hero-vs-badge">VS</span>
      <div class="hero-vs-side">
        <img v-if="featured.options[1].image_url" :src="mediaUrl(featured.options[1].image_url)" alt="" class="hero-vs-avatar" :style="{ borderColor: featured.options[1].color || 'var(--gold-ink)' }" />
        <div v-else class="hero-vs-avatar hero-vs-avatar-fallback" :style="{ background: featured.options[1].color || 'var(--accent)' }">{{ featured.options[1].label.charAt(0).toUpperCase() }}</div>
        <span class="hero-vs-name">{{ featured.options[1].label }}</span>
        <span class="hero-vs-pct">{{ Math.round(featured.options[1].probability * 100) }}%</span>
      </div>
    </div>
  </router-link>
</template>

<style scoped>
.hero {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  text-decoration: none;
  background: var(--gold);
  color: var(--gold-ink);
  border: 3px solid var(--gold-edge);
  border-bottom-width: 6px;
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 28px;
}
.hero-body { min-width: 0; flex: 1; }
.hero-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.hero-chip {
  background: var(--gold-ink);
  color: var(--gold);
  font-size: 0.72rem;
  font-weight: 900;
  padding: 5px 12px;
  border-radius: 999px;
}
.hero-chip.ghost {
  background: transparent;
  color: var(--gold-ink);
  border: 2px solid var(--gold-edge);
}
.hero-q {
  font-size: clamp(1.35rem, 4.5vw, 1.8rem);
  font-weight: 800;
  line-height: 1.16;
  letter-spacing: -0.02em;
  margin: 0 0 18px;
  max-width: 20ch;
}
.hero-pills { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 18px; }
.hero-pill {
  background: var(--surface);
  border: 2px solid var(--gold-edge);
  border-radius: 12px;
  padding: 8px 14px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.pill-side { font-size: 0.68rem; font-weight: 900; letter-spacing: 0.03em; }
.pill-yes { color: var(--yes); }
.pill-no { color: var(--no); }
.pill-mult { font-size: 1.05rem; font-weight: 900; color: var(--ink); }
.hero-poolinfo { font-size: 0.8rem; font-weight: 800; color: var(--gold-ink); opacity: 0.85; }
.hero-trade {
  display: inline-block;
  background: var(--brand);
  color: var(--brand-ink);
  font-weight: 900;
  font-size: 0.95rem;
  padding: 13px 24px;
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 0 var(--brand-edge);
}
.hero-gauge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.hero-gauge-cap {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.75;
}
.hero-poolinfo-vs { display: block; margin-bottom: 18px; }
.hero-vs { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
.hero-vs-side { display: flex; flex-direction: column; align-items: center; gap: 6px; max-width: 96px; }
.hero-vs-avatar { width: 76px; height: 76px; border-radius: 50%; object-fit: cover; border: 3px solid var(--gold-ink); }
.hero-vs-avatar-fallback { display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 1.8rem; }
.hero-vs-name { font-size: 0.8rem; font-weight: 800; text-align: center; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hero-vs-pct { font-size: 0.85rem; font-weight: 900; }
.hero-vs-badge {
  flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--gold-ink); color: var(--gold); font-size: 0.68rem; font-weight: 900;
}
@media (max-width: 560px) {
  .hero-vs { flex-direction: row; justify-content: center; }
}

/* Mobile: gauge tucks under, single column */
@media (max-width: 560px) {
  .hero { flex-direction: column; align-items: stretch; }
  .hero-gauge { flex-direction: row; justify-content: center; gap: 14px; }
}

@media (min-width: 900px) {
  .hero { padding: 34px; }
  .hero-q { font-size: clamp(1.7rem, 2.4vw, 2.2rem); max-width: 22ch; }
}
</style>
