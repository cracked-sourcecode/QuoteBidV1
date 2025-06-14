import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
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

export default function PitchEditModal({ isOpen, onClose, pitch }: PitchEditModalProps) {
  const [content, setContent] = useState(pitch.content);
  const { toast } = useToast();
  const [location] = useLocation();

  // Detect if we're in dark theme based on the current route
  const isDarkTheme = location.includes('/dark/') || location.includes('dark');

  // Ensure we can only edit pitches with 'pending' status or 'draft' status
  // CRITICAL FIX: Allow editing of both draft and pending pitches
  const canEdit = pitch.status === 'pending' || pitch.status === 'draft';

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Validate content before sending
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
      // Validate content before sending
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        throw new Error("Pitch content cannot be empty");
      }
      
      // Always use the standard pitch update endpoint
      // Both draft and pending pitches can be updated using the same endpoint
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

    // Simply update the content with the submitMutation
    // This keeps the pitch in pending status while updating the content
    submitMutation.mutate();
  };

  const isLoading = updateMutation.isPending || submitMutation.isPending;

    // Theme-aware classes with mobile optimization
  const dialogClasses = isDarkTheme 
    ? "w-[95vw] sm:w-full max-w-md sm:max-w-3xl h-[90vh] sm:max-h-[90vh] overflow-hidden bg-slate-800/95 backdrop-blur-sm border-slate-700/50 text-white" 
    : "w-[95vw] sm:w-full max-w-md sm:max-w-3xl h-[90vh] sm:max-h-[90vh] overflow-hidden";
    
    const titleClasses = isDarkTheme 
    ? "text-base sm:text-xl font-semibold text-white leading-tight" 
    : "text-base sm:text-xl font-semibold leading-tight";
    
  const descriptionClasses = isDarkTheme 
    ? "text-gray-300 text-sm mt-2" 
    : "text-sm mt-2";
    
  const cardClasses = isDarkTheme 
    ? "p-3 bg-slate-700/50 rounded-md border border-slate-600/50" 
    : "p-3 bg-muted rounded-md";
    
  const labelClasses = isDarkTheme 
    ? "text-sm font-medium mb-2 text-gray-200" 
    : "text-sm font-medium mb-2";
    
  const titleTextClasses = isDarkTheme 
    ? "font-medium text-white text-sm sm:text-base" 
    : "font-medium text-sm sm:text-base";
    
  const subtitleClasses = isDarkTheme 
    ? "text-xs sm:text-sm text-gray-300 mt-1" 
    : "text-xs sm:text-sm text-muted-foreground mt-1";
    
  const warningClasses = isDarkTheme 
    ? "p-2 mb-2 bg-yellow-900/30 text-yellow-300 text-xs sm:text-sm rounded flex items-center border border-yellow-700/50" 
    : "p-2 mb-2 bg-yellow-50 text-yellow-700 text-xs sm:text-sm rounded flex items-center";
    
  const textareaClasses = isDarkTheme 
    ? "min-h-[150px] sm:min-h-[200px] bg-slate-700/50 border-slate-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 text-sm" 
    : "min-h-[150px] sm:min-h-[200px] text-sm";

      return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={dialogClasses}>
        <div className="flex flex-col h-full">
          <DialogHeader className="flex-shrink-0 pb-4 border-b">
            <DialogTitle className={titleClasses}>
              Edit Pitch
            </DialogTitle>
            <DialogDescription className={descriptionClasses}>
              Update your pitch content
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div>
              <h3 className={labelClasses}>Opportunity</h3>
              <div className={cardClasses}>
                <h4 className={titleTextClasses}>{pitch.opportunity?.title}</h4>
                {pitch.opportunity?.outlet && (
                  <p className={subtitleClasses}>{pitch.opportunity.outlet}</p>
                )}
              </div>
            </div>
            
            <div>
              <h3 className={labelClasses}>Your Pitch</h3>
              {!canEdit && (
                <div className={warningClasses}>
                  <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>This pitch cannot be edited because it has already been sent to the reporter.</span>
                </div>
              )}
              <Textarea 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
                placeholder="Enter your pitch details here..."
                className={textareaClasses}
                disabled={isLoading || !canEdit}
              />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 flex flex-col space-y-3 pt-4 border-t">
            {canEdit ? (
              <>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isLoading} 
                  variant="default"
                  size="lg"
                  className={`w-full ${isDarkTheme ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white" : ""}`}
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating Pitch...
                    </>
                  ) : (
                    "Update Pitch"
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onClose} 
                  disabled={isLoading}
                  size="lg"
                  className={`w-full ${isDarkTheme ? "border-slate-600 bg-slate-800/50 text-gray-300 hover:bg-slate-700 hover:text-white backdrop-blur-sm" : ""}`}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="secondary" 
                  disabled
                  size="lg"
                  className={`w-full ${isDarkTheme ? "bg-slate-700/50 text-gray-400 border-slate-600" : ""}`}
                >
                  Cannot Edit (Already Sent)
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onClose} 
                  size="lg"
                  className={`w-full ${isDarkTheme ? "border-slate-600 bg-slate-800/50 text-gray-300 hover:bg-slate-700 hover:text-white backdrop-blur-sm" : ""}`}
                >
                  Close
                </Button>
              </>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}