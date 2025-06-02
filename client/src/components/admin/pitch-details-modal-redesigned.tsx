import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  User, Calendar, Eye, FileText, Mic, Copy, Star, Send,
  ExternalLink, Globe, Mail, Phone, Building2, MapPin, Briefcase,
  Building, Target, Sparkles, XCircle, Loader2, Clock, Twitter,
  Linkedin, Instagram, AlertCircle, CheckCircle, HelpCircle,
  Ban, TrendingUp, Award
} from 'lucide-react';
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface PitchDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pitchId: number;
}

interface Pitch {
  id: number;
  userId: number;
  opportunityId: number;
  content: string;
  audioUrl?: string;
  transcript?: string;
  status: string;
  createdAt: string;
  bidAmount?: number;
  user?: {
    id: number;
    fullName: string;
    email: string;
    avatar?: string;
    title?: string;
    bio?: string;
    location?: string;
    industry?: string;
    linkedIn?: string;
    twitter?: string;
    instagram?: string;
    website?: string;
  };
  opportunity?: {
    title: string;
    description?: string;
    publication?: {
      name: string;
    };
  };
}

const statusConfig = {
  pending: { 
    label: 'Pending Review', 
    color: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white',
    icon: Clock,
  },
  sent_to_reporter: { 
    label: 'Sent to Reporter', 
    color: 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white',
    icon: Send,
  },
  interested: { 
    label: 'Reporter Interested', 
    color: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white',
    icon: TrendingUp,
  },
  not_interested: { 
    label: 'Not Interested', 
    color: 'bg-gradient-to-r from-red-500 to-rose-600 text-white',
    icon: XCircle,
  },
  successful: { 
    label: 'Successful Coverage', 
    color: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white',
    icon: Award,
  },
  draft: {
    label: 'Draft',
    color: 'bg-gradient-to-r from-gray-500 to-slate-600 text-white',
    icon: FileText,
  }
};

