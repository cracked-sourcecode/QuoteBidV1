import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  User,
  FileText,
  Mail,
  Globe,
  Twitter,
  Linkedin,
  Mic,
  Clock,
  Bookmark,
  Calendar,
  DownloadCloud,
  Loader2,
  MapPin,
  Building,
  MessageSquare,
  ExternalLink,
  Sliders,
  Circle,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  Target,
  Instagram,
  Link,
  Briefcase,
  Award,
  ChevronRight,
  Copy,
  Share2,
  Building2,
  Hash,
  Phone,
  Maximize2,
  Minimize2,
  ScrollText
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";
import PitchMessageThread from "../pitch-message-thread";
import { PitchDTO } from "@/utils/pitchInterfaces";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

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

// Status configuration with icons
const statusConfig = {
  pending: { 
    label: 'Pending Review', 
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: Clock,
  },
  sent_to_reporter: { 
    label: 'Sent to Reporter', 
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: Send,
  },
  interested: { 
    label: 'Reporter Interested', 
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: CheckCircle,
  },
  not_interested: { 
    label: 'Not Interested', 
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: XCircle,
  },
  successful: { 
    label: 'Successful Coverage', 
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: Award,
  },
  draft: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: FileText,
  }
};

// Function to get the formatted do-follow link for attribution
function getDoFollowLinkDisplay(user: any): string {
  if (!user || !user.doFollowLink || user.doFollowLink === 'None') return '';
  
  let url = '';
  
  // Get the URL based on the doFollowLink type
  switch (user.doFollowLink.toLowerCase()) {
    case 'website':
      url = user.website;
      break;
    case 'linkedin':
      url = user.linkedIn;
      break;
    case 'twitter':
      url = user.twitter;
      break;
    case 'instagram':
      url = user.instagram;
      break;
    default:
      // If doFollowLink is a URL itself
      if (user.doFollowLink.startsWith('http')) {
        url = user.doFollowLink;
      }
  }
  
  // Return empty string if no URL is found
  if (!url) return '';
  
  // Return URL in parentheses
  return ` (${url})`;
}

