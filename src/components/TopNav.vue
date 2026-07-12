<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useWalletStore } from '../stores/wallet'
import { useSearchStore } from '../stores/search'

const router = useRouter()
const auth = useAuthStore()
const wallet = useWalletStore()
const search = useSearchStore()

const items = [
  { to: '/', label: 'Markets' },
  { to: '/predictions', label: 'My Bets' },
  { to: '/wallet', label: 'Wallet' },
  { to: '/notifications', label: 'Alerts' },
  { to: '/profile', label: 'Profile' },
]

const showHowItWorks = ref(false)

onMounted(() => {
  if (auth.isAuthenticated) wallet.fetchBalance()
})
</script>

<template>
  <header class="top-nav">
    <div class="top-nav-inner">
      <router-link to="/" class="wordmark-link">
        <img src="/logo.png" alt="Foresee" class="logo-img" />
        <span class="wordmark">Fore<span class="accent">see</span></span>
      </router-link>

      <div class="search-wrap">
        <span class="search-icon">⌕</span>
        <input v-model="search.query" type="search" placeholder="Search markets…" class="search-input" />
      </div>

      <nav class="nav-links">
        <router-link v-for="item in items" :key="item.to" :to="item.to" class="nav-link" active-class="nav-link-active">
          {{ item.label }}
        </router-link>
      </nav>

      <div class="how-it-works-wrap">
        <button class="how-link" @click="showHowItWorks = !showHowItWorks">ⓘ How it works</button>
        <div v-if="showHowItWorks" class="how-popover surface-raised">
          <p>
            Foresee is a peer-to-peer prediction market. Stake KES on YES or NO — everyone on the
            losing side funds the payouts for the winning side, minus a small platform fee.
          </p>
          <p>Prices move in real time as more people stake, and payouts are shown before you confirm.</p>
          <button class="btn-neu" @click="showHowItWorks = false">Got it</button>
        </div>
      </div>

      <div class="top-nav-actions">
        <template v-if="auth.isAuthenticated">
          <button class="create-btn" @click="router.push('/create')">＋ Create</button>
          <span class="balance-pill money-display">KES {{ wallet.balance.toLocaleString() }}</span>
          <button class="btn-brand" @click="router.push('/wallet')">Deposit</button>
        </template>
        <template v-else>
          <button class="login-btn" @click="router.push('/auth')">Log in</button>
          <button class="btn-brand" @click="router.push('/auth')">Sign up</button>
        </template>
      </div>
    </div>
  </header>
</template>

<style scoped>
.top-nav {
  background: var(--surface);
  border-bottom: 2px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 20;
}
.top-nav-inner {
  max-width: 1240px;
  margin: 0 auto;
  padding: 12px 32px;
  display: flex;
  align-items: center;
  gap: 18px;
}
.wordmark-link { text-decoration: none; display: flex; align-items: center; gap: 7px; }
.logo-img { width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; }
.wordmark { font-weight: 800; font-size: 1.2rem; letter-spacing: -0.02em; color: var(--ink); }
.wordmark .accent { color: var(--brand); }

.search-wrap {
  position: relative;
  flex: 1;
  min-width: 160px;
  max-width: 380px;
}
.search-icon {
  position: absolute;
  left: 15px; top: 50%;
  transform: translateY(-50%);
  color: var(--ink-faint);
  font-size: 1.1rem;
}
.search-input {
  width: 100%;
  padding: 11px 16px 11px 38px;
  border-radius: 999px;
  border: 2px solid var(--border);
  background: var(--surface-sunken);
  font-family: inherit;
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--ink);
}
.search-input:focus { outline: 3px solid var(--brand-tint); border-color: var(--brand); background: var(--surface); }

.nav-links { display: flex; gap: 4px; }
.nav-link {
  padding: 8px 12px;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--ink-muted);
  white-space: nowrap;
}
.nav-link-active { color: var(--brand); background: var(--brand-tint); }

.how-it-works-wrap { position: relative; }
.how-link {
  background: none; border: none;
  color: var(--accent); font-weight: 700; font-size: 0.85rem;
  cursor: pointer; white-space: nowrap; padding: 8px 4px;
}
.how-popover {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 300px;
  padding: 18px;
  z-index: 30;
}
.how-popover p { font-size: 0.85rem; color: var(--ink-muted); line-height: 1.5; font-weight: 600; margin: 0 0 10px; }

.top-nav-actions { display: flex; align-items: center; gap: 10px; }
.create-btn {
  background: var(--surface);
  color: var(--brand);
  border: 2px solid var(--brand);
  border-bottom-width: 3px;
  border-radius: 999px;
  padding: 8px 16px;
  font-family: inherit;
  font-weight: 800;
  font-size: 0.88rem;
  cursor: pointer;
  white-space: nowrap;
}
.create-btn:active { transform: translateY(1px); }
.login-btn {
  background: none; border: none;
  color: var(--ink); font-family: inherit; font-weight: 800; font-size: 0.9rem;
  cursor: pointer; padding: 8px 10px;
}
.balance-pill { padding: 8px 14px; font-weight: 800; font-size: 0.88rem; white-space: nowrap; }

/* Hide nav links on smaller desktops so search + actions keep room */
@media (max-width: 1160px) {
  .nav-links { display: none; }
}
</style>
