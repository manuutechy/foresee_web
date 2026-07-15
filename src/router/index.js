import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { staticPages } from '../data/staticPages'

const routes = [
  { path: '/auth', name: 'auth', component: () => import('../views/AuthView.vue'), meta: { public: true } },
  // Browsing markets never requires an account — only staking, wallet, and
  // account-specific screens do.
  { path: '/', name: 'markets', component: () => import('../views/MarketListView.vue') },
  { path: '/markets/:slug', name: 'market-detail', component: () => import('../views/MarketDetailView.vue') },
  { path: '/wallet', name: 'wallet', component: () => import('../views/WalletView.vue'), meta: { requiresAuth: true } },
  { path: '/predictions', name: 'predictions', component: () => import('../views/MyPredictionsView.vue'), meta: { requiresAuth: true } },
  { path: '/notifications', name: 'notifications', component: () => import('../views/NotificationsView.vue'), meta: { requiresAuth: true } },
  { path: '/profile', name: 'profile', component: () => import('../views/ProfileView.vue'), meta: { requiresAuth: true } },
  { path: '/create', name: 'create-market', component: () => import('../views/CreateMarketView.vue'), meta: { requiresAuth: true } },

  // Footer pages — public, static content.
  { path: '/about', name: 'about', component: () => import('../views/StaticPageView.vue'), meta: { page: staticPages.about } },
  { path: '/partnerships', name: 'partnerships', component: () => import('../views/StaticPageView.vue'), meta: { page: staticPages.partnerships } },
  { path: '/terms', name: 'terms', component: () => import('../views/StaticPageView.vue'), meta: { page: staticPages.terms } },
  { path: '/privacy', name: 'privacy', component: () => import('../views/StaticPageView.vue'), meta: { page: staticPages.privacy } },
  { path: '/support', name: 'support', component: () => import('../views/SupportView.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'auth', query: { redirect: to.fullPath } }
  }
  if (to.name === 'auth' && auth.isAuthenticated) {
    return { name: 'markets' }
  }
})

export default router
