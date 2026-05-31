import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

import PrimeVue from 'primevue/config'
import Tooltip from 'primevue/tooltip'
import Aura from '@primevue/themes/aura'
import { definePreset } from '@primevue/themes'

const CustomTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
      950: '#1e1b4b'
    },
    colorScheme: {
      dark: {
        // Aura's dark surface defaults to zinc; the app uses slate everywhere
        // (body is slate-900). Realign so PrimeVue components match.
        surface: {
          0: '#ffffff',
          50: '{slate.50}',
          100: '{slate.100}',
          200: '{slate.200}',
          300: '{slate.300}',
          400: '{slate.400}',
          500: '{slate.500}',
          600: '{slate.600}',
          700: '{slate.700}',
          800: '{slate.800}',
          900: '{slate.900}',
          950: '{slate.950}'
        },
        // Cards/drawers/menus default to surface.900 = body bg → no contrast.
        // Lift to slate-800 so they read as elevated above the page.
        content: {
          background: '{surface.800}',
          hoverBackground: '{surface.700}',
          borderColor: '{surface.700}',
          color: '{text.color}',
          hoverColor: '{text.hover.color}'
        },
        // Modals/popovers/select panels: same lift so they sit above the page,
        // and so inputs (which use formField.background = slate-700) sit clearly
        // on top of the panel.
        overlay: {
          select: { background: '{surface.800}', borderColor: '{surface.700}', color: '{text.color}' },
          popover: { background: '{surface.800}', borderColor: '{surface.700}', color: '{text.color}' },
          modal: { background: '{surface.800}', borderColor: '{surface.700}', color: '{text.color}' }
        },
        // Inputs default to surface.950 (near-black). Use slate-700 to match the
        // hand-rolled inputs already in Categories/Items pages.
        formField: {
          background: '{surface.700}',
          disabledBackground: '{surface.800}',
          filledBackground: '{surface.700}',
          filledHoverBackground: '{surface.600}',
          filledFocusBackground: '{surface.700}',
          borderColor: '{surface.600}',
          hoverBorderColor: '{surface.500}',
          color: '{surface.0}',
          placeholderColor: '{surface.400}',
          floatLabelColor: '{surface.400}',
          iconColor: '{surface.400}'
        },
        // List option focus/hover (used by Select/Dropdown/AutoComplete panels):
        // surface.800 default would equal the panel itself after the lift above.
        // Step it down to surface.700 so hovered options stand out.
        list: {
          option: {
            focusBackground: '{surface.700}',
            selectedBackground: '{highlight.background}',
            selectedFocusBackground: '{highlight.focus.background}',
            color: '{text.color}',
            focusColor: '{text.hover.color}',
            selectedColor: '{highlight.color}',
            selectedFocusColor: '{highlight.focus.color}',
            icon: { color: '{surface.500}', focusColor: '{surface.400}' }
          },
          optionGroup: { background: 'transparent', color: '{text.muted.color}' }
        },
        navigation: {
          item: {
            focusBackground: '{surface.700}',
            activeBackground: '{surface.700}',
            color: '{text.color}',
            focusColor: '{text.hover.color}',
            activeColor: '{text.hover.color}',
            icon: { color: '{surface.500}', focusColor: '{surface.400}', activeColor: '{surface.400}' }
          },
          submenuLabel: { background: 'transparent', color: '{text.muted.color}' },
          submenuIcon: { color: '{surface.500}', focusColor: '{surface.400}', activeColor: '{surface.400}' }
        }
      }
    }
  }
})

const app = createApp(App)

app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: CustomTheme,
    options: {
      prefix: 'p',
      darkModeSelector: '.dark',
      cssLayer: false
    }
  }
})
app.directive('tooltip', Tooltip)

app.mount('#app')
