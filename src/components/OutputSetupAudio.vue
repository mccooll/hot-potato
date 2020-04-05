<template>
  <div class="content">
    <div>
      <h3 :class="{ emerge: emerge, hide: hide }">{{msg}}</h3>
    </div>
    <h2 :class="{ hide: loading, emerge: !loading }">Can you hear anything?</h2>
    <div :class="{ hide: loading, emerge: !loading }">
      <button @click="yes"><h2>Yes</h2></button>
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
    this.$emit('bubble', 1);
    setTimeout(this.rotateMessage);
    this.readyPromise.then(() => {
      this.loading = false;
      this.soundServices.playBaseAudio();
    });
  },
  methods: {
    yes: function() {
      if(!this.loading) {
        this.soundServices.stopPlayingBaseAudio();
        this.$router.push('3');
      }
    },
    rotateMessage:  function() {
      this.hide = false;
      this.emerge = true;
      if(this.loading && this.msg !== this.loadingMsg) {
        this.msg = this.loadingMsg;
      } else {
        this.msg = this.volumeMsg;
      }
      if(this.loading) {
        setTimeout(this.rotateMessage, 4000);
        setTimeout(() => {
          if(this.loading) {
            this.hide = true
            this.emerge = false;
          }
        }, 3000);
      }
    }
  }
}
</script>
