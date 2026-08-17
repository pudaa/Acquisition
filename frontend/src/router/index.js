import { createRouter, createWebHistory, createWebHashHistory  } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    children: [
      { path: 'experiment/tasks', component: () => import('../views/ExperimentTaskView.vue') },
      { path: 'experiment/manage', component: () => import('../views/ExperimentManageView.vue') },
      { path: 'experiment/viewing', 
        component: () => import('../views/StudentsDataView.vue'),
        meta: { 
          requiresAuth: true,
          requiresTeacher: true 
        }
      },
      { 
        path: 'experiment/upload', 
        component: () => import('../views/ExperimentUploadView.vue'),
        meta: { 
          requiresAuth: true,
          requiresTeacher: true  // 仅教师可访问
        }
      },
      { path: 'experiment/search', component: () => import('../views/ExperimentSearchView.vue') },
      { path: 'experiment/test', component: () => import('../components/ExperimentTest.vue') },
      { path: 'experiment/explain', component: () => import('../views/ExperimentExplainView.vue')},
      { path: 'discussion', component: () => import('../views/DiscussionView.vue') },
      { path: 'profile', component: () => import('../views/ProfileView.vue') },
      { path: 'class/manage', component: () => import('../views/ClassManageView.vue') },
      { path: 'correction-notebook', component: () => import('../views/CorrectionNotebook.vue') },
    ]
  },
  {
   path: '/login',
   name: 'login',
   component: LoginView
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/RegisterView.vue')
  },
  {
    path:'/reset',
    name:'reset',
    component: () => import('../views/ResetView.vue')
  },
  {
    path: '/learn',
    name: 'ExperimentLearning',
    component: () => import('../views/ExperimentLearningView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/experiment-feeling',
    name: 'ExperimentFeeling',
    component: () => import('../views/ExperimentFeeling.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(), // createWebHistory
  routes
})
router.beforeEach((to, from) => {
  if (to.name === 'home') {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user?.role === 'teacher') {
      return '/experiment/manage';
    }
    return '/experiment/tasks';
  }
});

export default router
