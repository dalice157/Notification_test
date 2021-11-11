import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    doubleCount(state) { return state.count * 2 },
    doubleGet(): number { return this.doubleCount / 2 }
  },
  actions: {
    increment() {
      this.count++
    }
  }
})
