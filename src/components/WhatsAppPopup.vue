<script setup>
import { ref, onMounted } from 'vue'
import client from '../api/client'

// Shown at most once per this window, so it invites without nagging.
const SNOOZE_MS = 24 * 60 * 60 * 1000
const STORAGE_KEY = 'foresee_wa_popup_dismissed_at'

const popup = ref(null)
const visible = ref(false)

function recentlyDismissed() {
  const at = Number(localStorage.getItem(STORAGE_KEY) || 0)
  return Date.now() - at < SNOOZE_MS
}

function dismiss() {
  visible.value = false
  localStorage.setItem(STORAGE_KEY, String(Date.now()))
}

function join() {
  window.open(popup.value.url, '_blank', 'noopener')
  dismiss()
}

onMounted(async () => {
  if (recentlyDismissed()) return
  try {
    const { data } = await client.get('/config')
    if (data.whatsapp_popup?.enabled && data.whatsapp_popup.url) {
      popup.value = data.whatsapp_popup
      // Small delay so it doesn't fight with the page's first paint.
      setTimeout(() => { visible.value = true }, 1200)
    }
  } catch { /* no popup if config can't load */ }
})
</script>

<template>
  <transition name="wa-fade">
    <div v-if="visible && popup" class="wa-backdrop" @click.self="dismiss">
      <div class="wa-card">
        <button class="wa-close" aria-label="Close" @click="dismiss">×</button>
        <div class="wa-logo">
          <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" aria-hidden="true">
            <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38a9.9 9.9 0 0 0 4.73 1.2h.01c5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2Zm5.8 14.16c-.24.68-1.4 1.3-1.94 1.34-.5.06-1.13.08-1.83-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.8-4.17-4.94-4.36-.15-.19-1.19-1.58-1.19-3.01 0-1.43.75-2.13 1.02-2.42.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.82 2.01.89 2.16.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.29.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.16-.19.69-.81.88-1.09.19-.27.37-.22.62-.13.25.09 1.62.76 1.9.9.28.14.46.21.53.33.07.12.07.68-.17 1.36Z"/>
          </svg>
        </div>
        <h2>{{ popup.title }}</h2>
        <p>{{ popup.message }}</p>
        <button class="wa-join" @click="join">{{ popup.button || 'Join WhatsApp' }}</button>
        <button class="wa-later" @click="dismiss">Maybe later</button>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.wa-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.wa-card {
  position: relative;
  width: 100%; max-width: 360px;
  background: var(--surface, #fff);
  border-radius: 20px;
  padding: 28px 24px 20px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
}
.wa-close {
  position: absolute; top: 10px; right: 14px;
  background: none; border: none; font-size: 1.6rem; line-height: 1;
  color: var(--ink-faint, #999); cursor: pointer; font-family: inherit;
}
.wa-logo {
  width: 60px; height: 60px; margin: 0 auto 14px;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: #25D366; color: #fff;
}
.wa-card h2 { font-size: 1.25rem; font-weight: 900; margin: 0 0 8px; color: var(--ink, #111); }
.wa-card p { font-size: 0.92rem; line-height: 1.5; color: var(--ink-muted, #555); font-weight: 600; margin: 0 0 20px; }
.wa-join {
  width: 100%; padding: 14px; border: none; border-radius: 12px;
  background: #25D366; color: #fff; font-weight: 900; font-size: 1rem;
  font-family: inherit; cursor: pointer;
}
.wa-join:active { transform: translateY(1px); }
.wa-later {
  width: 100%; margin-top: 8px; padding: 10px; border: none; background: none;
  color: var(--ink-muted, #777); font-weight: 700; font-size: 0.88rem; cursor: pointer; font-family: inherit;
}
.wa-fade-enter-active, .wa-fade-leave-active { transition: opacity 0.25s ease; }
.wa-fade-enter-from, .wa-fade-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .wa-fade-enter-active, .wa-fade-leave-active { transition: none; }
}
</style>
