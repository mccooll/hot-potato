<template>
  <div class="content" :class="{hide: hide, emerge: !hide}">
    <h2>Get ready to sing</h2>
  </div>
</template>

<script>
export default {
  name: 'Welcome',
  data: () => ({
    hide: true
  }),
  mounted: function() {
    setTimeout(() => this.hide = false );
    setTimeout(() => {
      this.hide = true;
      setTimeout(() => this.$router.push("output-setup"), 1000 );
    }, 3000);
  }
}
</script>

<style scoped>

</style>
