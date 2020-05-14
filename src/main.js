import Vue from 'vue'
import App from './App.vue'
import router from './router'

if(!window.AudioContext) window.AudioContext = window.webkitAudioContext;

Vue.config.productionTip = false

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
