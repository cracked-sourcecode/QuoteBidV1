import { useState, useEffect, useRef } from "react";
import { User, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PitchDTO, PitchMessage } from "../utils/pitchInterfaces";
import { useAdminAuth } from "@/hooks/use-admin-auth";

interface PitchMessageThreadProps {
  pitch: PitchDTO;
}

export default function PitchMessageThread({ pitch }: PitchMessageThreadProps) {
  const { toast } = useToast();
  const { adminUser } = useAdminAuth();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch messages for this pitch
  const { data: messages, isLoading, error } = useQuery<PitchMessage[]>({
    queryKey: ['/api/pitch-messages', pitch.id],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/pitch-messages/${pitch.id}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to fetch messages');
        }
        return res.json();
      } catch (err) {
        console.error("Error fetching messages:", err);
        throw err;
      }
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    retry: 1
  });

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when viewed
  useEffect(() => {
    if (messages && messages.length > 0) {
      const unreadMessages = messages.filter(msg => !msg.isRead);
      if (unreadMessages.length > 0) {
        apiRequest("POST", `/api/pitch-messages/mark-read/${pitch.id}`, {})
          .catch(err => console.error("Failed to mark messages as read:", err));
      }
    }
  }, [messages, pitch.id]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (newMessage: string) => {
      const res = await apiRequest("POST", `/api/pitch-messages/${pitch.id}`, { 
        message: newMessage
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/pitch-messages', pitch.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessageMutation.mutate(message);
    }
  };

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const isCurrentUser = (message: PitchMessage) => {
    // For admin view, messages from admin are shown as "You"
    return !message.isAdmin;
  };

  return (
    <div className="flex flex-col h-[450px]">
      {/* Message Thread Area with improved spacing and padding */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!adminUser ? (
          <div className="flex flex-col justify-center items-center h-full text-center p-4">
            <h3 className="text-lg font-medium mb-1 text-amber-500">Admin Login Required</h3>
            <p className="text-muted-foreground text-sm">
              Please login as an admin to access the messaging system.
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col justify-center items-center h-full text-center p-4">
            <h3 className="text-lg font-medium mb-1 text-red-500">Error loading messages</h3>
            <p className="text-muted-foreground text-sm">
              There was a problem loading the conversation.
            </p>
          </div>
        ) : messages && messages.length > 0 ? (
          messages.map((message: PitchMessage) => (
            <div 
              key={message.id} 
              className={`flex ${isCurrentUser(message) ? 'justify-end' : 'justify-start'} mb-4`}
            >
              <div 
                className={`max-w-[85%] rounded-lg p-4 shadow-sm ${
                  isCurrentUser(message)
                    ? 'bg-primary text-primary-foreground ml-8'
                    : 'bg-white border border-slate-200 mr-8'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {!isCurrentUser(message) && (
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={message.senderAvatar || ""} />
                      <AvatarFallback className="bg-primary/20 text-xs">
                        {message.senderName ? getInitials(message.senderName) : 'R'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <span className={`text-xs font-medium ${isCurrentUser(message) ? 'text-primary-foreground/80' : 'text-slate-700'}`}>
                    {message.senderName || (isCurrentUser(message) ? 'You' : 'Reporter')}
                  </span>
                  <span className={`text-xs ml-auto ${isCurrentUser(message) ? 'text-primary-foreground/80' : 'text-slate-500'}`}>
                    {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {message.message}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col justify-center items-center h-full text-center p-4">
            <Circle className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-medium mb-1">No messages yet</h3>
            <p className="text-muted-foreground text-sm">
              When you or the reporter has questions about this pitch, messages will appear here.
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input Area with improved styling */}
      <div className="border-t border-slate-200 p-4 bg-white rounded-b-lg">
        {!adminUser ? (
          <div className="flex justify-center items-center py-2">
            <p className="text-sm text-amber-500">Please login as an admin to send messages.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <Textarea
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="resize-none flex-1 border-slate-200 focus:border-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={sendMessageMutation.isPending}
                rows={3}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || sendMessageMutation.isPending}
                className="self-end"
              >
                {sendMessageMutation.isPending ? 
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"/> : 
                  'Send'
                }
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Press Enter to send, Shift+Enter for a new line
            </p>
          </>
        )}
      </div>
    </div>
  );
}