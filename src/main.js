import Vue from 'vue'
import App from './App.vue'
import router from './router'
import AudioRecorder from 'audio-recorder-polyfill'

if(!window.AudioContext) window.AudioContext = window.webkitAudioContext;
if(!window.OfflineAudioContext) window.OfflineAudioContext = window.webkitOfflineAudioContext;
if(!window.MediaRecorder) window.MediaRecorder = AudioRecorder;

window.addEventListener('error', (e) => {
	fetch('log', {method: 'post', body: e.message });
	window.alert("Whoa! Sorry, you've hit a bug!");
});

window.addEventListener('unhandledrejection', (e) => {
	fetch('log', {method: 'post', body: JSON.stringify(e.reason) || 'None' });
	window.alert("Whoa! Sorry, you've hit a bug!");
});

Vue.config.productionTip = false

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
