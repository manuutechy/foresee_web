<script setup>
import { computed } from 'vue'

const props = defineProps({
  probability: { type: Number, required: true }, // 0-1
  size: { type: Number, default: 88 },
  label: { type: String, default: 'chance' },
})

const RADIUS = 40
const ARC_LENGTH = Math.PI * RADIUS // half-circle arc length

const pct = computed(() => Math.round(props.probability * 100))
const isYes = computed(() => props.probability >= 0.5)
const dashOffset = computed(() => ARC_LENGTH * (1 - props.probability))
</script>

<template>
  <div class="gauge" :style="{ width: size + 'px' }" role="img" :aria-label="`${pct}% ${label}`">
    <svg viewBox="0 0 100 58" class="gauge-svg">
      <path d="M10,50 A40,40 0 0 1 90,50" class="gauge-track" />
      <path
        d="M10,50 A40,40 0 0 1 90,50"
        class="gauge-fill"
        :class="isYes ? 'gauge-fill-yes' : 'gauge-fill-no'"
        :style="{ strokeDasharray: RADIUS * Math.PI, strokeDashoffset: dashOffset }"
      />
    </svg>
    <div class="gauge-readout">
      <span class="gauge-pct" :class="isYes ? 'text-yes' : 'text-no'">{{ pct }}%</span>
      <span class="gauge-label">{{ label }}</span>
    </div>
  </div>
</template>

<style scoped>
.gauge {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.gauge-svg {
  width: 100%;
  display: block;
  overflow: visible;
}
.gauge-track {
  fill: none;
  stroke: var(--border);
  stroke-width: 9;
  stroke-linecap: round;
}
.gauge-fill {
  fill: none;
  stroke-width: 9;
  stroke-linecap: round;
  transition: stroke-dashoffset 500ms cubic-bezier(0.16, 1, 0.3, 1);
}
.gauge-fill-yes { stroke: var(--yes); }
.gauge-fill-no { stroke: var(--no); }
.gauge-readout {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: -6px;
}
.gauge-pct {
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1;
}
.text-yes { color: var(--yes); }
.text-no { color: var(--no); }
.gauge-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--ink-muted);
  margin-top: 2px;
}
</style>
