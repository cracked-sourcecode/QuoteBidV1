import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  FileText,
  Mail,
  Globe,
  Twitter,
  Linkedin,
  Mic,
  Clock,
  Calendar,
  DownloadCloud,
  Loader2,
  MapPin,
  Building,
  MessageSquare,
  ExternalLink,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  Target,
  Instagram,
  Briefcase,
  Award,
  Copy,
  Building2,
  Hash,
  Phone,
  PlayCircle,
  PauseCircle,
  FileDown
} from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";
import PitchMessageThread from "../pitch-message-thread";
import { PitchDTO } from "@/utils/pitchInterfaces";

interface PitchDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pitchId: number;
}

interface MediaItem {
  title: string;
  publication?: string;
  date?: string;
  url: string;
}

interface UserProfile {
  id: number;
  username: string;
  email: string;
  fullName: string;
  title?: string;
  company?: string;
  bio?: string;
  avatar?: string;
  website?: string;
  twitter?: string;
  linkedIn?: string;
  instagram?: string;
  industry?: string;
  location?: string;
  mediaKit?: (MediaItem | string)[];
  doFollowLink?: string;
  phone_number?: string;
  createdAt?: string;
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
  isDraft?: boolean;
  user?: UserProfile;
  opportunity?: {
    title: string;
    description?: string;
    outlet?: string;
    tier?: string;
    deadline?: string;
    publication?: {
      name: string;
      logo?: string;
    };
  };
  article?: {
    url: string;
    title?: string;
  };
}

// Simplified status configuration
const statusConfig = {
  pending: { 
    label: 'Pending Review', 
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    icon: Clock,
  },
  sent_to_reporter: { 
    label: 'Sent to Reporter', 
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Send,
  },
  interested: { 
    label: 'Reporter Interested', 
    color: 'bg-green-50 text-green-700 border-green-200',
    icon: CheckCircle,
  },
  not_interested: { 
    label: 'Not Interested', 
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
  },
  successful: { 
    label: 'Successful Coverage', 
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: Award,
  },
  draft: {
    label: 'Draft',
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    icon: FileText,
  }
};

function getDoFollowLinkDisplay(user: any): string {
  if (!user?.doFollowLink || user.doFollowLink === 'None') return '';
  
  let url = '';
  switch (user.doFollowLink.toLowerCase()) {
    case 'website': url = user.website; break;
    case 'linkedin': url = user.linkedIn; break;
    case 'twitter': url = user.twitter; break;
    case 'instagram': url = user.instagram; break;
    default: 
      if (user.doFollowLink.startsWith('http')) url = user.doFollowLink;
  }
  
  return url ? ` (${url})` : '';
}

function formatDate(dateString: string): string {
  if (!dateString) return "N/A";
  try {
    return format(new Date(dateString), "MMM d, yyyy");
  } catch (e) {
    return dateString;
  }
}

