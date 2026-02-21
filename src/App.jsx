import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Download, Settings, Shuffle, Volume2, VolumeX, X, Navigation } from 'lucide-react';

// --- インストゥルメント設定 ---
const INSTRUMENTS = [
  { id: 'CRASH', name: 'CRASH', defaultMidi: 49, color: 'bg-orange-500', activeColor: 'bg-orange-400' },
  { id: 'HIGH_TOM', name: 'HIGH TOM', defaultMidi: 50, color: 'bg-purple-500', activeColor: 'bg-purple-400' },
  { id: 'MID_TOM', name: 'MID TOM', defaultMidi: 47, color: 'bg-fuchsia-500', activeColor: 'bg-fuchsia-400' },
  { id: 'LOW_TOM', name: 'LOW TOM', defaultMidi: 43, color: 'bg-pink-500', activeColor: 'bg-pink-400' },
  { id: 'OPEN_HAT', name: 'OPEN HI-HAT', defaultMidi: 46, color: 'bg-yellow-500', activeColor: 'bg-yellow-400' },
  { id: 'CLOSED_HAT', name: 'CLOSED HI-HAT', defaultMidi: 42, color: 'bg-amber-500', activeColor: 'bg-amber-400' },
  { id: 'SNARE', name: 'SNARE', defaultMidi: 38, color: 'bg-green-500', activeColor: 'bg-green-400' },
  { id: 'KICK', name: 'KICK', defaultMidi: 36, color: 'bg-blue-500', activeColor: 'bg-blue-400' },
];

// --- MIDIノート変換ユーティリティ ---
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const midiToNoteName = (midi) => {
  if (midi < 0 || midi > 127 || isNaN(midi)) return '';
  const octave = Math.floor(midi / 12) - 1; // Roland standard (C4 = 60)
  const note = NOTES[midi % 12];
  return `${note}${octave}`;
};

const noteNameToMidi = (name) => {
  if (typeof name !== 'string' || !name) return null;
  const match = name.trim().toUpperCase().match(/^([A-G])([#B])?(-?\d+)$/);
  if (!match) return null;
  let noteIndex = NOTES.indexOf(match[1]);
  if (match[2] === '#') noteIndex++;
  if (match[2] === 'B') noteIndex--;
  if (noteIndex < 0) noteIndex = 11;
  if (noteIndex > 11) noteIndex = 0;
  const octave = parseInt(match[3], 10);
  const midi = (octave + 1) * 12 + noteIndex;
  return (midi >= 0 && midi <= 127) ? midi : null;
};

// --- プリセットパターン (32ステップ = 2小節) ---
const createEmptyGrid = () => Array(8).fill().map(() => Array(32).fill(false));

const PRESETS = {
  'Basic 1 (8 Beat)': [
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // CRASH
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // HIGH TOM
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // MID TOM
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // LOW TOM
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // OPEN HI-HAT
    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0,  1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], // CLOSED HI-HAT
    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0,  0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], // SNARE
    [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0,  1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0], // KICK
  ],
  'Basic 2 (16 Beat)': [
    [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // CRASH
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // HIGH TOM
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // MID TOM
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // LOW TOM
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // OPEN HI-HAT
    [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1,  1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1], // CLOSED HI-HAT
    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0,  0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], // SNARE
    [1,0,0,1, 0,0,0,0, 1,0,1,0, 0,0,0,0,  1,0,0,1, 0,0,0,0, 1,0,1,0, 0,0,0,0], // KICK
  ],
  'House': [
    [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // CRASH
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // HIGH TOM
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // MID TOM
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // LOW TOM
    [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0,  0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0], // OPEN HI-HAT
    [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0,  1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], // CLOSED HI-HAT
    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0,  0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], // SNARE
    [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0,  1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], // KICK
  ],
  'Hip Hop': [
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // CRASH
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // HIGH TOM
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // MID TOM
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // LOW TOM
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,1,0], // OPEN HI-HAT
    [1,0,1,0, 1,0,1,1, 1,0,1,0, 1,0,0,0,  1,0,1,0, 1,0,1,1, 1,0,1,0, 1,0,0,0], // CLOSED HI-HAT
    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0,  0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0], // SNARE
    [1,0,0,0, 0,0,1,0, 0,1,0,0, 0,0,0,0,  1,0,0,0, 0,0,1,0, 0,1,0,0, 0,0,0,0], // KICK
  ],
  'Reggaeton': [
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // CRASH
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // HIGH TOM
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // MID TOM
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // LOW TOM
    [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,  0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0], // OPEN HI-HAT
    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0,  1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], // CLOSED HI-HAT
    [0,0,0,1, 0,0,1,0, 0,0,0,1, 0,0,1,0,  0,0,0,1, 0,0,1,0, 0,0,0,1, 0,0,1,0], // SNARE
    [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0,  1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], // KICK
  ]
};

