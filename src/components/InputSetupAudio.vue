<template>
  <div class="content" :class="{ hide: hideAll }">
    <h3>Get your mic ready.</h3>
    <h2 :class="{ hide: !listening && !calibrating || hideInstruction, emerge: listening || !hideInstruction && calibrating }">{{instruction}}</h2>
    <h2 :class="{ hide: hideStatus, emerge: !hideStatus }">{{ status }}</h2>
  </div>
</template>

<script>
export default {
  data: () => ({
    heard: false,
    calibrating: false,
    //calibratingMsg: "OK",
    listening: false,
    listeningInstruction: "Say a few words.",
    hideAll: false,
    hideInstruction: false,
    instruction: 'OK',
    status: "_",
    heardStatus: "Great",
    cantHearStatus: "Can't hear you...",
    hideStatus: true
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
      this.hideInstruction = true;
      setTimeout(() => {
        this.instruction = this.listeningInstruction;
        this.hideInstruction = false;
        setTimeout(() => {
          if(!this.heard) {
            this.status = this.cantHearStatus;
            this.hideStatus = false;
          }
        }, 5000);
      }, 1000)
    }, 1000)
    await this.soundServices.listen().then(() => {
      this.heard = true;
      this.hideStatus = true;
      setTimeout(() => {
        this.status = this.heardStatus;
        this.hideStatus = false;
      }, this.status===this.cantHearStatus ? 1000: 0)
    });
    setTimeout(() => {
      this.hideAll = true;
      setTimeout(() => this.$router.push('5') , 1000)
    }, 3000)
  }
}
</script>