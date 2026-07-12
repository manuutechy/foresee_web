<script setup>
import { computed } from 'vue'

const props = defineProps({
  probability: { type: Number, required: true }, // 0-1 (yes)
  size: { type: Number, default: 96 },
  stroke: { type: Number, default: 11 },
  track: { type: String, default: 'var(--border)' },
  label: { type: String, default: 'YES' },
})

const R = computed(() => (100 - props.stroke) / 2)
const CIRC = computed(() => 2 * Math.PI * R.value)
const pct = computed(() => Math.round(props.probability * 100))
const dash = computed(() => `${CIRC.value * props.probability} ${CIRC.value}`)
const ringColor = computed(() => (props.probability >= 0.5 ? 'var(--yes-bright)' : 'var(--no-bright)'))
</script>

<template>
  <div class="ring" :style="{ width: size + 'px', height: size + 'px' }" role="img" :aria-label="`${pct}% ${label}`">
    <svg viewBox="0 0 100 100">
      <circle cx="50" cy="50" :r="R" :stroke="track" :stroke-width="stroke" fill="none" />
      <circle
        cx="50" cy="50" :r="R"
        :stroke="ringColor" :stroke-width="stroke" fill="none"
        stroke-linecap="round"
        :stroke-dasharray="dash"
        transform="rotate(-90 50 50)"
        class="ring-progress"
      />
    </svg>
    <div class="ring-center">
      <span class="ring-pct">{{ pct }}<span class="ring-sign">%</span></span>
      <span class="ring-label">{{ label }}</span>
    </div>
  </div>
</template>

<style scoped>
.ring { position: relative; flex-shrink: 0; }
.ring svg { width: 100%; height: 100%; display: block; }
.ring-progress { transition: stroke-dasharray 550ms cubic-bezier(0.16, 1, 0.3, 1); }
@media (prefers-reduced-motion: reduce) {
  .ring-progress { transition: none; }
}
.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.ring-pct {
  font-size: 1.28rem;
  font-weight: 900;
  color: var(--ink);
  letter-spacing: -0.02em;
}
.ring-sign { font-size: 0.72rem; }
.ring-label {
  font-size: 0.6rem;
  font-weight: 800;
  color: var(--ink-muted);
  letter-spacing: 0.06em;
  margin-top: 3px;
}
</style>
