<template>
  <div class="content">
    <h3>Mixing</h3>
    <div>
      <h3>Singing timing adjustment</h3>
      <h3><span v-if="time > 0">+</span>{{ time.toString() }} ms</h3>
      <input v-model="time" v-on:change="setTime" type="range" id="volume" name="volume"
         min="-500" max="500">
    </div>
    <div>
      <button @click="soundsGood"><h3>Sounds good to me</h3></button>
    </div>
  </div>
</template>

<script>
//import SoundServicesTestRig from '../SoundServicesTestRig'
export default {
  data: () => ({
    time: 0
  }),
  props: ['soundServices'],
  mounted: async function() {
    //this.soundServices = new SoundServicesTestRig();
    this.$emit('bubble', 2);
    //await this.soundServices.setMockTracks();
    //this.soundServices.liveMixMocks();
    this.soundServices.setupChannelMixingMock();
    if(this.soundServices.liveMixer) {
      this.time = Math.ceil(this.soundServices.liveMixer.delay*1000);
      this.setTime();
    }
  },
  methods: {
    setTime: function() {
      if(this.soundServices.liveMixer) {
        this.soundServices.liveMixer.setRecordingDelay(this.time/1000);
      }
    },
    soundsGood: function() {
      this.setTime();
      this.soundServices.liveMixer.kill();
      this.$router.push('7');
    }
  }
}
</script>

<style scoped>
input {
  width: 75vw;
}
</style>