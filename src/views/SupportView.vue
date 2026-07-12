<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import client from '../api/client'
import Icon from '../components/Icon.vue'

const router = useRouter()

const CATEGORIES = [
  { value: 'deposit', label: 'Deposit issue' },
  { value: 'withdrawal', label: 'Withdrawal issue' },
  { value: 'market', label: 'A market or stake' },
  { value: 'account', label: 'Account' },
  { value: 'general', label: 'Something else' },
]

const form = ref({ name: '', email: '', category: 'general', message: '' })
const submitting = ref(false)
const error = ref('')
const done = ref(false)

async function submit() {
  error.value = ''
  if (!form.value.name.trim() || !form.value.email.trim() || !form.value.message.trim()) {
    error.value = 'Please fill in your name, email, and a message.'
    return
  }
  submitting.value = true
  try {
    await client.post('/support', form.value)
    done.value = true
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to send — please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page page-narrow static-page">
    <button class="btn-neu back-btn" @click="router.push('/')">← Back</button>
    <h1 class="title">Support</h1>

    <template v-if="!done">
      <p class="body-text">
        Trouble with a deposit, withdrawal, or a market that hasn't resolved? Fill in the form
        below and we'll get back to you by email. For anything urgent involving money, include
        the approximate time and amount so we can trace the M-Pesa transaction quickly. You can
        also reach us directly at <a href="mailto:support@foresee.co.ke">support@foresee.co.ke</a>.
      </p>

      <div class="surface-raised form-card">
        <label class="field-label">Your name</label>
        <input v-model="form.name" type="text" class="money-input field-input" />

        <label class="field-label">Email</label>
        <input v-model="form.email" type="email" class="money-input field-input" />

        <label class="field-label">What's this about?</label>
        <div class="cat-row">
          <button
            v-for="c in CATEGORIES"
            :key="c.value"
            class="btn-neu cat-chip"
            :class="{ active: form.category === c.value }"
            @click="form.category = c.value"
          >{{ c.label }}</button>
        </div>

        <label class="field-label">Message</label>
        <textarea v-model="form.message" rows="5" class="money-input field-input textarea" placeholder="Tell us what happened…"></textarea>

        <button class="btn-confirm full-width" :disabled="submitting" @click="submit">
          {{ submitting ? 'Sending…' : 'Send message' }}
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </div>
    </template>

    <div v-else class="surface-raised done-card">
      <Icon name="check-circle" :size="40" class="done-emoji" />
      <h2 class="done-title">Message sent</h2>
      <p class="body-text">We'll reply to {{ form.email }} as soon as we can.</p>
      <router-link to="/" class="view-link">Back to markets →</router-link>
    </div>
  </div>
</template>

<style scoped>
.back-btn { margin-bottom: 16px; }
.title { font-size: 1.5rem; font-weight: 900; letter-spacing: -0.01em; margin: 0 0 14px; }
.body-text { font-size: 0.92rem; line-height: 1.6; color: var(--ink-muted); font-weight: 600; margin: 0 0 20px; }
.body-text a { color: var(--brand); font-weight: 800; }
.form-card { padding: 20px; display: flex; flex-direction: column; }
.field-label { font-size: 0.8rem; font-weight: 800; color: var(--ink-muted); margin-bottom: 6px; }
.field-input { width: 100%; padding: 13px 15px; font-family: inherit; font-weight: 700; font-size: 0.95rem; margin-bottom: 16px; }
.textarea { resize: vertical; font-family: inherit; line-height: 1.5; }
.cat-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.cat-chip { font-size: 0.8rem; }
.full-width { width: 100%; }
.error { color: var(--no); font-weight: 700; margin-top: 10px; }
.done-card { padding: 32px 24px; text-align: center; }
.done-emoji { font-size: 3rem; margin-bottom: 8px; }
.done-title { font-size: 1.2rem; font-weight: 900; margin: 0 0 8px; }
.view-link { display: inline-block; color: var(--brand); font-weight: 800; text-decoration: none; margin-top: 8px; }
</style>
