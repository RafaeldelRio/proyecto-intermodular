import React, { useState } from 'react';
import { identifyLandmark, getLandmarkDetails, generateNarration, fileToGenerativePart } from './services/geminiService';
import { AppState, AnalysisStage } from './types';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ARView } from './components/ARView';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    status: 'idle',
    imageSrc: null,
    landmarkData: null,
    audioBuffer: null,
  });

  const [stages, setStages] = useState<AnalysisStage[]>([
    { label: 'Analyzing visual features...', active: false, completed: false },
    { label: 'Consulting knowledge base...', active: false, completed: false },
    { label: 'Synthesizing guide narration...', active: false, completed: false },
  ]);

  const updateStage = (index: number, update: Partial<AnalysisStage>) => {
    setStages(prev => prev.map((s, i) => i === index ? { ...s, ...update } : s));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset state
    setState({
      status: 'analyzing',
      imageSrc: URL.createObjectURL(file),
      landmarkData: null,
      audioBuffer: null,
    });

    // Reset stages
    setStages([
      { label: 'Analyzing visual features...', active: true, completed: false },
      { label: 'Consulting knowledge base...', active: false, completed: false },
      { label: 'Synthesizing guide narration...', active: false, completed: false },
    ]);

    try {
      // 1. Convert to base64
      const base64 = await fileToGenerativePart(file);

      // 2. Identify
      const landmarkName = await identifyLandmark(base64);
      if (landmarkName === "Unknown") {
        throw new Error("Could not identify a landmark in this image.");
      }
      updateStage(0, { completed: true, active: false });
      updateStage(1, { active: true });

      // 3. Search Details
      const details = await getLandmarkDetails(landmarkName);
      updateStage(1, { completed: true, active: false });
      updateStage(2, { active: true });

      // 4. Generate Speech
      const audio = await generateNarration(details.description);
      updateStage(2, { completed: true, active: false });

      setState(prev => ({
        ...prev,
        status: 'ready',
        landmarkData: details,
        audioBuffer: audio
      }));

    } catch (error: any) {
      console.error(error);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error.message || "An unexpected error occurred."
      }));
    }
  };

  const resetApp = () => {
    setState({
      status: 'idle',
      imageSrc: null,
      landmarkData: null,
      audioBuffer: null,
    });
  };

  return (
    <div className="h-screen w-screen bg-black text-white relative flex flex-col items-center justify-center overflow-hidden">
      
      {state.status === 'idle' && (
        <div className="flex flex-col items-center p-8 text-center space-y-8 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 blur-[60px] opacity-20 rounded-full animate-pulse"></div>
            <h1 className="relative text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 tracking-tighter">
              CityLens
            </h1>
          </div>
          
          <p className="text-gray-400 max-w-xs text-lg font-light leading-relaxed">
            Point your camera at any landmark to reveal its hidden history.
          </p>
          
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-200"></div>
            <label className="relative flex items-center justify-center w-64 h-16 bg-black rounded-full border border-gray-800 cursor-pointer hover:bg-gray-900 transition-colors">
              <span className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-lg font-medium">Start Scanning</span>
              </span>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                className="hidden" 
                onChange={handleFileSelect}
              />
            </label>
          </div>
        </div>
      )}

      {(state.status === 'analyzing' || state.status === 'searching' || state.status === 'narrating') && (
        <>
            {state.imageSrc && (
                <div 
                    className="absolute inset-0 bg-cover bg-center blur-sm scale-110"
                    style={{ backgroundImage: `url(${state.imageSrc})` }}
                />
            )}
            <LoadingOverlay stages={stages} />
        </>
      )}

      {state.status === 'ready' && state.imageSrc && state.landmarkData && state.audioBuffer && (
        <ARView 
          imageSrc={state.imageSrc}
          data={state.landmarkData}
          audioBuffer={state.audioBuffer}
          onReset={resetApp}
        />
      )}

      {state.status === 'error' && (
        <div className="relative z-50 p-8 max-w-sm w-full bg-gray-900 border border-red-500/30 rounded-2xl shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
          <h2 className="text-xl font-bold text-white mb-2">Scan Failed</h2>
          <p className="text-gray-400 mb-6">{state.error}</p>
          <button 
            onClick={resetApp}
            className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