const mapPresetToGrid = (preset) => {
  return preset.map(row => row.map(val => val === 1));
};

export default function App() {
  // --- 状態管理 ---
  const [grid, setGrid] = useState(mapPresetToGrid(PRESETS['Basic 1 (8 Beat)']));
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [currentStep, setCurrentStep] = useState(0);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [trackVolumes, setTrackVolumes] = useState(Array(8).fill(0.8));
  const [trackMutes, setTrackMutes] = useState(Array(8).fill(false));
  const [midiMap, setMidiMap] = useState(INSTRUMENTS.map(i => i.defaultMidi));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('Basic 1 (8 Beat)');
  const [tempMidiMap, setTempMidiMap] = useState([]);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  const openSettings = () => {
    setTempMidiMap(midiMap.map(midiToNoteName));
    setIsSettingsOpen(true);
  };

  // --- 参照 (Audio Scheduling用) ---
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const noiseBufferRef = useRef(null);
  const timerIDRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const scrollContainerRef = useRef(null);
  const stepRefs = useRef([]);
  
  // Reactの状態をrefに同期（スケジューラ内で最新の値にアクセスするため）
  const stateRef = useRef({ grid, bpm, trackVolumes, trackMutes });
  useEffect(() => {
    stateRef.current = { grid, bpm, trackVolumes, trackMutes };
  }, [grid, bpm, trackVolumes, trackMutes]);

  // --- Audio初期化 ---
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioContext();
      
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.connect(audioCtxRef.current.destination);
      masterGainRef.current.gain.value = masterVolume;

      // ノイズバッファの生成 (スネア、ハイハット、クラッシュ用)
      const bufferSize = audioCtxRef.current.sampleRate * 2;
      const buffer = audioCtxRef.current.createBuffer(1, bufferSize, audioCtxRef.current.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      noiseBufferRef.current = buffer;
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = masterVolume;
    }
  }, [masterVolume]);

  // --- ドラム音合成 ---
  const playDrum = useCallback((instIndex, time, volume) => {
    if (!audioCtxRef.current || stateRef.current.trackMutes[instIndex]) return;
    
    const ctx = audioCtxRef.current;
    const masterGain = masterGainRef.current;
    
    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(masterGain);

    switch (instIndex) {
      case 0: // CRASH
        const crashOsc1 = ctx.createOscillator();
        const crashOsc2 = ctx.createOscillator();
        const crashBandpass = ctx.createBiquadFilter();
        
        crashOsc1.type = 'square';
        crashOsc2.type = 'square';
        crashOsc1.frequency.value = 400;
        crashOsc2.frequency.value = 600;
        
        crashBandpass.type = 'bandpass';
        crashBandpass.frequency.value = 8000;
        
        const crashGain = ctx.createGain();
        crashGain.gain.setValueAtTime(volume, time);
        crashGain.gain.exponentialRampToValueAtTime(0.01, time + 1.5);
        
        crashOsc1.connect(crashBandpass);
        crashOsc2.connect(crashBandpass);
        crashBandpass.connect(crashGain);
        crashGain.connect(gainNode);
        
        crashOsc1.start(time);
        crashOsc2.start(time);
        crashOsc1.stop(time + 1.5);
        crashOsc2.stop(time + 1.5);
        break;

      case 1: // HIGH TOM
      case 2: // MID TOM
      case 3: // LOW TOM
        const tomOsc = ctx.createOscillator();
        const tomGain = ctx.createGain();
        tomOsc.type = 'sine';
        
        const baseFreq = instIndex === 1 ? 250 : instIndex === 2 ? 180 : 120;
        tomOsc.frequency.setValueAtTime(baseFreq, time);
        tomOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.2, time + 0.3);
        
        tomGain.gain.setValueAtTime(volume, time);
        tomGain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        
        tomOsc.connect(tomGain);
        tomGain.connect(gainNode);
        tomOsc.start(time);
        tomOsc.stop(time + 0.3);
        break;

      case 4: // OPEN HI-HAT
      case 5: // CLOSED HI-HAT
        const hatSource = ctx.createBufferSource();
        hatSource.buffer = noiseBufferRef.current;
        const hatFilter = ctx.createBiquadFilter();
        hatFilter.type = 'highpass';
        hatFilter.frequency.value = 7000;
        
        const hatGain = ctx.createGain();
        const decayTime = instIndex === 4 ? 0.4 : 0.1; // Open has longer decay
        hatGain.gain.setValueAtTime(volume, time);
        hatGain.gain.exponentialRampToValueAtTime(0.01, time + decayTime);
        
        hatSource.connect(hatFilter);
        hatFilter.connect(hatGain);
        hatGain.connect(gainNode);
        hatSource.start(time);
        hatSource.stop(time + decayTime);
        break;

      case 6: // SNARE
        const snOsc = ctx.createOscillator();
        const snGain = ctx.createGain();
        snOsc.type = 'triangle';
        snOsc.frequency.setValueAtTime(200, time);
        snOsc.connect(snGain);
        
        const snNoise = ctx.createBufferSource();
        snNoise.buffer = noiseBufferRef.current;
        const snFilter = ctx.createBiquadFilter();
        snFilter.type = 'highpass';
        snFilter.frequency.value = 2000;
        const snNoiseGain = ctx.createGain();
        snNoise.connect(snFilter);
        snFilter.connect(snNoiseGain);
        
        snGain.gain.setValueAtTime(volume * 0.7, time);
        snGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        snNoiseGain.gain.setValueAtTime(volume, time);
        snNoiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        
        snGain.connect(gainNode);
        snNoiseGain.connect(gainNode);
        
        snOsc.start(time);
        snNoise.start(time);
        snOsc.stop(time + 0.2);
        snNoise.stop(time + 0.2);
        break;

      case 7: // KICK
        const kickOsc = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kickOsc.type = 'sine';
        
        kickOsc.frequency.setValueAtTime(150, time);
        kickOsc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        
        kickGain.gain.setValueAtTime(volume, time);
        kickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        
        kickOsc.connect(kickGain);
        kickGain.connect(gainNode);
        
        kickOsc.start(time);
        kickOsc.stop(time + 0.5);
        break;

      default:
        break;
    }
  }, []);

  // --- スケジューラー ---
  const lookahead = 25.0; // ms
  const scheduleAheadTime = 0.1; // s

  const nextNote = useCallback(() => {
    const secondsPerBeat = 60.0 / stateRef.current.bpm;
    nextNoteTimeRef.current += 0.25 * secondsPerBeat; // 16th note
    currentStepRef.current = (currentStepRef.current + 1) % 32; // 32 steps (2 measures)
  }, []);

  const scheduleNote = useCallback((stepNumber, time) => {
    const { grid, trackVolumes } = stateRef.current;
    
    // UIを更新するためのタイマー
    setTimeout(() => {
      setCurrentStep(stepNumber);
    }, (time - audioCtxRef.current.currentTime) * 1000);

    for (let i = 0; i < 8; i++) {
      if (grid[i][stepNumber]) {
        playDrum(i, time, trackVolumes[i]);
      }
    }
  }, [playDrum]);

  const scheduler = useCallback(() => {
    while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + scheduleAheadTime) {
      scheduleNote(currentStepRef.current, nextNoteTimeRef.current);
      nextNote();
    }
    timerIDRef.current = setTimeout(scheduler, lookahead);
  }, [nextNote, scheduleNote]);

  // 再生/停止の切り替え
  useEffect(() => {
    if (isPlaying) {
      initAudio();
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      currentStepRef.current = 0;
      setCurrentStep(0);
      nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.05;
      scheduler();
    } else {
      clearTimeout(timerIDRef.current);
    }
    return () => clearTimeout(timerIDRef.current);
  }, [isPlaying, scheduler]);

  // --- オートスクロール制御 ---
  useEffect(() => {
    if (isPlaying && isAutoScroll && scrollContainerRef.current && stepRefs.current[currentStep]) {
      const container = scrollContainerRef.current;
      const stepEl = stepRefs.current[currentStep];
      
      const containerRect = container.getBoundingClientRect();
      const stepRect = stepEl.getBoundingClientRect();
      
      // 現在のステップがコンテナの中央にくるようにスクロール位置を計算
      const scrollPos = container.scrollLeft + (stepRect.left - containerRect.left) - (container.clientWidth / 2) + (stepRect.width / 2);

      container.scrollTo({
        left: scrollPos,
        behavior: 'smooth'
      });
    }
  }, [currentStep, isPlaying, isAutoScroll]);

  // --- アクションハンドラ ---
  const toggleStep = (instIndex, stepIndex) => {
    const newGrid = [...grid];
    newGrid[instIndex] = [...newGrid[instIndex]];
    newGrid[instIndex][stepIndex] = !newGrid[instIndex][stepIndex];
    setGrid(newGrid);
    
    if (newGrid[instIndex][stepIndex] && !isPlaying) {
      initAudio();
      playDrum(instIndex, audioCtxRef.current.currentTime, trackVolumes[instIndex]);
    }
  };

  const handlePresetChange = (e) => {
    const presetName = e.target.value;
    setSelectedPreset(presetName);
    setGrid(mapPresetToGrid(PRESETS[presetName]));
  };

  const generateRandomPattern = () => {
    const presetNames = Object.keys(PRESETS);
    let randomPresetName = selectedPreset;
    
    // 現在選択されているプリセットと被らないようにランダム選択
    if (presetNames.length > 1) {
      while (randomPresetName === selectedPreset || randomPresetName === 'custom') {
        randomPresetName = presetNames[Math.floor(Math.random() * presetNames.length)];
      }
    } else {
      randomPresetName = presetNames[0];
    }

    setSelectedPreset(randomPresetName);
    setGrid(mapPresetToGrid(PRESETS[randomPresetName]));
  };

  const clearGrid = () => {
    setGrid(createEmptyGrid());
    setSelectedPreset('custom');
  };

  // --- MIDIダウンロード ---
  const downloadMIDI = async () => {
    // 外部ライブラリを動的に読み込む
    if (!window.MidiWriter) {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/midi-writer-js@2.1.4/build/index.browser.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      } catch (e) {
        alert("MIDIエクスポート用のライブラリの読み込みに失敗しました。");
        return;
      }
    }

    const track = new window.MidiWriter.Track();
    track.setTimeSignature(4, 4);
    track.setTempo(bpm);

    let waitSteps = 0;
    for (let step = 0; step < 32; step++) {
      let pitches = [];
      for (let inst = 0; inst < 8; inst++) {
        if (grid[inst][step]) {
          pitches.push(midiMap[inst]);
        }
      }

      if (pitches.length > 0) {
        let waitStr = waitSteps > 0 ? `T${waitSteps * 32}` : 0; // 16分音符 = 32ティック
        const note = new window.MidiWriter.NoteEvent({
          pitch: pitches,
          duration: '16',
          wait: waitStr,
          channel: 10, // ドラムチャンネル
          velocity: 100
        });
        track.addEvent(note);
        waitSteps = 0;
      } else {
        waitSteps++;
      }
    }

    const write = new window.MidiWriter.Writer(track);
    const dataUri = write.dataUri();
    
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `drum-pattern-${bpm}bpm.mid`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div translate="no" className="notranslate min-h-screen bg-gray-950 text-gray-100 font-sans p-2 sm:p-4 md:p-8 selection:bg-indigo-500/30 relative">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(79, 70, 229, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(79, 70, 229, 0.8);
        }
      `}</style>

      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
        
        {/* ヘッダー */}
        <div className="bg-gray-900 rounded-2xl p-4 md:p-6 shadow-xl border border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent text-center md:text-left">
              Basic Drum Sequencer
            </h1>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-4 bg-gray-950/50 p-2 md:p-3 rounded-xl border border-gray-800/50 w-full md:w-auto">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center justify-center w-12 h-12 md:w-14 md:h-14 flex-shrink-0 rounded-full transition-all duration-300 shadow-lg ${
                isPlaying 
                  ? 'bg-red-500 hover:bg-red-400 shadow-red-500/20' 
                  : 'bg-indigo-500 hover:bg-indigo-400 shadow-indigo-500/20'
              }`}
            >
              {isPlaying ? <Square fill="currentColor" size={20} className="md:w-6 md:h-6" /> : <Play fill="currentColor" className="ml-1 md:w-7 md:h-7" size={24} />}
            </button>

            <div className="flex flex-col gap-1 w-24 md:w-32">
              <label className="text-[10px] md:text-xs text-gray-400 font-medium tracking-wider">BPM: <span className="text-indigo-300">{bpm}</span></label>
              <input
                type="range"
                min="60"
                max="200"
                value={bpm}
                onChange={(e) => setBpm(parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div className="w-px h-8 md:h-10 bg-gray-800 mx-1 md:mx-2"></div>

            <div className="flex flex-col gap-1 w-24 md:w-32">
              <label className="text-[10px] md:text-xs text-gray-400 font-medium tracking-wider">Master Vol</label>
              <div className="flex items-center gap-1 md:gap-2">
                <Volume2 size={12} className="text-gray-500 md:w-4 md:h-4" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ツールバー */}
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 w-full sm:w-auto">
            <select
              value={selectedPreset}
              onChange={handlePresetChange}
              className="bg-gray-900 border border-gray-700 text-xs md:text-sm rounded-lg px-2 md:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all flex-1 sm:flex-none min-w-[140px]"
            >
              <option value="custom">Custom Pattern</option>
              {Object.keys(PRESETS).map(preset => (
                <option key={preset} value={preset}>{preset}</option>
              ))}
            </select>
            
            <button
              onClick={generateRandomPattern}
              className="flex items-center justify-center gap-1 md:gap-2 bg-gray-800 hover:bg-gray-700 text-xs md:text-sm px-3 md:px-4 py-2 rounded-lg transition-colors border border-gray-700 flex-1 sm:flex-none"
            >
              <Shuffle size={14} className="md:w-4 md:h-4" /> <span className="hidden xs:inline">Random</span>
            </button>
            <button
              onClick={clearGrid}
              className="text-gray-400 hover:text-white text-xs md:text-sm px-2 md:px-3 py-2 transition-colors flex-shrink-0"
            >
              Clear
            </button>
            <button
              onClick={() => setIsAutoScroll(!isAutoScroll)}
              className={`flex items-center justify-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm transition-colors border ${
                isAutoScroll 
                  ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600/30' 
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-gray-300'
              } flex-1 sm:flex-none`}
            >
              <Navigation size={14} className="md:w-4 md:h-4" /> 
              <span className="hidden xs:inline">Auto Scroll</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 md:gap-3 w-full sm:w-auto">
            <button
              onClick={downloadMIDI}
              className="flex items-center justify-center gap-1 md:gap-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm transition-all flex-1 sm:flex-none"
            >
              <Download size={14} className="md:w-4 md:h-4" /> <span className="whitespace-nowrap">Export MIDI</span>
            </button>
            <button
              onClick={openSettings}
              className="flex items-center justify-center gap-1 md:gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm transition-colors border border-gray-700 flex-1 sm:flex-none"
            >
              <Settings size={14} className="md:w-4 md:h-4" /> Settings
            </button>
          </div>
        </div>

        {/* シーケンサーグリッド */}
        <div 
          ref={scrollContainerRef}
          className="bg-gray-900 rounded-2xl p-2 sm:p-4 md:p-6 shadow-xl border border-gray-800 overflow-x-auto custom-scrollbar"
        >
          <div className="min-w-[900px] sm:min-w-[1200px] md:min-w-[1500px]">
            {/* ステップインジケーター */}
            <div className="flex mb-2 md:mb-4 pl-[90px] sm:pl-[140px] md:pl-[220px]">
              {Array(32).fill().map((_, i) => (
                <div 
                  key={i} 
                  ref={el => stepRefs.current[i] = el}
                  className={`flex-1 flex justify-center ${i === 16 ? 'ml-3 sm:ml-5 md:ml-6' : ''}`}
                >
                  <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all duration-75 ${i === currentStep && isPlaying ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]' : 'bg-gray-800'}`}></div>
                </div>
              ))}
            </div>

            {/* グリッド行 */}
            <div className="space-y-1.5 md:space-y-2">
              {INSTRUMENTS.map((inst, rowIdx) => (
                <div key={inst.id} className="flex items-center bg-gray-950/40 rounded-xl hover:bg-gray-800/50 transition-colors group p-1 border border-transparent hover:border-gray-800">
                  {/* トラックコントロール */}
                  <div className="w-[85px] sm:w-[135px] md:w-[210px] flex items-center justify-between pr-2 md:pr-4 flex-shrink-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                      <button 
                        onClick={() => {
                          const newMutes = [...trackMutes];
                          newMutes[rowIdx] = !newMutes[rowIdx];
                          setTrackMutes(newMutes);
                        }}
                        className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 flex items-center justify-center rounded-md md:rounded-lg transition-colors flex-shrink-0 ${trackMutes[rowIdx] ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                      >
                        {trackMutes[rowIdx] ? <VolumeX size={12} className="md:w-3.5 md:h-3.5" /> : <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${inst.color}`}></div>}
                      </button>
                      <span className="font-mono text-[9px] sm:text-[10px] md:text-xs font-semibold text-gray-300 tracking-wider w-12 sm:w-16 md:w-24 truncate" title={inst.name}>{inst.name}</span>
                    </div>
                    
                    <div className="hidden sm:block w-12 md:w-16 opacity-0 group-hover:opacity-100 transition-opacity">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={trackVolumes[rowIdx]}
                        onChange={(e) => {
                          const newVols = [...trackVolumes];
                          newVols[rowIdx] = parseFloat(e.target.value);
                          setTrackVolumes(newVols);
                        }}
                        className={`w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 md:[&::-webkit-slider-thumb]:w-3 md:[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full`}
                      />
                    </div>
                  </div>

                  {/* ステップボタン */}
                  <div className="flex-1 flex gap-0.5 sm:gap-1">
                    {Array(32).fill().map((_, colIdx) => {
                      const isActive = grid[rowIdx][colIdx];
                      const isCurrentStep = colIdx === currentStep && isPlaying;
                      const isBeatStart = colIdx % 4 === 0;

                      return (
                        <button
                          key={colIdx}
                          onClick={() => toggleStep(rowIdx, colIdx)}
                          className={`flex-1 aspect-[4/5] rounded sm:rounded-md transition-all duration-100 border relative ${
                            isActive 
                              ? `${inst.color} border-transparent shadow-[0_0_6px_rgba(0,0,0,0.5)] md:shadow-[0_0_10px_rgba(0,0,0,0.5)]` 
                              : `bg-gray-900 ${isBeatStart ? 'border-gray-700' : 'border-gray-800'} hover:bg-gray-800`
                          } ${
                            isCurrentStep ? (isActive ? 'brightness-125 scale-105' : 'bg-gray-700 border-gray-600') : ''
                          } ${colIdx === 16 ? 'ml-3 sm:ml-5 md:ml-6' : ''}`}
                        >
                           {/* アクセントカラーインジケーター (アクティブ時) */}
                           {isActive && <div className="absolute inset-0 bg-white/20 rounded sm:rounded-md mix-blend-overlay"></div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 設定モーダル */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-950/50">
              <h2 className="text-lg font-bold flex items-center gap-2"><Settings size={20} className="text-indigo-400"/> MIDI Mapping Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-400 mb-4">Set the note assigned to each instrument during MIDI export. (e.g., C3, D#2). Default is General MIDI mapping.</p>
              
              <div className="grid grid-cols-2 gap-4">
                {INSTRUMENTS.map((inst, idx) => (
                  <div key={inst.id} className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-gray-400">{inst.name}</label>
                    <input
                      type="text"
                      value={tempMidiMap[idx] || ''}
                      onChange={(e) => {
                        const newMap = [...tempMidiMap];
                        newMap[idx] = e.target.value;
                        setTempMidiMap(newMap);
                      }}
                      onBlur={() => {
                        const parsed = noteNameToMidi(tempMidiMap[idx]);
                        if (parsed !== null) {
                          const newMainMap = [...midiMap];
                          newMainMap[idx] = parsed;
                          setMidiMap(newMainMap);

                          const newTempMap = [...tempMidiMap];
                          newTempMap[idx] = midiToNoteName(parsed);
                          setTempMidiMap(newTempMap);
                        } else {
                          // Invalid input, revert to current valid state
                          const newTempMap = [...tempMidiMap];
                          newTempMap[idx] = midiToNoteName(midiMap[idx]);
                          setTempMidiMap(newTempMap);
                        }
                      }}
                      placeholder="e.g. C3"
                      className="bg-gray-950 border border-gray-700 rounded text-sm px-3 py-2 focus:outline-none focus:border-indigo-500 text-white font-mono uppercase"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 border-t border-gray-800 bg-gray-950/50 flex justify-end">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}