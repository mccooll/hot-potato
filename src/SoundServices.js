import Meyda from 'meyda'

export default class SoundServices {

  track = {
    _id: null,
    _rev: null,
    title: null,
    lyrics: null
  }
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

  async fetchBaseAudio(id) {
    const arrayBuffer = await this.fetchArrayBuffer('hotpotato/' + id);
    this.baseTrack.buffer = this.getBufferFromRaw(arrayBuffer);
    this.baseTrack.volume = this.getVolume(this.baseTrack.buffer.getChannelData(0));
    console.log("track length" + this.baseTrack.buffer.duration)
  }

  async setBaseAudio(file) {
    const arrayBuffer = await file.arrayBuffer();
    this.baseTrack.buffer = await this.getBufferFromEncoded(arrayBuffer);
    this.baseTrack.volume = this.getVolume(this.baseTrack.buffer.getChannelData(0));
  }

  async fetchMeta(id) {
    const response = await fetch('hotpotato-meta/' + id);
    const meta = await response.json();
    this.track.title = meta.title;
    this.track.lyrics = meta.lyrics;
    this.track._id = meta._id;
    this.track._rev = meta._rev;
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
      channelCount: 1,
      latency: 0
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
        if( rmss.length > 2 && ( features.spectralFlatness < 0.2 || (features.rms/3 > (rmss[0]+rmss[1])) ) ) {
          fetch('log', {method: 'post', body: "heard SF "+features.spectralFlatness });
          heardResolver();
        } 
      }
    });
    analyzer.start();
    await heardPromise;
    rmss.pop(); rmss.pop();
    this.quietRMS = Math.sqrt(rmss.reduce((s,v)=> s + v*v)/rmss.length);
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
    mediaRecorder.addEventListener('stop', async () => {
      const buffer = await this.getRecordedBuffer(recordedChunks);
      this.micTrack.volume = this.getVolume(buffer.getChannelData(1));
      let gain = this.baseTrack.volume/this.micTrack.volume;
      if(this.micTrack.volume < this.quietRMS*2) gain = 1;
      console.log(gain);
      this.liveMixer = new LiveMixer(buffer, gain, this.stream.getAudioTracks()[0].getSettings().latency || 0);
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

  async mix(buffer2) {
    const offlineAudioCtx = new OfflineAudioContext(1, buffer2.duration*48000, 48000);
    const source = offlineAudioCtx.createBufferSource();
    window.u = source;
    source.buffer = buffer2;

    const splitter = offlineAudioCtx.createChannelSplitter(2);
    const merger = offlineAudioCtx.createChannelMerger(2);

    const delay = this.liveMixer.delay;
    const delayNode = offlineAudioCtx.createDelay(Math.max(delay,1));
    delayNode.delayTime.setValueAtTime(delay, 0);

    const gain = offlineAudioCtx.createGain();
    gain.gain.value = this.liveMixer.gainNode.gain.value

    source.connect(splitter);
    splitter.connect(delayNode, 0);
    splitter.connect(gain, 1);
    delayNode.connect(merger, 0, 0);
    gain.connect(merger, 0, 1);
    merger.connect(offlineAudioCtx.destination);
    source.start(0)

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

  async saveMixed(audioBuffer) { //deprecated
    const mixRawData = audioBuffer.getChannelData(0);
    const mixDataBlob = new Blob([mixRawData]);
    return fetch('output', {method: 'post', body: mixDataBlob});
  }

  async saveBuffer(audioBuffer) {
    if(!audioBuffer) {
      audioBuffer = this.baseTrack.buffer;
    }
    if(!audioBuffer) {
      return;
    }
    var method = 'post';
    var url = 'hotpotato-track';
    if(this.track._id) {
      method = 'put';
      url += '/' + this.track._id + '/' + this.track._rev;
    }
    const rawData = audioBuffer.getChannelData(0);
    const dataBlob = new Blob([rawData]);
    const response = await fetch(url, {
      method: method,
      body: dataBlob,
      headers: { 'Content-Type': 'application/x-binary' }
    });
    const updated = await response.json();
    this.track._id = updated.id;
    this.track._rev = updated.rev;
  }

  async saveMeta() {
    const response = await fetch('hotpotato-meta', {
      method: 'put',
      body: JSON.stringify(this.track),
      headers: { 'Content-Type': 'application/json' }
    });
    const updated = await response.json();
    this.track._id = updated.id;
    this.track._rev = updated.rev;
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
  initialNode;

  constructor(recordedBuffer2, gain, micDelay) {
    this.killed = false;
    
    this.ctx = new AudioContext();    

    this.delay = 0.005 + this.ctx.baseLatency + micDelay;
    this.delayNode = this.ctx.createDelay(1);

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = gain;

    this.initialNode = this.bufferToSource(recordedBuffer2);
    
    const splitter = this.ctx.createChannelSplitter(2);
    const merger = this.ctx.createChannelMerger(2);
    //const destination = this.ctx.createMediaStreamDestination();
    
    this.initialNode.connect(splitter);
    splitter.connect(this.delayNode, 0);
    splitter.connect(this.gainNode, 1);
    this.delayNode.connect(merger, 0, 0);
    this.gainNode.connect(merger, 0, 1);
    merger.connect(this.ctx.destination);
    this.initialNode.start();
  }

  kill() {
    this.killed = true;
    this.stop();
    this.ctx.close();
  }

  stop() {
    this.initialNode.stop();
  }

  bufferToSource(buffer) {
    let source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  setRecordingDelay(delay) {
    this.delay = delay;
    this.delayNode.delayTime.linearRampToValueAtTime(delay, this.ctx.currentTime + 2)
  }
}