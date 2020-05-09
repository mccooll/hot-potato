import Meyda from 'meyda'

export default class SoundServices {

  baseTrack = {
    volume: null,
    buffer: null
  }
  micTrack = {
    volume: null,
    buffer: null
  }
  trackSource;
  stream;
  streamSource;
  mediaRecorder;
  recordedBuffer;
  playSource;
  liveMixer;
  arr;
  audioCtx = new AudioContext();

  getBufferFromRaw(arrayBuffer) {
    const array = new Float32Array(arrayBuffer);
    const buffer = this.audioCtx.createBuffer(1,array.length,48000);
    buffer.copyToChannel(array, 0);
    return buffer;
  }

  async getBufferFromEncoded(arrayBuffer) {
    const buffer = await this.audioCtx.decodeAudioData(arrayBuffer);
    return buffer;
  }

  async fetchArrayBuffer(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer;
  }

  async fetchBaseAudio() {
    const arrayBuffer = await this.fetchArrayBuffer('output');
    const baseTrack.buffer = this.getBufferFromRaw(arrayBuffer);
    const trackSource = this.audioCtx.createBufferSource();
    trackSource.buffer = baseTrack.buffer;

    const workit = new Worker('./MeydaVolumeAnalysis.js');
    workit.onmessage = function() {
      console.log('Message received from worker');
    }
    workit.postMessage(this.baseTrack.buffer.getChannelData(0));

    trackSource.connect(this.audioCtx.destination);
    this.trackSource = trackSource;
  }

  getVolume(pcmArray) {
    return Math.sqrt(pcmArray.reduce((s,v)=> s + v*v)/pcmArray.length);
  }

  playBaseAudio() {
    if(this.trackSource) {
      if(this.playSource) this.playSource.disconnect();
      this.playSource = this.audioCtx.createBufferSource();
      this.playSource.buffer = this.trackSource.buffer;
      this.playSource.loop = true;
      this.playSource.connect(this.audioCtx.destination);
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
    return this.stream;
  }

  micDiagnostic() {
    let tracks = this.stream.getAudioTracks();
    let track = tracks[0];
    console.log(track.getSettings());
  }

  async listen() {
    const streamSource = this.audioCtx.createMediaStreamSource(this.stream);
    var heardResolver;
    var heardPromise = new Promise((resolve) => heardResolver = resolve);
    var rmss = [];
    const analyzer = Meyda.createMeydaAnalyzer({
      "audioContext": this.audioCtx,
      "source": streamSource,
      "bufferSize": 16384,
      "featureExtractors": ["spectralFlatness", "buffer", "rms"],
      "callback": features => {
        rmss.push(features.rms);
        if(features.spectralFlatness < 0.35) heardResolver();
      }
    });
    analyzer.start();
    await heardPromise;
    rmss.pop(); rmss.pop();
    const quietRMS = rmss.reduce((s,v)=> s + v)/rmss.length;
    console.log(quietRMS);
    analyzer.stop();
  }



  async setupRecording() {
    this.trackSource.addEventListener('ended', () => {
      this.mediaRecorder.stop();
      this.trackSource.disconnect();
      this.streamSource.disconnect();
    });

    this.streamSource = this.audioCtx.createMediaStreamSource(this.stream);

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
    window.chhunks = chunks;
    const chunksBlob = new Blob(chunks);
    var arrayBuffer;
    try {
      arrayBuffer = await chunksBlob.arrayBuffer();
    } catch {
      arrayBuffer = await new Response(chunksBlob).arrayBuffer();
    }
    const recordedAudioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
    return recordedAudioBuffer;
  }

  startRecording() {
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
    const delayNode = offlineAudioCtx.createDelay(Math.max(delay,1));
    delayNode.delayTime.setValueAtTime(delay, 0);
    delayNode.connect(offlineAudioCtx.destination);
    originTrackSource.connect(delayNode);

    const recordedTrackSource = offlineAudioCtx.createBufferSource();
    recordedTrackSource.buffer = recordedBuffer;
    const gain = offlineAudioCtx.createGain();
    gain.gain.value = 2;
    recordedTrackSource.connect(gain);
    gain.connect(offlineAudioCtx.destination);

    originTrackSource.start(0);
    recordedTrackSource.start(0);
    const render = await offlineAudioCtx.startRendering();
    return render;
  }

  playMixed(audioBuffer) {
    var mix = this.audioCtx.createBufferSource();
    mix.buffer = audioBuffer;
    mix.connect(this.audioCtx.destination);
    this.setupMixedDownload(mix);
    mix.start();
  }

  setupMixedDownload(mixNode) {
    var stream = this.audioCtx.createMediaStreamDestination();
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

  async saveMixed(audioBuffer) {
    const mixRawData = audioBuffer.getChannelData(0);
    const mixDataBlob = new Blob([mixRawData]);
    return fetch('output', {method: 'post', body: mixDataBlob});
  }

  
}

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