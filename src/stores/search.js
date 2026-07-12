import { defineStore } from 'pinia'

// Shared so the search input lives in the top bar (desktop) while the
// market list (a sibling route view) does the actual filtering.
export const useSearchStore = defineStore('search', {
  state: () => ({ query: '' }),
})
