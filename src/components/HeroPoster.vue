<script setup>
import { computed } from 'vue'
import RingGauge from './RingGauge.vue'
import { marketPath } from '../composables/useMarketSlug'

const PLATFORM_FEE_RATE = 0.05

const props = defineProps({
  markets: { type: Array, required: true },
})

const featured = computed(() => {
  const binary = props.markets.filter((m) => m.market_type !== 'multiple_choice')
  if (!binary.length) return null
  return [...binary].sort((a, b) => (b.yes_pool + b.no_pool) - (a.yes_pool + a.no_pool))[0]
})

const pool = computed(() => featured.value ? featured.value.yes_pool + featured.value.no_pool : 0)

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

      <div class="hero-pills">
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

      <span class="hero-trade">Trade this market →</span>
    </div>

    <div class="hero-gauge">
      <RingGauge :probability="featured.yes_probability" :size="132" :stroke="13" track="oklch(88% 0.06 88)" />
      <span class="hero-gauge-cap">chance of yes</span>
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
