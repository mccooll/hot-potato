onmessage = function(e) {
  console.log('Worker: Message received from main script');
  postMessage('Sending Message');
  const m = new MeydaVolumeAnalyser(e.data);
  console.log(m.analyse());
  //const array = new Float32Array(e.data);
}

class MeydaVolumeAnalyser {
  


  constructor(sourceNode, calibrate) {
  }

  analyse() {
  	
  }

  process() {
  }

  getAverageVolume() {
  }

  disconnect() {
  }

  static getRange() {
    return this.maxDecibels - this.minDecibels;
  }

  calibrate() {
  }
}
