import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { Link } from "wouter";

interface ResubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionStatus?: string;
  expiryDate?: Date | null;
}

export default function ResubscriptionModal({ open, onOpenChange, subscriptionStatus, expiryDate }: ResubscriptionModalProps) {
  const [formattedDate, setFormattedDate] = useState<string>('');

  useEffect(() => {
    if (expiryDate) {
      // Format date as Month Day, Year
      setFormattedDate(new Date(expiryDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }));
    }
  }, [expiryDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Subscription Renewal Required
          </DialogTitle>
          <DialogDescription className="text-base">
            Your access to opportunities requires an active subscription.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive" className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Subscription {subscriptionStatus === 'past_due' ? 'Past Due' : 'Expired'}</AlertTitle>
            <AlertDescription className="text-amber-700">
              {subscriptionStatus === 'past_due' 
                ? 'Your last payment was unsuccessful. Please update your payment method to continue accessing opportunities.'
                : expiryDate 
                  ? `Your subscription expired on ${formattedDate}. Renew now to regain full access.`
                  : 'Your subscription has expired. Renew now to regain full access.'}
            </AlertDescription>
          </Alert>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <h3 className="font-medium mb-2">Benefits of an active subscription:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Access to exclusive media opportunities</li>
              <li>Ability to submit pitches and secure coverage</li>
              <li>Voice pitching capabilities</li>
              <li>Full platform functionality</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Remind Me Later
          </Button>
          <Button 
            asChild
            className="w-full sm:w-auto bg-[#004684] hover:bg-[#003a70]"
          >
            <Link href="/subscribe">
              Renew Subscription
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
