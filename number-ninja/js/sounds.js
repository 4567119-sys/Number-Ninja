/**
 * sounds.js — Number Ninja
 * All sound effects synthesised via Web Audio API.
 * No external audio files needed.
 */

const SoundManager = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playTone(freq, duration, type = 'sine', gain = 0.3, startDelay = 0) {
    try {
      const ac = getCtx();
      const osc = ac.createOscillator();
      const gainNode = ac.createGain();
      osc.connect(gainNode);
      gainNode.connect(ac.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime + startDelay);
      gainNode.gain.setValueAtTime(0, ac.currentTime + startDelay);
      gainNode.gain.linearRampToValueAtTime(gain, ac.currentTime + startDelay + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + startDelay + duration);
      osc.start(ac.currentTime + startDelay);
      osc.stop(ac.currentTime + startDelay + duration);
    } catch (e) { /* silently fail if audio not supported */ }
  }

  function correct() {
    playTone(523,  0.12, 'sine', 0.35, 0.00);
    playTone(659,  0.12, 'sine', 0.35, 0.10);
    playTone(784,  0.12, 'sine', 0.35, 0.20);
    playTone(1047, 0.20, 'sine', 0.35, 0.30);
  }

  function wrong() {
    playTone(220, 0.15, 'sawtooth', 0.25, 0.00);
    playTone(180, 0.25, 'sawtooth', 0.25, 0.15);
  }

  function tick() {
    playTone(880, 0.05, 'square', 0.10, 0);
  }

  function urgentTick() {
    playTone(1100, 0.06, 'square', 0.18, 0);
  }

  function streak() {
    playTone(523,  0.10, 'sine', 0.30, 0.00);
    playTone(659,  0.10, 'sine', 0.30, 0.08);
    playTone(784,  0.10, 'sine', 0.30, 0.16);
    playTone(1047, 0.10, 'sine', 0.30, 0.24);
    playTone(1319, 0.20, 'sine', 0.30, 0.32);
  }

  function achievement() {
    playTone(784,  0.10, 'sine', 0.30, 0.00);
    playTone(988,  0.10, 'sine', 0.30, 0.10);
    playTone(1175, 0.10, 'sine', 0.30, 0.20);
    playTone(1568, 0.30, 'sine', 0.30, 0.30);
  }

  function gameOver() {
    playTone(523, 0.20, 'triangle', 0.30, 0.00);
    playTone(440, 0.20, 'triangle', 0.30, 0.20);
    playTone(349, 0.20, 'triangle', 0.30, 0.40);
    playTone(262, 0.40, 'triangle', 0.30, 0.60);
  }

  function coin() {
    playTone(1047, 0.08, 'sine', 0.20, 0.00);
    playTone(1319, 0.12, 'sine', 0.20, 0.06);
  }

  function click() {
    playTone(600, 0.05, 'sine', 0.15, 0);
  }

  return { correct, wrong, tick, urgentTick, streak, achievement, gameOver, coin, click };
})();
