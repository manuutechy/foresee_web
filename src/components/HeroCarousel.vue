<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import client from '../api/client'
import RingGauge from './RingGauge.vue'
import { marketPath } from '../composables/useMarketSlug'

const PLATFORM_FEE_RATE = 0.05
const ADVANCE_MS = 5500

const props = defineProps({
  markets: { type: Array, required: true },
})

// Banner (promo) slides are managed from the admin panel and fetched live.
const banners = ref([])

const slides = computed(() => {
  const top = props.markets
    .filter((m) => m.market_type !== 'multiple_choice')
    .sort((a, b) => (b.yes_pool + b.no_pool) - (a.yes_pool + a.no_pool))
    .slice(0, 3)
    .map((m) => ({ type: 'market', market: m }))
  const promo = banners.value.map((b) => ({
    type: 'promo',
    image: b.image_url,
    eyebrow: b.eyebrow,
    title: b.title,
    sub: b.subtitle,
    cta: b.cta_label,
    to: b.cta_url || '/',
  }))
  if (!top.length) return promo
  // Interleave: hottest market, first banner, next markets, remaining banners.
  return [top[0], ...(promo[0] ? [promo[0]] : []), ...top.slice(1), ...promo.slice(1)]
})

const index = ref(0)
let timer = null
const prefersReducedMotion = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function go(i) {
  const n = slides.value.length
  index.value = ((i % n) + n) % n
}
function next() { go(index.value + 1) }
function prev() { go(index.value - 1) }

function start() {
  if (prefersReducedMotion) return
  stop()
  timer = setInterval(next, ADVANCE_MS)
}
function stop() { if (timer) { clearInterval(timer); timer = null } }

onMounted(async () => {
  try {
    const { data } = await client.get('/banners')
    banners.value = data
  } catch { /* carousel still works with market slides only */ }
  start()
})
onBeforeUnmount(stop)

function compact(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(Math.round(n))
}
function multiplier(sidePool, oppositePool) {
  if (sidePool <= 0) return null
  return 1 + (oppositePool * (1 - PLATFORM_FEE_RATE)) / sidePool
}
function pool(m) { return m.yes_pool + m.no_pool }
</script>

<template>
  <section class="carousel" @mouseenter="stop" @mouseleave="start" aria-roledescription="carousel">
    <div class="track" :style="{ transform: `translateX(-${index * 100}%)` }">
      <div v-for="(slide, i) in slides" :key="i" class="slide">
        <!-- Market slide -->
        <router-link v-if="slide.type === 'market'" :to="marketPath(slide.market)" class="hero-market">
          <div class="hm-body">
            <div class="hm-chips">
              <span class="hm-chip">★ Biggest pool today</span>
              <span class="hm-chip ghost">{{ slide.market.zone }}</span>
            </div>
            <h2 class="hm-q">{{ slide.market.question }}</h2>
            <div class="hm-pills">
              <div class="hm-pill">
                <span class="ps yes">YES</span>
                <span class="pm">{{ multiplier(slide.market.yes_pool, slide.market.no_pool)?.toFixed(2) ?? '—' }}×</span>
              </div>
              <div class="hm-pill">
                <span class="ps no">NO</span>
                <span class="pm">{{ multiplier(slide.market.no_pool, slide.market.yes_pool)?.toFixed(2) ?? '—' }}×</span>
              </div>
              <span class="hm-info">KES {{ compact(pool(slide.market)) }} · {{ slide.market.participant_count }} trading</span>
            </div>
            <span class="hm-cta">Trade this market →</span>
          </div>
          <div class="hm-gauge">
            <RingGauge :probability="slide.market.yes_probability" :size="122" :stroke="13" track="oklch(88% 0.06 88)" />
            <span class="hm-gauge-cap">chance of yes</span>
          </div>
        </router-link>

        <!-- Promo image slide -->
        <router-link v-else :to="slide.to" class="hero-promo">
          <img :src="slide.image" alt="" class="promo-img" loading="lazy" />
          <div class="promo-overlay"></div>
          <div class="promo-content">
            <span class="promo-eyebrow">{{ slide.eyebrow }}</span>
            <h2 class="promo-title">{{ slide.title }}</h2>
            <p v-if="slide.sub" class="promo-sub">{{ slide.sub }}</p>
            <span v-if="slide.cta" class="promo-cta">{{ slide.cta }} →</span>
          </div>
        </router-link>
      </div>
    </div>

    <button v-if="slides.length > 1" class="arrow left" aria-label="Previous" @click.prevent="prev">‹</button>
    <button v-if="slides.length > 1" class="arrow right" aria-label="Next" @click.prevent="next">›</button>

    <div v-if="slides.length > 1" class="dots">
      <button
        v-for="(s, i) in slides"
        :key="i"
        class="dot"
        :class="{ active: i === index }"
        :aria-label="`Go to slide ${i + 1}`"
        @click="go(i)"
      ></button>
    </div>
  </section>
