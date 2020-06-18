<template>
  <div class="content">
    <h3>{{ status }}</h3>
    <h3>Hot Potato, pass it on!</h3>
    <h3>Send this web address to a friend to enjoy our song.</h3>
  </div>
</template>

<script>
export default {
  data: () => ({
    status: 'Uploading'
  }),
  props: ['soundServices'],
  mounted: async function() {
    this.$emit('bubble', 2);
    let render = await this.soundServices.mix(this.soundServices.liveMixer.initialNode.buffer);
    this.soundServices.saveBuffer(render).then(() => {
      this.status = "Song upload saved";
    });
    this.soundServices.playMixed(render);
  },
  methods: {
  }
}
</script>

<style>
</style>