export default function PitchDetailsModalRedesigned({ isOpen, onClose, pitchId }: PitchDetailsModalProps) {
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && pitchId) {
      setIsLoading(true);
      apiRequest("GET", `/api/admin/pitches/${pitchId}`)
        .then((res) => res.json())
        .then((data) => {
          setPitch(data);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching pitch details:", error);
          setIsLoading(false);
          toast({
            title: "Error",
            description: "Failed to load pitch details",
            variant: "destructive",
          });
        });
    }
  }, [isOpen, pitchId, toast]);

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

  const copyQuoteToClipboard = () => {
    if (!pitch) return;
    
    const quote = `"${pitch.content.trim().replace(/\n+/g, ' ')}" —${pitch.user?.fullName || 'Anonymous'}${pitch.user?.title ? `, ${pitch.user.title}` : ''}${getDoFollowLinkDisplay(pitch.user)}`;
    
    navigator.clipboard.writeText(quote).then(() => {
      toast({
        title: "Copied!",
        description: "Quote copied to clipboard",
      });
    });
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: 'bg-gray-50 text-gray-700 border-gray-200',
      icon: AlertCircle
    };
    const Icon = config.icon;
    
    return (
      <Badge variant="outline" className={`${config.color} flex items-center gap-1.5 px-3 py-1.5 font-medium`}>
        <Icon className="h-3.5 w-3.5" />
        <span>{config.label}</span>
      </Badge>
    );
  };

  const generateMediaKitPDF = () => {
    if (!pitch || !pitch.user) return;

    // Create expert-focused media kit for reporters
    const mediaKitHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pitch.user.fullName} - Expert Source</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Georgia', 'Times New Roman', serif;
            background: white;
            color: #1a1a1a;
            line-height: 1.6;
        }
        
        .expert-showcase {
            max-width: 800px;
            margin: 0 auto;
            background: white;
        }
        
        /* Hero Section - Expert Introduction */
        .expert-hero {
            background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%);
            color: white;
            padding: 60px 50px;
            text-align: center;
            position: relative;
        }
        
        .expert-photo {
            width: 140px;
            height: 140px;
            border-radius: 50%;
            margin: 0 auto 25px;
            border: 6px solid rgba(255, 255, 255, 0.9);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
            object-fit: cover;
            background: #f8fafc;
            background-image: url('${pitch.user.avatar || ''}');
            background-size: cover;
            background-position: center;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            font-weight: bold;
            color: #64748b;
        }
        
        .expert-name {
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 12px;
            letter-spacing: -1px;
        }
        
        .expert-credentials {
            font-size: 22px;
            opacity: 0.95;
            margin-bottom: 20px;
            font-weight: 500;
        }
        
        .authority-badges {
            display: flex;
            justify-content: center;
            gap: 15px;
            flex-wrap: wrap;
            margin-top: 20px;
        }
        
        .authority-badge {
            background: rgba(255, 255, 255, 0.15);
            padding: 8px 18px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        /* Story Relevance Section */
        .story-section {
            background: #f8fafc;
            padding: 50px;
            border-left: 8px solid #2563eb;
        }
        
        .story-label {
            color: #2563eb;
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 15px;
        }
        
        .story-title {
            font-size: 28px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 20px;
            line-height: 1.3;
        }
        
        .expert-relevance {
            font-size: 18px;
            color: #475569;
            font-style: italic;
            padding: 20px;
            background: white;
            border-radius: 12px;
            border-left: 4px solid #10b981;
        }
        
        /* Expert Quote Showcase */
        .quote-section {
            padding: 50px;
            background: white;
        }
        
        .quote-header {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .quote-label {
            color: #64748b;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .quote-container {
            background: #f8fafc;
            border: 3px solid #e2e8f0;
            border-radius: 16px;
            padding: 40px;
            position: relative;
            margin: 30px 0;
        }
        
        .quote-container::before {
            content: '"';
            position: absolute;
            top: -20px;
            left: 30px;
            font-size: 80px;
            color: #2563eb;
            font-family: serif;
            line-height: 1;
        }
        
        .quote-text {
            font-size: 22px;
            color: #1e293b;
            line-height: 1.7;
            margin-bottom: 25px;
            font-style: italic;
            text-align: center;
        }
        
        .quote-attribution {
            text-align: right;
            font-size: 18px;
            color: #475569;
            font-weight: 600;
        }
        
        /* Expert Authority Section */
        .authority-section {
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            padding: 50px;
        }
        
        .authority-title {
            text-align: center;
            font-size: 24px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 35px;
        }
        
        .credentials-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 25px;
        }
        
        .credential-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
            border-top: 4px solid #2563eb;
        }
        
        .credential-icon {
            font-size: 32px;
            margin-bottom: 15px;
            display: block;
        }
        
        .credential-label {
            font-size: 12px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }
        
        .credential-value {
            font-size: 16px;
            color: #1e293b;
            font-weight: 600;
            line-height: 1.4;
        }
        
        /* Bio Section */
        .bio-section {
            padding: 50px;
            background: white;
        }
        
        .bio-title {
            font-size: 24px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 25px;
            text-align: center;
        }
        
        .bio-text {
            font-size: 18px;
            color: #475569;
            line-height: 1.8;
            text-align: center;
            max-width: 600px;
            margin: 0 auto;
            font-style: italic;
        }
        
        /* Value Proposition */
        .value-section {
            background: #1e293b;
            color: white;
            padding: 40px 50px;
            text-align: center;
        }
        
        .value-title {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 15px;
        }
        
        .value-text {
            font-size: 16px;
            opacity: 0.9;
            line-height: 1.6;
        }
        
        /* SEO Benefits Highlight */
        .seo-highlight {
            background: linear-gradient(135deg, #dcfce7, #bbf7d0);
            border: 3px solid #16a34a;
            margin: 30px 0;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
        }
        
        .seo-badge {
            background: #16a34a;
            color: white;
            padding: 8px 20px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 700;
            display: inline-block;
            margin-bottom: 10px;
        }
        
        .seo-text {
            color: #166534;
            font-weight: 600;
            font-size: 16px;
        }
        
        @media print {
            body { -webkit-print-color-adjust: exact; }
        }
        
        @media (max-width: 768px) {
            .expert-hero { padding: 40px 30px; }
            .expert-name { font-size: 36px; }
            .quote-section, .authority-section, .bio-section { padding: 30px 25px; }
            .credentials-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="expert-showcase">
        <!-- Expert Hero Section -->
        <div class="expert-hero">
            <div class="expert-photo">
                ${!pitch.user.avatar ? (pitch.user.fullName?.substring(0, 2).toUpperCase() || 'EX') : ''}
            </div>
            <h1 class="expert-name">${pitch.user.fullName || 'Expert Profile'}</h1>
            <div class="expert-credentials">
                ${pitch.user.title ? `${pitch.user.title}` : 'Industry Expert'}${pitch.user.company ? ` at ${pitch.user.company}` : ''}
            </div>
            
            <div class="authority-badges">
                ${pitch.user.industry ? `<span class="authority-badge">🏆 ${pitch.user.industry} Expert</span>` : ''}
                ${pitch.user.location ? `<span class="authority-badge">📍 ${pitch.user.location}</span>` : ''}
                <span class="authority-badge">✅ Verified Source</span>
                ${pitch.user.doFollowLink && pitch.user.doFollowLink !== 'None' ? '<span class="authority-badge">🔗 SEO Benefits</span>' : ''}
            </div>
        </div>
        
        <!-- Story Relevance -->
        ${pitch.opportunity ? `
        <div class="story-section">
            <div class="story-label">Perfect Expert For Your Story</div>
            <h2 class="story-title">${pitch.opportunity.title}</h2>
            <div class="expert-relevance">
                ${pitch.user.fullName} brings deep ${pitch.user.industry || 'industry'} expertise and practical insights that will resonate with your readers. Their professional background makes them an authoritative voice on this topic.
            </div>
        </div>
        ` : ''}
        
        <!-- Expert Quote -->
        <div class="quote-section">
            <div class="quote-header">
                <div class="quote-label">Ready-to-Use Expert Quote</div>
            </div>
            <div class="quote-container">
                <div class="quote-text">${pitch.content.trim().replace(/\n+/g, ' ')}</div>
                <div class="quote-attribution">
                    — ${pitch.user.fullName}${pitch.user.title ? `, ${pitch.user.title}` : ''}
                </div>
            </div>
        </div>
        
        <!-- Expert Bio -->
        ${pitch.user.bio ? `
        <div class="bio-section">
            <h3 class="bio-title">About the Expert</h3>
            <div class="bio-text">${pitch.user.bio}</div>
        </div>
        ` : ''}
        
        <!-- SEO Benefits -->
        ${pitch.user.doFollowLink && pitch.user.doFollowLink !== 'None' ? `
        <div class="seo-highlight">
            <div class="seo-badge">✅ ADDED VALUE FOR YOUR PUBLICATION</div>
            <div class="seo-text">Featuring this expert provides valuable SEO benefits for your article</div>
        </div>
        ` : ''}
        
        <!-- Expert Authority/Credentials -->
        <div class="authority-section">
            <h3 class="authority-title">Expert Credentials & Authority</h3>
            <div class="credentials-grid">
                ${pitch.user.industry ? `
                <div class="credential-card">
                    <span class="credential-icon">🏆</span>
                    <div class="credential-label">Expertise</div>
                    <div class="credential-value">${pitch.user.industry} Professional</div>
                </div>
                ` : ''}
                ${pitch.user.title ? `
                <div class="credential-card">
                    <span class="credential-icon">💼</span>
                    <div class="credential-label">Position</div>
                    <div class="credential-value">${pitch.user.title}</div>
                </div>
                ` : ''}
                ${pitch.user.company ? `
                <div class="credential-card">
                    <span class="credential-icon">🏢</span>
                    <div class="credential-label">Organization</div>
                    <div class="credential-value">${pitch.user.company}</div>
                </div>
                ` : ''}
                ${pitch.user.location ? `
                <div class="credential-card">
                    <span class="credential-icon">📍</span>
                    <div class="credential-label">Location</div>
                    <div class="credential-value">${pitch.user.location}</div>
                </div>
                ` : ''}
            </div>
        </div>
        
        <!-- Value Proposition -->
        <div class="value-section">
            <h3 class="value-title">Why This Expert is Perfect for Your Story</h3>
            <div class="value-text">
                Verified professional credentials • Ready-to-use expert quotes • Relevant industry authority • Available for follow-up questions
                ${pitch.user.doFollowLink && pitch.user.doFollowLink !== 'None' ? ' • SEO benefits included' : ''}
            </div>
        </div>
    </div>
</body>
</html>
    `;

    // Open in new window
    const newWindow = window.open('', '_blank', 'width=1000,height=1200,scrollbars=yes,resizable=yes');
    if (newWindow) {
      newWindow.document.write(mediaKitHTML);
      newWindow.document.close();
      
      // Focus the new window
      newWindow.focus();
      
      toast({
        title: "Expert Media Kit Generated",
        description: "Professional expert showcase ready for reporters! Use Ctrl+P (or Cmd+P) to save as PDF.",
      });
    } else {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups for this site to generate the media kit.",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0 gap-0 flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading pitch details...</p>
            </div>
          </div>
        ) : pitch ? (
          <>
            {/* Compact Header */}
            <DialogHeader className="border-b border-gray-200 px-4 py-3 bg-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-400" />
                    Pitch {pitch.id}
                  </DialogTitle>
                  <p className="text-xs text-gray-500 mt-1">
                    Submitted {formatDistanceToNow(new Date(pitch.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateMediaKitPDF}
                    className="gap-1 h-8 text-xs px-3 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    <FileDown className="h-3 w-3" />
                    Export Media Kit
                  </Button>
                  <StatusBadge status={pitch.status} />
                  {pitch.bidAmount && (
                    <Badge variant="secondary" className="text-xs px-2 py-1">
                      <DollarSign className="h-3 w-3 mr-1" />
                      ${pitch.bidAmount.toFixed(2)}
                    </Badge>
                  )}
                </div>
              </div>
            </DialogHeader>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-4 space-y-4">
                
                {/* Opportunity Details - Compact */}
                <Card className="border border-gray-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Target className="h-4 w-4 text-gray-600" />
                        Opportunity Details
                      </CardTitle>
                      <Select
                        value={pitch.status}
                        onValueChange={updatePitchStatus}
                        disabled={updatingStatus}
                      >
                        <SelectTrigger className="w-40 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <config.icon className="h-3 w-3" />
                                {config.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3">
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {pitch.opportunity?.publication?.name || 'N/A'}: {pitch.opportunity?.title || 'Unnamed Opportunity'}
                      </h3>
                      {pitch.opportunity?.description && (
                        <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">
                          {pitch.opportunity.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-4 gap-3 pt-2 border-t border-gray-100">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Publication</p>
                        <p className="text-xs font-medium text-gray-900">{pitch.opportunity?.publication?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Tier</p>
                        <p className="text-xs font-medium text-gray-900">{pitch.opportunity?.tier || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Deadline</p>
                        <p className="text-xs font-medium text-gray-900">{formatDate(pitch.opportunity?.deadline || '')}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Bid Amount</p>
                        <p className="text-xs font-medium text-gray-900">${pitch.bidAmount?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* User Profile - Redesigned for Better Visual Appeal */}
                {pitch.user && (
                  <Card className="border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                    <CardContent className="p-0">
                      {/* Profile Header with Avatar and Key Info */}
                      <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-lg">
                        <div className="flex items-start gap-4">
                          <div className="relative">
                            <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                              <AvatarImage src={pitch.user.avatar} />
                              <AvatarFallback className="text-lg bg-white text-blue-600 font-bold">
                                {pitch.user.fullName?.substring(0, 2).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 bg-green-400 rounded-full p-1">
                              <CheckCircle className="h-3 w-3 text-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-white mb-1">{pitch.user.fullName}</h3>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {pitch.user.title && (
                                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                                  <Briefcase className="h-3 w-3 mr-1" />
                                  {pitch.user.title}
                                </Badge>
                              )}
                              {pitch.user.industry && (
                                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                                  <Building className="h-3 w-3 mr-1" />
                                  {pitch.user.industry}
                                </Badge>
                              )}
                            </div>
                            {pitch.user.location && (
                              <p className="text-white/90 text-sm flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {pitch.user.location}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Bio Section */}
                        {pitch.user.bio && (
                          <div className="mt-3 pt-3 border-t border-white/20">
                            <p className="text-white/90 text-sm italic line-clamp-2">
                              "{pitch.user.bio}"
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Profile Content */}
                      <div className="p-4 space-y-4">
                        
                        {/* Contact Information Card */}
                        <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                            <Mail className="h-4 w-4 text-blue-600" />
                            Contact Information
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            {pitch.user.email && (
                              <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 transition-colors">
                                <div className="bg-blue-100 p-1.5 rounded-md">
                                  <Mail className="h-3 w-3 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-500">Email</p>
                                  <a href={`mailto:${pitch.user.email}`} className="text-sm text-blue-600 hover:underline truncate block font-medium">
                                    {pitch.user.email}
                                  </a>
                                </div>
                              </div>
                            )}
                            {pitch.user.phone_number && (
                              <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 transition-colors">
                                <div className="bg-green-100 p-1.5 rounded-md">
                                  <Phone className="h-3 w-3 text-green-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-500">Phone</p>
                                  <p className="text-sm text-gray-900 font-medium">{pitch.user.phone_number}</p>
                                </div>
                              </div>
                            )}
                            {pitch.user.company && (
                              <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 transition-colors">
                                <div className="bg-purple-100 p-1.5 rounded-md">
                                  <Building2 className="h-3 w-3 text-purple-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-500">Company</p>
                                  <p className="text-sm text-gray-900 font-medium">{pitch.user.company}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Social Media & Links Card */}
                        <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                            <Globe className="h-4 w-4 text-indigo-600" />
                            Social Media & Links
                            {pitch.user.doFollowLink && pitch.user.doFollowLink !== 'None' && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 ml-auto">
                                <Award className="h-2 w-2 mr-1" />
                                Do-Follow
                              </Badge>
                            )}
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {pitch.user.website && (
                              <a href={pitch.user.website} target="_blank" rel="noopener noreferrer" 
                                 className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 transition-colors group">
                                <div className="bg-gray-100 p-1.5 rounded-md group-hover:bg-gray-200 transition-colors">
                                  <Globe className="h-3 w-3 text-gray-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-500">Website</p>
                                  <p className="text-sm text-blue-600 font-medium truncate">Visit Site</p>
                                </div>
                                <ExternalLink className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </a>
                            )}
                            {pitch.user.linkedIn && (
                              <a href={pitch.user.linkedIn} target="_blank" rel="noopener noreferrer" 
                                 className="flex items-center gap-2 p-2 rounded-md hover:bg-blue-50 transition-colors group">
                                <div className="bg-blue-100 p-1.5 rounded-md group-hover:bg-blue-200 transition-colors">
                                  <Linkedin className="h-3 w-3 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-500">LinkedIn</p>
                                  <p className="text-sm text-blue-600 font-medium truncate">Connect</p>
                                </div>
                                <ExternalLink className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </a>
                            )}
                            {pitch.user.twitter && (
                              <a href={pitch.user.twitter} target="_blank" rel="noopener noreferrer" 
                                 className="flex items-center gap-2 p-2 rounded-md hover:bg-sky-50 transition-colors group">
                                <div className="bg-sky-100 p-1.5 rounded-md group-hover:bg-sky-200 transition-colors">
                                  <Twitter className="h-3 w-3 text-sky-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-500">Twitter</p>
                                  <p className="text-sm text-sky-600 font-medium truncate">Follow</p>
                                </div>
                                <ExternalLink className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </a>
                            )}
                            {pitch.user.instagram && (
                              <a href={pitch.user.instagram} target="_blank" rel="noopener noreferrer" 
                                 className="flex items-center gap-2 p-2 rounded-md hover:bg-pink-50 transition-colors group">
                                <div className="bg-pink-100 p-1.5 rounded-md group-hover:bg-pink-200 transition-colors">
                                  <Instagram className="h-3 w-3 text-pink-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-gray-500">Instagram</p>
                                  <p className="text-sm text-pink-600 font-medium truncate">Follow</p>
                                </div>
                                <ExternalLink className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* User Stats */}
                        <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                            <User className="h-4 w-4 text-indigo-600" />
                            Account Information
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-2 bg-blue-50 rounded-md">
                              <p className="text-xs text-gray-500 mb-1">Member Since</p>
                              <p className="text-sm font-semibold text-blue-600">
                                {formatDate(pitch.user.createdAt || '')}
                              </p>
                            </div>
                            <div className="text-center p-2 bg-green-50 rounded-md">
                              <p className="text-xs text-gray-500 mb-1">Profile Status</p>
                              <p className="text-sm font-semibold text-green-600 flex items-center justify-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Complete
                              </p>
                            </div>
                          </div>
                        </div>

                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Pitch Content - Moved Below User Profile */}
                <Card className="border border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4 text-gray-600" />
                      Pitch Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3">
                    {pitch.audioUrl ? (
                      <div className="space-y-2">
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Mic className="h-3 w-3 text-blue-600" />
                              <span className="font-medium text-blue-900 text-xs">Audio Pitch</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsPlaying(!isPlaying)}
                              className="h-6 w-6 p-0"
                            >
                              {isPlaying ? (
                                <PauseCircle className="h-3 w-3 text-blue-600" />
                              ) : (
                                <PlayCircle className="h-3 w-3 text-blue-600" />
                              )}
                            </Button>
                          </div>
                          <audio controls className="w-full h-6">
                            <source src={pitch.audioUrl} type="audio/mpeg" />
                          </audio>
                        </div>
                        {pitch.transcript && (
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-1 text-xs">Transcript</h4>
                            <p className="text-gray-700 text-xs leading-relaxed whitespace-pre-wrap max-h-20 overflow-y-auto">
                              {pitch.transcript}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-xs max-h-16 overflow-y-auto">
                          {pitch.content}
                        </p>
                      </div>
                    )}

                    {/* Formatted Quote - Compact */}
                    <div className="border-t border-gray-100 pt-3 mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 text-xs">Formatted Quote</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyQuoteToClipboard}
                          className="gap-1 h-6 text-xs px-2"
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </Button>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <p className="italic text-gray-800 leading-relaxed text-xs">
                          "{pitch.content.trim().replace(/\n+/g, ' ')}" —{pitch.user?.fullName || 'Anonymous'}{pitch.user?.title ? `, ${pitch.user.title}` : ''}{getDoFollowLinkDisplay(pitch.user)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Communication Section - Added at Bottom */}
                <Card className="border border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MessageSquare className="h-4 w-4 text-gray-600" />
                      Communication
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3">
                    <PitchMessageThread pitch={{
                      id: pitch.id,
                      userId: pitch.userId,
                      opportunityId: pitch.opportunityId,
                      content: pitch.content,
                      bidAmount: pitch.bidAmount || 0,
                      status: pitch.status as any,
                      createdAt: pitch.createdAt,
                      opportunity: pitch.opportunity as any,
                    }} />
                  </CardContent>
                </Card>
                
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <XCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600">Failed to load pitch details</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}