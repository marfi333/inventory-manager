import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../pages/Dashboard.vue'
import Categories from '../pages/Categories.vue'
import Items from '../pages/Items.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Dashboard',
      component: Dashboard,
      meta: { title: 'Dashboard - Inventory Manager' },
    },
    {
      path: '/categories',
      name: 'Categories',
      component: Categories,
      meta: { title: 'Categories - Inventory Manager' },
    },
    {
      path: '/items',
      name: 'Items',
      component: Items,
      meta: { title: 'Items - Inventory Manager' },
    },
  ],
})

router.beforeEach((to, _, next) => {
  document.title = (to.meta.title as string) || 'Inventory Manager'
  next()
})

export default router
