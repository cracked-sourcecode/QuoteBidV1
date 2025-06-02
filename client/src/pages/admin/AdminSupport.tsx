import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Clock, User, Shield, Loader2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import PitchChatModal from '@/components/PitchChatModal';

interface Conversation {
  pitchId: number;
  pitch: {
    id: number;
    content: string;
    status: string;
    createdAt: string;
    opportunityId: number;
    opportunity?: {
      title: string;
      publication?: {
        name: string;
      };
    };
  };
  user: {
    id: number;
    fullName: string;
    email: string;
    avatar?: string;
    title?: string;
  } | null;
  latestMessage: {
    id: number;
    message: string;
    isAdmin: boolean;
    createdAt: string;
  } | null;
  unreadCount: number;
}

export default function AdminSupport() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  // Fetch all conversations
  const { data: conversations, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/messages/admin/conversations'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/messages/admin/conversations');
      return res.json() as Promise<Conversation[]>;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Fetch unread count
  const { data: unreadCount } = useQuery({
    queryKey: ['/api/messages/admin/unread-count'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/messages/admin/unread-count');
      const data = await res.json();
      return data.count;
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const handleOpenChat = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setIsChatModalOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatModalOpen(false);
    setSelectedConversation(null);
    // Refetch conversations to update unread counts
    refetch();
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700">Under Review</Badge>;
      case 'sent_to_reporter':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-700">Sent to Reporter</Badge>;
      case 'successful':
        return <Badge variant="secondary" className="bg-green-100 text-green-700">Published</Badge>;
      case 'not_interested':
        return <Badge variant="secondary" className="bg-red-100 text-red-700">Not Selected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading conversations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
            <div>
              <h3 className="font-medium text-red-800">Unable to load conversations</h3>
              <p className="text-red-700 text-sm mt-1">Please try refreshing the page.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Communication Center
              </h1>
              <p className="text-gray-600">
                Manage all pitch conversations and support requests
              </p>
            </div>
            <div className="flex items-center gap-4">
              {unreadCount > 0 && (
                <Badge variant="destructive" className="px-3 py-1">
                  {unreadCount} unread
                </Badge>
              )}
              <Button onClick={() => refetch()} variant="outline">
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Conversations List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
          {!conversations || conversations.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
                <MessageCircle className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversations yet</h3>
              <p className="text-gray-600 max-w-md mx-auto text-sm">
                When users start messaging about their pitches, conversations will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conversation, index) => (
                <div
                  key={conversation.pitchId}
                  className={`p-6 hover:bg-gray-50/50 transition-all duration-200 cursor-pointer ${
                    index === 0 ? 'rounded-t-2xl' : ''
                  } ${index === conversations.length - 1 ? 'rounded-b-2xl' : ''}`}
                  onClick={() => handleOpenChat(conversation)}
                >
                  <div className="flex items-start justify-between">
                    {/* Left: User and Pitch Info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarImage src={conversation.user?.avatar} />
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">
                          {conversation.user?.fullName?.substring(0, 2).toUpperCase() || 'EX'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {conversation.user?.fullName || 'Anonymous User'}
                          </h3>
                          {conversation.user?.title && (
                            <Badge variant="outline" className="text-xs">
                              {conversation.user.title}
                            </Badge>
                          )}
                          {getStatusBadge(conversation.pitch.status)}
                        </div>

                        <div className="mb-2">
                          <p className="font-medium text-gray-800 text-sm truncate">
                            {conversation.pitch.opportunity?.title || `Pitch #${conversation.pitch.id}`}
                          </p>
                          <p className="text-gray-600 text-sm">
                            {conversation.pitch.opportunity?.publication?.name || 'Unknown Publication'}
                          </p>
                        </div>

                        {conversation.latestMessage && (
                          <div className="bg-gray-50 rounded-lg p-3 mt-3">
                            <div className="flex items-center gap-2 mb-1">
                              {conversation.latestMessage.isAdmin ? (
                                <Shield className="h-4 w-4 text-purple-600" />
                              ) : (
                                <User className="h-4 w-4 text-blue-600" />
                              )}
                              <span className="text-xs font-medium text-gray-600">
                                {conversation.latestMessage.isAdmin ? 'Admin' : conversation.user?.fullName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatTime(conversation.latestMessage.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 line-clamp-2">
                              {conversation.latestMessage.message}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions and Status */}
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      {conversation.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {conversation.unreadCount} new
                        </Badge>
                      )}
                      <div className="text-center">
                        <MessageCircle className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                        <span className="text-xs text-gray-500">Chat</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Modal */}
      {selectedConversation && (
        <PitchChatModal
          isOpen={isChatModalOpen}
          onClose={handleCloseChat}
          pitchId={selectedConversation.pitchId}
          pitchTitle={selectedConversation.pitch.opportunity?.title || 'Pitch Discussion'}
          isAdmin={true}
        />
      )}
    </div>
  );
} 