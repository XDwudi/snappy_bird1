module.exports={
 advanceClock(now){
  if(this._lastTick==null){this._lastTick=now;return 0}
  const elapsed=Math.max(0,now-this._lastTick);this._lastTick=now
  if(this._suspended)return 0
  // Long stalls are pause time, never an instant burst of unseen physics.
  const delta=Math.min(250,elapsed);if(this.timings)this.timings.pause+=Math.max(0,elapsed-delta)/1000
  this._clockAccumulator=(this._clockAccumulator||0)+delta;let ticks=0
  while(this._clockAccumulator+1e-7>=1000/60){this._clockAccumulator-=1000/60;this.update();ticks++}
  return ticks
 },
 suspend(now=Date.now()){this._suspended=true;this._hiddenAt=now;this._clockAccumulator=0;this._choiceGesture=null;this._saveCheckpoint()},
 resume(now=Date.now()){if(this._hiddenAt&&this.timings)this.timings.pause+=Math.max(0,now-this._hiddenAt)/1000;this._suspended=false;this._hiddenAt=null;this._lastTick=null;this._choiceOpenedAt=now;this._choiceGesture=null},
 resumeRun(){return require('./Checkpoint').load(this)},
 _saveCheckpoint(){return require('./Checkpoint').save(this)},
 _countTime(){if(!this.timings||this.state==='ready'||this.state==='gameover')return
  const phase=this.state==='upgrading'?'reading':this.phoenixAnim||this.chapterSystem.isBossIntro()||this.chapterSystem.isTransitioning()||this._bossDyingFrames>0?'performance':this.chapterSystem.endless?'endless':this.chapterSystem.isBossActive()?'boss':'flight';this.timings[phase]+=1/60
 }
}
