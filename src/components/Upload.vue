<template>
  <div class="content">
    <h3>Uploading</h3>
    <h3>Hot Potato, pass it on!</h3>
    <h3>Send this web address to a friend to enjoy our song.</h3>
  </div>
</template>

<script>
export default {
  data: () => ({
  }),
  props: ['soundServices'],
  mounted: async function() {
    this.$emit('bubble', 2);
    let render = await this.soundServices.mix(this.soundServices.liveMixer.recordedNode.buffer, this.soundServices.liveMixer.baseNode.buffer);
    this.soundServices.saveMixed(render);
    this.soundServices.playMixed(render);
  },
  methods: {
  }
}
</script>

<style>
</style>