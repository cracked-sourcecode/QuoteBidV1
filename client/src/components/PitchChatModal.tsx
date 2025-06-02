import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Send, MessageCircle, Clock, User, Shield } from 'lucide-react';
import { cn } from '../lib/utils';

interface PitchMessage {
  id: number;
  pitchId: number;
  senderId: number;
  isAdmin: boolean;
  message: string;
  createdAt: string;
  isRead: boolean;
  senderName: string;
  senderAvatar?: string | null;
}

interface PitchChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  pitchId: number;
  pitchTitle?: string;
  isAdmin?: boolean;
}

export default function PitchChatModal({ 
  isOpen, 
  onClose, 
  pitchId, 
  pitchTitle = "Pitch Discussion",
  isAdmin = false 
}: PitchChatModalProps) {
  const [messages, setMessages] = useState<PitchMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // API endpoints based on whether user is admin or not
  const getMessagesEndpoint = isAdmin 
    ? `/api/messages/admin/pitch/${pitchId}`
    : `/api/messages/pitch/${pitchId}`;
    
  const sendMessageEndpoint = isAdmin
    ? `/api/messages/admin/pitch/${pitchId}`
    : `/api/messages/pitch/${pitchId}`;

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch messages when modal opens
  useEffect(() => {
    if (isOpen && pitchId) {
      fetchMessages();
    }
  }, [isOpen, pitchId]);

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(getMessagesEndpoint, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      } else {
        console.error('Failed to fetch messages');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch(sendMessageEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
        body: JSON.stringify({ message: newMessage.trim() }),
      });

      if (response.ok) {
        const newMsg = await response.json();
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
      } else {
        console.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold">{pitchTitle}</div>
              <div className="text-sm text-gray-600 font-normal">
                {isAdmin ? 'Admin Communication Portal' : 'Pitch Discussion'}
              </div>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {messages.length} messages
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading conversation...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No messages yet</p>
                  <p className="text-sm text-gray-500">Start the conversation below</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.isAdmin === isAdmin ? "justify-end" : "justify-start"
                    )}
                  >
                    {/* Avatar (on left for others, right for self) */}
                    {message.isAdmin !== isAdmin && (
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarImage src={message.senderAvatar || undefined} />
                        <AvatarFallback className={cn(
                          "text-xs font-medium",
                          message.isAdmin ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {message.isAdmin ? (
                            <Shield className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    {/* Message bubble */}
                    <div className={cn(
                      "max-w-[70%] space-y-1",
                      message.isAdmin === isAdmin ? "items-end" : "items-start"
                    )}>
                      {/* Sender name and time */}
                      <div className={cn(
                        "flex items-center gap-2 text-xs",
                        message.isAdmin === isAdmin ? "flex-row-reverse" : "flex-row"
                      )}>
                        <span className="font-medium text-gray-700">
                          {message.senderName}
                          {message.isAdmin && (
                            <Badge variant="secondary" className="ml-1 text-xs bg-purple-100 text-purple-700">
                              Admin
                            </Badge>
                          )}
                        </span>
                        <div className="flex items-center gap-1 text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(message.createdAt)}</span>
                        </div>
                      </div>

                      {/* Message content */}
                      <div className={cn(
                        "rounded-lg px-4 py-2 text-sm leading-relaxed",
                        message.isAdmin === isAdmin
                          ? "bg-blue-500 text-white rounded-br-sm"
                          : message.isAdmin
                          ? "bg-purple-50 text-purple-900 border border-purple-200 rounded-bl-sm"
                          : "bg-gray-100 text-gray-900 rounded-bl-sm"
                      )}>
                        {message.message}
                      </div>
                    </div>

                    {/* Avatar for self (on right) */}
                    {message.isAdmin === isAdmin && (
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarImage src={message.senderAvatar || undefined} />
                        <AvatarFallback className="bg-blue-500 text-white text-xs font-medium">
                          {message.isAdmin ? (
                            <Shield className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t bg-gray-50 p-4">
            <div className="flex gap-3">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isAdmin ? "Type your admin response..." : "Type your message..."}
                className="flex-1 min-h-[40px] max-h-[120px] resize-none bg-white"
                disabled={isSending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isSending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700"
              >
                {isSending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 