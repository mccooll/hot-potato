import Vue from 'vue'
import VueRouter from 'vue-router'
import Welcome from '../components/Welcome'
import OutputSetupAudio from '../components/OutputSetupAudio'
import InputSetupAudio from '../components/InputSetupAudio'
import Ready from '../components/Ready'
import Sing from '../components/Sing'
import Mixer from '../components/Mixer'
import SoundServices from '../SoundServices'

const soundServices = new SoundServices();

Vue.use(VueRouter)

const routes = [
  {
    path: '/1',
    component: Welcome,
    props: { soundServices }
  },
  {
    path: '/2',
    name: '2',
    component: OutputSetupAudio,
    props: (route) => {
      return { soundServices, ...route.params }
    }
  },
  {
    path: '/3',
    component: InputSetupAudio,
    props: { soundServices }
  },
  {
    path: '/4',
    component: Ready
  },
  {
    path: '/5',
    component: Sing,
    props: { soundServices }
  },
  {
    path: '/6',
    component: Mixer,
    props: { soundServices }
  }
]

const router = new VueRouter({
  routes: routes,
  mode: "abstract"
})

export default router
