<template>
  <div>
    <div
      v-if="isMobileMenuOpen"
      class="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
      @click="closeMobileMenu"
    ></div>

    <div
      :class="[
        'fixed inset-y-0 left-0 z-50 w-60 bg-slate-800  transform transition-transform duration-300 ease-in-out lg:translate-x-0',
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
      ]"
    >
      <div class="flex items-center justify-between px-6 py-5 border-b border-slate-700">
        <div class="flex items-center">
          <i class="mr-3 text-2xl text-white pi pi-warehouse"></i>
          <span class="text-lg font-semibold text-white">Inventory</span>
        </div>
        <button
          @click="closeMobileMenu"
          class="p-1 transition-colors duration-200 rounded lg:hidden text-slate-400 hover:text-white"
        >
          <i class="text-xl pi pi-times"></i>
        </button>
      </div>

      <nav class="mt-6">
        <div class="px-3 space-y-1">
          <router-link
            v-for="item in navigationItems"
            :key="item.name"
            :to="item.path"
            :class="[
              'group flex items-center px-6 py-3 text-sm font-medium rounded-md transition-colors duration-200',
              $route.path === item.path
                ? 'bg-slate-700  text-white border-l-4 border-indigo-500 '
                : 'text-slate-300 hover:bg-slate-700  hover:text-white',
            ]"
            @click="closeMobileMenu"
          >
            <i :class="[item.icon, 'mr-3 text-lg']"></i>
            {{ item.name }}
          </router-link>
        </div>
      </nav>

      <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
        <button
          @click="toggleDarkMode"
          class="flex items-center justify-between w-full px-4 py-3 text-sm font-medium transition-colors duration-200 rounded-md text-slate-300 hover:bg-slate-700 hover:text-white"
        >
          <div class="flex items-center">
            <i :class="[isDarkMode ? 'pi pi-sun' : 'pi pi-moon', 'mr-3 text-lg']"></i>
            <span>Dark mode</span>
          </div>
          <div class="relative">
            <div
              :class="[
                'w-10 h-6 rounded-full transition-colors duration-200',
                isDarkMode ? 'bg-indigo-600' : 'bg-slate-600',
              ]"
            >
              <div
                :class="[
                  'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200',
                  isDarkMode ? 'translate-x-5' : 'translate-x-1',
                ]"
              ></div>
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useDarkMode } from '../composables/useDarkMode'

const isMobileMenuOpen = ref(false)
const { isDarkMode, toggleDarkMode, initializeDarkMode } = useDarkMode()

const EDGE_ZONE_PX = 24
const OPEN_THRESHOLD_PX = 60
const VERTICAL_SLOP_PX = 40

let touchStartX = 0
let touchStartY = 0
let tracking = false

const navigationItems = [
  {
    name: 'Dashboard',
    path: '/',
    icon: 'pi pi-chart-line',
  },
  {
    name: 'Categories',
    path: '/categories',
    icon: 'pi pi-folder',
  },
  {
    name: 'Items',
    path: '/items',
    icon: 'pi pi-box',
  },
]

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

const handleResize = () => {
  if (window.innerWidth >= 1024) {
    isMobileMenuOpen.value = false
  }
}

const onTouchStart = (e: TouchEvent) => {
  if (window.innerWidth >= 1024) return
  if (isMobileMenuOpen.value) return
  const touch = e.touches[0]
  if (!touch) return
  if (touch.clientX > EDGE_ZONE_PX) return
  touchStartX = touch.clientX
  touchStartY = touch.clientY
  tracking = true
}

const onTouchMove = (e: TouchEvent) => {
  if (!tracking) return
  const touch = e.touches[0]
  if (!touch) return
  const dx = touch.clientX - touchStartX
  const dy = Math.abs(touch.clientY - touchStartY)
  if (dy > VERTICAL_SLOP_PX && dy > dx) {
    tracking = false
    return
  }
  if (dx >= OPEN_THRESHOLD_PX) {
    isMobileMenuOpen.value = true
    tracking = false
  }
}

const onTouchEnd = () => {
  tracking = false
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: true })
  window.addEventListener('touchend', onTouchEnd, { passive: true })
  window.addEventListener('touchcancel', onTouchEnd, { passive: true })
  initializeDarkMode()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
  window.removeEventListener('touchcancel', onTouchEnd)
})

defineExpose({
  toggleMobileMenu: () => {
    isMobileMenuOpen.value = !isMobileMenuOpen.value
  },
})
</script>
