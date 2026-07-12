<script setup>
const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 16 },
})

// A small hand-drawn set of stroke icons so the app never depends on an emoji
// font being installed on the viewer's system (unlike color emoji, these are
// plain SVG and render identically everywhere).
const PATHS = {
  rocket: 'M12 2c-2 3-3 6-3 10 0 2 1 4 3 6 2-2 3-4 3-6 0-4-1-7-3-10z|M9 15l-2.5 2.5|M15 15l2.5 2.5|c:12,9,1.5',
  landmark: 'M2 10l10-6 10 6|M4 10v11|M20 10v11|M9 21v-6|M15 21v-6|M2 21h20',
  image: 'r:3,3,18,18,2|c:8.5,8.5,1.5|M21 15l-5-5L5 21',
  pin: 'M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z|c:12,10,2.5',
  wallet: 'M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z|M15.5 12h2.5',
  target: 'c:12,12,9|c:12,12,5|c:12,12,1.5',
  bell: 'M12 3a5 5 0 0 0-5 5v3.5c0 .8-.3 1.6-.9 2.2L5 15h14l-1.1-1.3a3 3 0 0 1-.9-2.2V8a5 5 0 0 0-5-5z|M10 18a2 2 0 0 0 4 0',
  search: 'c:10.5,10.5,6.5|M20 20l-4.35-4.35',
  'bar-chart': 'M4 20V10|M10 20V4|M16 20v-7|M4 20h16',
  card: 'r:2,5,20,14,2|M2 10h20',
  users: 'c:9,8,3|M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6|c:17,9,2.5|M15.5 14a5 5 0 0 1 4.9 6',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z',
  upload: 'M12 16V4|M7 9l5-5 5 5|M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3',
  'trending-up': 'M3 17l6-6 4 4 8-8|M15 6h6v6',
  banknote: 'r:2,6,20,12,2|c:12,12,3',
  'message-circle': 'M21 11.5a8.5 8.5 0 0 1-12.36 7.57L3 20l1.07-4.44A8.5 8.5 0 1 1 21 11.5z',
  ballot: 'r:4,4,16,16,0|M8 12l3 3 5-6',
  sparkle: 'M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z|M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
  flame: 'M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1-1-2-1-2 1 0 3 2 3 5a5 5 0 0 1-10 0c0-5 3-6 5-11z',
  link: 'M9 15l6-6|M8 12l-2 2a3.5 3.5 0 0 0 5 5l2-2|M16 12l2-2a3.5 3.5 0 0 0-5-5l-2 2',
  lock: 'r:4,11,16,9,2|M8 11V7a4 4 0 0 1 8 0v4',
  clipboard: 'r:6,4,12,17,2|r:9,2,6,4,1|M9 12h6|M9 16h6',
  trophy: 'M7 4h10v4a5 5 0 0 1-10 0V4z|M5 5H3v2a4 4 0 0 0 4 4|M19 5h2v2a4 4 0 0 1-4 4|M9 20h6|M12 15v5',
  flag: 'M5 21V4|M5 4h13l-3 4 3 4H5',
  party: 'M3 21l6-2 10-10-4-4L5 15l-2 6z|M14 6l4 4|c:19,4,1|c:21,9,1|c:15,2,1',
  'check-circle': 'c:12,12,9|M8 12l3 3 5-6',
  person: 'c:12,8,4|M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8',
  phone: 'r:7,2,10,20,2|M11 18h2',
  settings: 'c:12,12,3|M12 2v3|M12 19v3|M4.2 4.2l2.1 2.1|M17.7 17.7l2.1 2.1|M2 12h3|M19 12h3|M4.2 19.8l2.1-2.1|M17.7 6.3l2.1-2.1',
  scale: 'M12 3v18|M5 7h14|M5 7l-3 6a3 3 0 0 0 6 0z|M19 7l-3 6a3 3 0 0 0 6 0z',
  clock: 'c:12,12,9|M12 7v5l3 3',
}

function segments(name) {
  const spec = PATHS[name] || ''
  return spec.split('|').map((seg) => {
    if (seg.startsWith('c:')) {
      const [cx, cy, r] = seg.slice(2).split(',')
      return { tag: 'circle', attrs: { cx, cy, r } }
    }
    if (seg.startsWith('r:')) {
      const [x, y, w, h, rx] = seg.slice(2).split(',')
      return { tag: 'rect', attrs: { x, y, width: w, height: h, rx } }
    }
    return { tag: 'path', attrs: { d: seg } }
  })
}
</script>

<template>
  <svg
    :width="size" :height="size" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round"
    class="icon" aria-hidden="true"
  >
    <component :is="seg.tag" v-for="(seg, i) in segments(name)" :key="i" v-bind="seg.attrs" />
  </svg>
</template>

<style scoped>
.icon { display: inline-block; vertical-align: -3px; flex-shrink: 0; }
</style>
