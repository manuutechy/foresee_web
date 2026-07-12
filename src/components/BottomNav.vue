<script setup>
import Icon from './Icon.vue'

const items = [
  { to: '/', label: 'Markets', icon: 'bar-chart' },
  { to: '/predictions', label: 'My Bets', icon: 'target' },
  { to: '/wallet', label: 'Wallet', icon: 'wallet' },
  { to: '/notifications', label: 'Alerts', icon: 'bell' },
  { to: '/profile', label: 'Profile', icon: 'person' },
]
</script>

<template>
  <nav class="bottom-nav">
    <router-link
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="nav-item"
      active-class="nav-item-active"
    >
      <Icon :name="item.icon" :size="20" class="icon" />
      <span class="label">{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 12px;
  left: 12px;
  right: 12px;
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  justify-content: space-around;
  padding: 8px 6px;
  background: var(--surface);
  border: 2px solid var(--border);
  border-bottom-width: 4px;
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 14px oklch(30% 0.06 60 / 0.1);
}
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  text-decoration: none;
  color: var(--ink-faint);
  font-size: 0.66rem;
  font-weight: 800;
  padding: 6px 8px;
  border-radius: 14px;
}
.nav-item .icon { filter: grayscale(0.4) opacity(0.7); }
.nav-item-active {
  color: var(--brand);
  background: var(--brand-tint);
}
.nav-item-active .icon { filter: none; }
</style>
