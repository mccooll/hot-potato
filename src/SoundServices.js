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
  quietRMS;
  stream;
  mediaRecorder;
  recordedBuffer;
  playSource;
  liveMixer;
  arr;
  audioCtx = new AudioContext();

  constructor() {
    return
  }

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
    const arrayBuffer = await this.fetchArrayBuffer('input');
    this.baseTrack.buffer = this.getBufferFromRaw(arrayBuffer);
    this.baseTrack.volume = this.getVolume(this.baseTrack.buffer.getChannelData(0));
    console.log("track length" + this.baseTrack.buffer.duration)
  }

  getVolume(pcmArray) {
    return Math.sqrt(pcmArray.reduce((s,v)=> s + v*v)/pcmArray.length);
  }

  getGain(linear1, linear2) {
    return linear2/linear1;
  }

  bufferToSource(buffer, loop) {
    let source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    return source;
  }

  playBuffer(buffer, loop) {
    const source = this.bufferToSource(buffer, loop);
    source.connect(this.audioCtx.destination);
    source.start();
    return () => {
      source.disconnect();
      source.stop();
    }
  }

  playBaseAudio() {
    return this.playBuffer(this.baseTrack.buffer, true);
  }

  async requestMic() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: {
      autoGainControl: false,
      echoCancellation: false,
      channelCount: 1
    }, video: false })
    return this.stream;
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
    this.quietRMS = rmss.reduce((s,v)=> s + v)/rmss.length;
    analyzer.stop();
    streamSource.disconnect();
  }

  async record() {
    const merger = this.audioCtx.createChannelMerger(2);
    const mixedStream = this.audioCtx.createMediaStreamDestination();
    
    const baseTrackSplitter = this.audioCtx.createChannelSplitter(1);
    const baseTrackSource = this.bufferToSource(this.baseTrack.buffer);
    baseTrackSource.connect(this.audioCtx.destination);
    baseTrackSource.connect(baseTrackSplitter);
    baseTrackSplitter.connect(merger,0,0)

    const micSplitter = this.audioCtx.createChannelSplitter(1);
    const micStream = this.audioCtx.createMediaStreamSource(this.stream);
    var gainNode = this.audioCtx.createGain();
    micStream.connect(gainNode);
    gainNode.gain.value = 4;
    gainNode.connect(micSplitter);
    micSplitter.connect(merger, 0, 1);

    merger.connect(mixedStream);

    const mediaRecorder = new MediaRecorder(mixedStream.stream, { mimeType: 'audio/webm' });

    baseTrackSource.start();
    mediaRecorder.start();

    baseTrackSource.addEventListener('ended', () => {
      mediaRecorder.stop();
      console.log('track ended and recording stopped' + this.audioCtx.currentTime);
      baseTrackSource.disconnect();
    });

    let recordedChunks = [];

    mediaRecorder.addEventListener('dataavailable', async function(e) { //assuming this event only happens after recording 
      recordedChunks = [];
      if (e.data.size > 0) {
        recordedChunks.push(e.data);
        console.log('doone yo')
        window.chunkss = recordedChunks;
      }
    });
    var doneResolver;
    const donePromise = new Promise((resolve) => doneResolver = resolve);
    mediaRecorder.addEventListener('stop', () => {
      doneResolver();
    })
    return donePromise;
  }

  async getRecordedBuffer(chunks) {
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
    gain.gain.value = this.getGain(this.micTrack.volume, this.baseTrack.volume);
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

export class LiveMixer {
  delay;
  delayNode;
  gainNode;
  recordedNode;
  baseNode;
  ctx;
  killed;

  constructor(recordedBuffer2, gain) {
    this.killed = false;
    
    this.ctx = new AudioContext();    

    this.delay = 0.005 + this.ctx.baseLatency;
    this.delayNode = this.ctx.createDelay(1);

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = gain;

    const initialNode = this.bufferToSource(recordedBuffer2);
    
    const splitter = this.ctx.createChannelSplitter(2);
    const merger = this.ctx.createChannelMerger(2);
    //const destination = this.ctx.createMediaStreamDestination();
    
    initialNode.connect(splitter);
    splitter.connect(this.delayNode, 0);
    splitter.connect(this.gainNode, 1);
    this.delayNode.connect(merger, 0, 0);
    this.gainNode.connect(merger, 0, 1);
    merger.connect(this.ctx.destination);
    initialNode.start();
  }

  // setupSingleUseNodes(recordedBuffer, baseBuffer) {
  //   if(this.recordedNode) this.recordedNode.disconnect();
  //   this.recordedNode = this.bufferToSource(recordedBuffer);
  //   this.recordedNode.connect(this.gainNode);
  //   if(this.baseNode) this.baseNode.disconnect();
  //   this.baseNode = this.bufferToSource(baseBuffer);
  //   this.baseNode.connect(this.delayNode);
  //   let time = this.ctx.currentTime;
  //   let length = Math.min(recordedBuffer.length, baseBuffer.length)/48000;
  //   this.recordedNode.start(time + 1, 0, length);
  //   this.baseNode.start(time +1, 0, length);
  //   this.baseNode.addEventListener('ended', () => {
  //     if(!this.killed) {
  //       this.setupSingleUseNodes(recordedBuffer, baseBuffer);
  //     }
  //   })
  // }

  kill() {
    this.killed = true;
    this.stop();
    this.ctx.close();
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