import React, { useEffect, useState, useRef } from 'react';
import { LandmarkData } from '../types';

interface ARViewProps {
  imageSrc: string;
  data: LandmarkData;
  audioBuffer: AudioBuffer;
  onReset: () => void;
}

export const ARView: React.FC<ARViewProps> = ({ imageSrc, data, audioBuffer, onReset }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  // Auto-reveal info after a moment
  useEffect(() => {
    const t = setTimeout(() => setShowInfo(true), 500);
    return () => clearTimeout(t);
  }, []);

  const playAudio = () => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = audioContextRef.current;
    
    // If context is suspended (browser policy), resume it
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    
    // Start from where we left off
    const offset = pausedAtRef.current % audioBuffer.duration;
    source.start(0, offset);
    startTimeRef.current = ctx.currentTime - offset;

    source.onended = () => {
        // Only reset if we reached the end naturally, not if stopped manually
        if (ctx.currentTime - startTimeRef.current >= audioBuffer.duration) {
             setIsPlaying(false);
             pausedAtRef.current = 0;
        }
    };

    sourceNodeRef.current = source;
    setIsPlaying(true);
  };

  const pauseAudio = () => {
    if (sourceNodeRef.current && audioContextRef.current) {
        sourceNodeRef.current.stop();
        pausedAtRef.current = audioContextRef.current.currentTime - startTimeRef.current;
        sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const toggleAudio = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="relative h-full w-full bg-black overflow-hidden flex flex-col">
      {/* Background Image - The "AR" View */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 transition-transform duration-700 ease-out"
        style={{ backgroundImage: `url(${imageSrc})` }}
      />
      
      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10 pointer-events-none" />

      {/* Top Controls */}
      <div className="relative z-20 p-6 flex justify-between items-start">
        <button 
          onClick={onReset}
          className="bg-black/30 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-semibold border border-white/20 hover:bg-white/20 transition-all"
        >
          ← New Scan
        </button>
      </div>

      {/* Bottom Info Card */}
      <div className={`relative z-20 mt-auto p-6 transition-all duration-700 transform ${showInfo ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl text-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1 text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white">
                {data.name}
              </h1>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                <span className="text-xs uppercase tracking-widest text-green-400 font-semibold">Live Knowledge</span>
              </div>
            </div>
            
            <button 
              onClick={toggleAudio}
              className="flex-shrink-0 w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/20"
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
              ) : (
                <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>
          </div>

          <p className="text-gray-200 leading-relaxed text-lg mb-6">
            {data.description}
          </p>

          {data.sources.length > 0 && (
            <div className="border-t border-white/10 pt-4">
              <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">Sources</p>
              <div className="flex flex-wrap gap-2">
                {data.sources.slice(0, 3).map((source, i) => (
                  <a 
                    key={i} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs bg-white/10 hover:bg-white/20 text-blue-200 px-3 py-1.5 rounded-lg transition-colors truncate max-w-[150px]"
                  >
                    {source.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
