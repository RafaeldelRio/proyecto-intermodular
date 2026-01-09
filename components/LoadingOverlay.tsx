import React from 'react';
import { AnalysisStage } from '../types';

interface LoadingOverlayProps {
  stages: AnalysisStage[];
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ stages }) => {
  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 transition-all duration-500">
      <div className="w-full max-w-sm space-y-6">
        <h2 className="text-2xl font-bold text-center text-white mb-8 tracking-tight">
          Exploring...
        </h2>
        
        {stages.map((stage, idx) => (
          <div key={idx} className={`flex items-center space-x-4 transition-opacity duration-500 ${stage.active || stage.completed ? 'opacity-100' : 'opacity-30'}`}>
            <div className="relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                ${stage.completed ? 'bg-emerald-500 border-emerald-500' : 
                  stage.active ? 'border-blue-400 animate-pulse' : 'border-gray-600'}`}>
                {stage.completed ? (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <div className={`w-2 h-2 rounded-full ${stage.active ? 'bg-blue-400' : 'bg-gray-600'}`} />
                )}
              </div>
              {stage.active && !stage.completed && (
                 <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-75"></div>
              )}
            </div>
            <span className={`text-lg font-medium ${stage.active ? 'text-blue-200' : 'text-gray-400'}`}>
              {stage.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