// Helper function to format date consistently
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
  const [isCompactView, setIsCompactView] = useState(false);
  const [fullScrollMode, setFullScrollMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
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

  const generatePDF = async () => {
    if (!pitch || !pitch.user || !containerRef.current) return;

    try {
      toast({
        title: "Generating PDF",
        description: "Please wait while we generate the media kit PDF..."
      });
      
      const element = containerRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const userName = pitch.user.fullName || pitch.user.username || 'User';
      pdf.save(`${userName.replace(/\s+/g, '-').toLowerCase()}-media-kit.pdf`);

      toast({
        title: "Media Kit Generated",
        description: "The PDF has been downloaded successfully."
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive"
      });
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: 'bg-gray-100 text-gray-800 border-gray-300',
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`${isCompactView ? 'max-w-4xl h-[70vh]' : 'max-w-7xl h-[95vh]'} p-0 gap-0 overflow-hidden transition-all duration-300`} aria-describedby="pitch-details-description">
        {isLoading ? (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-lg text-gray-600">Loading pitch details...</p>
            </div>
          </div>
        ) : pitch ? (
          <div className="flex flex-col h-full bg-gray-50" ref={containerRef}>
            {/* Enhanced Header */}
            <div className="bg-white border-b px-6 py-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Hash className="h-5 w-5 text-gray-400" />
                    <h2 className="text-2xl font-bold text-gray-900">Pitch {pitch.id}</h2>
                  </div>
                  <p className="text-sm text-gray-500 ml-7">
                    Submitted {formatDistanceToNow(new Date(pitch.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={pitch.status} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFullScrollMode(!fullScrollMode)}
                    className="gap-2"
                    title={fullScrollMode ? "Switch to tab scroll mode" : "Switch to full scroll mode"}
                  >
                    {fullScrollMode ? (
                      <>
                        <FileText className="h-4 w-4" />
                        Tab Scroll
                      </>
                    ) : (
                      <>
                        <ScrollText className="h-4 w-4" />
                        Full Scroll
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCompactView(!isCompactView)}
                    className="gap-2"
                  >
                    {isCompactView ? (
                      <>
                        <Maximize2 className="h-4 w-4" />
                        Expand
                      </>
                    ) : (
                      <>
                        <Minimize2 className="h-4 w-4" />
                        Compact
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generatePDF}
                    className="gap-2 bg-white hover:bg-gray-50"
                  >
                    <DownloadCloud className="h-4 w-4" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </div>

            {/* Content Area */}
            {fullScrollMode ? (
              <ScrollArea className="flex-1">
                <div className="bg-gray-50">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
                    <div className="bg-white border-b px-6 sticky top-0 z-10">
                      <TabsList className="h-12 bg-transparent p-0 gap-6">
                        <TabsTrigger 
                          value="details" 
                          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 font-medium text-sm"
                        >
                          Details
                        </TabsTrigger>
                        <TabsTrigger 
                          value="user" 
                          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 font-medium text-sm"
                        >
                          User Profile
                        </TabsTrigger>
                        <TabsTrigger 
                          value="messages" 
                          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 font-medium text-sm"
                        >
                          Messages
                        </TabsTrigger>
                        <TabsTrigger 
                          value="media" 
                          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 font-medium text-sm"
                        >
                          Media Kit
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <div className="p-6">
                    {/* Details Tab */}
                    <TabsContent value="details" className="mt-0 space-y-6">
                      {/* Opportunity Info Card */}
                      <Card className="shadow-sm border-gray-200">
                        <CardHeader className="bg-gray-50 border-b py-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              <Target className="h-5 w-5 text-gray-600" />
                              Opportunity Details
                            </h3>
                            {pitch.bidAmount && (
                              <Badge variant="secondary" className="text-sm px-3 py-1">
                                ${pitch.bidAmount.toFixed(2)} bid
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                          <div>
                            <h4 className="text-xl font-bold text-gray-900 mb-2">
                              {pitch.opportunity?.title || 'Unnamed Opportunity'}
                            </h4>
                            {pitch.opportunity?.description && (
                              <p className="text-gray-600 whitespace-pre-wrap leading-relaxed text-sm">
                                {pitch.opportunity.description}
                              </p>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-gray-500">Publication</p>
                              <p className="text-sm font-semibold text-gray-900">{pitch.opportunity?.publication?.name || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-gray-500">Tier</p>
                              <p className="text-sm font-semibold text-gray-900">{pitch.opportunity?.tier || 'N/A'}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-gray-500">Deadline</p>
                              <p className="text-sm font-semibold text-gray-900">{formatDate(pitch.opportunity?.deadline || '')}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-gray-500">Status</p>
                              <Select
                                value={pitch.status}
                                onValueChange={updatePitchStatus}
                                disabled={updatingStatus}
                              >
                                <SelectTrigger className="w-full h-8 text-sm">
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
                          </div>
                        </CardContent>
                      </Card>

                      {/* Pitch Content Card */}
                      <Card className="shadow-sm border-gray-200">
                        <CardHeader className="bg-gray-50 border-b py-4">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <FileText className="h-5 w-5 text-gray-600" />
                            Pitch Content
                          </h3>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                          {pitch.audioUrl ? (
                            <div className="space-y-4">
                              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <div className="flex items-center gap-2 mb-3">
                                  <Mic className="h-5 w-5 text-blue-600" />
                                  <span className="font-semibold text-blue-900">Audio Pitch</span>
                                </div>
                                <audio controls className="w-full">
                                  <source src={pitch.audioUrl} type="audio/mpeg" />
                                </audio>
                              </div>
                              {pitch.transcript && (
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-2">Transcript</h4>
                                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                                      {pitch.transcript}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {pitch.content}
                              </p>
                            </div>
                          )}

                          {/* Formatted Quote Section */}
                          <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-gray-900">Formatted Quote</h4>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={copyQuoteToClipboard}
                                className="gap-2 h-8 text-sm"
                              >
                                <Copy className="h-3 w-3" />
                                Copy
                              </Button>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                              <p className="italic text-gray-800 leading-relaxed mb-2">
                                "{pitch.content.trim().replace(/\n+/g, ' ')}"
                              </p>
                              <p className="text-gray-700 text-sm">
                                —{pitch.user?.fullName || 'Anonymous'}
                                {pitch.user?.title && `, ${pitch.user.title}`}
                                {getDoFollowLinkDisplay(pitch.user)}
                              </p>
                            </div>
                          </div>

                          {/* Coverage Link Section */}
                          {pitch.status === 'successful' && (
                            <div className="border-t pt-4">
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                Published Coverage
                              </h4>
                              {pitch.article?.url ? (
                                <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-200">
                                  <a
                                    href={pitch.article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium flex items-center gap-2"
                                  >
                                    {pitch.article.title || pitch.article.url}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={async () => {
                                      const newUrl = window.prompt("Update coverage link:", pitch.article?.url);
                                      if (newUrl && newUrl !== pitch.article?.url) {
                                        try {
                                          await apiRequest("PATCH", `/api/admin/pitches/${pitch.id}/coverage`, {
                                            url: newUrl.startsWith('http') ? newUrl : `https://${newUrl}`,
                                            title: newUrl
                                          });
                                          setPitch(prev => prev ? {
                                            ...prev,
                                            article: { url: newUrl, title: newUrl }
                                          } : null);
                                          toast({ title: "Coverage link updated" });
                                        } catch (error) {
                                          toast({
                                            title: "Error",
                                            description: "Failed to update coverage link",
                                            variant: "destructive"
                                          });
                                        }
                                      }
                                    }}
                                  >
                                    Edit
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full h-9"
                                  onClick={async () => {
                                    const url = window.prompt("Add coverage link:");
                                    if (url) {
                                      try {
                                        await apiRequest("PATCH", `/api/admin/pitches/${pitch.id}/coverage`, {
                                          url: url.startsWith('http') ? url : `https://${url}`,
                                          title: url
                                        });
                                        setPitch(prev => prev ? {
                                          ...prev,
                                          article: { url, title: url }
                                        } : null);
                                        toast({ title: "Coverage link added" });
                                      } catch (error) {
                                        toast({
                                          title: "Error",
                                          description: "Failed to add coverage link",
                                          variant: "destructive"
                                        });
                                      }
                                    }
                                  }}
                                >
                                  Add Coverage Link
                                </Button>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* User Profile Tab */}
                    <TabsContent value="user" className="mt-0">
                      {pitch.user ? (
                        <div className="space-y-4">
                          {/* Main Profile Card */}
                          <Card className="shadow-sm border-gray-200 overflow-hidden">
                            {/* Profile Header with Gradient Background */}
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 pb-20 relative">
                              <div className="absolute top-4 right-4">
                                <Badge className="bg-white/20 backdrop-blur text-white border-white/30">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Verified Expert
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Profile Content */}
                            <CardContent className="p-6 -mt-16 relative">
                              <div className="flex flex-col items-center text-center mb-6">
                                <Avatar className="h-32 w-32 mb-4 ring-4 ring-white shadow-xl">
                                  <AvatarImage src={pitch.user.avatar} />
                                  <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                    {pitch.user.fullName?.substring(0, 2).toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                
                                <div className="space-y-2">
                                  <h3 className="text-2xl font-bold text-gray-900">{pitch.user.fullName}</h3>
                                  {pitch.user.title && (
                                    <p className="text-lg text-gray-600">{pitch.user.title}</p>
                                  )}
                                  {pitch.user.company && (
                                    <p className="text-gray-500 flex items-center justify-center gap-2">
                                      <Building2 className="h-4 w-4" />
                                      {pitch.user.company}
                                    </p>
                                  )}
                                </div>

                                {/* Quick Stats */}
                                <div className="flex items-center gap-6 mt-4 pt-4 border-t w-full max-w-sm">
                                  <div className="flex-1 text-center">
                                    <p className="text-2xl font-bold text-gray-900">
                                      {pitch.user.mediaKit?.length || 0}
                                    </p>
                                    <p className="text-xs text-gray-500">Media Features</p>
                                  </div>
                                  <div className="flex-1 text-center">
                                    <p className="text-2xl font-bold text-gray-900">
                                      {pitch.user.industry || 'N/A'}
                                    </p>
                                    <p className="text-xs text-gray-500">Industry</p>
                                  </div>
                                  <div className="flex-1 text-center">
                                    <p className="text-2xl font-bold text-green-600">Active</p>
                                    <p className="text-xs text-gray-500">Status</p>
                                  </div>
                                </div>
                              </div>

                              {/* Professional Summary */}
                              {pitch.user.bio && (
                                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Professional Summary
                                  </h4>
                                  <p className="text-gray-700 leading-relaxed">
                                    {pitch.user.bio}
                                  </p>
                                </div>
                              )}

                              {/* Contact & Social Grid */}
                              <div className="grid md:grid-cols-2 gap-6">
                                {/* Contact Information */}
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Contact Information
                                  </h4>
                                  <div className="space-y-3">
                                    {pitch.user.email && (
                                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                          <Mail className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-500 mb-0.5">Email</p>
                                          <a href={`mailto:${pitch.user.email}`} className="text-blue-600 hover:underline text-sm font-medium">
                                            {pitch.user.email}
                                          </a>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {pitch.user.location && (
                                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                          <MapPin className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-500 mb-0.5">Location</p>
                                          <p className="text-sm font-medium text-gray-900">{pitch.user.location}</p>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {pitch.user.phone_number && (
                                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                          <Phone className="h-5 w-5 text-purple-600" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-500 mb-0.5">Phone</p>
                                          <p className="text-sm font-medium text-gray-900">{pitch.user.phone_number}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Online Presence */}
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Globe className="h-4 w-4" />
                                    Online Presence
                                  </h4>
                                  <div className="space-y-3">
                                    {pitch.user.website && (
                                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                          <Globe className="h-5 w-5 text-indigo-600" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-500 mb-0.5">Website</p>
                                          <a
                                            href={pitch.user.website.startsWith('http') ? pitch.user.website : `https://${pitch.user.website}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline text-sm font-medium truncate block"
                                          >
                                            {pitch.user.website.replace(/^https?:\/\/(www\.)?/, '')}
                                          </a>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {pitch.user.linkedIn && (
                                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                          <Linkedin className="h-5 w-5 text-blue-700" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-500 mb-0.5">LinkedIn</p>
                                          <a
                                            href={pitch.user.linkedIn.startsWith('http') ? pitch.user.linkedIn : `https://linkedin.com/in/${pitch.user.linkedIn}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline text-sm font-medium"
                                          >
                                            View Profile
                                          </a>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {pitch.user.twitter && (
                                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                                          <Twitter className="h-5 w-5 text-sky-500" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-500 mb-0.5">Twitter/X</p>
                                          <a
                                            href={`https://twitter.com/${pitch.user.twitter.replace('@', '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline text-sm font-medium"
                                          >
                                            @{pitch.user.twitter.replace('@', '')}
                                          </a>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {pitch.user.instagram && (
                                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                                          <Instagram className="h-5 w-5 text-pink-600" />
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-500 mb-0.5">Instagram</p>
                                          <a
                                            href={`https://instagram.com/${pitch.user.instagram.replace('@', '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline text-sm font-medium"
                                          >
                                            @{pitch.user.instagram.replace('@', '')}
                                          </a>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Expertise & Credentials Card */}
                          <Card className="shadow-sm border-gray-200">
                            <CardHeader className="bg-gray-50 border-b">
                              <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Award className="h-5 w-5 text-gray-600" />
                                Expertise & Credentials
                              </h3>
                            </CardHeader>
                            <CardContent className="p-6">
                              <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Professional Details</h4>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between py-2 border-b">
                                      <span className="text-sm text-gray-600">Industry</span>
                                      <span className="text-sm font-medium text-gray-900">{pitch.user.industry || 'Not specified'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b">
                                      <span className="text-sm text-gray-600">Years of Experience</span>
                                      <span className="text-sm font-medium text-gray-900">10+ years</span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b">
                                      <span className="text-sm text-gray-600">Specialization</span>
                                      <span className="text-sm font-medium text-gray-900">{pitch.user.title || 'Expert'}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Platform Activity</h4>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between py-2 border-b">
                                      <span className="text-sm text-gray-600">Member Since</span>
                                      <span className="text-sm font-medium text-gray-900">
                                        {pitch.user.createdAt 
                                          ? formatDate(pitch.user.createdAt) 
                                          : 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b">
                                      <span className="text-sm text-gray-600">Response Rate</span>
                                      <span className="text-sm font-medium text-green-600">95%</span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b">
                                      <span className="text-sm text-gray-600">Avg. Response Time</span>
                                      <span className="text-sm font-medium text-gray-900">&lt; 2 hours</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Trust Badges */}
                              <div className="mt-6 pt-6 border-t">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Trust & Verification</h4>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="secondary" className="gap-1.5">
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                    Email Verified
                                  </Badge>
                                  <Badge variant="secondary" className="gap-1.5">
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                    Profile Complete
                                  </Badge>
                                  {pitch.user.linkedIn && (
                                    <Badge variant="secondary" className="gap-1.5">
                                      <Linkedin className="h-3 w-3 text-blue-600" />
                                      LinkedIn Connected
                                    </Badge>
                                  )}
                                  <Badge variant="secondary" className="gap-1.5">
                                    <Award className="h-3 w-3 text-purple-600" />
                                    Top Contributor
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ) : (
                        <Card className="shadow-sm border-gray-200">
                          <CardContent className="py-12 text-center text-gray-500">
                            <User className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                            <p>User information not available</p>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    {/* Messages Tab */}
                    <TabsContent value="messages" className="mt-0">
                      <Card className="shadow-sm border-gray-200">
                        <CardHeader className="bg-gray-50 border-b">
                          <h3 className="text-xl font-semibold">Communication Log</h3>
                        </CardHeader>
                        <CardContent className="p-0">
                          <PitchMessageThread pitch={pitch as PitchDTO} />
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* Media Kit Tab */}
                    <TabsContent value="media" className="mt-0">
                      {pitch.user?.mediaKit && Array.isArray(pitch.user.mediaKit) && pitch.user.mediaKit.length > 0 ? (
                        <Card className="shadow-sm border-gray-200">
                          <CardHeader className="bg-gray-50 border-b">
                            <h3 className="text-xl font-semibold">Media Coverage</h3>
                            <p className="text-gray-600">
                              Previous publications by {pitch.user.fullName}
                            </p>
                          </CardHeader>
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              {pitch.user.mediaKit.map((item, index) => {
                                const mediaItem = typeof item === 'string' 
                                  ? { title: item, url: '#' } 
                                  : item;
                                
                                return (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-200"
                                  >
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-gray-900 text-lg">{mediaItem.title}</h4>
                                      <div className="flex items-center gap-6 mt-2 text-sm text-gray-600">
                                        {mediaItem.publication && (
                                          <span className="flex items-center gap-2">
                                            <Bookmark className="h-4 w-4" />
                                            {mediaItem.publication}
                                          </span>
                                        )}
                                        {mediaItem.date && (
                                          <span className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            {mediaItem.date}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {mediaItem.url && mediaItem.url !== '#' && (
                                      <a
                                        href={mediaItem.url.startsWith('http') ? mediaItem.url : `https://${mediaItem.url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 ml-4"
                                      >
                                        View Article
                                        <ChevronRight className="h-4 w-4" />
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <Card className="shadow-sm border-gray-200">
                          <CardContent className="py-16 text-center text-gray-500">
                            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>No media kit items available</p>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>
                  </div>
                  </Tabs>
                </div>
              </ScrollArea>
            ) : (
                <div className="flex-1 overflow-hidden">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <div className="bg-white border-b px-6">
                      <TabsList className="h-12 bg-transparent p-0 gap-6">
                        <TabsTrigger 
                          value="details" 
                          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 font-medium text-sm"
                        >
                          Details
                        </TabsTrigger>
                        <TabsTrigger 
                          value="user" 
                          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 font-medium text-sm"
                        >
                          User Profile
                        </TabsTrigger>
                        <TabsTrigger 
                          value="messages" 
                          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 font-medium text-sm"
                        >
                          Messages
                        </TabsTrigger>
                        <TabsTrigger 
                          value="media" 
                          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 font-medium text-sm"
                        >
                          Media Kit
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <ScrollArea className="flex-1 bg-gray-50">
                      <div className="p-6">
                        {/* Details Tab */}
                        <TabsContent value="details" className="mt-0 space-y-6">
                          {/* Opportunity Info Card */}
                          <Card className="shadow-sm border-gray-200">
                            <CardHeader className="bg-gray-50 border-b py-4">
                              <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                  <Target className="h-5 w-5 text-gray-600" />
                                  Opportunity Details
                                </h3>
                                {pitch.bidAmount && (
                                  <Badge variant="secondary" className="text-sm px-3 py-1">
                                    ${pitch.bidAmount.toFixed(2)} bid
                                  </Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                              <div>
                                <h4 className="text-xl font-bold text-gray-900 mb-2">
                                  {pitch.opportunity?.title || 'Unnamed Opportunity'}
                                </h4>
                                {pitch.opportunity?.description && (
                                  <p className="text-gray-600 whitespace-pre-wrap leading-relaxed text-sm">
                                    {pitch.opportunity.description}
                                  </p>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-gray-500">Publication</p>
                                  <p className="text-sm font-semibold text-gray-900">{pitch.opportunity?.publication?.name || 'N/A'}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-gray-500">Tier</p>
                                  <p className="text-sm font-semibold text-gray-900">{pitch.opportunity?.tier || 'N/A'}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-gray-500">Deadline</p>
                                  <p className="text-sm font-semibold text-gray-900">{formatDate(pitch.opportunity?.deadline || '')}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-gray-500">Status</p>
                                  <Select
                                    value={pitch.status}
                                    onValueChange={updatePitchStatus}
                                    disabled={updatingStatus}
                                  >
                                    <SelectTrigger className="w-full h-8 text-sm">
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
                              </div>
                            </CardContent>
                          </Card>

                          {/* Pitch Content Card */}
                          <Card className="shadow-sm border-gray-200">
                            <CardHeader className="bg-gray-50 border-b py-4">
                              <h3 className="text-lg font-semibold flex items-center gap-2">
                                <FileText className="h-5 w-5 text-gray-600" />
                                Pitch Content
                              </h3>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                              {pitch.audioUrl ? (
                                <div className="space-y-4">
                                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Mic className="h-5 w-5 text-blue-600" />
                                      <span className="font-semibold text-blue-900">Audio Pitch</span>
                                    </div>
                                    <audio controls className="w-full">
                                      <source src={pitch.audioUrl} type="audio/mpeg" />
                                    </audio>
                                  </div>
                                  {pitch.transcript && (
                                    <div>
                                      <h4 className="font-semibold text-gray-900 mb-2">Transcript</h4>
                                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                                          {pitch.transcript}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {pitch.content}
                                  </p>
                                </div>
                              )}

                              {/* Formatted Quote Section */}
                              <div className="border-t pt-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-semibold text-gray-900">Formatted Quote</h4>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={copyQuoteToClipboard}
                                    className="gap-2 h-8 text-sm"
                                  >
                                    <Copy className="h-3 w-3" />
                                    Copy
                                  </Button>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                  <p className="italic text-gray-800 leading-relaxed mb-2">
                                    "{pitch.content.trim().replace(/\n+/g, ' ')}"
                                  </p>
                                  <p className="text-gray-700 text-sm">
                                    —{pitch.user?.fullName || 'Anonymous'}
                                    {pitch.user?.title && `, ${pitch.user.title}`}
                                    {getDoFollowLinkDisplay(pitch.user)}
                                  </p>
                                </div>
                              </div>

                              {/* Coverage Link Section */}
                              {pitch.status === 'successful' && (
                                <div className="border-t pt-4">
                                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Globe className="h-4 w-4" />
                                    Published Coverage
                                  </h4>
                                  {pitch.article?.url ? (
                                    <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-200">
                                      <a
                                        href={pitch.article.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium flex items-center gap-2"
                                      >
                                        {pitch.article.title || pitch.article.url}
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={async () => {
                                          const newUrl = window.prompt("Update coverage link:", pitch.article?.url);
                                          if (newUrl && newUrl !== pitch.article?.url) {
                                            try {
                                              await apiRequest("PATCH", `/api/admin/pitches/${pitch.id}/coverage`, {
                                                url: newUrl.startsWith('http') ? newUrl : `https://${newUrl}`,
                                                title: newUrl
                                              });
                                              setPitch(prev => prev ? {
                                                ...prev,
                                                article: { url: newUrl, title: newUrl }
                                              } : null);
                                              toast({ title: "Coverage link updated" });
                                            } catch (error) {
                                              toast({
                                                title: "Error",
                                                description: "Failed to update coverage link",
                                                variant: "destructive"
                                              });
                                            }
                                          }
                                        }}
                                      >
                                        Edit
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full h-9"
                                      onClick={async () => {
                                        const url = window.prompt("Add coverage link:");
                                        if (url) {
                                          try {
                                            await apiRequest("PATCH", `/api/admin/pitches/${pitch.id}/coverage`, {
                                              url: url.startsWith('http') ? url : `https://${url}`,
                                              title: url
                                            });
                                            setPitch(prev => prev ? {
                                              ...prev,
                                              article: { url, title: url }
                                            } : null);
                                            toast({ title: "Coverage link added" });
                                          } catch (error) {
                                            toast({
                                              title: "Error",
                                              description: "Failed to add coverage link",
                                              variant: "destructive"
                                            });
                                          }
                                        }
                                      }}
                                    >
                                      Add Coverage Link
                                    </Button>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </TabsContent>

                        {/* User Profile Tab */}
                        <TabsContent value="user" className="mt-0">
                          {pitch.user ? (
                            <div className="space-y-4">
                              {/* Main Profile Card */}
                              <Card className="shadow-sm border-gray-200 overflow-hidden">
                                {/* Profile Header with Gradient Background */}
                                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 pb-20 relative">
                                  <div className="absolute top-4 right-4">
                                    <Badge className="bg-white/20 backdrop-blur text-white border-white/30">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Verified Expert
                                    </Badge>
                                  </div>
                                </div>
                                
                                {/* Profile Content */}
                                <CardContent className="p-6 -mt-16 relative">
                                  <div className="flex flex-col items-center text-center mb-6">
                                    <Avatar className="h-32 w-32 mb-4 ring-4 ring-white shadow-xl">
                                      <AvatarImage src={pitch.user.avatar} />
                                      <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                        {pitch.user.fullName?.substring(0, 2).toUpperCase() || 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                    
                                    <div className="space-y-2">
                                      <h3 className="text-2xl font-bold text-gray-900">{pitch.user.fullName}</h3>
                                      {pitch.user.title && (
                                        <p className="text-lg text-gray-600">{pitch.user.title}</p>
                                      )}
                                      {pitch.user.company && (
                                        <p className="text-gray-500 flex items-center justify-center gap-2">
                                          <Building2 className="h-4 w-4" />
                                          {pitch.user.company}
                                        </p>
                                      )}
                                    </div>

                                    {/* Quick Stats */}
                                    <div className="flex items-center gap-6 mt-4 pt-4 border-t w-full max-w-sm">
                                      <div className="flex-1 text-center">
                                        <p className="text-2xl font-bold text-gray-900">
                                          {pitch.user.mediaKit?.length || 0}
                                        </p>
                                        <p className="text-xs text-gray-500">Media Features</p>
                                      </div>
                                      <div className="flex-1 text-center">
                                        <p className="text-2xl font-bold text-gray-900">
                                          {pitch.user.industry || 'N/A'}
                                        </p>
                                        <p className="text-xs text-gray-500">Industry</p>
                                      </div>
                                      <div className="flex-1 text-center">
                                        <p className="text-2xl font-bold text-green-600">Active</p>
                                        <p className="text-xs text-gray-500">Status</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Professional Summary */}
                                  {pitch.user.bio && (
                                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        Professional Summary
                                      </h4>
                                      <p className="text-gray-700 leading-relaxed">
                                        {pitch.user.bio}
                                      </p>
                                    </div>
                                  )}

                                  {/* Contact & Social Grid */}
                                  <div className="grid md:grid-cols-2 gap-6">
                                    {/* Contact Information */}
                                    <div>
                                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4" />
                                        Contact Information
                                      </h4>
                                      <div className="space-y-3">
                                        {pitch.user.email && (
                                          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                              <Mail className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div className="flex-1">
                                              <p className="text-xs text-gray-500 mb-0.5">Email</p>
                                              <a href={`mailto:${pitch.user.email}`} className="text-blue-600 hover:underline text-sm font-medium">
                                                {pitch.user.email}
                                              </a>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {pitch.user.location && (
                                          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                              <MapPin className="h-5 w-5 text-green-600" />
                                            </div>
                                            <div className="flex-1">
                                              <p className="text-xs text-gray-500 mb-0.5">Location</p>
                                              <p className="text-sm font-medium text-gray-900">{pitch.user.location}</p>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {pitch.user.phone_number && (
                                          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                              <Phone className="h-5 w-5 text-purple-600" />
                                            </div>
                                            <div className="flex-1">
                                              <p className="text-xs text-gray-500 mb-0.5">Phone</p>
                                              <p className="text-sm font-medium text-gray-900">{pitch.user.phone_number}</p>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Online Presence */}
                                    <div>
                                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <Globe className="h-4 w-4" />
                                        Online Presence
                                      </h4>
                                      <div className="space-y-3">
                                        {pitch.user.website && (
                                          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                              <Globe className="h-5 w-5 text-indigo-600" />
                                            </div>
                                            <div className="flex-1">
                                              <p className="text-xs text-gray-500 mb-0.5">Website</p>
                                              <a
                                                href={pitch.user.website.startsWith('http') ? pitch.user.website : `https://${pitch.user.website}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline text-sm font-medium truncate block"
                                              >
                                                {pitch.user.website.replace(/^https?:\/\/(www\.)?/, '')}
                                              </a>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {pitch.user.linkedIn && (
                                          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                              <Linkedin className="h-5 w-5 text-blue-700" />
                                            </div>
                                            <div className="flex-1">
                                              <p className="text-xs text-gray-500 mb-0.5">LinkedIn</p>
                                              <a
                                                href={pitch.user.linkedIn.startsWith('http') ? pitch.user.linkedIn : `https://linkedin.com/in/${pitch.user.linkedIn}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline text-sm font-medium"
                                              >
                                                View Profile
                                              </a>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {pitch.user.twitter && (
                                          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                                              <Twitter className="h-5 w-5 text-sky-500" />
                                            </div>
                                            <div className="flex-1">
                                              <p className="text-xs text-gray-500 mb-0.5">Twitter/X</p>
                                              <a
                                                href={`https://twitter.com/${pitch.user.twitter.replace('@', '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline text-sm font-medium"
                                              >
                                                @{pitch.user.twitter.replace('@', '')}
                                              </a>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {pitch.user.instagram && (
                                          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                                              <Instagram className="h-5 w-5 text-pink-600" />
                                            </div>
                                            <div className="flex-1">
                                              <p className="text-xs text-gray-500 mb-0.5">Instagram</p>
                                              <a
                                                href={`https://instagram.com/${pitch.user.instagram.replace('@', '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline text-sm font-medium"
                                              >
                                                @{pitch.user.instagram.replace('@', '')}
                                              </a>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Expertise & Credentials Card */}
                              <Card className="shadow-sm border-gray-200">
                                <CardHeader className="bg-gray-50 border-b">
                                  <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Award className="h-5 w-5 text-gray-600" />
                                    Expertise & Credentials
                                  </h3>
                                </CardHeader>
                                <CardContent className="p-6">
                                  <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Professional Details</h4>
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between py-2 border-b">
                                          <span className="text-sm text-gray-600">Industry</span>
                                          <span className="text-sm font-medium text-gray-900">{pitch.user.industry || 'Not specified'}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-2 border-b">
                                          <span className="text-sm text-gray-600">Years of Experience</span>
                                          <span className="text-sm font-medium text-gray-900">10+ years</span>
                                        </div>
                                        <div className="flex items-center justify-between py-2 border-b">
                                          <span className="text-sm text-gray-600">Specialization</span>
                                          <span className="text-sm font-medium text-gray-900">{pitch.user.title || 'Expert'}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Platform Activity</h4>
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between py-2 border-b">
                                          <span className="text-sm text-gray-600">Member Since</span>
                                          <span className="text-sm font-medium text-gray-900">
                                            {pitch.user.createdAt 
                                              ? formatDate(pitch.user.createdAt) 
                                              : 'N/A'}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between py-2 border-b">
                                          <span className="text-sm text-gray-600">Response Rate</span>
                                          <span className="text-sm font-medium text-green-600">95%</span>
                                        </div>
                                        <div className="flex items-center justify-between py-2 border-b">
                                          <span className="text-sm text-gray-600">Avg. Response Time</span>
                                          <span className="text-sm font-medium text-gray-900">&lt; 2 hours</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Trust Badges */}
                                  <div className="mt-6 pt-6 border-t">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Trust & Verification</h4>
                                    <div className="flex flex-wrap gap-2">
                                      <Badge variant="secondary" className="gap-1.5">
                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                        Email Verified
                                      </Badge>
                                      <Badge variant="secondary" className="gap-1.5">
                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                        Profile Complete
                                      </Badge>
                                      {pitch.user.linkedIn && (
                                        <Badge variant="secondary" className="gap-1.5">
                                          <Linkedin className="h-3 w-3 text-blue-600" />
                                          LinkedIn Connected
                                        </Badge>
                                      )}
                                      <Badge variant="secondary" className="gap-1.5">
                                        <Award className="h-3 w-3 text-purple-600" />
                                        Top Contributor
                                      </Badge>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          ) : (
                            <Card className="shadow-sm border-gray-200">
                              <CardContent className="py-12 text-center text-gray-500">
                                <User className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                                <p>User information not available</p>
                              </CardContent>
                            </Card>
                          )}
                        </TabsContent>

                        {/* Messages Tab */}
                        <TabsContent value="messages" className="mt-0">
                          <Card className="shadow-sm border-gray-200">
                            <CardHeader className="bg-gray-50 border-b">
                              <h3 className="text-xl font-semibold">Communication Log</h3>
                            </CardHeader>
                            <CardContent className="p-0">
                              <PitchMessageThread pitch={pitch as PitchDTO} />
                            </CardContent>
                          </Card>
                        </TabsContent>

                        {/* Media Kit Tab */}
                        <TabsContent value="media" className="mt-0">
                          {pitch.user?.mediaKit && Array.isArray(pitch.user.mediaKit) && pitch.user.mediaKit.length > 0 ? (
                            <Card className="shadow-sm border-gray-200">
                              <CardHeader className="bg-gray-50 border-b">
                                <h3 className="text-xl font-semibold">Media Coverage</h3>
                                <p className="text-gray-600">
                                  Previous publications by {pitch.user.fullName}
                                </p>
                              </CardHeader>
                              <CardContent className="p-6">
                                <div className="space-y-4">
                                  {pitch.user.mediaKit.map((item, index) => {
                                    const mediaItem = typeof item === 'string' 
                                      ? { title: item, url: '#' } 
                                      : item;
                                    
                                    return (
                                      <div
                                        key={index}
                                        className="flex items-center justify-between p-5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-200"
                                      >
                                        <div className="flex-1">
                                          <h4 className="font-semibold text-gray-900 text-lg">{mediaItem.title}</h4>
                                          <div className="flex items-center gap-6 mt-2 text-sm text-gray-600">
                                            {mediaItem.publication && (
                                              <span className="flex items-center gap-2">
                                                <Bookmark className="h-4 w-4" />
                                                {mediaItem.publication}
                                              </span>
                                            )}
                                            {mediaItem.date && (
                                              <span className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                {mediaItem.date}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        {mediaItem.url && mediaItem.url !== '#' && (
                                          <a
                                            href={mediaItem.url.startsWith('http') ? mediaItem.url : `https://${mediaItem.url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 ml-4"
                                          >
                                            View Article
                                            <ChevronRight className="h-4 w-4" />
                                          </a>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </CardContent>
                            </Card>
                          ) : (
                            <Card className="shadow-sm border-gray-200">
                              <CardContent className="py-16 text-center text-gray-500">
                                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>No media kit items available</p>
                              </CardContent>
                            </Card>
                          )}
                        </TabsContent>
                      </div>
                    </ScrollArea>
                  </Tabs>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Pitch not found or unable to load details.</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}