import { useState, useRef, useEffect } from "react";

interface RecorderOptions {
  maxTimeInSeconds?: number;
  mimeType?: string;
}

interface RecorderState {
  audioURL: string | null;
  isRecording: boolean;
  recordingTime: number;
  recordingBlob: Blob | null;
  isProcessing: boolean;
  error: string | null;
}

export function useRecorder({ maxTimeInSeconds = 120, mimeType = 'audio/webm' }: RecorderOptions = {}) {
  const [recorderState, setRecorderState] = useState<RecorderState>({
    audioURL: null,
    isRecording: false,
    recordingTime: 0,
    recordingBlob: null,
    isProcessing: false,
    error: null
  });

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timeInterval = useRef<number | null>(null);

  // Initialize media recorder
  const initializeRecorder = async () => {
    try {
      setRecorderState(prev => ({ ...prev, isProcessing: true, error: null }));
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStream.current = stream;
      
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.current = recorder;
      
      recorder.addEventListener("dataavailable", handleDataAvailable);
      recorder.addEventListener("stop", handleRecordingStop);
      
      setRecorderState(prev => ({ 
        ...prev, 
        isProcessing: false,
        error: null
      }));
    } catch (err) {
      console.error("Error initializing recorder:", err);
      setRecorderState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: `Microphone access error: ${err instanceof Error ? err.message : String(err)}`
      }));
    }
  };

  // Handle data chunks as they become available
  const handleDataAvailable = (event: BlobEvent) => {
    if (event.data.size > 0) {
      audioChunks.current.push(event.data);
    }
  };

  // Process recorded audio when recording stops
  const handleRecordingStop = () => {
    const audioBlob = new Blob(audioChunks.current, { type: mimeType });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    setRecorderState(prev => ({
      ...prev,
      audioURL: audioUrl,
      recordingBlob: audioBlob,
      isRecording: false
    }));
  };

  // Timer to track recording duration
  const startTimer = () => {
    clearInterval(timeInterval.current || undefined);
    setRecorderState(prev => ({ ...prev, recordingTime: 0 }));
    
    timeInterval.current = window.setInterval(() => {
      setRecorderState(prev => {
        if (prev.recordingTime >= maxTimeInSeconds) {
          stopRecording();
          return prev;
        }
        return { ...prev, recordingTime: prev.recordingTime + 1 };
      });
    }, 1000);
  };

  // Start recording
  const startRecording = async () => {
    if (recorderState.isRecording) return;
    if (!mediaRecorder.current) {
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
          recordingTime: 0
        }));
        
        mediaRecorder.current.start();
        startTimer();
      } catch (err) {
        console.error("Error starting recording:", err);
        setRecorderState(prev => ({ 
          ...prev, 
          error: `Recording error: ${err instanceof Error ? err.message : String(err)}`
        }));
      }
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.stop();
      clearInterval(timeInterval.current || undefined);
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    stopRecording();
    setRecorderState({
      audioURL: null,
      isRecording: false,
      recordingTime: 0,
      recordingBlob: null,
      isProcessing: false,
      error: null
    });
  };

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      // Stop the media recorder if it's recording
      if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
        mediaRecorder.current.stop();
      }
      
      // Stop all media stream tracks
      if (mediaStream.current) {
        mediaStream.current.getTracks().forEach(track => track.stop());
      }
      
      // Clear the timer
      if (timeInterval.current) {
        clearInterval(timeInterval.current);
      }
      
      // Revoke any object URLs to avoid memory leaks
      if (recorderState.audioURL) {
        URL.revokeObjectURL(recorderState.audioURL);
      }
    };
  }, [recorderState.audioURL]);

  // Return the recorder state and controls
  return {
    audioURL: recorderState.audioURL,
    isRecording: recorderState.isRecording,
    recordingTime: recorderState.recordingTime,
    recordingBlob: recorderState.recordingBlob,
    isProcessing: recorderState.isProcessing,
    error: recorderState.error,
    startRecording,
    stopRecording,
    cancelRecording
  };
}
