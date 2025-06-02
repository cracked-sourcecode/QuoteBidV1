import { useState, useRef, useEffect } from "react";

interface RecorderOptions {
  maxTimeInSeconds?: number;
  mimeType?: string;
  audioBitsPerSecond?: number;
  sampleRate?: number;
}

interface RecorderState {
  audioURL: string | null;
  isRecording: boolean;
  recordingTime: number;
  recordingBlob: Blob | null;
  isProcessing: boolean;
  error: string | null;
  audioLevel?: number;
}

export function useRecorder({ 
  maxTimeInSeconds = 120, 
  mimeType = 'audio/webm;codecs=opus',
  audioBitsPerSecond = 128000,
  sampleRate = 48000
}: RecorderOptions = {}) {
  const [recorderState, setRecorderState] = useState<RecorderState>({
    audioURL: null,
    isRecording: false,
    recordingTime: 0,
    recordingBlob: null,
    isProcessing: false,
    error: null,
    audioLevel: 0
  });

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timeInterval = useRef<number | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const dataArray = useRef<Uint8Array | null>(null);
  const animationFrame = useRef<number | null>(null);

  const initializeRecorder = async () => {
    try {
      console.log('[Recorder] Initializing recorder...');
      setRecorderState(prev => ({ ...prev, isProcessing: true, error: null }));
      
      console.log('[Recorder] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: sampleRate,
          channelCount: 1
        } 
      });
      
      console.log('[Recorder] Microphone access granted, stream:', stream);
      console.log('[Recorder] Audio tracks:', stream.getAudioTracks());
      mediaStream.current = stream;
      
      console.log('[Recorder] Creating audio context...');
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.current.createMediaStreamSource(stream);
      analyser.current = audioContext.current.createAnalyser();
      analyser.current.fftSize = 256;
      const bufferLength = analyser.current.frequencyBinCount;
      dataArray.current = new Uint8Array(bufferLength);
      source.connect(analyser.current);
      
      let selectedMimeType = mimeType;
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav'
      ];
      
      console.log('[Recorder] Checking supported MIME types...');
      for (const type of supportedTypes) {
        const isSupported = MediaRecorder.isTypeSupported(type);
        console.log(`[Recorder] ${type}: ${isSupported ? 'supported' : 'not supported'}`);
        if (isSupported) {
          selectedMimeType = type;
          break;
        }
      }
      
      console.log('[Recorder] Using MIME type:', selectedMimeType);
      
      const recorder = new MediaRecorder(stream, { 
        mimeType: selectedMimeType,
        audioBitsPerSecond: audioBitsPerSecond
      });
      
      mediaRecorder.current = recorder;
      
      recorder.addEventListener("dataavailable", handleDataAvailable);
      recorder.addEventListener("stop", handleRecordingStop);
      recorder.addEventListener("error", handleRecordingError);
      
      setRecorderState(prev => ({ 
        ...prev, 
        isProcessing: false,
        error: null
      }));
      
      console.log('[Recorder] Initialized successfully with enhanced settings');
    } catch (err) {
      console.error("Error initializing recorder:", err);
      let errorMessage = "Microphone access error";
      
      if (err instanceof Error) {
        console.log('[Recorder] Error name:', err.name);
        console.log('[Recorder] Error message:', err.message);
        if (err.name === 'NotAllowedError') {
          errorMessage = "Microphone access denied. Please allow microphone permissions and try again.";
        } else if (err.name === 'NotFoundError') {
          errorMessage = "No microphone found. Please connect a microphone and try again.";
        } else if (err.name === 'NotSupportedError') {
          errorMessage = "Your browser doesn't support audio recording. Please try a different browser.";
        } else {
          errorMessage = `Microphone error: ${err.message}`;
        }
      }
      
      setRecorderState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: errorMessage
      }));
    }
  };

  const handleDataAvailable = (event: BlobEvent) => {
    if (event.data.size > 0) {
      audioChunks.current.push(event.data);
      console.log('[Recorder] Audio chunk received:', event.data.size, 'bytes');
    }
  };

  const handleRecordingError = (event: Event) => {
    console.error('[Recorder] Recording error:', event);
    setRecorderState(prev => ({ 
      ...prev, 
      error: "Recording error occurred. Please try again.",
      isRecording: false
    }));
  };

  const handleRecordingStop = () => {
    console.log('[Recorder] Recording stopped, processing audio...');
    
    const audioBlob = new Blob(audioChunks.current, { 
      type: mediaRecorder.current?.mimeType || 'audio/webm' 
    });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    console.log('[Recorder] Audio blob created:', audioBlob.size, 'bytes');
    
    setRecorderState(prev => ({
      ...prev,
      audioURL: audioUrl,
      recordingBlob: audioBlob,
      isRecording: false,
      audioLevel: 0
    }));
    
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
  };

  const monitorAudioLevel = () => {
    if (!analyser.current || !dataArray.current) return;
    
    analyser.current.getByteFrequencyData(dataArray.current);
    
    let sum = 0;
    for (let i = 0; i < dataArray.current.length; i++) {
      sum += dataArray.current[i];
    }
    const average = sum / dataArray.current.length;
    const audioLevel = Math.round((average / 255) * 100);
    
    setRecorderState(prev => ({ ...prev, audioLevel }));
    
    if (recorderState.isRecording) {
      animationFrame.current = requestAnimationFrame(monitorAudioLevel);
    }
  };

  const startTimer = () => {
    clearInterval(timeInterval.current || undefined);
    setRecorderState(prev => ({ ...prev, recordingTime: 0 }));
    
    timeInterval.current = window.setInterval(() => {
      setRecorderState(prev => {
        const newTime = prev.recordingTime + 1;
        
        if (newTime >= maxTimeInSeconds) {
          console.log('[Recorder] Max recording time reached, stopping...');
          stopRecording();
          return { ...prev, recordingTime: maxTimeInSeconds };
        }
        
        return { ...prev, recordingTime: newTime };
      });
    }, 1000);
  };

  const startRecording = async () => {
    if (recorderState.isRecording) return;
    
    console.log('[Recorder] Starting recording...');
    console.log('[Recorder] Current recorder state:', recorderState);
    
    if (!mediaRecorder.current) {
      console.log('[Recorder] MediaRecorder not initialized, initializing...');
      await initializeRecorder();
    }
    
    if (mediaRecorder.current && mediaRecorder.current.state !== "recording") {
      try {
        audioChunks.current = [];
        setRecorderState(prev => ({ 
          ...prev, 
          isRecording: true, 
          audioURL: null,
          recordingBlob: null,
          recordingTime: 0,
          error: null
        }));
        
        console.log('[Recorder] Starting MediaRecorder...');
        mediaRecorder.current.start(100);
        startTimer();
        
        monitorAudioLevel();
        
        console.log('[Recorder] Recording started successfully');
      } catch (err) {
        console.error("Error starting recording:", err);
        setRecorderState(prev => ({ 
          ...prev, 
          error: `Recording error: ${err instanceof Error ? err.message : String(err)}`
        }));
      }
    } else {
      console.log('[Recorder] MediaRecorder state:', mediaRecorder.current?.state);
    }
  };

  const stopRecording = () => {
    console.log('[Recorder] Stopping recording...');
    
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.stop();
      clearInterval(timeInterval.current || undefined);
      
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
    }
  };

  const cancelRecording = () => {
    console.log('[Recorder] Cancelling recording...');
    
    stopRecording();
    
    if (recorderState.audioURL) {
      URL.revokeObjectURL(recorderState.audioURL);
    }
    
    setRecorderState({
      audioURL: null,
      isRecording: false,
      recordingTime: 0,
      recordingBlob: null,
      isProcessing: false,
      error: null,
      audioLevel: 0
    });
  };

  useEffect(() => {
    return () => {
      console.log('[Recorder] Cleaning up resources...');
      
      if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
        mediaRecorder.current.stop();
      }
      
      if (mediaStream.current) {
        mediaStream.current.getTracks().forEach(track => track.stop());
      }
      
      if (audioContext.current) {
        audioContext.current.close();
      }
      
      if (timeInterval.current) {
        clearInterval(timeInterval.current);
      }
      
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
      
      if (recorderState.audioURL) {
        URL.revokeObjectURL(recorderState.audioURL);
      }
    };
  }, [recorderState.audioURL]);

  return {
    audioURL: recorderState.audioURL,
    isRecording: recorderState.isRecording,
    recordingTime: recorderState.recordingTime,
    recordingBlob: recorderState.recordingBlob,
    isProcessing: recorderState.isProcessing,
    error: recorderState.error,
    audioLevel: recorderState.audioLevel || 0,
    startRecording,
    stopRecording,
    cancelRecording
  };
}
