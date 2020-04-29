const audioCtx = new AudioContext();

export default class SoundServices {

  trackSource;
  trackAnal;
  stream;
  streamSource;
  anal;
  mediaRecorder;
  recordedBuffer;
  playSource;
  liveMixer;

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
        that.liveMixer = new LiveMixer(await that.getRecordedBuffer(recordedChunks), that.trackSource.buffer, 2);
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

  async getRecordedBuffer(chunks) {
    const chunksBlob = new Blob(chunks);
    var arrayBuffer;
    try {
      arrayBuffer = await chunksBlob.arrayBuffer();
    } catch {
      arrayBuffer = await new Response(chunksBlob).arrayBuffer();
    }
    const recordedAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return recordedAudioBuffer;
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

  async mix(recordedBuffer, trackBuffer) {
    const offlineAudioCtx = new OfflineAudioContext(1, trackBuffer.duration*48000, 48000);
    const originTrackSource = offlineAudioCtx.createBufferSource();
    originTrackSource.buffer = trackBuffer;
    const delay = this.liveMixer.delay;
    const delayNode = offlineAudioCtx.createDelay(delay);
    delayNode.delayTime.setValueAtTime(delay, 0);
    delayNode.connect(offlineAudioCtx.destination);
    originTrackSource.connect(delayNode);

    const recordedTrackSource = offlineAudioCtx.createBufferSource();
    recordedTrackSource.buffer = recordedBuffer;
    const gain = offlineAudioCtx.createGain();
    gain.gain.value = this.trackAnal.getAverageVolume() - this.anal.getAverageVolume();
    recordedTrackSource.connect(gain);
    gain.connect(offlineAudioCtx.destination);

    originTrackSource.start(0);
    recordedTrackSource.start(0);
    const render = await offlineAudioCtx.startRendering();
    return render;
  }

  playMixed(audioBuffer) {
    var mix = audioCtx.createBufferSource();
    mix.buffer = audioBuffer;
    mix.connect(audioCtx.destination);
    this.setupMixedDownload(mix);
    mix.start();
  }

  setupMixedDownload(mixNode) {
    var stream = audioCtx.createMediaStreamDestination();
    var mediaRecorder = new MediaRecorder(stream.stream);
    mixNode.connect(stream);

    var chunks = [];
    mixNode.addEventListener('ended', () => {
      mediaRecorder.stop();
    })
    mediaRecorder.addEventListener('stop', async function() {
      try {
        var blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
        var url = URL.createObjectURL(blob);
        console.log(url);
      } catch(e) {
        console.log(e);
      }
    });
    mediaRecorder.addEventListener('dataavailable', async function(e) { //assuming this event only happens after recording 
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    });
    mediaRecorder.start();
  }

  // playMixing(buffers) {
  //   let time = audioCtx.currentTime;
  //   buffers.forEach(buffer => {
  //     let source = audioCtx.createBufferSource();
  //     source.buffer = buffer;
  //     source.connect(audioCtx.destination);
  //     source.start(time + 1);
  //   })
  // }

  // delayRecordingPlaying(source, delay) {
  //   source.
  // }

  async saveMixed(audioBuffer) {
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
  processor;

  constructor(sourceNode) {
    this.anal = sourceNode.context.createAnalyser();
    this.anal.maxDecibels = VolumeAnalyser.maxDecibels;
    this.anal.minDecibels = VolumeAnalyser.minDecibels;
    this.anal.smoothingTimeConstant = 0;
    this.anal.fftSize = 32;
    
    this.processor = sourceNode.context.createScriptProcessor(0, 1, 1);

    sourceNode.connect(this.anal);
    this.anal.connect(this.processor);
    this.processor.connect(sourceNode.context.destination)
    
    this.amplitudeArray = new Uint8Array(this.anal.frequencyBinCount);
    this.processor.onaudioprocess = this.process.bind(this);
    window.pr = this.processor
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
    return this.numberOfSamples === 0 ? 0: this.samplesTotal/this.numberOfSamples/255*VolumeAnalyser.getRange();
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

class LiveMixer {
  delay;
  delayNode;
  gainNode;
  recordedNode;
  baseNode;
  ctx;
  killed;

  constructor(recordedBuffer, baseBuffer, gain) {
    this.killed = false;
    console.log((recordedBuffer.length - baseBuffer.length)/48000)

    this.ctx = new AudioContext();    
    
    this.delay = 0;
    this.delayNode = this.ctx.createDelay(1);
    this.delayNode.connect(this.ctx.destination);

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = gain;
    this.gainNode.connect(this.ctx.destination);

    this.setupSingleUseNodes(recordedBuffer, baseBuffer);
  }

  setupSingleUseNodes(recordedBuffer, baseBuffer) {
    if(this.recordedNode) this.recordedNode.disconnect();
    this.recordedNode = this.bufferToSource(recordedBuffer);
    this.recordedNode.connect(this.gainNode);
    if(this.baseNode) this.baseNode.disconnect();
    this.baseNode = this.bufferToSource(baseBuffer);
    this.baseNode.connect(this.delayNode);
    let time = this.ctx.currentTime;
    let length = Math.min(recordedBuffer.length, baseBuffer.length)/48000;
    this.recordedNode.start(time + 1, 0, length);
    this.baseNode.start(time +1, 0, length);
    this.baseNode.addEventListener('ended', () => {
      if(!this.killed) {
        this.setupSingleUseNodes(recordedBuffer, baseBuffer);
      }
    })
  }

  kill() {
    this.killed = true;
    this.stop();
  }

  stop() {
    this.recordedNode.stop();
    this.baseNode.stop();
  }

  bufferToSource(buffer) {
    let source = this.ctx.createBufferSource();
    source.buffer = buffer;
    return source;
  }

  setRecordingDelay(delay) {
    this.delay = delay;
    this.delayNode.delayTime.linearRampToValueAtTime(delay, this.ctx.currentTime + 2)
  }
}