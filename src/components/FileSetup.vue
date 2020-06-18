<template>
  <div class="content">
    <div>
      <h2 :class="{ emerge: emerge, hide: hide }">Hot Potato Music</h2>
      <h3>Choose a recording for your friends to sing along to.</h3>
    </div>
    <div class="fileInput">
      <input type="file" accept="audio/*" v-on:input="selected">
      <button><h3>Tap or Drop</h3></button>
    </div>
    <h3>Tip: use MP3 or FLAC.</h3>
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
  props: ['soundServices'],
  mounted: function() {
    setTimeout(() => this.emerge = true)
  },
  methods: {
    yes: function() {
      this.hide = true;
      setTimeout(() => {
        this.$router.push( {name:"3", params: {readyPromise: this.readyPromise} });
      }, 1000 );
    },
    no: function() {
      return;
    },
    selected: async function(e) {
      var file = e.srcElement.files[0]
      try {
        await this.soundServices.setBaseAudio(file)
        this.$router.push("/setup-lyrics");
      }
      catch(e) {
        if(e.name==="EncodingError") window.alert("Unsupported format")
        else throw e;
      }
    }
  }
}
</script>
<style scoped>
  input {
    height: 100%;
    width: 100%;
    filter: opacity(0);
  }
  button {
    height: 20vh;
    width: 50vw;
    margin: 0;
    position: absolute;
    top: 0;
    left: 0;
    z-index: -1;
  }
  .fileInput {
    width: 50vw;
    height: 20vh;
    position: relative;
  }
</style>