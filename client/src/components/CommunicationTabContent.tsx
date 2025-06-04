import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Clock, ExternalLink, Loader2, Mail, Phone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CommunicationTabContentProps {
  user: any;
  userPitches: any[];
  isLoadingPitches: boolean;
  onOpenChatModal: (pitchId: number, pitchTitle: string) => void;
}

export function CommunicationTabContent({ 
  user,
  userPitches,
  isLoadingPitches,
  onOpenChatModal
}: CommunicationTabContentProps) {

  // Ensure userPitches is always an array
  const pitches = Array.isArray(userPitches) ? userPitches : [];

  // Filter pitches that have communication (responses or messages)
  const pitchesWithCommunication = pitches.filter(pitch => 
    pitch.responses && pitch.responses.length > 0
  );

  // Get recent activity
  const recentActivity = pitches
    .filter(pitch => pitch.responses && pitch.responses.length > 0)
    .flatMap(pitch => 
      pitch.responses.map((response: any) => ({
        ...response,
        pitchId: pitch.id,
        pitchTitle: pitch.opportunity?.title || 'Untitled Opportunity',
        publicationName: pitch.opportunity?.publication?.name || 'Unknown Publication'
      }))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10); // Show last 10 activities

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
      case 'successful':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'under review':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
      case 'declined':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold mb-2">Communication & Messages</h2>
        <p className="text-gray-600">View your pitch responses and communicate with journalists</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <MessageCircle className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{pitches.length}</p>
                <p className="text-sm text-gray-600">Total Pitches</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{pitchesWithCommunication.length}</p>
                <p className="text-sm text-gray-600">Active Conversations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{recentActivity.length}</p>
                <p className="text-sm text-gray-600">Recent Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column - Active Conversations */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Active Conversations</h3>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Pitch Responses
              </CardTitle>
              <p className="text-sm text-gray-600">
                Ongoing conversations with journalists about your pitches
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingPitches ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : pitchesWithCommunication.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {pitchesWithCommunication.map((pitch: any) => (
                    <div key={pitch.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {pitch.opportunity?.title || 'Untitled Opportunity'}
                          </h4>
                          {pitch.opportunity?.publication?.name && (
                            <p className="text-xs text-gray-500 mt-1">
                              {pitch.opportunity.publication.name}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <Badge 
                              variant="secondary"
                              className={getStatusColor(pitch.status)}
                            >
                              {pitch.status || 'Pending'}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {pitch.responses?.length || 0} messages
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <Button
                            size="sm"
                            onClick={() => onOpenChatModal(pitch.id, pitch.opportunity?.title || 'Untitled')}
                            className="text-xs"
                          >
                            View Chat
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No active conversations</p>
                  <p className="text-sm text-gray-400">
                    When journalists respond to your pitches, conversations will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Recent Activity */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Latest Messages
              </CardTitle>
              <p className="text-sm text-gray-600">
                Recent responses and updates from journalists
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingPitches ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {recentActivity.map((activity: any, index: number) => (
                    <div key={activity.id || index} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <MessageCircle className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {activity.publicationName}
                            </p>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 truncate">
                            {activity.pitchTitle}
                          </p>
                          {activity.message && (
                            <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                              {activity.message.length > 100 
                                ? `${activity.message.substring(0, 100)}...` 
                                : activity.message
                              }
                            </p>
                          )}
                          <div className="mt-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onOpenChatModal(activity.pitchId, activity.pitchTitle)}
                              className="text-xs h-6 px-2"
                            >
                              View conversation
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No recent activity</p>
                  <p className="text-sm text-gray-400">
                    Recent messages and updates will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Help Section */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="bg-green-100 rounded-full p-2">
              <Phone className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-green-900 mb-1">Need help with communication?</h4>
              <p className="text-sm text-green-700 mb-3">
                Our team can help you craft better pitches and improve your response rates.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-100" asChild>
                  <a href="mailto:support@quotebid.com">
                    Email Support
                  </a>
                </Button>
                <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-100" asChild>
                  <a href="https://calendly.com/rubicon-pr-group/quotebid" target="_blank" rel="noopener noreferrer">
                    Schedule Call
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 