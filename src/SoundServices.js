const audioCtx = new AudioContext();

export default class SoundServices {

  trackSource;
  trackAnal;
  stream;
  streamSource;
  anal;
  mediaRecorder;
  playSource;

  async fetchBaseAudio() {
    //await this.sleep()
    const response = await fetch('input');
    const arrayBuffer = await response.arrayBuffer();
    const array = new Float32Array(arrayBuffer);
    const originAudioBuffer = audioCtx.createBuffer(1,array.length,48000);
    originAudioBuffer.copyToChannel(array, 0);
    const trackSource = audioCtx.createBufferSource();
    trackSource.buffer = originAudioBuffer;

    // const response = await fetch('sample.mp3');
    // const arrayBuffer = await response.arrayBuffer();
    // const originAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    // const trackSource = audioCtx.createBufferSource();
    // trackSource.buffer = originAudioBuffer;

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
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: {
      autoGainControl: false,
      echoCancellation: false,
      channelCount: 1
    }, video: false })
  }

  micDiagnostic() {
    let tracks = this.stream.getAudioTracks();
    let track = tracks[0];
    console.log(track.getSettings());
  }

  async listen() {
    const streamSource = audioCtx.createMediaStreamSource(this.stream);
    const anal = new VolumeAnalyser(streamSource);
    await anal.heardPromise;
    anal.disconnect();
  }



  async setupRecording() {
    this.trackSource.addEventListener('ended', () => {
      this.mediaRecorder.stop();
      this.trackSource.disconnect();
      this.trackAnal.disconnect();
      this.streamSource.disconnect();
      this.anal.disconnect();
    });

    this.streamSource = audioCtx.createMediaStreamSource(this.stream);

    const options = {mimeType: 'audio/webm'};
    const recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream, options);

    let that = this;
    this.mediaRecorder.addEventListener('stop', async function() {
      try {
        let tracks = this.stream.getAudioTracks();
        let track = tracks[0];
        track.stop();
        this.stream.removeTrack(track);
        let render = await that.mix(recordedChunks, that.trackSource);
        that.saveMix(render);
        that.playMix(render);
      } catch(e) {
        console.log(e);
      }
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
    var doneResolver;
    const donePromise = new Promise((resolve) => doneResolver = resolve);
    this.trackSource.addEventListener('ended', () => doneResolver() )
    return donePromise;
  }

  async mix(recordedChunks, trackSource) {
    const recordedChunksBlob = new Blob(recordedChunks);
    const offlineAudioCtx = new OfflineAudioContext(1, trackSource.buffer.duration*48000, 48000);
    const originTrackSource = offlineAudioCtx.createBufferSource();
    originTrackSource.buffer = trackSource.buffer;
    originTrackSource.connect(offlineAudioCtx.destination);

    var recordedArrayBuffer;
    try {
      recordedArrayBuffer = await recordedChunksBlob.arrayBuffer();
    } catch {
      recordedArrayBuffer = await new Response(recordedChunksBlob).arrayBuffer();
    }
    const recordedAudioBuffer = await audioCtx.decodeAudioData(recordedArrayBuffer);
    const recordedTrackSource = offlineAudioCtx.createBufferSource();
    recordedTrackSource.buffer = recordedAudioBuffer;
    const gain = offlineAudioCtx.createGain();
    gain.gain.value = this.trackAnal.getAverageVolume() - this.anal.getAverageVolume();
    recordedTrackSource.connect(gain);
    gain.connect(offlineAudioCtx.destination);

    originTrackSource.start(0);
    recordedTrackSource.start(0);
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
    const mixDataBlob = new Blob([mixRawData]);
    return fetch('output', {method: 'post', body: mixDataBlob});
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
  processCycle = 0;
  heardResolver;
  heardPromise = new Promise((resolve) => this.heardResolver = resolve);

  constructor(sourceNode) {
    this.anal = sourceNode.context.createAnalyser();
    this.anal.maxDecibels = VolumeAnalyser.maxDecibels;
    this.anal.minDecibels = VolumeAnalyser.minDecibels;
    this.anal.smoothingTimeConstant = 0;
    this.anal.fftSize = 32;
    
    const processor = sourceNode.context.createScriptProcessor(0, 1, 0);

    sourceNode.connect(this.anal);
    this.anal.connect(processor);
    
    this.amplitudeArray = new Uint8Array(this.anal.frequencyBinCount);
    processor.onaudioprocess = this.process.bind(this);
  }

  process() {
    if(this.processCycle < 10) {
      this.processCycle++;
      return;
    }
    this.processCycle = 0;
    this.anal.getByteFrequencyData(this.amplitudeArray);
    let sampleTotal = (this.amplitudeArray[0]+this.amplitudeArray[1]);
    if(sampleTotal > 0) {
      this.heardResolver();
      this.samplesTotal += sampleTotal;
      this.numberOfSamples += 2;
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