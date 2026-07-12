<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  points: { type: Array, required: true }, // [{ time, yes_probability }]
})

const WIDTH = 600
const HEIGHT = 220
const PAD_X = 10
const PAD_Y = 18

const TIMEFRAMES = [
  { label: '1H', ms: 3_600_000 },
  { label: '1D', ms: 86_400_000 },
  { label: '1W', ms: 7 * 86_400_000 },
  { label: '1M', ms: 30 * 86_400_000 },
  { label: 'ALL', ms: null },
]

const activeTimeframe = ref('ALL')

const filteredPoints = computed(() => {
  const tf = TIMEFRAMES.find((t) => t.label === activeTimeframe.value)
  if (!tf.ms) return props.points
  const cutoff = Date.now() - tf.ms
  const inRange = props.points.filter((p) => new Date(p.time).getTime() >= cutoff)
  return inRange.length ? inRange : props.points.slice(-1)
})

function yFor(prob) {
  return PAD_Y + (1 - prob) * (HEIGHT - PAD_Y * 2)
}

// Points are spaced evenly by their order (each is one odds change), which keeps
// the curve clean and readable regardless of how clustered the real timestamps
// are. The timeframe tabs still filter which points are shown.
const xs = computed(() => {
  const pts = filteredPoints.value
  const n = Math.max(pts.length - 1, 1)
  return pts.map((_, i) => PAD_X + (i / n) * (WIDTH - PAD_X * 2))
})

function coords(getProb) {
  return filteredPoints.value.map((p, i) => [xs.value[i], yFor(getProb(p))])
}

// Monotone cubic (Fritsch–Carlson) — smooth curves that never overshoot the data,
// so lines stay clean with no loops, exactly like a price chart.
function smooth(pts) {
  const n = pts.length
  if (n < 2) return n ? `M${pts[0][0]},${pts[0][1]}` : ''
  if (n === 2) return `M${pts[0][0]},${pts[0][1]} L${pts[1][0]},${pts[1][1]}`

  const dx = [], dy = [], m = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0]
    dy[i] = pts[i + 1][1] - pts[i][1]
    m[i] = dy[i] / dx[i]
  }
  const t = [m[0]]
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      t[i] = 0
    } else {
      const w1 = 2 * dx[i] + dx[i - 1]
      const w2 = dx[i] + 2 * dx[i - 1]
      t[i] = (w1 + w2) / (w1 / m[i - 1] + w2 / m[i])
    }
  }
  t[n - 1] = m[n - 2]

  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`
  for (let i = 0; i < n - 1; i++) {
    const c1x = pts[i][0] + dx[i] / 3
    const c1y = pts[i][1] + (t[i] * dx[i]) / 3
    const c2x = pts[i + 1][0] - dx[i] / 3
    const c2y = pts[i + 1][1] - (t[i + 1] * dx[i]) / 3
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${pts[i + 1][0].toFixed(2)},${pts[i + 1][1].toFixed(2)}`
  }
  return d
}

const yesCoords = computed(() => coords((p) => p.yes_probability))
const noCoords = computed(() => coords((p) => 1 - p.yes_probability))
const yesPath = computed(() => smooth(yesCoords.value))
const noPath = computed(() => smooth(noCoords.value))

function endDot(coordsArr) {
  const last = coordsArr[coordsArr.length - 1]
  if (!last) return null
  return { left: (last[0] / WIDTH) * 100, top: (last[1] / HEIGHT) * 100 }
}
const yesDot = computed(() => endDot(yesCoords.value))
const noDot = computed(() => endDot(noCoords.value))

// Hover crosshair — reveals the yes/no % at any point along the line.
const hoverIndex = ref(null)
function onMove(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const rel = (e.clientX - rect.left) / rect.width
  const n = filteredPoints.value.length
  if (!n) return
  hoverIndex.value = Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1))))
}
function onLeave() { hoverIndex.value = null }

const hover = computed(() => {
  const i = hoverIndex.value
  if (i === null || !filteredPoints.value[i]) return null
  const yes = filteredPoints.value[i].yes_probability
  return {
    left: (xs.value[i] / WIDTH) * 100,
    yesTop: (yesCoords.value[i][1] / HEIGHT) * 100,
    noTop: (noCoords.value[i][1] / HEIGHT) * 100,
    yesPct: Math.round(yes * 100),
    noPct: Math.round((1 - yes) * 100),
  }
})
</script>

