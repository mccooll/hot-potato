<template>
  <div class="content">
    <div>
      <h3>Turn up your volume.</h3>
      <h3>Loading our song...</h3>
    </div>
    <h2>Can you hear anything?</h2>
    <div><button><h2>Yes</h2></button></div>
  </div>
</template>

<script>
export default {
  name: 'OutputSetupAudio',
  data: () => ({
  }),
  mounted: function() {
    this.$emit('bubble', 1);
    console.log('emitted')
    // setTimeout(() => this.hide = false );
    // setTimeout(() => {
    //   this.hide = true;
    // }, 3000);
  }
}
</script>
