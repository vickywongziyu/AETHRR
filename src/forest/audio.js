// Quiet original generative ambience, created only after an explicit click.
export function createAmbience(){
 let context,gain,active=false;
 return {async toggle(){
  if(!context){context=new AudioContext();gain=context.createGain();gain.gain.value=0;gain.connect(context.destination);
   for(const [i,f] of [110,164.81,220,261.63,329.63].entries()){const osc=context.createOscillator(),v=context.createGain();osc.type='sine';osc.frequency.value=f;v.gain.value=.014/(1+i*.3);osc.connect(v);v.connect(gain);osc.start();}
   const buffer=context.createBuffer(1,context.sampleRate*4,context.sampleRate);const data=buffer.getChannelData(0);let brown=0;for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.02)/1.02;data[i]=brown*.2;}
   const noise=context.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=500;noise.connect(filter);filter.connect(gain);noise.start();
  }
  await context.resume();active=!active;gain.gain.setTargetAtTime(active?.8:0,context.currentTime,.5);return active;
 },suspend(){context?.suspend();},resume(){if(active)context?.resume();},dispose(){context?.close();}};
}
