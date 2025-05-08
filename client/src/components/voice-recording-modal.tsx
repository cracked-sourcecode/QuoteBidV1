import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { OpportunityWithPublication } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useRecorder } from "@/hooks/use-recorder";

interface VoiceRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: OpportunityWithPublication;
}

export default function VoiceRecordingModal({
  isOpen,
  onClose,
  opportunity
}: VoiceRecordingModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Voice recorder state and handlers
  const {
    audioURL,
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    recordingBlob,
    isProcessing
  } = useRecorder({ maxTimeInSeconds: 120 });

  const [transcript, setTranscript] = useState<string>("");
  const [isEditing, setIsEditing] = useState<false>();

  // Process the recording to get transcript
  const processRecording = useMutation({
    mutationFn: async () => {
      if (!recordingBlob) {
        throw new Error("No recording available");
      }

      const reader = new FileReader();
      const audioBase64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1]; // Remove the data URL prefix
          resolve(base64Data);
        };
        reader.readAsDataURL(recordingBlob);
      });

      const audioBase64 = await audioBase64Promise;
      const response = await apiRequest("POST", "/api/pitches/voice", { audio: audioBase64 });
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      setTranscript(data.text);
      toast({
        title: "Recording processed",
        description: "Your recording has been transcribed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process the recording. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Submit the pitch with audio and transcript
  const submitPitch = useMutation({
    mutationFn: async () => {
      if (!recordingBlob || !transcript) {
        throw new Error("Recording and transcript are required");
      }

      const formData = new FormData();
      formData.append('audio', recordingBlob);
      
      // In a real app, we would upload the audio file to a storage service
      // For this prototype, we'll simulate it
      
      return apiRequest("POST", "/api/pitches", {
        opportunityId: opportunity.id,
        userId: 1, // In a real app, this would be the logged-in user's ID
        transcript: transcript,
        audioUrl: audioURL || "",
        status: "pending"
      });
    },
    onSuccess: () => {
      toast({
        title: "Pitch submitted",
        description: "Your pitch has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/opportunities/${opportunity.id}/pitches`] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit pitch. Please try again.",
        variant: "destructive"
      });
    }
  });

  // When recording stops, process it to get transcript
  useEffect(() => {
    if (recordingBlob && !isRecording && !transcript) {
      processRecording.mutate();
    }
  }, [recordingBlob, isRecording]);

  // Format recording time
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Your Pitch</DialogTitle>
          <DialogDescription>
            Record a voice pitch for {opportunity.publication.name} about {opportunity.title}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-6 text-center">
          <div className="w-24 h-24 mx-auto bg-qpurple bg-opacity-10 rounded-full flex items-center justify-center mb-3">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-10 w-10 text-qpurple" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
              />
            </svg>
          </div>
          <div className="text-sm text-gray-600 mb-2">
            Recording Time: <span className="font-medium">{formatTime(recordingTime)}</span>
          </div>
          <div className="flex justify-center space-x-3">
            {isRecording ? (
              <Button 
                onClick={stopRecording}
                className="px-4 py-2 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" 
                  />
                </svg>
              </Button>
            ) : (
              <Button 
                onClick={startRecording}
                disabled={!!audioURL || isProcessing}
                className="px-4 py-2 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-qpurple hover:bg-qpurple-dark"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" 
                  />
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </Button>
            )}
          </div>
          
          {audioURL && (
            <div className="mt-3">
              <audio controls src={audioURL} className="w-full"></audio>
            </div>
          )}
          
          {isProcessing && (
            <div className="mt-3 text-sm text-gray-600">
              Processing your recording...
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Transcript</label>
          <div className="relative">
            <Textarea
              rows={6}
              className="shadow-sm focus:ring-qpurple focus:border-qpurple block w-full sm:text-sm border-gray-300 rounded-md resize-none"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              disabled={isProcessing || processRecording.isPending}
            />
            <div className="absolute top-2 right-2">
              <button 
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                onClick={() => setIsEditing(!isEditing)}
                disabled={isProcessing || processRecording.isPending}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" 
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            <span>You can record up to <span className="font-medium">2 minutes</span></span>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose} className="mt-2 sm:mt-0">
            Cancel
          </Button>
          <Button 
            onClick={() => submitPitch.mutate()}
            disabled={!audioURL || !transcript || isProcessing || processRecording.isPending || submitPitch.isPending}
            className="bg-qpurple hover:bg-qpurple/90"
          >
            {submitPitch.isPending ? "Sending..." : "Send Pitch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
