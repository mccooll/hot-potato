<template>
  <div class="content">
    <h1 :class="{ hide: hide, emerge: !hide, recording: recording }">{{ label }}</h1>
  </div>
</template>

<script>
export default {
  data: () => ({
    hide: true,
    label: 3,
    recording: false
  }),
  props: ['soundServices'],
  mounted: function() {
    setTimeout(this.countdown);
    this.$emit('bubble', 1);
  },
  methods: {
    countdown: function() {
      this.hide = false;
      setTimeout(() => {
        this.hide = true;
        setTimeout(() => {
          if(this.label > 1) {
            this.label = this.label - 1;
            this.countdown();
          }
          else {
            this.label = '\u25cf';
            this.recording = true;
            this.countdown();
            this.soundServices.setupRecording();
            this.soundServices.startRecording();
          }
        }, 1000)
      }, 1000)
    }
  }
}
</script>

<style>
.recording {
	color: darkred;
}
</style>