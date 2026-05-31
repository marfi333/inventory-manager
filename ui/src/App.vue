<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'
import OfflineBadge from './components/OfflineBadge.vue'
import Sidebar from './components/Sidebar.vue'
import { usePwaUpdate } from './composables/usePwaUpdate'
import { useSyncQueue } from './composables/useSyncQueue'

usePwaUpdate()
useSyncQueue()

const sidebarRef = ref()
const windowWidth = ref(window.innerWidth)

const onResize = () => {
  windowWidth.value = window.innerWidth
}

onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const toastPosition = computed(() => (windowWidth.value < 640 ? 'top-center' : 'bottom-right'))

const toggleMobileMenu = () => {
  sidebarRef.value?.toggleMobileMenu()
}
</script>

<template>
  <div class="min-h-screen transition-colors duration-200 bg-slate-50 dark:bg-slate-900">
    <Sidebar ref="sidebarRef" />

    <div
      class="sticky top-0 z-30 transition-colors duration-200 bg-white border-b shadow-sm lg:hidden dark:bg-slate-800 border-slate-200 dark:border-slate-700"
      style="padding-top: env(safe-area-inset-top)"
    >
      <div class="flex items-center justify-between px-4 py-3">
        <button
          @click="toggleMobileMenu"
          class="p-2 transition-colors duration-200 rounded text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          <i class="text-xl pi pi-bars"></i>
        </button>
        <div class="flex items-center">
          <i class="mr-2 text-xl text-indigo-600 pi pi-warehouse dark:text-indigo-400"></i>
          <span class="font-semibold text-slate-900 dark:text-white">Inventory</span>
        </div>
        <OfflineBadge />
      </div>
    </div>

    <div class="lg:ml-60">
      <div
        class="hidden lg:flex sticky top-0 z-30 justify-end px-6 py-3 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur"
        style="padding-top: env(safe-area-inset-top)"
      >
        <OfflineBadge />
      </div>
      <main class="p-4 lg:p-6 lg:pt-0">
        <router-view />
      </main>
    </div>

    <Toaster :position="toastPosition" :expand="false" rich-colors close-button theme="system" />
  </div>
</template>

<style scoped>
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.dark ::-webkit-scrollbar-track {
  background: #1e293b;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.dark ::-webkit-scrollbar-thumb {
  background: #475569;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}
</style>

