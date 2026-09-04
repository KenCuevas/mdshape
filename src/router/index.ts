import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  // Assets are built with `base: './'` (relative), but the dev/preview servers
  // serve the app from `/`, so the history base is the root.
  history: createWebHistory('/'),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/board', name: 'board', component: () => import('@/views/BoardView.vue') },
    { path: '/epics', name: 'epics', component: () => import('@/views/EpicsView.vue') },
    {
      path: '/epics/:slug',
      name: 'epic',
      component: () => import('@/views/EpicView.vue'),
      props: true,
    },
    { path: '/findings', name: 'findings', component: () => import('@/views/FindingsView.vue') },
    {
      path: '/findings/:id',
      name: 'finding',
      component: () => import('@/views/FindingView.vue'),
      props: true,
    },
    {
      path: '/docs/:slug',
      name: 'doc',
      component: () => import('@/views/DocView.vue'),
      props: true,
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) {
      return { el: to.hash, top: 72, behavior: 'smooth' }
    }
    // Query-only changes (board filters) must not scroll.
    if (to.path === from.path) return false
    return { top: 0 }
  },
})

export default router
