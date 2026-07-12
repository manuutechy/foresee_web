<script setup>
import { useRoute } from 'vue-router'
import BottomNav from './components/BottomNav.vue'
import TopNav from './components/TopNav.vue'
import AppFooter from './components/AppFooter.vue'

const route = useRoute()
</script>

<template>
  <TopNav v-if="route.name !== 'auth'" class="desktop-only" />
  <router-view />
  <AppFooter v-if="route.name !== 'auth'" />
  <BottomNav v-if="route.name !== 'auth'" class="mobile-only" />
</template>
