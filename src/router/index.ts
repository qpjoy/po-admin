import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/providers',
    },
    {
      path: '/providers',
      name: 'providers',
      component: () => import('@/pages/ProviderManagement.vue'),
    },
    {
      path: '/providers/:id/keys',
      name: 'ssh-keys',
      component: () => import('@/pages/SSHKeyManagement.vue'),
    },
    {
      path: '/releases',
      name: 'releases',
      component: () => import('@/pages/ReleaseManagement.vue'),
    },
    {
      path: '/releases/create',
      name: 'create-release',
      component: () => import('@/pages/CreateProviderRelease.vue'),
    },
    // Statistics dashboard disabled - backend API not implemented yet
    // TODO: Implement /api/admin/stats/* endpoints in backend
    // {
    //   path: '/statistics',
    //   name: 'statistics',
    //   component: () => import('@/pages/StatisticsDashboard.vue'),
    // },
  ],
});

export default router;
