<script setup>
import { computed } from 'vue'

const props = defineProps({
  markets: { type: Array, required: true },
})

// The #1 pool is the hero cover, so the strip ranks the next ones.
const trending = computed(() =>
  props.markets
    .filter((m) => m.market_type !== 'multiple_choice')
    .sort((a, b) => (b.yes_pool + b.no_pool) - (a.yes_pool + a.no_pool))
    .slice(1, 7)
)
</script>

<template>
  <section v-if="trending.length" class="trending" aria-label="Trending markets">
    <div class="trending-scroller">
      <router-link
        v-for="(m, i) in trending"
        :key="m.id"
        :to="`/markets/${m.id}`"
        class="trending-card"
      >
        <span class="trending-rank">{{ i + 2 }}</span>
        <div class="trending-body">
          <p class="trending-question">{{ m.question }}</p>
          <div class="trending-foot">
            <span class="trending-pct">{{ Math.round(m.yes_probability * 100) }}% yes</span>
            <span class="trending-vol">KES {{ (m.yes_pool + m.no_pool).toLocaleString() }}</span>
          </div>
        </div>
      </router-link>
    </div>
  </section>
</template>

<style scoped>
.trending { margin-bottom: 8px; }
.trending-scroller {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 6px;
  margin: 0 -16px;
  padding-left: 16px;
  padding-right: 16px;
}
.trending-card {
  flex: 0 0 auto;
  width: 72%;
  max-width: 260px;
  scroll-snap-align: start;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px;
  text-decoration: none;
  color: inherit;
}
@media (min-width: 900px) {
  .trending-card { width: 250px; }
  .trending-card:hover { border-color: oklch(80% 0.06 44); }
}
.trending-rank {
  font-size: 1.4rem;
  font-weight: 800;
  color: oklch(64% 0.18 45);
  line-height: 1;
  min-width: 22px;
}
.trending-body { min-width: 0; }
.trending-question {
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.3;
  margin: 0 0 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.trending-foot {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.74rem;
  font-weight: 700;
}
.trending-pct { color: var(--yes); }
.trending-vol { color: var(--ink-muted); }
</style>
