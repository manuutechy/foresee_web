<script setup>
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const page = route.meta.page
</script>

<template>
  <div class="page page-narrow static-page">
    <button class="btn-neu back-btn" @click="router.push('/')">← Back</button>
    <h1 class="title">{{ page.title }}</h1>
    <div v-for="(section, i) in page.sections" :key="i" class="section">
      <h2 v-if="section.heading" class="heading">{{ section.heading }}</h2>
      <p v-for="(p, j) in section.body" :key="j" class="body-text">{{ p }}</p>
    </div>
  </div>
</template>

<style scoped>
.back-btn { margin-bottom: 16px; }
.title { font-size: 1.5rem; font-weight: 900; letter-spacing: -0.01em; margin: 0 0 20px; }
.section { margin-bottom: 20px; }
.heading { font-size: 1.02rem; font-weight: 800; margin: 0 0 8px; }
.body-text { font-size: 0.92rem; line-height: 1.6; color: var(--ink-muted); font-weight: 600; margin: 0 0 10px; }
</style>
