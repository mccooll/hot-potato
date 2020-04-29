<template>
  <div class="content" :class="{hide: hide, emerge: !hide}">
    <div>
      <h2>Get ready to sing</h2>
      <h3>{{title}}</h3>
    </div>
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
      let x = new Response();
      if(!x.arrayBuffer) {
        window.alert("This browser is not supported. Try firefox.");
        return true;
      }
      return false;
    }
  }
}
</script>
