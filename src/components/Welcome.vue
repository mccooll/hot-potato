<template>
  <div class="content" :class="{hide: hide, emerge: !hide}">
    <h2>Get ready to sing</h2>
  </div>
</template>

<script>
export default {
  data: () => ({
    hide: true
  }),
  props: ['soundServices'],
  mounted: function() {
    this.soundServices.fetchBaseAudio();
    setTimeout(() => this.hide = false );
    setTimeout(() => {
      this.hide = true;
      setTimeout(() => this.$router.push("2"), 1000 );
    }, 3000);
  }
}
</script>