</template>

<style scoped>
.carousel {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  margin-bottom: 28px;
}
.track {
  display: flex;
  transition: transform 550ms cubic-bezier(0.16, 1, 0.3, 1);
}
@media (prefers-reduced-motion: reduce) {
  .track { transition: none; }
}
.slide { flex: 0 0 100%; min-width: 100%; }

/* --- Market slide (gold) --- */
.hero-market {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  min-height: 260px;
  text-decoration: none;
  background: var(--gold);
  color: var(--gold-ink);
  border: 3px solid var(--gold-edge);
  border-bottom-width: 6px;
  border-radius: var(--radius-lg);
  padding: 24px 26px;
}
.hm-body { min-width: 0; flex: 1; }
.hm-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.hm-chip { background: var(--gold-ink); color: var(--gold); font-size: 0.72rem; font-weight: 900; padding: 5px 12px; border-radius: 999px; }
.hm-chip.ghost { background: transparent; color: var(--gold-ink); border: 2px solid var(--gold-edge); }
.hm-q { font-size: clamp(1.35rem, 4.5vw, 1.8rem); font-weight: 800; line-height: 1.16; letter-spacing: -0.02em; margin: 0 0 16px; max-width: 20ch; }
.hm-pills { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
.hm-pill { background: var(--surface); border: 2px solid var(--gold-edge); border-radius: 12px; padding: 7px 13px; display: flex; flex-direction: column; gap: 1px; }
.ps { font-size: 0.66rem; font-weight: 900; letter-spacing: 0.03em; }
.ps.yes { color: var(--yes); }
.ps.no { color: var(--no); }
.pm { font-size: 1rem; font-weight: 900; color: var(--ink); }
.hm-info { font-size: 0.78rem; font-weight: 800; color: var(--gold-ink); opacity: 0.85; }
.hm-cta { display: inline-block; background: var(--brand); color: var(--brand-ink); font-weight: 900; font-size: 0.92rem; padding: 12px 22px; border-radius: var(--radius-sm); box-shadow: 0 4px 0 var(--brand-edge); }
.hm-gauge { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.hm-gauge-cap { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.75; }

/* --- Promo image slide --- */
.hero-promo {
  position: relative;
  display: block;
  min-height: 260px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  text-decoration: none;
}
.promo-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.promo-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(90deg, oklch(25% 0.09 45 / 0.82) 0%, oklch(25% 0.09 45 / 0.45) 55%, oklch(25% 0.09 45 / 0.15) 100%);
}
.promo-content { position: relative; z-index: 1; padding: 32px 28px; color: white; max-width: 30ch; }
.promo-eyebrow { display: inline-block; font-size: 0.78rem; font-weight: 800; background: oklch(100% 0 0 / 0.2); padding: 5px 12px; border-radius: 999px; margin-bottom: 14px; }
.promo-title { font-size: clamp(1.5rem, 5vw, 2.1rem); font-weight: 900; line-height: 1.1; letter-spacing: -0.02em; margin: 0 0 10px; text-shadow: 0 2px 14px oklch(20% 0.06 45 / 0.5); }
.promo-sub { font-size: 0.95rem; font-weight: 600; line-height: 1.4; margin: 0 0 18px; text-shadow: 0 1px 10px oklch(20% 0.06 45 / 0.5); }
.promo-cta { display: inline-block; background: var(--brand); color: white; font-weight: 900; font-size: 0.92rem; padding: 12px 22px; border-radius: var(--radius-sm); box-shadow: 0 4px 0 var(--brand-edge); }

/* --- Controls --- */
.arrow {
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 38px; height: 38px; border-radius: 999px;
  border: none; cursor: pointer;
  background: oklch(100% 0 0 / 0.85); color: var(--ink);
  font-size: 1.4rem; font-weight: 900; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px oklch(20% 0.05 45 / 0.25);
}
.arrow.left { left: 12px; }
.arrow.right { right: 12px; }
.dots {
  position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 7px;
}
.dot {
  width: 8px; height: 8px; border-radius: 999px; border: none; cursor: pointer;
  background: oklch(100% 0 0 / 0.55);
  transition: width 200ms ease-out, background-color 200ms ease-out;
}
.dot.active { width: 22px; background: white; }

@media (min-width: 900px) {
  .hero-market, .hero-promo { min-height: 300px; }
  .hero-market { padding: 34px; }
  .hm-q { font-size: clamp(1.7rem, 2.4vw, 2.2rem); max-width: 22ch; }
}

@media (max-width: 560px) {
  .hero-market { flex-direction: column; align-items: stretch; }
  .hm-gauge { flex-direction: row; justify-content: center; gap: 14px; }
  .arrow { display: none; }
}
</style>
