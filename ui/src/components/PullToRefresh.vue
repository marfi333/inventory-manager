<template>
  <div
    ref="containerRef"
    class="pull-to-refresh"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
  >
    <div
      class="pull-to-refresh__indicator"
      :style="{ transform: `translateY(${indicatorOffset}px)`, opacity: indicatorOpacity }"
    >
      <i
        class="pi pi-spinner"
        :class="{ 'pi-spin': refreshing }"
        :style="{ transform: `rotate(${pullRotation}deg)` }"
      />
      <span v-if="refreshing">Refreshing...</span>
      <span v-else-if="pullDistance >= threshold">Release to refresh</span>
      <span v-else-if="pulling">Pull to refresh</span>
    </div>

    <div
      class="pull-to-refresh__content"
      :style="{ transform: `translateY(${contentOffset}px)` }"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  threshold?: number
  maxPull?: number
}>(), {
  threshold: 60,
  maxPull: 120
})

const emit = defineEmits<{
  refresh: []
}>()

const containerRef = ref<HTMLElement>()
const pulling = ref(false)
const refreshing = ref(false)
const startY = ref(0)
const pullDistance = ref(0)

const indicatorOffset = computed(() => {
  if (refreshing.value) return props.threshold - 40
  return Math.min(pullDistance.value, props.maxPull) - 40
})

const indicatorOpacity = computed(() => {
  if (refreshing.value) return 1
  return Math.min(pullDistance.value / props.threshold, 1)
})

const contentOffset = computed(() => {
  if (refreshing.value) return props.threshold
  return Math.min(pullDistance.value, props.maxPull)
})

const pullRotation = computed(() => {
  if (refreshing.value) return 0
  return (pullDistance.value / props.threshold) * 360
})

function isAtTop(): boolean {
  const el = containerRef.value
  if (!el) return false
  return el.scrollTop <= 0
}

function onTouchStart(e: TouchEvent) {
  if (refreshing.value) return
  if (!isAtTop()) return
  startY.value = e.touches[0].clientY
  pulling.value = true
}

function onTouchMove(e: TouchEvent) {
  if (!pulling.value || refreshing.value) return

  const currentY = e.touches[0].clientY
  const diff = currentY - startY.value

  if (diff < 0) {
    pullDistance.value = 0
    return
  }

  // Dampen the pull distance
  pullDistance.value = diff * 0.5

  if (pullDistance.value > 0) {
    e.preventDefault()
  }
}

function onTouchEnd() {
  if (!pulling.value || refreshing.value) return

  if (pullDistance.value >= props.threshold) {
    refreshing.value = true
    pullDistance.value = 0
    emit('refresh')
  } else {
    pullDistance.value = 0
  }

  pulling.value = false
}

function done() {
  refreshing.value = false
}

defineExpose({ done })
</script>

<style scoped>
.pull-to-refresh {
  position: relative;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.pull-to-refresh__indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 40px;
  font-size: 0.875rem;
  color: var(--p-text-muted-color, #6b7280);
  transition: opacity 0.2s;
  pointer-events: none;
}

.pull-to-refresh__content {
  transition: transform 0.2s ease;
}

.pull-to-refresh__indicator i {
  font-size: 1.25rem;
}
</style>