export default function PitchDetailsModalRedesigned({ isOpen, onClose, pitchId }: PitchDetailsModalProps) {
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && pitchId) {
      fetchPitchDetails();
    }
  }, [isOpen, pitchId]);

  const fetchPitchDetails = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest("GET", `/api/admin/pitches/${pitchId}`);
      const data = await res.json();
      setPitch(data);
    } catch (error) {
      console.error("Error fetching pitch details:", error);
      toast({
        title: "Error",
        description: "Failed to load pitch details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updatePitchStatus = async (newStatus: string) => {
    if (!pitch) return;
    
    setUpdatingStatus(true);
    try {
      await apiRequest("PATCH", `/api/admin/pitches/${pitch.id}/status`, { status: newStatus });
      setPitch({ ...pitch, status: newStatus });
      toast({
        title: "Status Updated",
        description: `Pitch status changed to ${statusConfig[newStatus as keyof typeof statusConfig]?.label || newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update pitch status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const copyQuote = () => {
    if (!pitch) return;
    
    const quote = `"${pitch.content.trim().replace(/\n+/g, ' ')}" —${pitch.user?.fullName || 'Anonymous'}${pitch.user?.title ? `, ${pitch.user.title}` : ''}`;
    
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(quote).then(() => {
        toast({
          title: "Copied!",
          description: "Quote copied to clipboard",
        });
      }).catch(() => {
        fallbackCopyTextToClipboard(quote);
      });
    } else {
      fallbackCopyTextToClipboard(quote);
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      toast({
        title: "Copied!",
        description: "Quote copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please copy the quote manually",
        variant: "destructive",
      });
    }
    
    document.body.removeChild(textArea);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: 'bg-gradient-to-r from-gray-500 to-slate-600 text-white',
      icon: XCircle
    };
    const Icon = config.icon;
    
    return (
      <div className={`${config.color} inline-flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg font-medium text-sm whitespace-nowrap`}>
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{config.label}</span>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 flex flex-col [&>button]:hidden border-0 shadow-none bg-transparent overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-96 bg-white">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-6" />
              <p className="text-lg text-gray-600 font-medium">Loading pitch details...</p>
            </div>
          </div>
        ) : pitch ? (
          <>
            {/* Header */}
            <DialogHeader className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white px-8 py-6 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="absolute top-4 right-4 z-10 h-10 w-10 p-0 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </Button>
              
              <div className="flex items-start justify-between pr-16">
                <div className="flex items-center gap-6 flex-1 min-w-0">
                  {pitch.user && (
                    <Avatar className="h-16 w-16 ring-4 ring-white/30 shadow-2xl flex-shrink-0">
                      <AvatarImage src={pitch.user.avatar} />
                      <AvatarFallback className="text-xl bg-white/20 text-white font-bold">
                        {pitch.user.fullName?.substring(0, 2).toUpperCase() || 'EX'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                      <span className="truncate">{pitch.opportunity?.title || 'Pitch Details'}</span>
                    </DialogTitle>
                    <div className="flex items-center gap-4 text-white/90 flex-wrap">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 flex-shrink-0" />
                        <span className="font-semibold truncate">{pitch.user?.fullName || 'Anonymous Expert'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">Submitted {formatDistanceToNow(new Date(pitch.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 flex-shrink-0">
                  <StatusBadge status={pitch.status} />
                </div>
              </div>
            </DialogHeader>

            {/* Single Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto space-y-6 bg-gray-50">
              
              {/* Expert Profile Card - MOVED TO TOP */}
              {pitch.user && (
                <Card className="bg-white border border-gray-200 shadow-xl overflow-hidden mx-6 mt-6">
                  <div className="relative">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"></div>
                    <div className="absolute inset-0 opacity-30">
                      <div className="w-full h-full" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f1f5f9' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        backgroundSize: '60px 60px'
                      }}></div>
                    </div>
                    
                    <CardContent className="relative pt-8 pb-6">
                      {/* Profile Header */}
                      <div className="flex items-start gap-6 mb-6">
                        <div className="flex-shrink-0">
                          <Avatar className="h-24 w-24 ring-4 ring-white shadow-xl">
                            {pitch.user.avatar ? (
                              <AvatarImage 
                                src={pitch.user.avatar} 
                                alt={pitch.user.fullName || 'User'} 
                                className="object-cover" 
                              />
                            ) : null}
                            <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                              {pitch.user.fullName?.substring(0, 2).toUpperCase() || 'EX'}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-3xl font-bold text-gray-900 mb-2">
                            {pitch.user.fullName || 'Unknown Expert'}
                          </h3>
                          {pitch.user.title && (
                            <p className="text-xl text-blue-600 font-medium mb-3">
                              {pitch.user.title}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                            {pitch.user.industry && (
                              <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4" />
                                <span className="font-medium">{pitch.user.industry}</span>
                              </div>
                            )}
                            {pitch.user.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{pitch.user.location}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <span>{pitch.user.email}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bio Section */}
                      {pitch.user.bio && (
                        <div className="mb-6">
                          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-gray-100">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                              About This Expert
                            </h4>
                            <p className="text-gray-700 leading-relaxed text-base">
                              {pitch.user.bio}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Social Links */}
                      {(pitch.user.linkedIn || pitch.user.twitter || pitch.user.instagram || pitch.user.website) && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                            Connect With Expert
                          </h4>
                          <div className="flex gap-3 flex-wrap">
                            {pitch.user.linkedIn && (
                              <a 
                                href={pitch.user.linkedIn} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                              >
                                <Linkedin className="h-4 w-4" />
                                <span className="font-medium">LinkedIn</span>
                              </a>
                            )}
                            {pitch.user.twitter && (
                              <a 
                                href={pitch.user.twitter} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                              >
                                <Twitter className="h-4 w-4" />
                                <span className="font-medium">Twitter</span>
                              </a>
                            )}
                            {pitch.user.instagram && (
                              <a 
                                href={pitch.user.instagram} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                              >
                                <Instagram className="h-4 w-4" />
                                <span className="font-medium">Instagram</span>
                              </a>
                            )}
                            {pitch.user.website && (
                              <a 
                                href={pitch.user.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                              >
                                <Globe className="h-4 w-4" />
                                <span className="font-medium">Website</span>
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </div>
                </Card>
              )}

              {/* Opportunity Card */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg mx-6">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-xl font-bold text-blue-900">
                      <div className="p-2 bg-blue-500 rounded-xl">
                        <Target className="h-6 w-6 text-white" />
                      </div>
                      Opportunity Details
                    </CardTitle>
                    <Select
                      value={pitch.status}
                      onValueChange={updatePitchStatus}
                      disabled={updatingStatus}
                    >
                      <SelectTrigger className="w-48 bg-white shadow-sm border-blue-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-3">
                              <config.icon className="h-4 w-4" />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {pitch.opportunity?.title || 'Unnamed Opportunity'}
                    </h3>
                    <div className="flex items-center gap-2 mb-3">
                      <Building className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-blue-900">{pitch.opportunity?.publication?.name || 'N/A'}</span>
                    </div>
                    {pitch.opportunity?.description && (
                      <p className="text-gray-700 leading-relaxed bg-white/60 p-3 rounded-lg text-sm">
                        {pitch.opportunity.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Pitch Content Card */}
              <Card className="bg-gradient-to-br from-slate-50 to-gray-50 border-gray-200 shadow-lg mx-6 mb-6">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                    <div className="p-2 bg-gray-700 rounded-xl">
                      {pitch.audioUrl ? (
                        <Mic className="h-6 w-6 text-white" />
                      ) : (
                        <FileText className="h-6 w-6 text-white" />
                      )}
                    </div>
                    {pitch.audioUrl ? 'Audio Pitch' : 'Written Pitch'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {pitch.audioUrl ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500 rounded-lg">
                              <Mic className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-semibold text-blue-900">Audio Recording</span>
                          </div>
                        </div>
                        <audio controls className="w-full h-12 rounded-lg">
                          <source src={pitch.audioUrl} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                      {pitch.transcript && (
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-600" />
                            Transcript
                          </h4>
                          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {pitch.transcript}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-600" />
                        Pitch Content
                      </h4>
                      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                        {pitch.content}
                      </p>
                    </div>
                  )}

                  {/* Copy Quote Section */}
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-amber-900 flex items-center gap-2">
                        <Copy className="h-4 w-4" />
                        Ready-to-Use Quote
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyQuote}
                        className="bg-white border-amber-200 text-amber-700 hover:bg-amber-50"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Quote
                      </Button>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-amber-100 shadow-sm">
                      <div className="relative">
                        <div className="absolute -top-4 -left-2 text-6xl text-amber-400 font-serif">"</div>
                        <div className="pl-8">
                          <p className="italic text-gray-800 leading-relaxed text-lg mb-4">
                            {pitch.content.trim().replace(/\n+/g, ' ')}
                          </p>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              — {pitch.user?.fullName || 'Anonymous'}{pitch.user?.title ? `, ${pitch.user.title}` : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Failed to load pitch details</h3>
              <p className="text-gray-600">Please try refreshing or contact support if the issue persists.</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}