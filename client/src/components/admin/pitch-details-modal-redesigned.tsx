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
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import PitchMessageThread from "../pitch-message-thread";
import { PitchDTO } from "@/utils/pitchInterfaces";
// Removed Progress Tracker import as requested

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
  industry?: string;
  location?: string;
  mediaKit?: (MediaItem | string)[];
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

function getStatusBadgeColor(status: string): string {
  switch (status.toLowerCase()) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200";
    case "sent to reporter":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200";
    case "interested":
      return "bg-green-100 text-green-800 hover:bg-green-100 border-green-200";
    case "not interested":
      return "bg-red-100 text-red-800 hover:bg-red-100 border-red-200";
    case "successful placement":
      return "bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200";
  }
}

// Function to get the formatted do-follow link for attribution
function getDoFollowLinkDisplay(user: any): string {
  if (!user || !user.doFollowLink) return '';
  
  let url = '';
  
  // Get the URL based on the doFollowLink type
  switch (user.doFollowLink) {
    case 'website':
      url = user.website;
      break;
    case 'linkedIn':
      url = user.linkedIn;
      break;
    case 'twitter':
      url = user.twitter;
      break;
    case 'instagram':
      url = user.instagram;
      break;
    case 'other':
      url = user.otherProfileUrl;
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
        width: element.offsetWidth,
        height: element.offsetHeight,
        scrollX: 0,
        scrollY: 0,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add new pages if content exceeds one page
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-50" aria-describedby="pitch-details-description">
          {isLoading ? (
            <div className="flex items-center justify-center p-8 h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading pitch details...</span>
            </div>
          ) : pitch ? (
            <div>
              <DialogHeader className="sticky top-0 z-10 bg-white p-6 shadow-sm rounded-t-lg">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <DialogTitle className="text-2xl font-bold text-slate-800">
                      Pitch Details
                    </DialogTitle>
                    <DialogDescription id="pitch-details-description" className="text-sm text-slate-500 mt-1">
                      Complete information about pitch #{pitch.id} and the submitting user
                    </DialogDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-2 self-start md:self-center bg-white hover:bg-blue-50 text-blue-700 border-blue-200"
                    onClick={generatePDF}
                  >
                    <DownloadCloud className="h-4 w-4" />
                    Export Media Kit
                  </Button>
                </div>
              </DialogHeader>

              <div className="p-6 bg-slate-50">
                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  {/* Left Column - User Profile */}
                  <div className="lg:col-span-1">
                    {pitch.user ? (
                      <div className="space-y-4">
                        <Card className="overflow-hidden border-slate-200 shadow-sm bg-white">
                          <CardContent className="p-0">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white">
                              <h3 className="text-lg font-semibold mb-1">User Profile</h3>
                              <p className="text-sm text-blue-100">Source information</p>
                            </div>
                            
                            <div className="p-4 flex flex-col items-center text-center border-b border-slate-100">
                              <Avatar className="h-24 w-24 ring-4 ring-white shadow-md mb-3">
                                {pitch.user.avatar ? (
                                  <AvatarImage src={pitch.user.avatar} alt={pitch.user.fullName || ''} />
                                ) : (
                                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xl">
                                    {(pitch.user.fullName || pitch.user.username).substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              
                              <h3 className="text-xl font-bold text-slate-800">{pitch.user.fullName || pitch.user.username}</h3>
                              
                              {pitch.user.title && (
                                <p className="text-md text-slate-600 mt-1">{pitch.user.title}</p>
                              )}
                              
                              {pitch.user.company && (
                                <div className="flex items-center mt-1">
                                  <Building className="h-4 w-4 mr-1 text-slate-500" />
                                  <span className="text-slate-600">{pitch.user.company}</span>
                                </div>
                              )}
                              
                              {pitch.user.industry && (
                                <Badge className="mt-2 bg-blue-50 text-blue-700 border-blue-200 font-normal">
                                  {pitch.user.industry}
                                </Badge>
                              )}
                            </div>
                            
                            {/* Tabs for Contact/Messages */}
                            {/* Contact Information Section (Always Visible) */}
                            <div className="p-4 space-y-3">
                              {pitch.user.email && (
                                <div className="flex items-center">
                                  <Mail className="h-4 w-4 text-slate-500 mr-3" />
                                  <a href={`mailto:${pitch.user.email}`} className="text-blue-600 hover:underline">
                                    {pitch.user.email}
                                  </a>
                                </div>
                              )}
                              
                              {pitch.user.location && (
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 text-slate-500 mr-3" />
                                  <span className="text-slate-700">{pitch.user.location}</span>
                                </div>
                              )}
                              
                              {pitch.user.website && (
                                <div className="flex items-center">
                                  <Globe className="h-4 w-4 text-slate-500 mr-3" />
                                  <a 
                                    href={pitch.user.website.startsWith('http') ? pitch.user.website : `https://${pitch.user.website}`}
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-blue-600 hover:underline"
                                  >
                                    {pitch.user.website.replace(/^https?:\/\/(www\.)?/, '')}
                                  </a>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2 mt-2">
                                {pitch.user.twitter && (
                                  <a 
                                    href={`https://twitter.com/${pitch.user.twitter.replace('@', '')}`}
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-blue-500 hover:text-blue-600 p-1.5 bg-blue-50 rounded-full"
                                  >
                                    <Twitter className="h-4 w-4" />
                                  </a>
                                )}
                                
                                {pitch.user.linkedIn && (
                                  <a 
                                    href={pitch.user.linkedIn.startsWith('http') ? pitch.user.linkedIn : `https://linkedin.com/in/${pitch.user.linkedIn}`}
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-blue-700 hover:text-blue-800 p-1.5 bg-blue-50 rounded-full"
                                  >
                                    <Linkedin className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                              
                              {pitch.user.bio && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                  <h4 className="font-semibold text-slate-800 mb-2 flex items-center">
                                    <User className="h-4 w-4 mr-2 text-slate-600" />
                                    Professional Bio
                                  </h4>
                                  <div className="whitespace-pre-line text-slate-700 text-sm">
                                    {pitch.user.bio}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="p-6 text-center">
                          <p className="text-slate-500">User information not available</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  
                  {/* Right Column - Pitch Details */}
                  <div className="lg:col-span-2">
                    <Card className="overflow-hidden border-slate-200 shadow-sm bg-white">
                      <CardContent className="p-0">
                        <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-4 text-white">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold">
                              {pitch.opportunity?.title || 'Unnamed Opportunity'}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-300">
                            <div className="flex items-center">
                              <Clock className="h-3.5 w-3.5 mr-1 opacity-70" />
                              <span>Submitted {formatDate(pitch.createdAt)}</span>
                            </div>
                            {pitch.bidAmount && (
                              <div className="flex items-center font-medium text-green-300">
                                <span>${pitch.bidAmount.toFixed(2)} bid</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-5 border-b border-slate-100">
                          <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-slate-600" />
                            Pitch Content
                          </h4>
                          <div className="bg-slate-50 p-4 rounded-md border border-slate-200 whitespace-pre-line text-slate-700">
                            {pitch.content}
                          </div>
                          
                          <div className="mt-4 bg-white p-4 rounded-md border border-slate-200">
                            <h5 className="text-sm text-slate-500 mb-2">Formatted Quote (For Article Use):</h5>
                            <div className="italic text-slate-800">
                              "{pitch.content.trim().replace(/\n+/g, ' ')}" 
                              <span className="not-italic font-medium">
                                —{pitch.user?.fullName || 'Anonymous'}{pitch.user?.title ? `, ${pitch.user.title}` : ''}{pitch.user?.title && pitch.user?.company ? ` of ${pitch.user.company}` : ''}{getDoFollowLinkDisplay(pitch.user)}
                              </span>
                            </div>
                          </div>
                          
                          {/* Coverage Link Field */}
                          {(pitch.status === 'successful placement' || pitch.status === 'successful') && (
                            <div className="mt-4 bg-green-50 p-4 rounded-md border border-green-200">
                              <h5 className="text-sm font-semibold text-green-800 mb-2 flex items-center">
                                <Globe className="h-4 w-4 mr-2" />
                                Published Coverage
                              </h5>
                              
                              {pitch.article?.url ? (
                                <div className="flex items-center justify-between">
                                  <a 
                                    href={pitch.article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 hover:underline text-sm flex items-center"
                                  >
                                    {pitch.article.title || pitch.article.url}
                                    <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                                  </a>
                                  
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-8"
                                    onClick={async () => {
                                      const newUrl = window.prompt("Update the coverage link:", pitch.article?.url);
                                      if (newUrl && newUrl !== pitch.article?.url) {
                                        // Basic URL validation
                                        let validatedUrl = newUrl;
                                        if (!/^https?:\/\//i.test(newUrl)) {
                                          validatedUrl = `https://${newUrl}`;
                                        }
                                        
                                        try {
                                          await apiRequest("PATCH", `/api/admin/pitches/${pitch.id}/coverage`, { 
                                            url: validatedUrl,
                                            title: newUrl // Keep original input as title for readability
                                          });
                                          
                                          setPitch(prev => prev ? {
                                            ...prev,
                                            article: {
                                              ...prev.article,
                                              url: validatedUrl,
                                              title: newUrl
                                            }
                                          } : null);
                                          
                                          toast({
                                            title: "Success",
                                            description: "Coverage link updated successfully"
                                          });
                                        } catch (error) {
                                          console.error("Error updating coverage link:", error);
                                          toast({
                                            title: "Error",
                                            description: "Failed to update coverage link",
                                            variant: "destructive"
                                          });
                                        }
                                      }
                                    }}
                                  >
                                    Edit Link
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <p className="text-sm text-slate-600">No coverage link has been added yet.</p>
                                  
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-8 bg-white"
                                    onClick={async () => {
                                      const newUrl = window.prompt("Add a link to the published coverage:");
                                      if (newUrl) {
                                        // Basic URL validation
                                        let validatedUrl = newUrl;
                                        if (!/^https?:\/\//i.test(newUrl)) {
                                          validatedUrl = `https://${newUrl}`;
                                        }
                                        
                                        try {
                                          await apiRequest("PATCH", `/api/admin/pitches/${pitch.id}/coverage`, { 
                                            url: validatedUrl,
                                            title: newUrl // Keep original input as title for readability
                                          });
                                          
                                          setPitch(prev => prev ? {
                                            ...prev,
                                            article: {
                                              url: validatedUrl,
                                              title: newUrl
                                            }
                                          } : null);
                                          
                                          toast({
                                            title: "Success",
                                            description: "Coverage link added successfully"
                                          });
                                        } catch (error) {
                                          console.error("Error adding coverage link:", error);
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
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {pitch.audioUrl && (
                          <div className="p-5 border-b border-slate-100">
                            <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                              <Mic className="h-4 w-4 mr-2 text-slate-600" />
                              Audio Recording
                            </h4>
                            <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                              <audio className="w-full" controls>
                                <source src={pitch.audioUrl} type="audio/mpeg" />
                                Your browser does not support the audio element.
                              </audio>
                              
                              {pitch.transcript && (
                                <div className="mt-4">
                                  <h5 className="font-medium mb-2 text-slate-700 text-sm">Transcript</h5>
                                  <div className="whitespace-pre-line text-slate-700 text-sm bg-white p-4 rounded-md border border-slate-200">
                                    {pitch.transcript}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="p-5">
                          <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
                            <Bookmark className="h-4 w-4 mr-2 text-slate-600" />
                            Opportunity Information
                          </h4>
                          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-md border border-slate-200">
                            <div>
                              <p className="text-sm font-medium text-slate-500">Publication</p>
                              <p className="font-medium text-slate-700">
                                {pitch.opportunity?.publication?.name || pitch.opportunity?.outlet || 'Unknown'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-500">Tier</p>
                              <p className="font-medium text-slate-700">{pitch.opportunity?.tier || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-500">Deadline</p>
                              <p className="font-medium text-slate-700">{formatDate(pitch.opportunity?.deadline || '')}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-500">Bid Amount</p>
                              <p className="font-medium text-blue-600">
                                {pitch.bidAmount ? `$${pitch.bidAmount.toFixed(2)}` : 'N/A'}
                              </p>
                            </div>
                          </div>
                          
                          {pitch.opportunity?.description && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-slate-500 mb-2">Description</p>
                              <div className="whitespace-pre-line text-slate-700 p-4 bg-slate-50 rounded-md border border-slate-200">
                                {pitch.opportunity.description}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Message Thread Row - Displayed directly on main page */}
                <div className="grid grid-cols-1 mt-6">
                  <Card className="w-full">
                    <CardHeader className="bg-slate-50 border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-slate-800 flex items-center">
                          <MessageSquare className="h-4 w-4 mr-2 text-slate-600" />
                          Communication Log
                        </h3>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <PitchMessageThread pitch={pitch as PitchDTO} />
                    </CardContent>
                  </Card>
                </div>

                {/* Media Kit Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                  {/* Empty space where the tabs used to be */}
                  <div className="lg:col-span-1">
                    {/* Intentionally left empty to maintain grid alignment */}
                  </div>
                  
                  {/* Media Kit in second column (if available) */}
                  <div className="lg:col-span-2">
                    {pitch.user?.mediaKit && Array.isArray(pitch.user.mediaKit) && pitch.user.mediaKit.length > 0 && (
                      <Card className="overflow-hidden border-slate-200 shadow-sm bg-white">
                        <CardContent className="p-0">
                          <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-4 text-white">
                            <h3 className="text-lg font-semibold">Media Coverage</h3>
                            <p className="text-sm text-teal-100">Previous publications by {pitch.user?.fullName || pitch.user?.username || 'User'}</p>
                          </div>
                          
                          <div className="divide-y divide-slate-100">
                            {pitch.user?.mediaKit?.map((item, index) => {
                              let mediaItem: MediaItem;
                              if (typeof item === 'string') {
                                mediaItem = { title: item, url: '#' };
                              } else {
                                mediaItem = item;
                              }
                              
                              return (
                                <div key={index} className="p-4 hover:bg-slate-50">
                                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                                    <div className="flex-1">
                                      <h4 className="text-md font-semibold text-slate-800">{mediaItem.title}</h4>
                                      <div className="flex flex-wrap gap-x-4 mt-1 text-sm text-slate-500">
                                        {mediaItem.publication && (
                                          <div className="flex items-center">
                                            <Bookmark className="h-3.5 w-3.5 mr-1 text-slate-400" />
                                            <span>{mediaItem.publication}</span>
                                          </div>
                                        )}
                                        {mediaItem.date && (
                                          <div className="flex items-center">
                                            <Calendar className="h-3.5 w-3.5 mr-1 text-slate-400" />
                                            <span>{mediaItem.date}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {mediaItem.url && mediaItem.url !== '#' && (
                                      <a 
                                        href={mediaItem.url.startsWith('http') ? mediaItem.url : `https://${mediaItem.url}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                                      >
                                        <Globe className="h-3.5 w-3.5 mr-1.5" />
                                        View Article
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-slate-500">Pitch not found or unable to load details.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}