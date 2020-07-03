<template>
  <div class="content">
    <div>
      <h3>Title</h3><input class="title" type="text" v-model="title" v-on:input="setText">
    </div>
    <div>
      <h3>Lyrics</h3><textarea class="lyricsEditor" v-model="lyrics" v-on:input="setText"></textarea>
    </div>
    <div>
      <button @click="done" v-bind:disabled="saving"><h3>All set! Let's go!</h3></button>
      <h3 style="display: inline-block">
        <span v-if="saving">Saving</span>
        <span v-else>Saved</span>
      </h3>
    </div>
  </div>
</template>

<script>
export default {
  data: () => ({
    saving: false,
    savingPromise: Promise.resolve(),
    title: "",
    lyrics: "",
    debouncePromise: Promise.resolve(),
    debouncePromiseCanceler: ()=>{return;},
    debounceTimer: null
  }),
  props: ['soundServices'],
  mounted: function() {
    this.save();
    setTimeout(() => this.emerge = true)
  },
  methods: {
    setText: function() {
      if(this.debounceTimer) {
        clearTimeout(this.debounceTimer)
        this.debouncePromiseCanceler();
      }
      var promiseResolver;
      this.debouncePromise = new Promise( (resolve,reject) => {
        this.debouncePromiseCanceler = reject
        promiseResolver = resolve
      });
      this.debounceTimer = setTimeout(() => {
        promiseResolver();
      }, 500)
      this.save();
    },
    done: function() {
      const id = this.soundServices.track._id;
      window.history.pushState({},'', window.location.href + '?id=' + id);
      this.$router.push( {name:"1", params: {id: id} });
    },
    save: function() {
      Promise.all([this.savingPromise, this.debouncePromise]).then(() => {
        this.saving=true;
        this.soundServices.track.lyrics = this.lyrics;
        this.soundServices.track.title = this.title;
        if(!this.soundServices.track._id) {
          this.savingPromise = this.soundServices.saveBuffer();
        } else {
          this.savingPromise = this.soundServices.saveMeta();
        }
        this.savingPromise.then(async () => {
          this.saving = false
        })
      }).catch((e) => console.log(e)) //404 is not an error
    }
  }
}
</script>
<style scoped>
  .lyricsEditor {
    width:80vw;
    height: 60vh;
    font-family: Roboto, Tahoma, Helvetica;
    color: darkslategrey;
    text-align: center;
    background: linear-gradient(to right, rgba(255,255,255,0.5), transparent, transparent), linear-gradient(to bottom, rgba(255,255,255,0.5), transparent, rgba(255,255,255,0.5));
  }
  input {
    width: 80vw;
    color: darkslategrey;
    font-size: 5vw;
    font-size: min(5vw,5vh);
    text-align: center;
    background: linear-gradient(to right, rgba(255,255,255,0.5), transparent, transparent), linear-gradient(to bottom, rgba(255,255,255,0.5), transparent, rgba(255,255,255,0.5));
  }
</style>