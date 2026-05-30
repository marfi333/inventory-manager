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

function onResize() {
  isMobile.value = window.innerWidth < 640
}

onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const drawerClass = computed(() => ({
  'bottom-drawer': true,
  'bottom-drawer--auto': props.autoHeight
}))

const bodyStyle = computed(() => {
  if (!isMobile.value) return {}
  if (props.autoHeight) return {}
  return { maxHeight: `calc(${props.maxHeight} - 4rem)` }
})

const passThroughOptions = computed(() => ({
  root: {
    style: isMobile.value
      ? props.autoHeight
        ? { height: 'auto', maxHeight: props.maxHeight }
        : { height: props.maxHeight }
      : { width: '450px' }
  },
  content: {
    style: { overflow: 'auto', flex: '1' }
  }
}))
</script>

<style scoped>
.drawer-body {
  overflow-y: auto;
  flex: 1;
}
</style>
