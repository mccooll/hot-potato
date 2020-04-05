<template>
  <div class="content">
    <h3>Mixing, then playing & uploading</h3>
    <h3>Hot Potato, pass it on!</h3>
    <h3>Send this web address to a friend to enjoy our song.</h3>
  </div>
</template>

<script>
export default {
  data: () => ({
  }),
  props: ['soundServices'],
  mounted: function() {
    this.$emit('bubble', 2);
  },
  methods: {
  }
}
</script>

<style>
</style>