<template>
  <div class="content" :class="{ hide: hideAll }">
    <h3>Get your mic ready.</h3>
    <h2 :class="{ hide: !listening, emerge: listening }">Say a few words.</h2>
    <h2 :class="{ hide: !heard, emerge: heard }">Great</h2>
  </div>
</template>

<script>
export default {
  data: () => ({
    heard: false,
    listening: false,
    hideAll: false
  }),
  props: ['soundServices'],
  mounted: async function() {
    await this.soundServices.requestMic();
    this.listening = true;
    await this.soundServices.listen().then(() => this.heard = true );
    setTimeout(() => {
      this.hideAll = true;
      setTimeout(() => this.$router.push('4') , 1000)
    }, 3000)
  }
}
</script>