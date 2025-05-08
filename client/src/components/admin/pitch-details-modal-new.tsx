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
import { Loader2, Download, User, Clock, Calendar, Globe, Twitter, Linkedin, FileText, Bookmark, DownloadCloud, Mail, Mic } from "lucide-react";
import { format } from "date-fns";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
    if (!pitch || !pitch.user) return;

    try {
      toast({
        title: "Generating PDF",
        description: "Please wait while we generate the media kit PDF..."
      });
      
      // Force switch to media kit tab for PDF generation
      if (activeTab !== "mediakit") {
        setActiveTab("mediakit");
        // Small delay to ensure the tab content is rendered
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const element = document.getElementById('pitch-details-for-pdf');
      if (!element) return;

      // Create a hidden div for PDF rendering with optimized layout
      const pdfContainer = document.createElement('div');
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.width = '800px';
      pdfContainer.className = 'pdf-container p-8';
      document.body.appendChild(pdfContainer);

      // Format user name
      const userName = pitch.user.fullName || pitch.user.username || 'User';
      
      // Create media kit content with professional formatting
      pdfContainer.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2563EB; font-size: 24px; margin-bottom: 5px;">MEDIA KIT</h1>
            <h2 style="color: #1F2937; font-size: 18px; margin-top: 5px;">${userName}</h2>
            ${pitch.user.title ? `<p style="color: #4B5563; font-size: 16px; margin-top: 5px;">${pitch.user.title}</p>` : ''}
            ${pitch.user.location ? `<p style="color: #6B7280; font-size: 14px; margin-top: 5px;">${pitch.user.location}</p>` : ''}
            ${pitch.user.industry ? `<p style="color: #6B7280; font-size: 14px; margin-top: 5px;">Industry: ${pitch.user.industry}</p>` : ''}
          </div>
          
          <hr style="border: 1px solid #E5E7EB; margin: 20px 0;" />
          
          ${pitch.user.bio ? `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #1F2937; font-size: 16px; margin-bottom: 10px;">PROFESSIONAL BIO</h3>
            <p style="color: #4B5563; line-height: 1.6;">${pitch.user.bio}</p>
          </div>
          <hr style="border: 1px solid #E5E7EB; margin: 20px 0;" />
          ` : ''}
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #1F2937; font-size: 16px; margin-bottom: 10px;">CONTACT INFORMATION</h3>
            <div style="display: flex; flex-wrap: wrap;">
              ${pitch.user.email ? `<p style="color: #4B5563; margin-right: 20px; margin-bottom: 10px;">Email: ${pitch.user.email}</p>` : ''}
              ${pitch.user.website ? `<p style="color: #4B5563; margin-right: 20px; margin-bottom: 10px;">Website: ${pitch.user.website}</p>` : ''}
              ${pitch.user.linkedIn ? `<p style="color: #4B5563; margin-right: 20px; margin-bottom: 10px;">LinkedIn: ${pitch.user.linkedIn}</p>` : ''}
              ${pitch.user.twitter ? `<p style="color: #4B5563; margin-bottom: 10px;">Twitter: ${pitch.user.twitter}</p>` : ''}
            </div>
          </div>
          
          ${(pitch.user.mediaKit?.length > 0) ? `
          <hr style="border: 1px solid #E5E7EB; margin: 20px 0;" />
          <div>
            <h3 style="color: #1F2937; font-size: 16px; margin-bottom: 15px;">PREVIOUS MEDIA COVERAGE</h3>
            <div>
              ${pitch.user.mediaKit?.map((item, i) => {
                const mediaItem = typeof item === 'string' ? { title: item, url: '#' } : item;
                return `
                  <div style="margin-bottom: 15px; padding-bottom: 15px; ${i < pitch.user.mediaKit?.length - 1 ? 'border-bottom: 1px solid #E5E7EB;' : ''}">
                    <h4 style="color: #2563EB; font-size: 16px; margin-bottom: 5px;">${mediaItem.title}</h4>
                    <div style="display: flex; flex-wrap: wrap; color: #6B7280; font-size: 14px;">
                      ${mediaItem.publication ? `<p style="margin-right: 15px;">Publication: ${mediaItem.publication}</p>` : ''}
                      ${mediaItem.date ? `<p>${mediaItem.date}</p>` : ''}
                    </div>
                    ${mediaItem.url && mediaItem.url !== '#' ? `<p style="color: #2563EB; font-size: 14px; margin-top: 5px;">${mediaItem.url}</p>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #9CA3AF;">
            <p>Generated on ${new Date().toLocaleDateString()} via QuoteBid Media Kit Generator</p>
          </div>
        </div>
      `;

      // Generate PDF from the hidden container
      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      // Remove the temporary container
      document.body.removeChild(pdfContainer);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = canvas.height * imgWidth / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
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
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Pitch Overview</TabsTrigger>
                  <TabsTrigger value="profile">User Profile</TabsTrigger>
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
                          {pitch.user.twitter && (
                            <a 
                              href={`https://twitter.com/${pitch.user.twitter?.replace('@', '')}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full transition-colors"
                              title={pitch.user.twitter}
                            >
                              <Twitter className="h-5 w-5" />
                            </a>
                          )}
                          
                          {pitch.user.linkedIn && (
                            <a 
                              href={pitch.user.linkedIn.startsWith('http') ? pitch.user.linkedIn : `https://${pitch.user.linkedIn}`}
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
                      <p className="text-gray-500">User profile not available</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="mediakit" className="mt-2 space-y-4">
                  <div className="space-y-4">
                    {/* Professional Profile Header Card */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20 ring-4 ring-white shadow-md">
                          {pitch.user?.avatar ? (
                            <AvatarImage src={pitch.user.avatar} alt={pitch.user?.fullName || ''} />
                          ) : (
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                              {(pitch.user?.fullName || pitch.user?.username || '').substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{pitch.user?.fullName || pitch.user?.username}</h3>
                          {pitch.user?.title && (
                            <p className="text-md text-gray-700 font-medium">{pitch.user.title}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {pitch.user?.location && (
                              <div className="flex items-center text-sm text-gray-600">
                                <svg className="h-3.5 w-3.5 mr-1 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {pitch.user.location}
                              </div>
                            )}
                            {pitch.user?.industry && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {pitch.user.industry}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Bio Section */}
                    {pitch.user?.bio && (
                      <Card className="border-blue-100 shadow-sm">
                        <CardContent className="p-4">
                          <h4 className="text-md font-semibold text-gray-800 mb-2">Professional Bio</h4>
                          <p className="text-gray-700 whitespace-pre-line">{pitch.user.bio}</p>
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* Contact & Social Links Card */}
                    <Card className="border-blue-100 shadow-sm">
                      <CardContent className="p-4">
                        <h4 className="text-md font-semibold text-gray-800 mb-2">Contact Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {pitch.user?.email && (
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-2 text-gray-500" />
                              <span className="text-gray-700">{pitch.user.email}</span>
                            </div>
                          )}
                          {pitch.user?.website && (
                            <div className="flex items-center">
                              <Globe className="h-4 w-4 mr-2 text-gray-500" />
                              <a href={pitch.user.website.startsWith('http') ? pitch.user.website : `https://${pitch.user.website}`} 
                                target="_blank" rel="noopener noreferrer" 
                                className="text-blue-600 hover:underline">
                                {pitch.user.website.replace(/^https?:\/\//, '').replace(/^www\./, '')}
                              </a>
                            </div>
                          )}
                          {pitch.user?.linkedIn && (
                            <div className="flex items-center">
                              <Linkedin className="h-4 w-4 mr-2 text-blue-600" />
                              <a href={pitch.user.linkedIn.startsWith('http') ? pitch.user.linkedIn : `https://${pitch.user.linkedIn}`} 
                                target="_blank" rel="noopener noreferrer" 
                                className="text-blue-600 hover:underline">
                                LinkedIn Profile
                              </a>
                            </div>
                          )}
                          {pitch.user?.twitter && (
                            <div className="flex items-center">
                              <Twitter className="h-4 w-4 mr-2 text-blue-500" />
                              <a href={`https://twitter.com/${pitch.user.twitter?.replace('@', '')}`} 
                                target="_blank" rel="noopener noreferrer" 
                                className="text-blue-600 hover:underline">
                                {pitch.user.twitter}
                              </a>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Media Coverage Section */}
                    <div className="mt-6">
                      <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                        <h3 className="text-lg font-semibold text-blue-800 flex items-center">
                          <FileText className="h-5 w-5 mr-2 text-blue-600" />
                          Media Coverage
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Previous publications and media appearances by {pitch.user?.fullName || pitch.user?.username}
                        </p>
                      </div>

                      {pitch.user?.mediaKit && pitch.user.mediaKit.length > 0 ? (
                        <div className="space-y-4">
                          {pitch.user.mediaKit.map((item, index) => {
                            let mediaItem: MediaItem;
                            if (typeof item === 'string') {
                              mediaItem = { title: item, url: '#' };
                            } else {
                              mediaItem = item;
                            }
                            
                            return (
                              <Card key={index} className="overflow-hidden border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    <div className="flex-1">
                                      <h4 className="text-lg font-semibold text-blue-800">{mediaItem.title}</h4>
                                      <div className="flex flex-wrap gap-x-4 mt-2 text-sm text-gray-600">
                                        {mediaItem.publication && (
                                          <div className="flex items-center">
                                            <Bookmark className="h-4 w-4 mr-1 text-blue-600" />
                                            <span>{mediaItem.publication}</span>
                                          </div>
                                        )}
                                        {mediaItem.date && (
                                          <div className="flex items-center">
                                            <Calendar className="h-4 w-4 mr-1 text-blue-600" />
                                            <span>{mediaItem.date}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <a 
                                      href={mediaItem.url.startsWith('http') ? mediaItem.url : `https://${mediaItem.url}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium"
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
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                          <FileText className="h-10 w-10 text-gray-300 mb-2" />
                          <p className="text-gray-500 mb-2">No media coverage items available</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-center mt-8">
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