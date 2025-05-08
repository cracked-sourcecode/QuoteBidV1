import { useState, useRef, useEffect } from 'react';

interface UseRecorderProps {
  maxTimeInSeconds?: number;
}

export function useRecorder({ maxTimeInSeconds = 60 }: UseRecorderProps = {}) {
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  
  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording, audioURL]);
  
  // Start recording audio
  const startRecording = async () => {
    try {
      // Reset state
      setAudioURL(null);
      setRecordingTime(0);
      setRecordingBlob(null);
      audioChunksRef.current = [];
      
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create media recorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      // Set up recording timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(time => {
          if (time >= maxTimeInSeconds - 1) {
            if (mediaRecorderRef.current && isRecording) {
              mediaRecorderRef.current.stop();
            }
            if (timerRef.current) {
              window.clearInterval(timerRef.current);
            }
            return maxTimeInSeconds;
          }
          return time + 1;
        });
      }, 1000);
      
      // Handle data available event
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop event
      mediaRecorderRef.current.onstop = () => {
        // Clear timer
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        // Create blob from chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordingBlob(audioBlob);
        
        // Create URL for audio playback
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        
        // Update recording state
        setIsRecording(false);
        setIsProcessing(true);
        
        // Stop all tracks of the stream
        stream.getTracks().forEach(track => track.stop());
        
        // Set processing to false after a small delay
        // This would typically be where you'd send the audio for processing
        setTimeout(() => {
          setIsProcessing(false);
        }, 500);
      };
      
      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions and try again.');
    }
  };
  
  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };
  
  return {
    audioURL,
    isRecording,
    recordingTime,
    recordingBlob,
    isProcessing,
    startRecording,
    stopRecording
  };
}