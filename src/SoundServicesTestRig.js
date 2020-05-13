import SoundServices, { LiveMixer } from './SoundServices'

export default class SoundServicesTestRig extends SoundServices {
    
    constructor() {
      super();
      window.testRig = this;
    }

    timeout(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    async sleep() {
      await this.timeout(10000);
    }

    async setMockTracks() {
      await this.fetchBaseAudio();
      const arrayBuffer = await this.fetchArrayBuffer('mic');
      this.micTrack.buffer = this.getBufferFromRaw(arrayBuffer);
      this.micTrack.volume = this.getVolume(this.micTrack.buffer.getChannelData(0));  
    }

    liveMixMocks() {
      this.liveMixer = new LiveMixer(this.micTrack.buffer, this.baseTrack.buffer, this.getGain(this.micTrack.volume, this.baseTrack.volume));
    }

    micDiagnostic() {
      let tracks = this.stream.getAudioTracks();
      let track = tracks[0];
      console.log(track.getSettings());
    }

    async setupChannelMixingMock() {
      const arrayBuffer = await this.fetchArrayBuffer('2channel.oga');
      const buffer = await this.getBufferFromEncoded(arrayBuffer)
      this.baseTrack.volume = this.getVolume(buffer.getChannelData(0));
      this.micTrack.volume = this.getVolume(buffer.getChannelData(1));
      const gain = this.baseTrack.volume/this.micTrack.volume;
      const clickHandler = () => {
        this.liveMixer = new LiveMixer(buffer, gain);
        document.removeEventListener('click', clickHandler);
      }
      document.addEventListener('click', clickHandler);
      window.that = this;
    }
}
