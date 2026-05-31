<template>
  <Drawer
    v-model:visible="model"
    :position="isMobile ? 'bottom' : 'right'"
    :header="header"
    :modal="true"
    :blockScroll="true"
    :dismissable="true"
    :showCloseIcon="false"
    :class="drawerClass"
    :pt="passThroughOptions"
  >
    <template v-if="isMobile || $slots.header" #header>
      <div class="bottom-drawer-header-wrap" @pointerdown="onHeaderPointerDown">
        <div v-if="isMobile" class="bottom-drawer-grab-handle" aria-hidden="true" />
        <div class="bottom-drawer-header-content">
          <slot v-if="$slots.header" name="header" />
          <span v-else class="p-drawer-title">{{ header }}</span>
        </div>
      </div>
    </template>

    <div
      class="drawer-body"
      :style="bodyStyle"
      ref="bodyEl"
      @pointerdown="onBodyPointerDown"
    >
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
    // Reset drag state when the drawer is closed.
    dragY.value = 0
    isDragging.value = false
    isAnimatingBack.value = false
    if (animateBackTimer !== null) {
      window.clearTimeout(animateBackTimer)
      animateBackTimer = null
    }
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
  if (animateBackTimer !== null) {
    window.clearTimeout(animateBackTimer)
    animateBackTimer = null
  }
})

const drawerClass = computed(() => ({
  'bottom-drawer': true,
  'bottom-drawer--auto': props.autoHeight
}))

const bodyEl = ref<HTMLElement | null>(null)

// Pull-down-to-close gesture state.
const dragY = ref(0)
const isDragging = ref(false)
// True briefly while we animate the drawer back to translateY(0) after a
// non-dismissing release.
const isAnimatingBack = ref(false)
let animateBackTimer: number | null = null
let pointerId: number | null = null
let dragStartY = 0
let lastMoveY = 0
let lastMoveT = 0
let lastVelocity = 0

function endDragListeners() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
}

function startDrag(e: PointerEvent) {
  if (!isMobile.value) return
  // Ignore non-primary buttons and multi-touch where possible; pointer events
  // already filter to a single primary pointer per interaction.
  if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return
  pointerId = e.pointerId
  dragStartY = e.clientY
  lastMoveY = e.clientY
  lastMoveT = e.timeStamp
  lastVelocity = 0
  isDragging.value = true
  window.addEventListener('pointermove', onPointerMove, { passive: false })
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function onHeaderPointerDown(e: PointerEvent) {
  // Header / grab-handle: always start a drag on mobile.
  startDrag(e)
}

function onBodyPointerDown(e: PointerEvent) {
  // Body content: only start a drag when the inner scroll is at the top, so
  // dragging down inside long lists keeps scrolling instead of dismissing.
  if (!isMobile.value) return
  const el = bodyEl.value
  if (!el) return
  if (el.scrollTop > 0) return
  // Don't intercept drags that originate on form fields; let the keyboard /
  // text selection behave normally.
  const target = e.target as HTMLElement | null
  if (target && target.closest('input, textarea, select, button, [contenteditable="true"]')) return
  startDrag(e)
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging.value || pointerId === null || e.pointerId !== pointerId) return
  const delta = e.clientY - dragStartY
  // Track velocity over the last move for release decision.
  const dt = e.timeStamp - lastMoveT
  if (dt > 0) {
    lastVelocity = (e.clientY - lastMoveY) / dt // px/ms, positive = downward
  }
  lastMoveY = e.clientY
  lastMoveT = e.timeStamp

  if (delta <= 0) {
    // Block upward drag.
    dragY.value = 0
    return
  }
  // 1:1 follow.
  dragY.value = delta
  // Once we're committed to the drag, prevent default so the page doesn't
  // also scroll/rubber-band underneath.
  if (e.cancelable) e.preventDefault()
}

function onPointerUp(e: PointerEvent) {
  if (!isDragging.value) return
  if (pointerId !== null && e.pointerId !== pointerId) return
  endDragListeners()
  pointerId = null

  const drawerHeight = getDrawerHeight()
  const dismissByDistance = drawerHeight > 0 && dragY.value > drawerHeight * 0.3
  const dismissByVelocity = lastVelocity > 0.7 // px/ms (≈ 700 px/s)

  isDragging.value = false

  if (dismissByDistance || dismissByVelocity) {
    // Close — let the watcher on `model` reset dragY back to 0 after close.
    model.value = false
  } else {
    // Spring back. Keep our inline transform/transition active for the duration
    // of the spring so it actually animates; then drop back to PrimeVue's
    // default styling.
    dragY.value = 0
    isAnimatingBack.value = true
    if (animateBackTimer !== null) window.clearTimeout(animateBackTimer)
    animateBackTimer = window.setTimeout(() => {
      isAnimatingBack.value = false
      animateBackTimer = null
    }, 220)
  }
}

function getDrawerHeight(): number {
  // The drawer root element is the closest ancestor with class `p-drawer`.
  const handle = bodyEl.value?.closest('.p-drawer') as HTMLElement | null
  return handle ? handle.getBoundingClientRect().height : window.innerHeight
}

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

  // Only set inline transform/transition while the user is actively dragging
  // or springing back from a non-dismissing release. Outside those windows we
  // leave them unset so PrimeVue's built-in `transition: transform 0.3s` and
  // `.p-drawer-{enter,leave}-{from,to}` classes drive the open/close slide.
  const isGesturing = isDragging.value || isAnimatingBack.value
  const gestureStyles: Record<string, string> = isGesturing
    ? {
        transform: dragY.value > 0 ? `translateY(${dragY.value}px)` : 'translateY(0)',
        transition: isDragging.value ? 'none' : 'transform 0.22s ease',
        willChange: 'transform'
      }
    : {}

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
        ...gestureStyles,
        touchAction: 'pan-x'
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

/* Ensure the drawer header is the positioning ancestor for our grab handle,
   so the handle centers against the full header width, not just the slot's
   allocated width. */
:deep(.p-drawer-header) {
  position: relative;
}

.bottom-drawer-header-wrap {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  /* Header is the primary drag target on mobile — disable native vertical
     pan so the browser doesn't fight our gesture. */
  touch-action: pan-x;
}

/* Center the grab handle against the full p-drawer-header. Absolute positioning
   escapes the slot wrapper's flex layout so left:50% measures the entire header
   width, not just the slot's allocated width.

   The visible bar is rendered as an inner ::before so we can give the outer
   element a much larger tap target (full header width × ~32px) without
   enlarging the visual handle. */
.bottom-drawer-grab-handle {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 28px;
  cursor: grab;
}

.bottom-drawer-grab-handle::before {
  content: '';
  position: absolute;
  top: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 4px;
  border-radius: 9999px;
  background-color: rgba(148, 163, 184, 0.55); /* slate-400 @ ~55% */
}

:global(.dark) .bottom-drawer-grab-handle::before {
  background-color: rgba(148, 163, 184, 0.4);
}

.bottom-drawer-header-content {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 1.75rem;
  margin-top: 0.5rem;
}

</style>
