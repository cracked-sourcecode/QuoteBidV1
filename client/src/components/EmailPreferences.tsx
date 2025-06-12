import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiFetch } from '@/lib/apiFetch';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  DollarSign, 
  FileText, 
  CheckCircle,
  Newspaper,
  TrendingDown,
  Clock,
  Mail
} from 'lucide-react';

interface EmailPreferences {
  priceAlerts: boolean;
  opportunityNotifications: boolean;
  pitchStatusUpdates: boolean;
  paymentConfirmations: boolean;
  mediaCoverageUpdates: boolean;
  placementSuccess: boolean;
}

const EMAIL_CATEGORIES = [
  {
    id: 'priceAlerts',
    title: 'Price Drop Alerts',
    description: 'Get notified when opportunity prices drop or reach last call',
    icon: TrendingDown,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    examples: ['Price dropped from $250 to $200', 'Last call - only 2 hours left!']
  },
  {
    id: 'opportunityNotifications',
    title: 'New Opportunities',
    description: 'Notifications about new opportunities in your industry',
    icon: Bell,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    examples: ['New tech opportunity posted', 'Opportunity matches your expertise']
  },
  {
    id: 'pitchStatusUpdates',
    title: 'Pitch Status Updates',
    description: 'Updates on your pitch submissions and responses',
    icon: FileText,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    examples: ['Your pitch was accepted!', 'Pitch deadline reminder']
  },
  {
    id: 'paymentConfirmations',
    title: 'Payment Confirmations',
    description: 'Receipts and billing confirmations',
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    examples: ['Payment processed successfully', 'Invoice for successful placement']
  },
  {
    id: 'mediaCoverageUpdates',
    title: 'Media Coverage Updates',
    description: 'Notifications when your articles are published',
    icon: Newspaper,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    examples: ['Your article was published!', 'Media coverage added to portfolio']
  },
  {
    id: 'placementSuccess',
    title: 'Placement Success',
    description: 'Confirmations of successful media placements',
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    examples: ['Placement confirmed', 'Ready for billing notification']
  }
];



export function EmailPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localPreferences, setLocalPreferences] = useState<EmailPreferences | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current email preferences
  const { data: preferences, isLoading, error } = useQuery<EmailPreferences>({
    queryKey: [`/api/users/${user?.id}/email-preferences`],
    queryFn: async () => {
      const response = await apiFetch(`/api/users/${user?.id}/email-preferences`);
      if (!response.ok) throw new Error('Failed to fetch email preferences');
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Initialize local preferences when data is loaded
  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
      setHasChanges(false);
    }
  }, [preferences]);

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: EmailPreferences) => {
      const response = await apiFetch(`/api/users/${user?.id}/email-preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreferences),
      });
      if (!response.ok) throw new Error('Failed to update email preferences');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/email-preferences`] });
      setHasChanges(false);
      toast({
        title: "Preferences Updated",
        description: "Your email preferences have been saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggle = (categoryId: keyof EmailPreferences) => {
    if (!localPreferences) return;
    
    const updatedPreferences = {
      ...localPreferences,
      [categoryId]: !localPreferences[categoryId]
    };
    
    setLocalPreferences(updatedPreferences);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (localPreferences) {
      updatePreferencesMutation.mutate(localPreferences);
    }
  };

  const handleReset = () => {
    if (preferences) {
      setLocalPreferences({ ...preferences });
      setHasChanges(false);
    }
  };

  if (isLoading || !localPreferences) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load email preferences</h3>
          <p className="text-gray-600 mb-4">Error: {error.message}</p>
          <p className="text-gray-600 mb-4">There was an error loading your email preferences. Please try refreshing the page.</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Preferences</h2>
        <p className="text-gray-600">
          Control which email notifications you receive from QuoteBid. You can always change these settings.
        </p>
      </div>

      {/* Optional Email Preferences */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            Notification Preferences
          </CardTitle>
          <CardDescription className="text-gray-600">
            Choose which types of email updates you'd like to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {EMAIL_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isEnabled = localPreferences[category.id as keyof EmailPreferences];
            
            return (
              <div key={category.id} className="group">
                <div className="flex items-start justify-between p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-all duration-200">
                  <div className="flex gap-4 flex-1">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl ${category.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`h-6 w-6 ${category.color}`} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{category.title}</h3>
                        <Badge 
                          variant={isEnabled ? "default" : "secondary"}
                          className={isEnabled ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"}
                        >
                          {isEnabled ? "On" : "Off"}
                        </Badge>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{category.description}</p>
                      
                      {/* Examples */}
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 font-medium">Examples:</p>
                        {category.examples.map((example, idx) => (
                          <p key={idx} className="text-xs text-gray-500 pl-2 border-l-2 border-gray-300">
                            "{example}"
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Toggle */}
                  <div className="flex-shrink-0 ml-4">
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => handleToggle(category.id as keyof EmailPreferences)}
                      disabled={updatePreferencesMutation.isPending}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>



      {/* Save Status */}
      {updatePreferencesMutation.isPending && (
        <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-3" />
          <span className="text-blue-700 text-sm">Saving preferences...</span>
        </div>
      )}

      {/* Save/Reset Buttons */}
      {hasChanges && !updatePreferencesMutation.isPending && (
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Unsaved Changes</h3>
                <p className="text-sm text-gray-600">You have unsaved changes to your email preferences.</p>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleReset}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </Button>
                <Button 
                  onClick={handleSave}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save Preferences
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 