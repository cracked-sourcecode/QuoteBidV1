import { CreditCard } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import PaymentModal from "./PaymentModal";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export default function PaywallModal({
  isOpen,
  onClose,
  title = "Subscription Required",
  description = "You need an active subscription to access this feature."
}: PaywallModalProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const { theme } = useTheme();

  const handleUpdateSubscription = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    onClose();
    // Force page refresh to update subscription status
    window.location.reload();
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`sm:max-w-lg ${
          theme === 'dark' 
            ? 'bg-slate-900 border-slate-700' 
            : 'bg-white border-gray-200'
        }`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${
              theme === 'dark' ? 'text-slate-100' : 'text-gray-900'
            }`}>
              <CreditCard className={`h-5 w-5 ${
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              }`} />
              {title}
            </DialogTitle>
            <DialogDescription className={
              theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
            }>
              {description} Please update your subscription to continue.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className={`rounded-lg p-4 mb-4 border ${
              theme === 'dark' 
                ? 'bg-slate-800/50 border-slate-700 backdrop-blur-sm' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <h3 className={`font-medium mb-2 ${
                theme === 'dark' ? 'text-slate-100' : 'text-blue-900'
              }`}>
                QuoteBid Premium Features:
              </h3>
              <ul className={`text-sm space-y-1 ${
                theme === 'dark' ? 'text-slate-300' : 'text-blue-800'
              }`}>
                <li>• Unlimited pitches to journalists</li>
                <li>• Access to premium tier opportunities</li>
                <li>• Priority matching with journalists</li>
                <li>• Professional profile showcase</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              className={`flex-1 ${
                theme === 'dark' 
                  ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateSubscription}
              className={`flex-1 text-white ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Update Subscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={handlePaymentClose}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
} 