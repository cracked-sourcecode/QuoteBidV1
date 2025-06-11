import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Copy, Send, Globe, Mail, MapPin, Briefcase,
  Building2, XCircle, Loader2, Clock, Twitter, Linkedin, Instagram, 
  TrendingUp, Award, X, ExternalLink
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
    color: 'bg-amber-500 text-white',
    icon: Clock,
  },
  sent_to_reporter: { 
    label: 'Sent to Reporter', 
    color: 'bg-blue-500 text-white',
    icon: Send,
  },
  interested: { 
    label: 'Reporter Interested', 
    color: 'bg-green-500 text-white',
    icon: TrendingUp,
  },
  not_interested: { 
    label: 'Not Interested', 
    color: 'bg-red-500 text-white',
    icon: XCircle,
  },
  successful: { 
    label: 'Successful Coverage', 
    color: 'bg-purple-500 text-white',
    icon: Award,
  },
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
    
    navigator.clipboard.writeText(quote).then(() => {
      toast({
        title: "Copied!",
        description: "Quote copied to clipboard",
      });
    }).catch(() => {
      toast({
        title: "Copy failed",
        description: "Please try copying manually",
        variant: "destructive",
      });
    });
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: 'bg-slate-500 text-white',
      icon: XCircle
    };
    const Icon = config.icon;
    
    return (
      <div className={`${config.color} inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-xs`}>
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 bg-slate-900 border border-white/20 [&>button]:hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
          </div>
        ) : pitch ? (
          <div className="flex flex-col max-h-[85vh]">
            
            {/* Compact Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-800/50">
              <div className="flex-1 min-w-0 pr-4">
                <h2 className="font-semibold text-white text-base mb-1 line-clamp-2">
                  {pitch.opportunity?.title || 'Pitch Details'}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {pitch.opportunity?.publication?.name && (
                    <>
                      <Building2 className="h-3 w-3" />
                      <span>{pitch.opportunity.publication.name}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>{formatDistanceToNow(new Date(pitch.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <StatusBadge status={pitch.status} />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClose} 
                  className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              
              {/* Expert Profile */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <div className="w-4 h-4 bg-amber-500 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">E</span>
                  </div>
                  Expert Profile
                </h3>
                
                <div className="bg-slate-800/30 rounded-lg p-6 border border-white/10">
                  <div className="flex items-start gap-5">
                    <Avatar className="h-20 w-20 ring-2 ring-white/20 flex-shrink-0">
                      <AvatarImage src={pitch.user?.avatar} className="object-cover" />
                      <AvatarFallback className="bg-slate-700 text-white font-bold text-xl">
                        {pitch.user?.fullName?.substring(0, 2).toUpperCase() || 'EX'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-lg mb-1">
                        {pitch.user?.fullName || 'Unknown Expert'}
                      </h4>
                      {pitch.user?.title && (
                        <p className="text-amber-400 font-medium text-base mb-4">{pitch.user.title}</p>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm mb-4">
                        {pitch.user?.industry && (
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-300 font-medium">{pitch.user.industry}</span>
                          </div>
                        )}
                        {pitch.user?.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-300">{pitch.user.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 md:col-span-2">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-300 truncate">{pitch.user?.email}</span>
                        </div>
                      </div>
                      
                      {pitch.user?.bio && (
                        <div className="mb-4">
                          <p className="text-slate-300 text-sm leading-relaxed">{pitch.user.bio}</p>
                        </div>
                      )}
                      
                      {/* Social Links */}
                      {(pitch.user?.linkedIn || pitch.user?.twitter || pitch.user?.website) && (
                        <div className="flex items-center gap-3">
                          {pitch.user.linkedIn && (
                            <a href={pitch.user.linkedIn} target="_blank" rel="noopener noreferrer" 
                               className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                              <Linkedin className="h-4 w-4" />
                              LinkedIn
                            </a>
                          )}
                          {pitch.user.twitter && (
                            <a href={pitch.user.twitter} target="_blank" rel="noopener noreferrer"
                               className="flex items-center gap-2 px-3 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors">
                              <Twitter className="h-4 w-4" />
                              Twitter
                            </a>
                          )}
                          {pitch.user.website && (
                            <a href={pitch.user.website} target="_blank" rel="noopener noreferrer"
                               className="flex items-center gap-2 px-3 py-2 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                              <ExternalLink className="h-4 w-4" />
                              Website
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Opportunity Details */}
              {pitch.opportunity?.description && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-amber-400" />
                    Opportunity Details
                  </h3>
                  
                  <div className="bg-slate-800/30 rounded-lg p-4 border border-white/10">
                    <p className="text-slate-300 text-sm leading-relaxed">{pitch.opportunity.description}</p>
                  </div>
                </div>
              )}

              {/* Quote Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Copy className="h-4 w-4 text-amber-400" />
                    Ready-to-Use Quote
                  </h3>
                  <Button 
                    onClick={copyQuote} 
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7"
                  >
                    <Copy className="h-3 w-3 mr-1.5" />
                    Copy
                  </Button>
                </div>
                
                <div className="bg-slate-800/20 rounded-lg p-4 border border-white/10">
                  <div className="relative">
                    <div className="absolute -top-2 -left-2 text-2xl text-amber-400/30 font-serif select-none">"</div>
                    <blockquote className="pl-4">
                      <p className="text-slate-200 text-sm leading-relaxed italic mb-2">
                        {pitch.content.trim().replace(/\n+/g, ' ')}
                      </p>
                      <footer className="text-right">
                        <cite className="text-white font-medium text-sm not-italic">
                          — {pitch.user?.fullName || 'Anonymous'}{pitch.user?.title ? `, ${pitch.user.title}` : ''}
                        </cite>
                      </footer>
                    </blockquote>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 px-5 py-3 bg-slate-800/30">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Pitch #{pitch.id}</span>
                <Select value={pitch.status} onValueChange={updatePitchStatus} disabled={updatingStatus}>
                  <SelectTrigger className="w-40 h-8 bg-slate-800 border-white/20 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/20">
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key} className="text-white hover:bg-slate-700 text-xs">
                        <div className="flex items-center gap-1.5">
                          <config.icon className="h-3 w-3" />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <XCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white mb-1">Failed to load pitch details</h3>
              <p className="text-xs text-slate-400">Please try again.</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}