<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { renderGoogleButton } from '../composables/useGoogleSignIn'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

function goToRedirect() {
  router.push(typeof route.query.redirect === 'string' ? route.query.redirect : '/')
}

const mode = ref('login') // 'login' | 'register'
const email = ref('')
const password = ref('')
const name = ref('')
const error = ref('')
const loading = ref(false)
const googleButtonEl = ref(null)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    if (mode.value === 'register') {
      await auth.register(email.value, password.value, name.value)
    } else {
      await auth.login(email.value, password.value)
    }
    goToRedirect()
  } catch (e) {
    error.value = e.response?.data?.error || 'Something went wrong'
  } finally {
    loading.value = false
  }
}

async function handleGoogleCredential(idToken) {
  error.value = ''
  try {
    await auth.loginWithGoogle(idToken)
    goToRedirect()
  } catch (e) {
    error.value = e.response?.data?.error || 'Google sign-in failed'
  }
}

onMounted(() => {
  if (googleButtonEl.value) renderGoogleButton(googleButtonEl.value, handleGoogleCredential)
})
</script>

<template>
  <div class="page page-narrow auth-page">
    <img src="/logo.png" alt="Foresee" class="brand-mark" />
    <h1 class="wordmark">Fore<span>see</span></h1>
    <p class="subtitle">{{ mode === 'register' ? 'Create your account and start predicting.' : 'Welcome back, predictor.' }}</p>

    <div class="surface-raised card">
      <div ref="googleButtonEl" class="google-btn"></div>

      <div class="divider"><span>or use email</span></div>

      <label class="field-label">Email</label>
      <input v-model="email" type="email" placeholder="you@example.com" class="money-input field-input" />
      <label class="field-label">Password</label>
      <input v-model="password" type="password" placeholder="••••••••" class="money-input field-input" />
      <label v-if="mode === 'register'" class="field-label">Name</label>
      <input v-if="mode === 'register'" v-model="name" type="text" placeholder="Jane Wanjiru" class="money-input field-input" />

      <button class="btn-confirm full-width" :disabled="!email || !password || loading" @click="submit">
        {{ loading ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Log in' }}
      </button>

      <p v-if="error" class="error">{{ error }}</p>

      <p class="switch-mode">
        <template v-if="mode === 'login'">
          New here? <a href="#" @click.prevent="mode = 'register'">Create an account</a>
        </template>
        <template v-else>
          Already have an account? <a href="#" @click.prevent="mode = 'login'">Log in</a>
        </template>
      </p>
    </div>

    <router-link to="/" class="browse-link">Just browsing? Explore markets →</router-link>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100svh;
  max-width: 420px;
}
.brand-mark {
  display: block;
  width: 64px;
  height: 64px;
  margin: 0 auto 4px;
  border-radius: 18px;
}
.wordmark {
  text-align: center;
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--ink);
  margin: 0 0 6px;
}
.wordmark span { color: var(--brand); }
.subtitle {
  text-align: center;
  color: var(--ink-muted);
  font-weight: 700;
  margin-bottom: 22px;
}
.card {
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.google-btn {
  display: flex;
  justify-content: center;
  margin-bottom: 6px;
  min-height: 40px;
}
.divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: var(--ink-faint);
  font-size: 0.78rem;
  font-weight: 800;
  margin: 14px 0;
}
.divider::before, .divider::after {
  content: '';
  flex: 1;
  border-bottom: 2px solid var(--border);
}
.divider span { padding: 0 12px; }
.field-label {
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--ink-muted);
  margin-bottom: 4px;
}
.field-input {
  padding: 14px 16px;
  font-size: 1rem;
  font-family: inherit;
  font-weight: 700;
  margin-bottom: 10px;
}
.full-width {
  width: 100%;
  margin-top: 8px;
}
.error {
  color: var(--no);
  font-size: 0.85rem;
  font-weight: 700;
  margin-top: 10px;
}
.switch-mode {
  text-align: center;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--ink-muted);
  margin-top: 14px;
}
.switch-mode a {
  color: var(--brand);
  font-weight: 900;
  text-decoration: none;
}
.browse-link {
  display: block;
  text-align: center;
  margin-top: 20px;
  color: var(--ink-muted);
  font-weight: 800;
  font-size: 0.88rem;
  text-decoration: none;
}
</style>
