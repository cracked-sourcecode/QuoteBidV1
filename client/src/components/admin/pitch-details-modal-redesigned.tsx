import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileDown,
  Star,
  TrendingUp,
  Eye,
  Users,
  Sparkles
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

// Enhanced status configuration with modern styling
const statusConfig = {
  pending: { 
    label: 'Pending Review', 
    color: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: Clock,
  },
  sent_to_reporter: { 
    label: 'Sent to Reporter', 
    color: 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Send,
  },
  interested: { 
    label: 'Reporter Interested', 
    color: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: TrendingUp,
  },
  not_interested: { 
    label: 'Not Interested', 
    color: 'bg-gradient-to-r from-red-500 to-rose-600 text-white',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircle,
  },
  successful: { 
    label: 'Successful Coverage', 
    color: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: Award,
  },
  draft: {
    label: 'Draft',
    color: 'bg-gradient-to-r from-gray-500 to-slate-600 text-white',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
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
  const [activeTab, setActiveTab] = useState("overview");
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
    
    const quote = `"${pitch.content.trim().replace(/\n+/g, ' ')}" —${pitch.user?.fullName || 'Anonymous'}${pitch.user?.title ? `, ${pitch.user.title}` : ''}`;
    
    // Fallback for older browsers or if clipboard API fails
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(quote).then(() => {
        toast({
          title: "Copied!",
          description: "Quote copied to clipboard",
        });
      }).catch(() => {
        // Fallback to textarea method
        fallbackCopyTextToClipboard(quote);
      });
    } else {
      // Fallback for older browsers
      fallbackCopyTextToClipboard(quote);
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        toast({
          title: "Copied!",
          description: "Quote copied to clipboard",
        });
      } else {
        toast({
          title: "Copy Failed",
          description: "Please manually select and copy the text",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please manually select and copy the text",
        variant: "destructive",
      });
    }
    
    document.body.removeChild(textArea);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: 'bg-gradient-to-r from-gray-500 to-slate-600 text-white',
      icon: AlertCircle
    };
    const Icon = config.icon;
    
    return (
      <div className={`${config.color} inline-flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg font-medium text-sm whitespace-nowrap`}>
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{config.label}</span>
      </div>
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
      <DialogContent className="max-w-7xl max-h-[95vh] p-0 gap-0 flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 [&>button]:hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-6" />
              <p className="text-lg text-gray-600 font-medium">Loading pitch details...</p>
              <p className="text-sm text-gray-500 mt-2">Gathering comprehensive information</p>
            </div>
          </div>
        ) : pitch ? (
          <>
            {/* Enhanced Header with Gradient */}
            <DialogHeader className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white px-8 py-6 flex-shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3Cpattern id='grid' width='10' height='10' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 0 L 0 0 0 10' fill='none' stroke='rgba(255,255,255,0.1)' stroke-width='0.5'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grid)'/%3E%3C/svg%3E")`
              }}></div>
              
              {/* Custom Close Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="absolute top-4 right-4 z-10 h-10 w-10 p-0 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white hover:text-white transition-all duration-200 backdrop-blur-sm"
              >
                <XCircle className="h-5 w-5" />
              </Button>
              
              <div className="relative flex items-start justify-between pr-16">
                <div className="flex items-center gap-6 flex-1 min-w-0">
                  {pitch.user && (
                    <Avatar className="h-16 w-16 ring-4 ring-white/30 shadow-2xl flex-shrink-0">
                      <AvatarImage src={pitch.user.avatar} />
                      <AvatarFallback className="text-xl bg-white/20 text-white font-bold backdrop-blur-sm">
                        {pitch.user.fullName?.substring(0, 2).toUpperCase() || 'EX'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                      <Sparkles className="h-8 w-8 text-yellow-400 flex-shrink-0" />
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

            {/* Enhanced Tabs Navigation */}
            <div className="bg-white border-b border-gray-200 px-8 py-4 flex-shrink-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-xl p-1">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
                    <Eye className="h-4 w-4 mr-2" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="communication" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Communication
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                
                {/* Overview Tab */}
                <TabsContent value="overview" className="p-8 space-y-6 m-0">
                  
                  {/* Expert Profile Section - NOW AT TOP */}
                  {pitch.user && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                      
                      {/* Expert Header Card */}
                      <Card className="lg:col-span-2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white border-0 shadow-2xl overflow-hidden">
                        <div className="absolute inset-0 opacity-20" style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' fill='none' stroke='rgba(255,255,255,0.1)' stroke-width='1'/%3E%3C/svg%3E")`
                        }}></div>
                        <CardContent className="p-8 relative">
                          <div className="flex items-start gap-6">
                            <Avatar className="h-24 w-24 ring-4 ring-white/40 shadow-2xl">
                              <AvatarImage src={pitch.user.avatar} />
                              <AvatarFallback className="text-2xl bg-white/20 text-white font-bold backdrop-blur-sm">
                                {pitch.user.fullName?.substring(0, 2).toUpperCase() || 'EX'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h2 className="text-3xl font-bold text-white mb-2">{pitch.user.fullName}</h2>
                              <div className="flex flex-wrap gap-3 mb-4">
                                {pitch.user.title && (
                                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                                    <Briefcase className="h-4 w-4 mr-2" />
                                    {pitch.user.title}
                                  </Badge>
                                )}
                                {pitch.user.industry && (
                                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                                    <Building className="h-4 w-4 mr-2" />
                                    {pitch.user.industry}
                                  </Badge>
                                )}
                                {pitch.user.location && (
                                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                                    <MapPin className="h-4 w-4 mr-2" />
                                    {pitch.user.location}
                                  </Badge>
                                )}
                              </div>
                              {pitch.user.bio && (
                                <p className="text-white/90 text-lg italic leading-relaxed">
                                  "{pitch.user.bio}"
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Contact Information */}
                      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-lg">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-3 text-xl font-bold text-blue-900">
                            <div className="p-2 bg-blue-500 rounded-xl">
                              <Mail className="h-6 w-6 text-white" />
                            </div>
                            Contact Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {pitch.user.email && (
                            <div className="flex items-center gap-4 p-4 bg-white/80 rounded-xl hover:bg-white transition-colors">
                              <div className="p-3 bg-blue-100 rounded-lg">
                                <Mail className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">Email Address</p>
                                <a href={`mailto:${pitch.user.email}`} className="text-lg font-semibold text-blue-600 hover:underline">
                                  {pitch.user.email}
                                </a>
                              </div>
                            </div>
                          )}
                          {pitch.user.phone_number && (
                            <div className="flex items-center gap-4 p-4 bg-white/80 rounded-xl hover:bg-white transition-colors">
                              <div className="p-3 bg-green-100 rounded-lg">
                                <Phone className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">Phone Number</p>
                                <p className="text-lg font-semibold text-gray-900">{pitch.user.phone_number}</p>
                              </div>
                            </div>
                          )}
                          {pitch.user.company && (
                            <div className="flex items-center gap-4 p-4 bg-white/80 rounded-xl hover:bg-white transition-colors">
                              <div className="p-3 bg-purple-100 rounded-lg">
                                <Building2 className="h-5 w-5 text-purple-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">Company</p>
                                <p className="text-lg font-semibold text-gray-900">{pitch.user.company}</p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Social Media & Links */}
                      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-3 text-xl font-bold text-green-900">
                            <div className="p-2 bg-green-500 rounded-xl">
                              <Globe className="h-6 w-6 text-white" />
                            </div>
                            Social Media & Links
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {pitch.user.website && (
                            <a href={pitch.user.website} target="_blank" rel="noopener noreferrer" 
                               className="flex items-center gap-4 p-4 bg-white/80 rounded-xl hover:bg-white transition-all hover:shadow-md group">
                              <div className="p-3 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                                <Globe className="h-5 w-5 text-gray-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">Website</p>
                                <p className="text-lg font-semibold text-blue-600">Visit Site</p>
                              </div>
                              <ExternalLink className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          )}
                          {pitch.user.linkedIn && (
                            <a href={pitch.user.linkedIn} target="_blank" rel="noopener noreferrer" 
                               className="flex items-center gap-4 p-4 bg-white/80 rounded-xl hover:bg-white transition-all hover:shadow-md group">
                              <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                                <Linkedin className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">LinkedIn</p>
                                <p className="text-lg font-semibold text-blue-600">Connect</p>
                              </div>
                              <ExternalLink className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          )}
                          {pitch.user.twitter && (
                            <a href={pitch.user.twitter} target="_blank" rel="noopener noreferrer" 
                               className="flex items-center gap-4 p-4 bg-white/80 rounded-xl hover:bg-white transition-all hover:shadow-md group">
                              <div className="p-3 bg-sky-100 rounded-lg group-hover:bg-sky-200 transition-colors">
                                <Twitter className="h-5 w-5 text-sky-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">Twitter</p>
                                <p className="text-lg font-semibold text-sky-600">Follow</p>
                              </div>
                              <ExternalLink className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          )}
                          {pitch.user.instagram && (
                            <a href={pitch.user.instagram} target="_blank" rel="noopener noreferrer" 
                               className="flex items-center gap-4 p-4 bg-white/80 rounded-xl hover:bg-white transition-all hover:shadow-md group">
                              <div className="p-3 bg-pink-100 rounded-lg group-hover:bg-pink-200 transition-colors">
                                <Instagram className="h-5 w-5 text-pink-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600">Instagram</p>
                                <p className="text-lg font-semibold text-pink-600">Follow</p>
                              </div>
                              <ExternalLink className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Opportunity Card - NOW ABOVE PITCH CONTENT */}
                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg mb-6">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-3 text-xl font-bold text-blue-900">
                          <div className="p-2 bg-blue-500 rounded-xl">
                            <Target className="h-6 w-6 text-white" />
                          </div>
                          Opportunity
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

                  {/* Pitch Content Card - NOW BELOW OPPORTUNITY */}
                  <Card className="bg-gradient-to-br from-slate-50 to-gray-50 border-gray-200 shadow-lg">
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
                              <div className="prose prose-sm max-w-none">
                                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                                  {pitch.transcript}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-600" />
                            Pitch Content
                          </h4>
                          <div className="prose prose-sm max-w-none">
                            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                              {pitch.content}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Formatted Quote Section */}
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-amber-900 flex items-center gap-2">
                            <Copy className="h-4 w-4" />
                            Ready-to-Use Quote
                          </h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={copyQuoteToClipboard}
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
                </TabsContent>

                {/* Communication Tab */}
                <TabsContent value="communication" className="p-8 m-0">
                  <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-xl font-bold text-indigo-900">
                        <div className="p-2 bg-indigo-500 rounded-xl">
                          <MessageSquare className="h-6 w-6 text-white" />
                        </div>
                        Communication Thread
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="bg-white rounded-xl p-6">
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
                </TabsContent>

              </Tabs>
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