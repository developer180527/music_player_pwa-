import { SoundTouch, SimpleFilter } from 'soundtouchjs';

const MAX_BUFFER_SIZE = 16384; // Small buffer since input/output rates are equal

class TimeStretchProcessor extends AudioWorkletProcessor {
  private soundTouch: any;
  private filter: any;
  private inputBufferL: Float32Array = new Float32Array(MAX_BUFFER_SIZE);
  private inputBufferR: Float32Array = new Float32Array(MAX_BUFFER_SIZE);
  private writePos = 0;
  private readPos = 0;
  private availableFrames = 0;
  
  constructor() {
    super();
    this.soundTouch = new SoundTouch();
    this.soundTouch.pitch = 1.0;
    this.soundTouch.tempo = 1.0;
    
    this.filter = new SimpleFilter(this.soundTouch, (samples: Float32Array) => {
      const numFrames = samples.length / 2;
      const framesToExtract = Math.min(numFrames, this.availableFrames);
      
      for (let i = 0; i < framesToExtract; i++) {
        const pos = (this.readPos + i) % MAX_BUFFER_SIZE;
        samples[i * 2] = this.inputBufferL[pos];
        samples[i * 2 + 1] = this.inputBufferR[pos];
      }
      
      this.readPos = (this.readPos + framesToExtract) % MAX_BUFFER_SIZE;
      this.availableFrames -= framesToExtract;
      
      return framesToExtract;
    });
    
    this.port.onmessage = (e) => {
      if (e.data.type === 'setSpeed') {
        // The browser changes playbackRate (resampling), which changes speed and pitch.
        // We use SoundTouch to pitch-shift it back to normal, effectively achieving
        // high-quality time-stretching without sync issues.
        this.soundTouch.pitch = 1.0 / e.data.speed;
      } else if (e.data.type === 'seek') {
        this.writePos = 0;
        this.readPos = 0;
        this.availableFrames = 0;
        this.soundTouch.clear();
      }
    };
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]) {
    const input = inputs[0];
    const output = outputs[0];
    
    if (input && input.length > 0) {
      const frames = input[0].length;
      for (let i = 0; i < frames; i++) {
        const pos = (this.writePos + i) % MAX_BUFFER_SIZE;
        this.inputBufferL[pos] = input[0][i];
        this.inputBufferR[pos] = input[1] ? input[1][i] : input[0][i];
      }
      this.writePos = (this.writePos + frames) % MAX_BUFFER_SIZE;
      this.availableFrames = Math.min(this.availableFrames + frames, MAX_BUFFER_SIZE);
    }
    
    if (output && output.length > 0) {
      const numFrames = output[0].length;
      const interleaved = new Float32Array(numFrames * 2);
      const extractedFrames = this.filter.extract(interleaved, numFrames);
      
      for (let i = 0; i < extractedFrames; i++) {
        output[0][i] = interleaved[i * 2];
        if (output[1]) output[1][i] = interleaved[i * 2 + 1];
      }
      
      for (let i = extractedFrames; i < numFrames; i++) {
        output[0][i] = 0;
        if (output[1]) output[1][i] = 0;
      }
    }
    
    return true;
  }
}

registerProcessor('time-stretch-processor', TimeStretchProcessor);
