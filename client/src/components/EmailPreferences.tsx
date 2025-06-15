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
import { useTheme } from '@/hooks/use-theme';
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
  const { theme } = useTheme();
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
        <div className={`h-8 w-64 ${theme === 'light' ? 'bg-gray-200' : 'bg-slate-700'} rounded animate-pulse`} />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className={`h-24 ${theme === 'light' ? 'bg-gray-200' : 'bg-slate-700'} rounded animate-pulse`} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h3 className={`text-lg font-medium ${theme === 'light' ? 'text-gray-900' : 'text-slate-100'} mb-2`}>Failed to load email preferences</h3>
          <p className={`${theme === 'light' ? 'text-gray-600' : 'text-slate-400'} mb-4`}>Error: {error.message}</p>
          <p className={`${theme === 'light' ? 'text-gray-600' : 'text-slate-400'} mb-4`}>There was an error loading your email preferences. Please try refreshing the page.</p>
          <Button onClick={() => window.location.reload()} variant="outline" className={theme === 'light' ? 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900' : 'border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100'}>
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
        <h2 className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-slate-100'} mb-2`}>Email Preferences</h2>
        <p className={theme === 'light' ? 'text-gray-600' : 'text-slate-400'}>
          Control which email notifications you receive from QuoteBid. You can always change these settings.
        </p>
      </div>

      {/* Optional Email Preferences */}
      <Card className={`${theme === 'light' ? 'bg-white border-gray-200' : 'bg-slate-800 border-slate-700'} shadow-sm`}>
        <CardHeader>
          <CardTitle className={`${theme === 'light' ? 'text-gray-900' : 'text-slate-100'} flex items-center gap-2`}>
            <Bell className="h-5 w-5 text-blue-400" />
            Notification Preferences
          </CardTitle>
          <CardDescription className={theme === 'light' ? 'text-gray-600' : 'text-slate-400'}>
            Choose which types of email updates you'd like to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {EMAIL_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isEnabled = localPreferences[category.id as keyof EmailPreferences];
            
            return (
              <div key={category.id} className="group">
                <div className={`flex items-start justify-between p-4 rounded-xl border ${theme === 'light' ? 'border-gray-200 bg-gray-50 hover:bg-blue-50' : 'border-slate-600 bg-slate-700 hover:bg-slate-600'} transition-all duration-200`}>
                  <div className="flex gap-4 flex-1">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl ${theme === 'light' ? 'bg-white border border-gray-200' : 'bg-slate-800'} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`h-6 w-6 ${theme === 'light' ? category.color : category.color.replace('text-red-600', 'text-red-400').replace('text-blue-600', 'text-blue-400').replace('text-yellow-600', 'text-yellow-400').replace('text-green-600', 'text-green-400').replace('text-purple-600', 'text-purple-400').replace('text-emerald-600', 'text-emerald-400')}`} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-slate-100'}`}>{category.title}</h3>
                        <Badge 
                          variant={isEnabled ? "default" : "secondary"}
                          className={isEnabled ? (theme === 'light' ? "bg-green-100 text-green-700 border-green-300" : "bg-green-800 text-green-200 border-green-700") : (theme === 'light' ? "bg-gray-100 text-gray-700 border-gray-300" : "bg-slate-600 text-slate-300 border-slate-500")}
                        >
                          {isEnabled ? "On" : "Off"}
                        </Badge>
                      </div>
                      <p className={`${theme === 'light' ? 'text-gray-700' : 'text-slate-300'} text-sm mb-3`}>{category.description}</p>
                      
                      {/* Examples */}
                      <div className="space-y-1">
                        <p className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-slate-400'} font-medium`}>Examples:</p>
                        {category.examples.map((example, idx) => (
                          <p key={idx} className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-slate-400'} pl-2 border-l-2 ${theme === 'light' ? 'border-gray-300' : 'border-slate-500'}`}>
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
        <div className={`flex items-center justify-center p-4 ${theme === 'light' ? 'bg-gray-50 border border-gray-200' : 'bg-slate-800 border border-slate-600'} rounded-xl`}>
          <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full mr-3" />
          <span className={`${theme === 'light' ? 'text-gray-700' : 'text-slate-200'} text-sm`}>Saving preferences...</span>
        </div>
      )}

      {/* Save/Reset Buttons */}
      {hasChanges && !updatePreferencesMutation.isPending && (
        <Card className={`${theme === 'light' ? 'bg-white border-gray-200' : 'bg-slate-800 border-slate-700'} shadow-sm`}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-center sm:text-left">
                <h3 className={`font-medium ${theme === 'light' ? 'text-gray-900' : 'text-slate-100'} mb-1`}>Unsaved Changes</h3>
                <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-slate-400'}`}>You have unsaved changes to your email preferences.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  onClick={handleReset}
                  className={`w-full sm:w-auto ${theme === 'light' ? '!bg-white !border-gray-300 !text-gray-700 hover:!bg-gray-50 hover:!text-gray-900' : '!bg-slate-800 !border-slate-600 !text-slate-300 hover:!bg-slate-700 hover:!text-slate-100'}`}
                >
                  Reset
                </Button>
                <Button 
                  onClick={handleSave}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
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