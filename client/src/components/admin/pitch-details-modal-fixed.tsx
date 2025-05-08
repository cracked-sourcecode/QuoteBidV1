import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, User, Clock, Calendar, Globe, Twitter, Linkedin, FileText, Bookmark, DownloadCloud, Mail, Mic, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import PitchMessageThread from "../pitch-message-thread";

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
  twitterHandle?: string;
  linkedinUrl?: string;
  industry?: string;
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
}

export default function PitchDetailsModal({ isOpen, onClose, pitchId }: PitchDetailsModalProps) {
  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (isOpen && pitchId) {
      const fetchPitchDetails = async () => {
        setIsLoading(true);
        try {
          // Fetch the pitch details
          const pitchRes = await apiRequest("GET", `/api/admin/pitches/${pitchId}`);
          const pitchData = await pitchRes.json();
          
          // Fetch the user profile details
          const userRes = await apiRequest("GET", `/api/admin/users/${pitchData.userId}`);
          const userData = await userRes.json();
          
          // Combine the data
          setPitch({
            ...pitchData,
            user: userData
          });
        } catch (error) {
          console.error("Error fetching pitch details:", error);
          toast({
            title: "Error",
            description: "Failed to load pitch details",
            variant: "destructive"
          });
        } finally {
          setIsLoading(false);
        }
      };

      fetchPitchDetails();
    }
  }, [isOpen, pitchId, toast]);

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (e) {
      return "Invalid date";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "sent":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "interested":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "not_interested":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
      case "successful":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  const generatePDF = async () => {
    if (!pitch) return;

    try {
      toast({
        title: "Generating PDF",
        description: "Please wait while we generate the PDF..."
      });

      const element = document.getElementById('pitch-details-for-pdf');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = canvas.height * imgWidth / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`pitch-${pitchId}-details.pdf`);

      toast({
        title: "PDF Generated",
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0" aria-describedby="pitch-details-description">
        {isLoading ? (
          <div className="flex items-center justify-center p-8 h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading pitch details...</span>
          </div>
        ) : pitch ? (
          <div>
            <DialogHeader className="sticky top-0 z-10 bg-white p-6 pb-0">
              <div className="flex justify-between items-start">
                <div>
                  <DialogTitle className="text-xl font-bold">
                    Pitch Details
                  </DialogTitle>
                  <DialogDescription id="pitch-details-description" className="text-sm text-gray-500">
                    Review details about this pitch and the user who submitted it.
                  </DialogDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1"
                  onClick={generatePDF}
                >
                  <DownloadCloud className="h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </DialogHeader>

            <div id="pitch-details-for-pdf" className="p-6 pt-4">
              <Tabs defaultValue="overview" className="mt-4" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Pitch Overview</TabsTrigger>
                  <TabsTrigger value="profile">User Profile</TabsTrigger>
                  <TabsTrigger value="messages">
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Messages
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="mediakit">Media Kit</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="mt-2 space-y-4">
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                      <h3 className="text-lg font-semibold text-blue-800">
                        {pitch.opportunity?.title || 'Unnamed Opportunity'}
                      </h3>
                      <div className="flex flex-wrap items-center mt-2 text-sm text-gray-600">
                        <div className="flex items-center mr-4">
                          <Clock className="h-4 w-4 mr-1 text-blue-600" />
                          <span>Submitted on {formatDate(pitch.createdAt)}</span>
                        </div>
                        <Badge className={`${getStatusBadgeColor(pitch.status)}`}>
                          {pitch.status.charAt(0).toUpperCase() + pitch.status.slice(1)}
                        </Badge>
                      </div>
                    </div>

                    <Card className="overflow-hidden border-blue-100 shadow-sm">
                      <CardContent className="p-6">
                        <h4 className="text-lg font-semibold mb-3 flex items-center text-blue-800">
                          <FileText className="h-5 w-5 mr-2 text-blue-600" />
                          Pitch Content
                        </h4>
                        <div className="whitespace-pre-wrap text-gray-700 bg-blue-50 p-4 rounded-md">
                          {pitch.content}
                        </div>
                        
                        {pitch.audioUrl && (
                          <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-100">
                            <h4 className="text-lg font-semibold mb-3 flex items-center text-indigo-800">
                              <Mic className="h-5 w-5 mr-2 text-indigo-600" />
                              Audio Recording
                            </h4>
                            <audio className="w-full" controls>
                              <source src={pitch.audioUrl} type="audio/mpeg" />
                              Your browser does not support the audio element.
                            </audio>
                            
                            {pitch.transcript && (
                              <div className="mt-4">
                                <h4 className="font-medium mb-2 text-indigo-700">Transcript</h4>
                                <div className="whitespace-pre-wrap text-gray-700 bg-white p-4 rounded-md border border-indigo-100">
                                  {pitch.transcript}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card className="overflow-hidden border-blue-100 shadow-sm">
                      <CardContent className="p-6">
                        <h4 className="text-lg font-semibold mb-3 flex items-center text-blue-800">
                          <Bookmark className="h-5 w-5 mr-2 text-blue-600" />
                          Opportunity Details
                        </h4>
                        <div className="grid grid-cols-2 gap-6 bg-blue-50 p-4 rounded-md">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Publication</p>
                            <p className="text-base font-medium">
                              {pitch.opportunity?.publication?.name || pitch.opportunity?.outlet || 'Unknown'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Tier</p>
                            <p className="text-base font-medium">{pitch.opportunity?.tier || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Deadline</p>
                            <p className="text-base font-medium">{formatDate(pitch.opportunity?.deadline || '')}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Bid Amount</p>
                            <p className="text-base font-medium text-blue-700">
                              {pitch.bidAmount ? `$${pitch.bidAmount.toFixed(2)}` : 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        {pitch.opportunity?.description && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-500 mb-2">Description</p>
                            <div className="whitespace-pre-wrap text-gray-700 bg-blue-50 p-4 rounded-md border border-blue-100">
                              {pitch.opportunity.description}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="profile" className="mt-2 space-y-4">
                  {pitch.user ? (
                    <div className="space-y-4">
                      {/* Enhanced user header with better styling */}
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                        <Avatar className="h-20 w-20 ring-4 ring-white shadow-md">
                          {pitch.user.avatar ? (
                            <AvatarImage src={pitch.user.avatar} alt={pitch.user.fullName || ''} />
                          ) : (
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                              {(pitch.user.fullName || pitch.user.username).substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{pitch.user.fullName || pitch.user.username}</h3>
                          {pitch.user.title && (
                            <p className="text-md text-gray-700">{pitch.user.title}</p>
                          )}
                          {pitch.user.company && (
                            <p className="text-md text-gray-700">{pitch.user.company}</p>
                          )}
                          {pitch.user.industry && (
                            <Badge variant="outline" className="mt-2 bg-blue-50 text-blue-700 border-blue-200">
                              {pitch.user.industry}
                            </Badge>
                          )}
                        </div>
                        <div className="flex ml-auto space-x-2 mt-2 sm:mt-0">
                          {pitch.user.twitterHandle && (
                            <a 
                              href={`https://twitter.com/${pitch.user.twitterHandle.replace('@', '')}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full transition-colors"
                              title={pitch.user.twitterHandle}
                            >
                              <Twitter className="h-5 w-5" />
                            </a>
                          )}
                          
                          {pitch.user.linkedinUrl && (
                            <a 
                              href={pitch.user.linkedinUrl.startsWith('http') ? pitch.user.linkedinUrl : `https://${pitch.user.linkedinUrl}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-blue-700 hover:bg-blue-800 text-white p-2 rounded-full transition-colors"
                              title="LinkedIn Profile"
                            >
                              <Linkedin className="h-5 w-5" />
                            </a>
                          )}
                          
                          {pitch.user.website && (
                            <a 
                              href={pitch.user.website.startsWith('http') ? pitch.user.website : `https://${pitch.user.website}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-full transition-colors"
                              title={pitch.user.website}
                            >
                              <Globe className="h-5 w-5" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Bio section with improved styling */}
                      {pitch.user.bio && (
                        <Card className="overflow-hidden border-blue-100 shadow-sm">
                          <CardContent className="p-6">
                            <h4 className="text-lg font-semibold mb-3 flex items-center text-blue-800">
                              <User className="h-5 w-5 mr-2 text-blue-600" />
                              Professional Bio
                            </h4>
                            <div className="prose prose-blue max-w-full text-gray-700 bg-blue-50 p-4 rounded-md">
                              {pitch.user.bio}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Contact information card */}
                      <Card className="overflow-hidden border-blue-100 shadow-sm">
                        <CardContent className="p-6">
                          <h4 className="text-lg font-semibold mb-3 flex items-center text-blue-800">
                            <Mail className="h-5 w-5 mr-2 text-blue-600" />
                            Contact Information
                          </h4>
                          <div className="grid sm:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-md">
                            <div>
                              <p className="text-sm font-medium text-gray-500">Email</p>
                              <p className="text-base">{pitch.user.email}</p>
                            </div>

                            <div>
                              <p className="text-sm font-medium text-gray-500">User ID</p>
                              <p className="text-base">{pitch.user.id}</p>
                            </div>
                            
                            {pitch.user.website && (
                              <div className="col-span-2">
                                <p className="text-sm font-medium text-gray-500">Website</p>
                                <a 
                                  href={pitch.user.website.startsWith('http') ? pitch.user.website : `https://${pitch.user.website}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-base text-blue-600 hover:underline"
                                >
                                  {pitch.user.website}
                                </a>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
                      <User className="h-12 w-12 text-gray-300 mb-2" />
                      <p className="text-gray-500">No user profile information available</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="messages" className="mt-2 space-y-4">
                  <Card className="overflow-hidden border-blue-100 shadow-sm">
                    <CardContent className="p-6">
                      <h4 className="text-lg font-semibold mb-3 flex items-center text-blue-800">
                        <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
                        Communication with Customer
                      </h4>
                      {pitch && (
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
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="mediakit" className="mt-2 space-y-4">
                  {pitch.user?.mediaKit && pitch.user.mediaKit.length > 0 ? (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                        <h3 className="text-lg font-semibold text-blue-800 flex items-center">
                          <FileText className="h-5 w-5 mr-2 text-blue-600" />
                          Media Coverage ({pitch.user.mediaKit.length} {pitch.user.mediaKit.length === 1 ? 'item' : 'items'})
                        </h3>
                        <p className="text-gray-600 text-sm mt-1">
                          Previously published articles and media mentions for {pitch.user.fullName || pitch.user.username}.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pitch.user.mediaKit.map((item, index) => {
                          // Convert string items to MediaItem objects
                          let mediaItem: MediaItem;
                          
                          if (typeof item === 'string') {
                            try {
                              // Try to parse as JSON
                              const parsed = JSON.parse(item);
                              mediaItem = {
                                title: parsed.title || 'Published Article',
                                publication: parsed.publication,
                                date: parsed.date,
                                url: parsed.url || '#'
                              };
                            } catch (e) {
                              // If parsing fails, use the string as URL
                              mediaItem = {
                                title: 'Published Article',
                                url: item
                              };
                            }
                          } else {
                            // It's already a MediaItem object
                            mediaItem = item as MediaItem;
                          }

                          return (
                            <Card key={index} className="overflow-hidden border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                              <CardContent className="p-6">
                                <h4 className="font-semibold truncate text-blue-800">
                                  {mediaItem.title || 'Published Article'}
                                </h4>
                                <div className="mt-3 flex items-center justify-between">
                                  <div className="text-sm font-medium text-gray-700 bg-blue-50 px-2 py-1 rounded">
                                    {mediaItem.publication || 'Publication'}
                                  </div>
                                  {mediaItem.date && (
                                    <div className="text-xs text-gray-600 flex items-center">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {mediaItem.date}
                                    </div>
                                  )}
                                </div>
                                <div className="mt-4">
                                  <a
                                    href={mediaItem.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                                  >
                                    <Globe className="h-4 w-4 mr-2" />
                                    View Article
                                  </a>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                      
                      <div className="flex justify-center mt-6">
                        <Button 
                          variant="outline" 
                          className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                          onClick={generatePDF}
                        >
                          <Download className="h-4 w-4" />
                          Download Complete Media Kit
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
                      <FileText className="h-12 w-12 text-gray-300 mb-2" />
                      <p className="text-gray-500 mb-4">No media kit items available</p>
                      <p className="text-xs text-gray-400 max-w-md text-center">
                        Users can add media coverage items in their profile settings to showcase their previous work.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-8 h-64">
            <Bookmark className="h-8 w-8 text-gray-300 mb-2" />
            <span className="ml-2 text-gray-500">Pitch not found</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}