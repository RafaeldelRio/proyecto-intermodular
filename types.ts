export interface LandmarkData {
  name: string;
  description: string;
  sources: Array<{
    title: string;
    uri: string;
  }>;
}

export interface AppState {
  status: 'idle' | 'analyzing' | 'searching' | 'narrating' | 'ready' | 'error';
  imageSrc: string | null;
  landmarkData: LandmarkData | null;
  audioBuffer: AudioBuffer | null;
  error?: string;
}

export interface AnalysisStage {
  label: string;
  active: boolean;
  completed: boolean;
}
