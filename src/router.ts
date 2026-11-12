import { createRouter, createWebHistory } from 'vue-router';
import { ensureSession, session } from './stores/session';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
    { path: '/card', name: 'card', component: () => import('./views/CardView.vue') },
    { path: '/login', name: 'login', component: () => import('./views/LoginView.vue') },
    {
      path: '/cloud',
      name: 'cloud',
      component: () => import('./views/CloudView.vue'),
      meta: { requiresAuth: true },
    },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('./views/NotFoundView.vue') },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true;
  await ensureSession();
  if (session.user) return true;
  return { name: 'login', query: { next: to.fullPath } };
});
