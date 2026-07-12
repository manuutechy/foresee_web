<script setup>
import { ref, onMounted } from 'vue'
import client from '../api/client'

const whatsappUrl = ref('')

onMounted(async () => {
  try {
    const { data } = await client.get('/config')
    whatsappUrl.value = data.whatsapp_channel_url
  } catch { /* footer still renders without the WhatsApp link */ }
})
</script>

<template>
  <footer class="app-footer">
    <div class="footer-inner">
      <div class="footer-top">
        <div class="footer-brand">
          <div class="footer-wordmark-row">
            <img src="/logo.png" alt="" class="footer-logo" />
            <span class="wordmark">Fore<span class="accent">see</span></span>
          </div>
          <p class="tagline">Predict the outcome. Split the pot.</p>
        </div>

        <a v-if="whatsappUrl" :href="whatsappUrl" target="_blank" rel="noopener" class="wa-pill">
          <span class="wa-dot"></span>
          Join our WhatsApp channel
        </a>
      </div>

      <nav class="footer-links">
        <router-link to="/about">About</router-link>
        <router-link to="/create">Propose Markets &amp; Get Paid</router-link>
        <router-link to="/partnerships">Partnerships</router-link>
        <router-link to="/terms">Terms</router-link>
        <router-link to="/privacy">Privacy</router-link>
        <router-link to="/support">Support</router-link>
      </nav>

      <p class="copyright">© {{ new Date().getFullYear() }} Foresee · Predictions settle in KES via M-Pesa</p>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  background: var(--surface);
  border-top: 2px solid var(--border);
  margin-top: 32px;
  padding: 28px 16px 100px;
}
@media (min-width: 900px) {
  .app-footer { padding: 32px 40px 40px; }
}
.footer-inner { max-width: 1100px; margin: 0 auto; }
.footer-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
}
.footer-wordmark-row { display: flex; align-items: center; gap: 8px; }
.footer-logo { width: 24px; height: 24px; border-radius: 7px; flex-shrink: 0; }
.wordmark { font-weight: 900; font-size: 1.2rem; letter-spacing: -0.02em; color: var(--ink); }
.wordmark .accent { color: var(--brand); }
.tagline { font-size: 0.85rem; color: var(--ink-muted); font-weight: 700; margin: 4px 0 0; }

.wa-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--yes-tint);
  color: var(--yes);
  border: 2px solid oklch(85% 0.09 150);
  border-radius: 999px;
  padding: 9px 16px;
  font-weight: 800;
  font-size: 0.85rem;
  text-decoration: none;
}
.wa-dot {
  width: 8px; height: 8px; border-radius: 999px;
  background: var(--yes-bright, var(--yes));
}

.footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-bottom: 18px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border);
}
.footer-links a {
  color: var(--ink-muted);
  text-decoration: none;
  font-weight: 700;
  font-size: 0.85rem;
}
.footer-links a:hover { color: var(--brand); }

.copyright { font-size: 0.76rem; color: var(--ink-faint); font-weight: 600; margin: 0; }
</style>