<template>
  <div class="odds-chart">
    <div class="timeframe-tabs">
      <button
        v-for="tf in TIMEFRAMES"
        :key="tf.label"
        class="timeframe-btn"
        :class="{ active: activeTimeframe === tf.label }"
        @click="activeTimeframe = tf.label"
      >
        {{ tf.label }}
      </button>
    </div>
    <div class="chart-body">
      <div class="chart-plot" @mousemove="onMove" @mouseleave="onLeave" @touchmove.passive="onMove($event.touches[0])">
        <svg :viewBox="`0 0 ${WIDTH} ${HEIGHT}`" preserveAspectRatio="none" class="chart-svg">
          <line
            v-for="mark in [0, 25, 50, 75, 100]"
            :key="mark"
            :x1="0" :x2="WIDTH"
            :y1="yFor(mark / 100)" :y2="yFor(mark / 100)"
            class="grid-line"
          />
          <path :d="noPath" class="chart-line line-no" />
          <path :d="yesPath" class="chart-line line-yes" />
        </svg>
        <span v-if="yesDot && !hover" class="end-dot dot-yes" :style="{ left: yesDot.left + '%', top: yesDot.top + '%' }"></span>
        <span v-if="noDot && !hover" class="end-dot dot-no" :style="{ left: noDot.left + '%', top: noDot.top + '%' }"></span>

        <template v-if="hover">
          <span class="crosshair" :style="{ left: hover.left + '%' }"></span>
          <span class="hover-dot dot-yes" :style="{ left: hover.left + '%', top: hover.yesTop + '%' }"></span>
          <span class="hover-dot dot-no" :style="{ left: hover.left + '%', top: hover.noTop + '%' }"></span>
          <span class="hover-tip" :style="{ left: hover.left + '%' }">
            <span class="tip-yes">YES {{ hover.yesPct }}%</span>
            <span class="tip-no">NO {{ hover.noPct }}%</span>
          </span>
        </template>
      </div>
      <div class="chart-grid-labels">
        <span v-for="mark in [100, 75, 50, 25, 0]" :key="mark" class="grid-label">{{ mark }}%</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.odds-chart { width: 100%; }
.timeframe-tabs {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
  background: var(--surface-sunken);
  border-radius: 999px;
  padding: 3px;
  margin-bottom: 12px;
  width: fit-content;
  margin-left: auto;
}
.timeframe-btn {
  border: none;
  background: none;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--ink-muted);
  cursor: pointer;
}
.timeframe-btn.active {
  background: var(--surface);
  color: var(--ink);
  box-shadow: 0 1px 2px oklch(0% 0 0 / 0.1);
}
.chart-body { display: flex; gap: 8px; }
.chart-plot { position: relative; flex: 1; min-width: 0; }
.chart-svg { width: 100%; height: 190px; display: block; }
.grid-line {
  stroke: var(--border);
  stroke-width: 1;
  stroke-dasharray: 3 5;
  vector-effect: non-scaling-stroke;
}
.chart-line {
  fill: none;
  stroke-width: 3;
  vector-effect: non-scaling-stroke;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.line-yes { stroke: var(--yes-bright); }
.line-no { stroke: var(--no-bright); }
.end-dot {
  position: absolute;
  width: 11px; height: 11px;
  border-radius: 999px;
  border: 2.5px solid var(--surface);
  transform: translate(-50%, -50%);
}
.dot-yes { background: var(--yes-bright); }
.dot-no { background: var(--no-bright); }

.chart-plot { cursor: crosshair; }
.crosshair {
  position: absolute;
  top: 0; bottom: 0;
  width: 2px;
  background: var(--border-strong);
  transform: translateX(-50%);
  pointer-events: none;
}
.hover-dot {
  position: absolute;
  width: 11px; height: 11px;
  border-radius: 999px;
  border: 2.5px solid var(--surface);
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.hover-tip {
  position: absolute;
  top: -4px;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  background: var(--ink);
  color: white;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  white-space: nowrap;
  pointer-events: none;
}
.tip-yes { color: oklch(80% 0.14 150); }
.tip-no { color: oklch(78% 0.14 27); }
.chart-grid-labels {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4px 0;
}
.grid-label { font-size: 0.65rem; color: var(--ink-faint); font-weight: 700; }
</style>
