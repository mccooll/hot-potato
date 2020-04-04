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

const audioCtx = new AudioContext();

async function fetchBaseAudio() {     
  const response = await fetch('sample.mp3');
  const arrayBuffer = await response.arrayBuffer();
  const originAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  const trackSource = audioCtx.createBufferSource();
  trackSource.buffer = originAudioBuffer;
  trackSource.connect(audioCtx.destination);
  return trackSource;
}

async function handleMicrophoneSuccess(stream) {
  let trackSource = await fetchBaseAudio();
  trackSource.addEventListener('ended', () => {
    mediaRecorder.stop();
    trackSource.disconnect();
    trackAnal.disconnect();
    streamSource.disconnect();
    anal.disconnect();
  });
  const trackAnal = new VolumeAnalyser(trackSource);

  const streamSource = audioCtx.createMediaStreamSource(stream);
  const anal = new VolumeAnalyser(streamSource);

  const options = {mimeType: 'audio/webm'};
  const recordedChunks = [];
  const mediaRecorder = new MediaRecorder(stream, options);

  mediaRecorder.addEventListener('stop', async function() {
    let render = await mix(recordedChunks, trackSource);
    saveMix(render);
    playMix(render);
  });
  mediaRecorder.addEventListener('dataavailable', async function(e) { //assuming this event only happens after recording 
    if (e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  });

  async function mix(recordedChunks, trackSource) {
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
    gain.gain.value = trackAnal.getAverageVolume() - anal.getAverageVolume();
    recordedTrackSource.connect(gain);
    gain.connect(offlineAudioCtx.destination);

    originTrackSource.start();
    recordedTrackSource.start();
    const render = await offlineAudioCtx.startRendering();
    return render;
  }

  function playMix(audioBuffer) {
    var mix = audioCtx.createBufferSource();
    mix.buffer = audioBuffer;
    mix.connect(audioCtx.destination);
    mix.start();
  }

  async function saveMix(audioBuffer) {
    const mixRawData = audioBuffer.getChannelData(0);
    const mixDataBlob = new Blob(mixRawData);
    return; //write to server
  }

  mediaRecorder.start();
  trackSource.start();

};

navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(handleMicrophoneSuccess);