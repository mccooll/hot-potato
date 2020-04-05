<template>
  <div class="content">
    <h3>Get your mic ready.</h3>
    <h2 :class="{ hide: !listening, emerge: listening }">Say a few words.</h2>
    <h2 :class="{ hide: !heard, emerge: heard }">Great</h2>
  </div>
</template>

<script>
export default {
  data: () => ({
    showGreat: false,
    heard: false,
    listening: false
  }),
  props: ['soundServices'],
  mounted: async function() {
    await this.soundServices.requestMic();
    this.listening = true;
    this.soundServices.listen().then(() => this.heard = true );
  }
}
</script>