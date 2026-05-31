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
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
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

  // iOS scrolls the layout viewport when focusing an input inside a fixed-position
  // element to bring the field into view. That scroll pushes the drawer (and the
  // header behind it) up. Force the layout viewport back to the top while the
  // drawer is open — the visualViewport-based offset handles fitting above the keyboard.
  if (model.value && window.scrollY !== 0) {
    window.scrollTo(0, 0)
  }
}

let savedScrollY = 0

watch(model, (visible) => {
  if (!isMobile.value) return
  if (visible) {
    savedScrollY = window.scrollY
    // Reset scroll so the drawer (anchored via visualViewport) lines up with the visible area.
    window.scrollTo(0, 0)
  } else {
    keyboardInset.value = 0
    // Restore previous scroll so the page doesn't jump when the drawer closes.
    window.scrollTo(0, savedScrollY)
  }
})

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

  // Anchor the drawer to the visual viewport so the iOS keyboard doesn't
  // appear to "push up" the page. We pin via `top` (not `bottom`) because
  // iOS scrolls the layout viewport when focusing inputs — pinning to top
  // relative to visualViewport.offsetTop keeps the drawer where the user sees it.
  const inset = keyboardInset.value
  const visibleHeight = `calc(100vh - ${inset}px)`
  const drawerHeight = props.autoHeight
    ? `min(auto, ${visibleHeight})`
    : `min(${props.maxHeight}, ${visibleHeight})`

  return {
    root: {
      style: {
        position: 'fixed',
        left: '0',
        right: '0',
        bottom: `${inset}px`,
        top: 'auto',
        ...(props.autoHeight
          ? { height: 'auto', maxHeight: visibleHeight }
          : { height: drawerHeight, maxHeight: visibleHeight }),
        transition: 'bottom 0.2s ease, height 0.2s ease, max-height 0.2s ease'
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
