<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import client, { mediaUrl } from '../api/client'

const router = useRouter()

const ZONES = ['Nationwide', 'Nairobi', 'Coast', 'Rift Valley', 'Western', 'Nyanza', 'Central', 'Eastern', 'North Eastern']
const CATEGORIES = ['sports', 'politics', 'weather', 'pop culture', 'finance', 'entertainment']

const form = ref({
  question: '', category: 'sports', zone: 'Nationwide', image_url: '', resolution_source: '', lock_at: '',
  market_type: 'binary',
})
const options = ref(['', ''])
const creating = ref(false)
const uploading = ref(false)
const error = ref('')
const createdId = ref(null)
const copied = ref(false)

function addOption() {
  if (options.value.length < 6) options.value.push('')
}
function removeOption(i) {
  if (options.value.length > 2) options.value.splice(i, 1)
}

async function uploadImage(e) {
  const file = e.target.files[0]
  if (!file) return
  uploading.value = true
  error.value = ''
  try {
    const fd = new FormData()
    fd.append('image', file)
    const { data } = await client.post('/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    form.value.image_url = data.url
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to upload image'
  } finally {
    uploading.value = false
  }
}

const shareUrl = computed(() =>
  createdId.value ? `${window.location.origin}/markets/${createdId.value}` : ''
)

// Default the lock time to 3 days out for convenience
function defaultLock() {
  const d = new Date(Date.now() + 3 * 86_400_000)
  d.setMinutes(0, 0, 0)
  return d.toISOString().slice(0, 16)
}
if (!form.value.lock_at) form.value.lock_at = defaultLock()

async function create() {
  error.value = ''
  if (form.value.market_type === 'multiple_choice') {
    const filled = options.value.map((o) => o.trim()).filter(Boolean)
    if (filled.length < 2) {
      error.value = 'Add at least 2 choices.'
      return
    }
  }
  creating.value = true
  try {
    const { data } = await client.post('/markets', {
      ...form.value,
      options: form.value.market_type === 'multiple_choice' ? options.value.map((o) => o.trim()).filter(Boolean) : undefined,
      lock_at: new Date(form.value.lock_at).toISOString(),
    })
    createdId.value = data.id
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to create market'
  } finally {
    creating.value = false
  }
}

async function copyLink() {
  await navigator.clipboard.writeText(shareUrl.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1600)
}

function shareWhatsApp() {
  const text = encodeURIComponent(`Predict this on Foresee: ${form.value.question} ${shareUrl.value}`)
  window.open(`https://wa.me/?text=${text}`, '_blank')
}
</script>

<template>
  <div class="page page-narrow">
    <button class="btn-neu back-btn" @click="router.back()">← Back</button>

    <template v-if="!createdId">
      <h1 class="title">Create a market</h1>
      <p class="subtitle">Ask a yes/no question about a real event. It goes live instantly — then share it with your friends.</p>

      <div class="surface-raised form-card">
        <label class="label">Market type</label>
        <div class="pick-row">
          <button class="btn-neu pick" :class="{ active: form.market_type === 'binary' }" @click="form.market_type = 'binary'">
            Yes / No
          </button>
          <button class="btn-neu pick" :class="{ active: form.market_type === 'multiple_choice' }" @click="form.market_type = 'multiple_choice'">
            Multiple choice
          </button>
        </div>

        <label class="label">Your question</label>
        <input
          v-model="form.question"
          type="text"
          :placeholder="form.market_type === 'binary' ? 'Will it rain in Nairobi this Friday?' : 'Who will score the most hat tricks this season?'"
          class="money-input input"
        />
        <p class="hint">
          {{ form.market_type === 'binary' ? 'Must be a yes/no question and end with a “?”' : 'Must end with a “?” — add the choices below.' }}
        </p>

        <template v-if="form.market_type === 'multiple_choice'">
          <label class="label">Choices</label>
          <div v-for="(opt, i) in options" :key="i" class="option-row">
            <input v-model="options[i]" type="text" :placeholder="`Choice ${i + 1}`" class="money-input input option-input" />
            <button v-if="options.length > 2" class="option-remove" title="Remove" @click="removeOption(i)">✕</button>
          </div>
          <button v-if="options.length < 6" class="btn-neu add-option" @click="addOption">+ Add another choice</button>
          <p class="hint">Between 2 and 6 choices.</p>
        </template>

        <label class="label">Picture (optional)</label>
        <div class="image-upload-row">
          <img v-if="form.image_url" :src="mediaUrl(form.image_url)" alt="" class="image-preview" />
          <label class="btn-neu upload-btn">
            {{ uploading ? 'Uploading…' : form.image_url ? 'Change picture' : 'Add a picture' }}
            <input type="file" accept="image/*" class="file-input" :disabled="uploading" @change="uploadImage" />
          </label>
        </div>

        <label class="label">Topic</label>
        <div class="pick-row">
          <button
            v-for="c in CATEGORIES"
            :key="c"
            class="btn-neu pick"
            :class="{ active: form.category === c }"
            @click="form.category = c"
          >{{ c }}</button>
        </div>

        <label class="label">Zone</label>
        <select v-model="form.zone" class="money-input input">
          <option v-for="z in ZONES" :key="z">{{ z }}</option>
        </select>

        <label class="label">How will it be resolved? (source link)</label>
        <input v-model="form.resolution_source" type="url" placeholder="https://…" class="money-input input" />

        <label class="label">Locks at</label>
        <input v-model="form.lock_at" type="datetime-local" class="money-input input" />
        <p class="hint">Staking closes at this time. Between 30 min and 6 months from now.</p>

        <button class="btn-confirm full" :disabled="creating" @click="create">
          {{ creating ? 'Launching…' : 'Launch market' }}
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </div>
    </template>

    <template v-else>
      <div class="surface-raised done-card">
        <h1 class="title">Your market is live!</h1>
        <p class="subtitle">Share it so people start predicting.</p>

        <div class="share-row">
          <button class="btn-confirm share-wa" @click="shareWhatsApp">Share on WhatsApp</button>
          <button class="btn-neu share-copy" @click="copyLink">{{ copied ? 'Copied ✓' : 'Copy link' }}</button>
        </div>

        <router-link :to="`/markets/${createdId}`" class="view-link">View market →</router-link>
      </div>
    </template>
  </div>
</template>

<style scoped>
.back-btn { margin-bottom: 16px; }
.title { font-size: 1.5rem; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.01em; }
.subtitle { color: var(--ink-muted); font-weight: 700; margin: 0 0 20px; }
.form-card { padding: 20px; display: flex; flex-direction: column; }
.label { font-size: 0.8rem; font-weight: 800; color: var(--ink-muted); margin-bottom: 6px; }
.input { width: 100%; padding: 13px 15px; font-family: inherit; font-weight: 700; font-size: 0.95rem; margin-bottom: 6px; }
.hint { font-size: 0.75rem; color: var(--ink-faint); font-weight: 700; margin: 0 0 16px; }
.image-upload-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.image-preview { width: 64px; height: 64px; border-radius: 14px; object-fit: cover; background: var(--surface-sunken); flex-shrink: 0; }
.upload-btn { position: relative; cursor: pointer; }
.file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
.option-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.option-input { margin-bottom: 0; flex: 1; }
.option-remove {
  flex-shrink: 0; width: 34px; height: 34px; border-radius: 10px;
  border: 2px solid var(--border); background: var(--surface);
  color: var(--ink-muted); font-weight: 800; cursor: pointer;
}
.add-option { margin: 4px 0 16px; align-self: flex-start; }
.pick-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.pick { text-transform: capitalize; }
.full { width: 100%; margin-top: 6px; }
.error { color: var(--no); font-weight: 700; margin-top: 10px; }

.done-card { padding: 32px 24px; text-align: center; }
.share-row { display: flex; gap: 10px; justify-content: center; margin: 20px 0 16px; flex-wrap: wrap; }
.share-wa { --_face: var(--yes-bright); --_edge: var(--yes-edge); }
.view-link { display: inline-block; color: var(--brand); font-weight: 800; text-decoration: none; }
</style>
