<template>
  <div class="content">
    <h1 :class="{ hide: hide, recording: recording }">{{ label }}</h1>
    <p class="lyrics" ref="lyrics" v-bind:style="{ transition: 'top '+trackSeconds+'s', top: scrollDistance+'px'}">
{{ lyrics }}
    </p>
  </div>
</template>

<script>
export default {
  data: () => ({
    hide: false,
    label: 3,
    recording: false,
    lyrics: "Amazing Grace, how sweet the sound\n\
That saved a wretch like me\n\
I once was lost, but now am found\n\
Was blind but now I see",
    scrollDistance: 0,
    trackSeconds: 0
  }),
  props: ['soundServices'],
  mounted: function() {
    setTimeout(this.countdown);
    this.$emit('bubble', 1);
    setTimeout(() => {
      this.setLyricScrollDistance();
      this.setTrackSeconds();
    }, 5000)
  },
  methods: {
    setLyricScrollDistance: function() {
      var diff = this.$refs.lyrics.offsetHeight - window.innerHeight;
      this.scrollDistance = diff > 0 ? -diff : 0;
    },
    setTrackSeconds: function() {
      var seconds = this.soundServices.baseTrack.buffer.duration - 10;
      this.trackSeconds = seconds > 0 ? seconds : 0;
    },
    countdown: function() {
      let ref1 = setTimeout(() => {
         this.hide = true
      }, 100)
      let ref2 = setTimeout(() => {
        this.hide = false;
        if(this.label > 1) {
          this.label = this.label - 1;
          this.countdown();
        }
        else {
          this.label = '\u25cf';
          this.countdown();
          if(!this.recording) {
            this.recording = true;
            this.soundServices.record().then(() => {
              //this.$router.push('6');
              clearTimeout(ref1);
              clearTimeout(ref2);
            });
          }
        }
      }, 1100)
    }
  }
}
</script>

<style>
.recording {
	color: darkred;
}
.lyrics {
  position: absolute;
  padding: 3px;
  margin: 0;
  white-space: pre;
  top: 0;
  background: linear-gradient(to right, rgba(255,255,255,0.5), transparent, transparent), linear-gradient(to bottom, rgba(255,255,255,0.5), transparent, rgba(255,255,255,0.5));
}
</style>