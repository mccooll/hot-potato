<template>
  <div class="content">
    <div>
      <h3 :class="{ emerge: emerge, hide: hide }">Privacy</h3>
    </div>
    <h3>If you agree your singing sounds good, it will be made public indefinitely. Some other non-personal data may also be logged.</h3>
    <div :class="{ hide: loading, emerge: emerge }">
      <button @click="yes"><h2>Got it</h2></button>
    </div>
  </div>
</template>

<script>
export default {
  data: () => ({
    loading: true,
    emerge: false,
    hide: true,
    volumeMsg: 'Turn up your volume.',
    loadingMsg: 'Loading our song...',
    msg: ''
  }),
  props: ['readyPromise','soundServices'],
  mounted: function() {
    setTimeout(() => this.emerge = true)
  },
  methods: {
    yes: function() {
      this.hide = true;
      this.soundServices.audioCtx.resume();
      setTimeout(() => {
        this.$router.push( {name:"3", params: {readyPromise: this.readyPromise} });
      }, 1000 );
    },
    no: function() {
      return;
    }
  }
}
</script>
