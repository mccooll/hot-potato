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
    await this.soundServices.requestMic();
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