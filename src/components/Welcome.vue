<template>
  <div class="content" :class="{hide: hide, emerge: !hide}">
    <h2>Get ready to sing</h2>
    <h2 class="title">{{title}}</h2>
  </div>
</template>

<script>
export default {
  data: () => ({
    title: 'Amazing Grace',
    hide: true
  }),
  props: ['soundServices'],
  mounted: function() {

    if(!this.badBroswer()) {
      let promise = this.soundServices.fetchBaseAudio();
      setTimeout(() => this.hide = false );
      setTimeout(() => {
        this.hide = true;
        setTimeout(() => this.$router.push( {name:"2", params: {readyPromise: promise} }), 1000 );
      }, 3000);
    }
  },
  methods: {
    badBroswer() {
      if(!window.Response) {
        window.alert("This browser is not supported. Try firefox.");
      }
      let x = new Response();
      if(!x.arrayBuffer) {
        window.alert("This browser is not supported. Try firefox.");
        return true;
      }
      if(!window.MediaRecorder) { //iOS safari/chrome
        window.alert("Iphone is not supported. This browser is not supported. Try firefox on desktop.");
        return true;
      }
      return false;
    }
  }
}
</script>

<style scoped>
.content {
  justify-content: space-evenly;
}
</style>
