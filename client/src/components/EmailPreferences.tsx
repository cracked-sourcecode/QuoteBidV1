import React, { useState } from 'react';
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
  Shield,
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
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    examples: ['Price dropped from $250 to $200', 'Last call - only 2 hours left!']
  },
  {
    id: 'opportunityNotifications',
    title: 'New Opportunities',
    description: 'Notifications about new opportunities in your industry',
    icon: Bell,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    examples: ['New tech opportunity posted', 'Opportunity matches your expertise']
  },
  {
    id: 'pitchStatusUpdates',
    title: 'Pitch Status Updates',
    description: 'Updates on your pitch submissions and responses',
    icon: FileText,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    examples: ['Your pitch was accepted!', 'Pitch deadline reminder']
  },
  {
    id: 'paymentConfirmations',
    title: 'Payment Confirmations',
    description: 'Receipts and billing confirmations',
    icon: DollarSign,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    examples: ['Payment processed successfully', 'Invoice for successful placement']
  },
  {
    id: 'mediaCoverageUpdates',
    title: 'Media Coverage Updates',
    description: 'Notifications when your articles are published',
    icon: Newspaper,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    examples: ['Your article was published!', 'Media coverage added to portfolio']
  },
  {
    id: 'placementSuccess',
    title: 'Placement Success',
    description: 'Confirmations of successful media placements',
    icon: CheckCircle,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    examples: ['Placement confirmed', 'Ready for billing notification']
  }
];

const REQUIRED_EMAILS = [
  {
    title: 'Password Reset',
    description: 'Security emails for password changes',
    icon: Shield,
    required: true
  },
  {
    title: 'Welcome Email',
    description: 'Account setup and onboarding',
    icon: Mail,
    required: true
  },
  {
    title: 'Username Reminder',
    description: 'Account recovery assistance',
    icon: Mail,
    required: true
  }
];

export function EmailPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current email preferences
  const { data: preferences, isLoading } = useQuery<EmailPreferences>({
    queryKey: [`/api/users/${user?.id}/email-preferences`],
    queryFn: async () => {
      const response = await apiFetch(`/api/users/${user?.id}/email-preferences`);
      if (!response.ok) throw new Error('Failed to fetch email preferences');
      return response.json();
    },
    enabled: !!user?.id,
  });

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
    if (!preferences) return;
    
    const updatedPreferences = {
      ...preferences,
      [categoryId]: !preferences[categoryId]
    };
    
    updatePreferencesMutation.mutate(updatedPreferences);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-slate-800/50 rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-24 bg-slate-800/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Email Preferences</h2>
        <p className="text-slate-400">
          Control which email notifications you receive from QuoteBid. You can always change these settings.
        </p>
      </div>

      {/* Optional Email Preferences */}
      <Card className="bg-slate-800/30 border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-400" />
            Notification Preferences
          </CardTitle>
          <CardDescription className="text-slate-400">
            Choose which types of email updates you'd like to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {EMAIL_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isEnabled = preferences?.[category.id as keyof EmailPreferences] ?? true;
            
            return (
              <div key={category.id} className="group">
                <div className="flex items-start justify-between p-4 rounded-xl border border-white/10 bg-slate-800/20 hover:bg-slate-800/40 transition-all duration-200">
                  <div className="flex gap-4 flex-1">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl ${category.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`h-6 w-6 ${category.color}`} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-white">{category.title}</h3>
                        <Badge 
                          variant={isEnabled ? "default" : "secondary"}
                          className={isEnabled ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-slate-600/20 text-slate-400 border-slate-500/30"}
                        >
                          {isEnabled ? "On" : "Off"}
                        </Badge>
                      </div>
                      <p className="text-slate-400 text-sm mb-3">{category.description}</p>
                      
                      {/* Examples */}
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 font-medium">Examples:</p>
                        {category.examples.map((example, idx) => (
                          <p key={idx} className="text-xs text-slate-400 pl-2 border-l-2 border-slate-700">
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

      {/* Required Emails Section */}
      <Card className="bg-slate-800/30 border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-400" />
            Required Security Emails
          </CardTitle>
          <CardDescription className="text-slate-400">
            These emails are required for account security and cannot be disabled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {REQUIRED_EMAILS.map((email, idx) => {
            const Icon = email.icon;
            
            return (
              <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-amber-500/20 bg-amber-500/10">
                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{email.title}</h3>
                    <p className="text-sm text-slate-400">{email.description}</p>
                  </div>
                </div>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  Required
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Save Status */}
      {updatePreferencesMutation.isPending && (
        <div className="flex items-center justify-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full mr-3" />
          <span className="text-blue-400 text-sm">Saving preferences...</span>
        </div>
      )}
    </div>
  );
} 