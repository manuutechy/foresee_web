<script setup>
import { ref, onMounted } from 'vue'
import client from '../api/client'
import Icon from '../components/Icon.vue'

const notifications = ref([])
const loading = ref(true)

const icons = {
  market_resolved: 'flag',
  payout_received: 'banknote',
  market_locking_soon: 'clock',
  withdrawal_update: 'landmark',
}

async function load() {
  loading.value = true
  const { data } = await client.get('/notifications')
  notifications.value = data
  loading.value = false
}

async function markRead(n) {
  if (n.read_at) return
  await client.post(`/notifications/${n.id}/read`)
  n.read_at = new Date().toISOString()
}

onMounted(load)
</script>

<template>
  <div class="page page-narrow">
    <h1 class="title">Notifications</h1>

    <p v-if="loading" class="hint">Loading…</p>
    <p v-else-if="!notifications.length" class="hint">You're all caught up.</p>

    <div
      v-for="n in notifications"
      :key="n.id"
      class="surface-raised notif-row"
      :class="{ unread: !n.read_at }"
      @click="markRead(n)"
    >
      <Icon :name="icons[n.type] || 'bell'" :size="20" class="icon" />
      <span class="body">{{ n.body }}</span>
      <span v-if="!n.read_at" class="unread-dot" aria-label="unread"></span>
    </div>
  </div>
</template>

<style scoped>
.title { color: var(--accent); margin-bottom: 16px; }
.hint { color: var(--text-secondary); text-align: center; margin-top: 32px; }
.notif-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  margin-bottom: 10px;
  cursor: pointer;
}
.notif-row.unread {
  background: var(--accent-tint);
  border-color: var(--accent-tint);
}
.icon { flex-shrink: 0; color: var(--accent); }
.body { font-size: 0.9rem; flex: 1; }
.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--accent);
  flex-shrink: 0;
}
</style>
