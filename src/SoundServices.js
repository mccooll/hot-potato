import Meyda from 'meyda'

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
  arr;

  async fetchBaseAudio() {
    // await this.sleep()
    // const response = await fetch('input');
    // const arrayBuffer = await response.arrayBuffer();
    // const array = new Float32Array(arrayBuffer);
    // this.arr = array;
    // const originAudioBuffer = audioCtx.createBuffer(1,array.length,48000);
    // originAudioBuffer.copyToChannel(array, 0);
    // const trackSource = audioCtx.createBufferSource();
    // trackSource.buffer = originAudioBuffer;

    const response = await fetch('Recording.m4a');
    const arrayBuffer = await response.arrayBuffer();
    const originAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    this.arr = originAudioBuffer.getChannelData(0);
    console.log(this.arr)
    const trackSource = audioCtx.createBufferSource();
    trackSource.buffer = originAudioBuffer;

    // trackSource.connect(audioCtx.destination);
    // this.trackSource = trackSource;
  }

  extractBeatProfile() {
    // var signal = (new Array(32).fill(0).map((element, index) => {
    //   const remainder = index % 3;
    //   if (remainder === 0) {
    //     return 1;
    //   } else if (remainder === 1) {
    //     return 0;
    //   }
    //   return -1;
    // }));
    Meyda.bufferSize = 2048;
    Meyda.sampleRate = 48000;
    var pos = 0//117120;
    var beatPositions = [];
    var previousMaxes = [];
    var previousBeatBucket = 0;
    while(pos < this.arr.length) {//149120) { //this.arr.length) {
      const buffer = this.arr.slice(pos, pos+=2048);
      if(buffer.length < 2048) break;
      const windowed = Meyda.windowing(buffer, "hamming");
      const ext = Meyda.extract(['spectralFlatness','rms','amplitudeSpectrum'], windowed);
      //console.log('rms' + ext.rms)
      //if(ext.rms>0.01)
      console.log(ext.amplitudeSpectrum);
      if(ext.spectralFlatness < 0.4)
      {
        const max = ext.amplitudeSpectrum.indexOf(Math.max(...ext.amplitudeSpectrum));
        if(max!=previousBeatBucket) {
          previousMaxes.push(max);
          //console.log(previousMaxes.slice())
          if(this.arePreviousMaxesConsistent(previousMaxes)) {
            //console.log(max)
            if(previousMaxes.length > 4) {
              beatPositions.push(this.findBeatStart(pos,max,ext.amplitudeSpectrum[max]));
              previousBeatBucket = max;
            }
          } else {
            previousMaxes = [];
          }
        }
      }
      //if(max==24)
        //console.log('pos'+pos);
      //console.log(ext.amplitudeSpectrum[14])
    }
    console.log(beatPositions)
  }

  arePreviousMaxesConsistent(previousMaxes) {
    let i=1;
    while(i<previousMaxes.length) {
      if(previousMaxes[0]!=previousMaxes[i++]) return false;
    }
    return true;
  }

  // findBeatStart(trackPosition) {
  //   return trackPosition;
  // }
  findBeatStart(trackPosition, maxBucket) { //trackPosition, maxBucket, maxValue
    Meyda.bufferSize = 2048;
    Meyda.sampleRate = 48000;
    var pos = trackPosition-2048*6;
    var val = null;
    const maxBack = 0.2*48000;
    while(pos > maxBack) {
      const buffer = this.arr.slice(pos-2048, pos);
      if(buffer.length < 2048) return pos;
      const windowed = Meyda.windowing(buffer, "hamming");
      const ext = Meyda.extract(['amplitudeSpectrum'], windowed);
      console.log('f'+ext.amplitudeSpectrum[maxBucket])
      console.log('c'+val)
      if(!val || ext.amplitudeSpectrum[maxBucket] < val) {
        console.log('yep')
        val = ext.amplitudeSpectrum[maxBucket];
        pos-=2048;
      } else {
        return pos;
      }
    }
    return pos;
  }
  //[94208, 133120, 256000, 319488, 344064, 407552, 534528]

  playBaseAudio() {
    if(this.trackSource) {
      if(this.playSource) this.playSource.disconnect();
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
    return this.stream;
  }

  micDiagnostic() {
    let tracks = this.stream.getAudioTracks();
    let track = tracks[0];
    console.log(track.getSettings());
  }

  async listen() {
    const streamSource = audioCtx.createMediaStreamSource(this.stream);
    const anal = new VolumeAnalyser(streamSource, false);
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
        that.liveMixer = new LiveMixer(await that.getRecordedBuffer(recordedChunks), that.trackSource.buffer, that.trackAnal.getAverageVolume() - that.anal.getAverageVolume());
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
    const delayNode = offlineAudioCtx.createDelay(Math.max(delay,1));
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
  calibrating = false;

  constructor(sourceNode, calibrate) {
    this.anal = sourceNode.context.createAnalyser();
    this.anal.maxDecibels = VolumeAnalyser.maxDecibels;
    this.anal.minDecibels = VolumeAnalyser.minDecibels;
    this.anal.smoothingTimeConstant = 0;
    this.anal.fftSize = 32;
    
    this.processor = sourceNode.context.createScriptProcessor(0, 1, 0);
    //just in case https://stackoverflow.com/questions/24338144/chrome-onaudioprocess-stops-getting-called-after-a-while
    if(window.chrome) this.processor = sourceNode.context.createScriptProcessor(0, 1, 1); //https://github.com/WebAudio/web-audio-api/issues/345

    sourceNode.connect(this.anal);
    this.anal.connect(this.processor);
    if(window.chrome) this.processor.connect(sourceNode.context.destination) //https://github.com/WebAudio/web-audio-api/issues/345
    
    this.amplitudeArray = new Uint8Array(this.anal.frequencyBinCount);
    this.processor.onaudioprocess = this.process.bind(this);
    if(calibrate) this.calibrate();
  }

  process() {
    if(this.processCycle < 10 && !this.calibrating) {
      this.processCycle++;
      return;
    }
    this.processCycle = 0;
    this.anal.getByteFrequencyData(this.amplitudeArray);
    let sampleTotal = (this.amplitudeArray[0]+this.amplitudeArray[1]);
    if(sampleTotal > 0) {
      this.samplesTotal += sampleTotal;
      console.log(sampleTotal);
      this.numberOfSamples += 2;
      if(!this.calibrating) {
        this.heardResolver();
      } else {
        if(this.numberOfSamples > 10) //move to calibrate
        {
          this.calibrate();
        }
      }
    }
  }

  getAverageVolume() {
    return this.numberOfSamples === 0 ? 0: this.samplesTotal/this.numberOfSamples/255*VolumeAnalyser.getRange();
  }

  disconnect() {
    this.anal.disconnect();
    this.processor.disconnect();
  }

  static getRange() {
    return this.maxDecibels - this.minDecibels;
  }

  calibrate() {
    if(!this.calibrating) {
      this.anal.minDecibels = VolumeAnalyser.initCalibrationDecibels;
      VolumeAnalyser.minDecibels = this.anal.minDecibels;
      this.calibrating = true;
    } else {
      this.anal.minDecibels+=this.getAverageVolume()+15;
      VolumeAnalyser.minDecibels = this.anal.minDecibels;
      this.numberOfSamples = 0; // no relevant samples
      this.samplesTotal = 0; // no relevant sample total
      this.calibrating = false;
      console.log(this.anal.minDecibels);
    }
  }
}
VolumeAnalyser.maxDecibels = -30;
VolumeAnalyser.minDecibels = -50;
VolumeAnalyser.initCalibrationDecibels = -100;

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