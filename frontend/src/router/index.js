import { createRouter, createWebHistory, createWebHashHistory  } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ExperimentTaskView from '../views/ExperimentTaskView.vue'
import ExperimentManageView from '../views/ExperimentManageView.vue'
import StudentsDataView from '../views/StudentsDataView.vue'
import ExperimentSearchView from '../views/ExperimentSearchView.vue'
import ExperimentTestView from '../components/ExperimentTest.vue'
import ExperimentExplainView from '../views/ExperimentExplainView.vue'
import ExperimentUploadView from '../views/ExperimentUploadView.vue'
import ResetView from '../views/ResetView.vue'
import ExperimentFeeling from '@/views/ExperimentFeeling.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    children: [
      { path: 'experiment/tasks', component: ExperimentTaskView },
      { path: 'experiment/manage', component: ExperimentManageView },
      { path: 'experiment/viewing', 
        component: StudentsDataView,
        meta: { 
          requiresAuth: true,
          requiresTeacher: true 
        }
      },
      { 
        path: 'experiment/upload', 
        component: ExperimentUploadView,
        meta: { 
          requiresAuth: true,
          requiresTeacher: true  // 仅教师可访问
        }
      },
      { path: 'experiment/search', component: ExperimentSearchView },
      { path: 'experiment/test', component: ExperimentTestView },
      { path: 'experiment/explain', component: ExperimentExplainView},
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
    component: RegisterView
  },
  {
    path:'/reset',
    name:'reset',
    component: ResetView
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
    component: ExperimentFeeling,
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
