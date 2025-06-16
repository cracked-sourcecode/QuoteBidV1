import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { AlertTriangle, Loader2, FileText, Building } from "lucide-react";

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`w-[95vw] max-w-2xl rounded-2xl ${
        isDarkTheme 
          ? "bg-slate-800/95 backdrop-blur-sm border-slate-700/50 text-white" 
          : "bg-white border-gray-200"
      } max-h-[85vh] overflow-hidden`}>
        <div className="flex flex-col max-h-[85vh]">
          <DialogHeader className="space-y-2 sm:space-y-3 flex-shrink-0">
            <DialogTitle className={`text-lg sm:text-xl font-semibold flex items-center gap-2 ${
              isDarkTheme ? "text-white" : "text-gray-900"
            }`}>
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              Edit Pitch
            </DialogTitle>
            <DialogDescription className={`text-sm ${
              isDarkTheme ? "text-gray-300" : "text-gray-600"
            }`}>
              Update your pitch content for this opportunity
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0">
            {/* Opportunity Info - Mobile Optimized */}
            <div className={`p-3 sm:p-4 rounded-lg border ${
              isDarkTheme 
                ? "bg-slate-700/50 border-slate-600/50" 
                : "bg-gray-50 border-gray-200"
            }`}>
              <div className="flex items-start gap-2 sm:gap-3">
                <Building className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                  isDarkTheme ? "text-blue-400" : "text-blue-600"
                }`} />
                <div className="min-w-0 flex-1">
                  <h4 className={`font-medium text-sm leading-tight ${
                    isDarkTheme ? "text-white" : "text-gray-900"
                  }`}>
                    {pitch.opportunity?.title}
                  </h4>
                  {pitch.opportunity?.outlet && (
                    <p className={`text-xs mt-1 ${
                      isDarkTheme ? "text-gray-300" : "text-gray-600"
                    }`}>
                      {pitch.opportunity.outlet}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Pitch Content - Mobile Optimized */}
            <div className="space-y-2">
              <label className={`text-sm font-medium ${
                isDarkTheme ? "text-gray-200" : "text-gray-700"
              }`}>
                Your Pitch
              </label>
              
              {!canEdit && (
                <div className={`p-3 rounded-lg flex items-start gap-2 text-sm ${
                  isDarkTheme 
                    ? "bg-yellow-900/30 text-yellow-300 border border-yellow-700/50" 
                    : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                }`}>
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>This pitch cannot be edited because it has already been sent to the reporter.</span>
                </div>
              )}
              
              <Textarea 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
                placeholder="Enter your pitch details here..."
                className={`min-h-[100px] sm:min-h-[120px] resize-none text-sm sm:text-base outline-none focus:outline-none ring-0 focus:ring-2 focus:ring-blue-500 shadow-none focus:shadow-none border-2 ${
                  isDarkTheme 
                    ? "bg-slate-700/50 border-slate-600 text-white placeholder-gray-400 focus:border-blue-500" 
                    : "bg-white border-gray-300 focus:border-blue-500"
                }`}
                disabled={isLoading || !canEdit}
                style={{ outline: 'none', boxShadow: 'none' }}
              />
              
              <div className={`text-xs ${
                isDarkTheme ? "text-gray-400" : "text-gray-500"
              }`}>
                {content.length} characters
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 pt-4 border-t border-opacity-20">
            {/* Mobile: Stack buttons vertically, Desktop: Side by side */}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button 
                variant="outline" 
                onClick={onClose} 
                disabled={isLoading}
                className={`flex-1 h-11 ${
                  isDarkTheme 
                    ? "border-slate-600 bg-slate-800/50 text-gray-300 hover:bg-slate-700 hover:text-white" 
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                Cancel
              </Button>
              
              {canEdit ? (
                <Button 
                  onClick={handleSubmit} 
                  disabled={isLoading || !content.trim()} 
                  className={`flex-1 h-11 ${
                    isDarkTheme 
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white" 
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Pitch"
                  )}
                </Button>
              ) : (
                <Button 
                  disabled
                  className={`flex-1 h-11 ${
                    isDarkTheme 
                      ? "bg-slate-700/50 text-gray-400" 
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  Cannot Edit
                </Button>
              )}
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}