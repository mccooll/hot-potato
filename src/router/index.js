import Vue from 'vue'
import VueRouter from 'vue-router'
import Welcome from '../components/Welcome'
import OutputSetupAudio from '../components/OutputSetupAudio'

Vue.use(VueRouter)

  const routes = [
  {
    path: '/',
    name: 'Home',
    component: Welcome
  },
  {
    path: '/output-setup',
    name: 'OutputSetupAudio',
    component: OutputSetupAudio
  }
]

const router = new VueRouter({
  routes: routes,
  mode: "abstract"
})

export default router
