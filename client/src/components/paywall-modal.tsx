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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              {title}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {description} Please update your subscription to continue.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-blue-900 mb-2">QuoteBid Premium Features:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
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
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateSubscription}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
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