import Vue from 'vue'
import VueRouter from 'vue-router'
import Welcome from '../components/Welcome'
import Privacy from '../components/Privacy'
import OutputSetupAudio from '../components/OutputSetupAudio'
import InputSetupAudio from '../components/InputSetupAudio'
import Ready from '../components/Ready'
import Sing from '../components/Sing'
import Mixer from '../components/Mixer'
import Upload from '../components/Upload'
import SoundServices from '../SoundServicesTestRig'
import FileSetup from '../components/FileSetup'
import VerseSetup from '../components/VerseSetup'

const soundServices = new SoundServices();

Vue.use(VueRouter)

const routes = [
  {
    path: '/setup-file',
    component: FileSetup,
    props: { soundServices }
  },
  {
    path: '/setup-lyrics',
    component: VerseSetup,
    props: { soundServices }
  },
  {
    path: '/1',
    name: '1',
    component: Welcome,
    props: (route) => {
      return { soundServices, ...route.params }
    }
  },
  {
    path: '/2',
    name: '2',
    component: Privacy,
    props: (route) => {
      return { soundServices, ...route.params }
    }
  },
  {
    path: '/3',
    name: '3',
    component: OutputSetupAudio,
    props: (route) => {
      return { soundServices, ...route.params }
    }
  },
  {
    path: '/4',
    component: InputSetupAudio,
    props: { soundServices }
  },
  {
    path: '/5',
    component: Ready,
    props: { soundServices }
  },
  {
    path: '/6',
    component: Sing,
    props: { soundServices }
  },
  {
    path: '/7',
    component: Mixer,
    props: { soundServices }
  },
  {
    path: '/8',
    component: Upload,
    props: { soundServices }
  }
]

const router = new VueRouter({
  routes: routes,
  mode: "abstract"
})

export default router
