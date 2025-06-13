import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2 } from "lucide-react";

interface PitchEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  pitch: {
    id: number;
    userId: number;
    content: string;
    opportunityId: number;
    status: string;
    opportunity?: {
      title: string;
      outlet?: string;
    };
  };
}

export default function DarkPitchEditModal({ isOpen, onClose, pitch }: PitchEditModalProps) {
  const [content, setContent] = useState(pitch.content);
  const { toast } = useToast();

  // Ensure we can only edit pitches with 'pending' status or 'draft' status
  const canEdit = pitch.status === 'pending' || pitch.status === 'draft';

  const updateMutation = useMutation({
    mutationFn: async () => {
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        throw new Error("Pitch content cannot be empty");
      }
      
      console.log(`Updating pitch ${pitch.id} with content length: ${trimmedContent.length}`);
      
      const res = await apiRequest("PATCH", `/api/pitches/${pitch.id}`, { content: trimmedContent });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${pitch.userId}/pitches`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${pitch.userId}/drafts`] });
      toast({
        title: "Pitch updated",
        description: "Your pitch has been updated successfully.",
      });
      onClose();
    },
    onError: (error: Error) => {
      console.error("Error updating pitch:", error);
      toast({
        title: "Failed to update pitch",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        throw new Error("Pitch content cannot be empty");
      }
      
      const endpoint = `/api/pitches/${pitch.id}`;
      const data = { content: trimmedContent };
      
      console.log(`Updating pitch ${pitch.id} with content length: ${trimmedContent.length}`);
      
      const res = await apiRequest("PATCH", endpoint, data);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${pitch.userId}/pitches`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${pitch.userId}/drafts`] });
      toast({
        title: "Pitch updated",
        description: "Your pitch has been updated successfully.",
      });
      onClose();
    },
    onError: (error: Error) => {
      console.error("Error updating pitch:", error);
      toast({
        title: "Failed to update pitch",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdate = () => {
    if (!canEdit) {
      toast({
        title: "Cannot edit pitch",
        description: "This pitch can no longer be edited because it has already been sent to the reporter.",
        variant: "destructive",
      });
      return;
    }
    
    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please enter your pitch content before saving.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate();
  };

  const handleSubmit = async () => {
    if (!canEdit) {
      toast({
        title: "Cannot update pitch",
        description: "This pitch can no longer be edited because it has already been sent to the reporter.",
        variant: "destructive",
      });
      return;
    }
    
    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please enter your pitch content before resubmitting.",
        variant: "destructive",
      });
      return;
    }

    submitMutation.mutate();
  };

  const isLoading = updateMutation.isPending || submitMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-800/95 backdrop-blur-sm border-slate-700/50 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">
            Resubmit Pitch for {pitch.opportunity?.title}
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Update your pitch content before resubmitting it to the reporter
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2 text-gray-200">Opportunity</h3>
            <div className="p-3 bg-slate-700/50 rounded-md border border-slate-600/50">
              <h4 className="font-medium text-white">{pitch.opportunity?.title}</h4>
              {pitch.opportunity?.outlet && (
                <p className="text-sm text-gray-300 mt-1">{pitch.opportunity.outlet}</p>
              )}
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2 text-gray-200">Your Pitch</h3>
            {!canEdit && (
              <div className="p-2 mb-2 bg-yellow-900/30 text-yellow-300 text-sm rounded flex items-center border border-yellow-700/50">
                <AlertTriangle className="h-4 w-4 mr-2" />
                This pitch cannot be edited because it has already been sent to the reporter.
              </div>
            )}
            <Textarea 
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              placeholder="Enter your pitch details here..."
              className="min-h-[200px] bg-slate-700/50 border-slate-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading || !canEdit}
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between space-x-2">
          <div className="flex-1">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={isLoading}
              className="border-slate-600 bg-slate-800/50 text-gray-300 hover:bg-slate-700 hover:text-white backdrop-blur-sm"
            >
              Cancel
            </Button>
          </div>
          <div className="flex space-x-2">
            {canEdit ? (
              <>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isLoading} 
                  variant="default"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resubmitting...
                    </>
                  ) : (
                    "Resubmit Pitch"
                  )}
                </Button>
              </>
            ) : (
              <Button 
                variant="secondary" 
                disabled
                className="bg-slate-700/50 text-gray-400 border-slate-600"
              >
                Cannot Edit (Already Sent)
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 