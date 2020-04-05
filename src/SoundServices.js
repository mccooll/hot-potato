const audioCtx = new AudioContext();

export default class SoundServices {

  trackSource;
  trackAnal;
  streamSource;
  anal;
  mediaRecorder;
  playSource;

  async fetchBaseAudio() {
    await this.sleep()
    const response = await fetch('sample.mp3');
    const arrayBuffer = await response.arrayBuffer();
    const originAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const trackSource = audioCtx.createBufferSource();
    trackSource.buffer = originAudioBuffer;
    trackSource.connect(audioCtx.destination);
    this.trackSource = trackSource;
  }

  playBaseAudio() {
    if(this.trackSource) {
      this.playSource = audioCtx.createBufferSource();
      this.playSource.buffer = this.trackSource.buffer;
      this.playSource.loop = true;
      this.playSource.connect(audioCtx.destination);
      this.playSource.start();
    }
  }

  stopPlayingBaseAudio() {
    if(this.playSource) {
      this.playSource.disconnect();
      this.playSource = null;
    }
  }

  async requestMic() {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
  }

  async setupRecording(stream) {
    this.trackSource.addEventListener('ended', () => {
      this.mediaRecorder.stop();
      this.trackSource.disconnect();
      this.trackAnal.disconnect();
      this.streamSource.disconnect();
      this.anal.disconnect();
    });

    this.streamSource = audioCtx.createMediaStreamSource(stream);

    const options = {mimeType: 'audio/webm'};
    const recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(stream, options);

    this.mediaRecorder.addEventListener('stop', async function() {
      await this.mix(recordedChunks, this.trackSource);
    });
    this.mediaRecorder.addEventListener('dataavailable', async function(e) { //assuming this event only happens after recording 
      if (e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    });
  }
  startRecording() {
    this.trackAnal = new VolumeAnalyser(this.trackSource);
    this.anal = new VolumeAnalyser(this.streamSource);
    this.mediaRecorder.start();
    this.trackSource.start();
  }

  async mix(recordedChunks, trackSource) {
    const recordedChunksBlob = new Blob(recordedChunks);
    const offlineAudioCtx = new OfflineAudioContext(1, trackSource.buffer.duration*48000, 48000);
    const originTrackSource = offlineAudioCtx.createBufferSource();
    originTrackSource.buffer = trackSource.buffer;
    originTrackSource.connect(offlineAudioCtx.destination);

    const recordedArrayBuffer = await recordedChunksBlob.arrayBuffer();
    const recordedAudioBuffer = await audioCtx.decodeAudioData(recordedArrayBuffer);
    const recordedTrackSource = offlineAudioCtx.createBufferSource();
    recordedTrackSource.buffer = recordedAudioBuffer;
    const gain = offlineAudioCtx.createGain();
    gain.gain.value = this.trackAnal.getAverageVolume() - this.anal.getAverageVolume();
    recordedTrackSource.connect(gain);
    gain.connect(offlineAudioCtx.destination);

    originTrackSource.start();
    recordedTrackSource.start();
    const render = await offlineAudioCtx.startRendering();
    return render;
  }

  playMix(audioBuffer) {
    var mix = audioCtx.createBufferSource();
    mix.buffer = audioBuffer;
    mix.connect(audioCtx.destination);
    mix.start();
  }

  async saveMix(audioBuffer) {
    const mixRawData = audioBuffer.getChannelData(0);
    const mixDataBlob = new Blob(mixRawData);
    return mixDataBlob; //write to server
  }

  timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async sleep() {
      await this.timeout(10000);
  }
}

class VolumeAnalyser {
  
  samplesTotal = 0;
  numberOfSamples = 0;

  constructor(sourceNode) {
    this.anal = sourceNode.context.createAnalyser();
    this.anal.maxDecibels = VolumeAnalyser.maxDecibels;
    this.anal.minDecibels = VolumeAnalyser.minDecibels;
    this.anal.smoothingTimeConstant = 0.9;
    this.anal.fftSize = 32;
    
    const processor = sourceNode.context.createScriptProcessor(1024, 1, 1);

    sourceNode.connect(this.anal);
    this.anal.connect(processor);
    
    this.amplitudeArray = new Uint8Array(this.anal.frequencyBinCount);
    processor.onaudioprocess = this.process.bind(this);
  }

  process() {
    this.anal.getByteFrequencyData(this.amplitudeArray);
    let sampleTotal = (this.amplitudeArray[0]+this.amplitudeArray[1])/2;
    if(sampleTotal > 0) {
      this.samplesTotal += sampleTotal;
      this.numberOfSamples++;
    }
  }

  getAverageVolume() {
    return this.samplesTotal/this.numberOfSamples/255*VolumeAnalyser.getRange();
  }

  disconnect() {
    this.anal.disconnect();
  }

  static getRange() {
    return this.maxDecibels - this.minDecibels;
  }
}
VolumeAnalyser.maxDecibels = -30;
VolumeAnalyser.minDecibels = -50;