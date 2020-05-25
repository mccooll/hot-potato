<template>
  <div class="content" :class="{ hide: hideAll }">
    <h3>Get your mic ready.</h3>
    <h2 :class="{ hide: !listening && !calibrating || hide, emerge: listening || !hide && calibrating }">{{message}}</h2>
    <h2 :class="{ hide: !heard, emerge: heard }">Great</h2>
  </div>
</template>

<script>
export default {
  data: () => ({
    heard: false,
    calibrating: false,
    //calibratingMsg: "OK",
    listening: false,
    listeningMsg: "Say a few words.",
    hideAll: false,
    hide: false,
    message: 'OK'
  }),
  props: ['soundServices'],
  mounted: async function() {
    try {
      await this.soundServices.requestMic();
    } catch(e) {
      switch (e.name) {
        case 'AbortError':
        case 'NotFoundError':
        case 'NotReadableError':
          window.alert("No microphone detected!");
          break;
        case 'NotAllowedError':
        case 'SecurityError':
          window.alert("Cannot access microphone. Please enable microphone access for this site, and reload.");
          break;
        case 'OverconstrainedError':
        case 'TypeError':
        default:
          window.alert("Whoa! Sorry, you've hit a bug!");
          break;
      }
      fetch('log', {method: 'post', body: e.name+e.message });
      return;
    }
    this.calibrating = true;
    setTimeout(() => {
      this.hide = true;
      setTimeout(() => {
        this.message = this.listeningMsg;
        this.hide = false;
      }, 1000)
    }, 1000)
    await this.soundServices.listen().then(() => this.heard = true );
    setTimeout(() => {
      this.hideAll = true;
      setTimeout(() => this.$router.push('4') , 1000)
    }, 3000)
  }
}
</script>