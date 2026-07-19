export class AudioEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private isMuted = true
  private oscillators: Map<string, OscillatorNode> = new Map()
  private gainNodes: Map<string, GainNode> = new Map()
  private lfo: OscillatorNode | null = null
  private lfoGain: GainNode | null = null
  private thrustGain: GainNode | null = null
  private engineOsc: OscillatorNode | null = null

  constructor() {
    // Audio defaults to muted - user must press M to enable
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = 0
      this.masterGain.connect(this.ctx.destination)
    }
    return this.ctx
  }

  init() {
    const ctx = this.getContext()
    
    // Ambient drone - triangle wave at 55Hz, low-pass filtered
    const droneOsc = ctx.createOscillator()
    droneOsc.type = 'triangle'
    droneOsc.frequency.value = 55
    
    const droneFilter = ctx.createBiquadFilter()
    droneFilter.type = 'lowpass'
    droneFilter.frequency.value = 120
    
    const droneGain = ctx.createGain()
    droneGain.gain.value = 0.15
    
    // LFO for drone modulation
    this.lfo = ctx.createOscillator()
    this.lfo.type = 'sine'
    this.lfo.frequency.value = 0.2
    this.lfoGain = ctx.createGain()
    this.lfoGain.gain.value = 30
    this.lfo.connect(this.lfoGain)
    this.lfoGain.connect(droneFilter.frequency)
    
    droneOsc.connect(droneFilter)
    droneFilter.connect(droneGain)
    droneGain.connect(this.masterGain!)
    
    droneOsc.start()
    this.lfo.start()
    
    this.oscillators.set('drone', droneOsc)
    this.gainNodes.set('drone', droneGain)
    
    // Engine hum - sawtooth, pitch modulated by thrust
    this.engineOsc = ctx.createOscillator()
    this.engineOsc.type = 'sawtooth'
    this.engineOsc.frequency.value = 50
    
    this.thrustGain = ctx.createGain()
    this.thrustGain.gain.value = 0
    
    const engineFilter = ctx.createBiquadFilter()
    engineFilter.type = 'lowpass'
    engineFilter.frequency.value = 200
    
    this.engineOsc.connect(engineFilter)
    engineFilter.connect(this.thrustGain)
    this.thrustGain.connect(this.masterGain!)
    
    this.engineOsc.start()
    this.oscillators.set('engine', this.engineOsc)
  }

  setThrust(thrustPercent: number) {
    if (!this.ctx || !this.engineOsc || !this.thrustGain) return
    
    const thrustFraction = thrustPercent / 100
    const targetFreq = 50 + thrustFraction * 60 // 50-110 Hz
    const targetGain = thrustFraction * 0.1
    
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1)
    this.thrustGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1)
  }

  playRCSThruster() {
    if (!this.ctx || !this.masterGain) return
    
    const ctx = this.ctx
    const noise = ctx.createBufferSource()
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1
    }
    noise.buffer = buffer
    
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1400
    filter.Q.value = 5
    
    const gain = ctx.createGain()
    gain.gain.value = 0.05
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
    
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)
    
    noise.start()
    noise.stop(ctx.currentTime + 0.1)
  }

  playSonarPing() {
    if (!this.ctx || !this.masterGain) return
    
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1200, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3)
    
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    
    osc.connect(gain)
    gain.connect(this.masterGain)
    
    osc.start()
    osc.stop(ctx.currentTime + 0.3)
  }

  playUIClick() {
    if (!this.ctx || !this.masterGain) return
    
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 800
    
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)
    
    osc.connect(gain)
    gain.connect(this.masterGain)
    
    osc.start()
    osc.stop(ctx.currentTime + 0.04)
  }

  toggleMute(): boolean {
    if (!this.masterGain || !this.ctx) {
      this.init()
      this.isMuted = false
      this.masterGain!.gain.setTargetAtTime(0.3, this.ctx!.currentTime, 0.15)
      return false
    }
    
    this.isMuted = !this.isMuted
    const targetGain = this.isMuted ? 0 : 0.3
    this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.15)
    return this.isMuted
  }

  isAudioMuted(): boolean {
    return this.isMuted
  }

  destroy() {
    this.oscillators.forEach(osc => osc.stop())
    this.oscillators.clear()
    this.gainNodes.clear()
    if (this.ctx) {
      this.ctx.close()
      this.ctx = null
    }
  }
}
