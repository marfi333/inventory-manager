<template>
  <Drawer
    v-model:visible="model"
    :position="isMobile ? 'bottom' : 'right'"
    :header="header"
    :modal="true"
    :blockScroll="true"
    :dismissable="true"
    :showCloseIcon="true"
    :class="drawerClass"
    :pt="passThroughOptions"
  >
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>

    <div class="drawer-body" :style="bodyStyle">
      <slot />
    </div>

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </Drawer>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import Drawer from 'primevue/drawer'

const props = withDefaults(defineProps<{
  header?: string
  maxHeight?: string
  autoHeight?: boolean
}>(), {
  header: '',
  maxHeight: '85vh',
  autoHeight: false
})

const model = defineModel<boolean>({ required: true })

const isMobile = ref(window.innerWidth < 640)
const keyboardInset = ref(0)

function onResize() {
  isMobile.value = window.innerWidth < 640
}

function onViewportChange() {
  const vv = window.visualViewport
  if (!vv) {
    keyboardInset.value = 0
    return
  }
  // Difference between the layout viewport and the visible (visual) viewport
  // is how much the on-screen keyboard is overlaying the page.
  const inset = window.innerHeight - vv.height - vv.offsetTop
  keyboardInset.value = inset > 50 ? inset : 0
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  window.visualViewport?.addEventListener('resize', onViewportChange)
  window.visualViewport?.addEventListener('scroll', onViewportChange)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.visualViewport?.removeEventListener('resize', onViewportChange)
  window.visualViewport?.removeEventListener('scroll', onViewportChange)
})

const drawerClass = computed(() => ({
  'bottom-drawer': true,
  'bottom-drawer--auto': props.autoHeight
}))

const bodyStyle = computed(() => {
  if (!isMobile.value) return {}
  if (props.autoHeight) return {}
  return { maxHeight: `calc(${props.maxHeight} - 4rem)` }
})

const passThroughOptions = computed(() => {
  if (!isMobile.value) {
    return {
      root: { style: { width: '450px' } },
      content: { style: { overflow: 'auto', flex: '1' } }
    }
  }

  const inset = keyboardInset.value
  const heightExpr = props.autoHeight
    ? { maxHeight: `calc(${props.maxHeight} - ${inset}px)` }
    : { height: `calc(${props.maxHeight} - ${inset}px)`, maxHeight: `calc(100vh - ${inset}px)` }

  return {
    root: {
      style: {
        ...(props.autoHeight ? { height: 'auto' } : {}),
        ...heightExpr,
        bottom: `${inset}px`,
        transition: 'bottom 0.15s ease, height 0.15s ease, max-height 0.15s ease'
      }
    },
    content: {
      style: { overflow: 'auto', flex: '1' }
    }
  }
})
</script>

<style scoped>
.drawer-body {
  overflow-y: auto;
  flex: 1;
}
</style>
