import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { OpportunityWithPublication, Bid } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface BiddingModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: OpportunityWithPublication;
}

export default function BiddingModal({
  isOpen,
  onClose,
  opportunity
}: BiddingModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [bidAmount, setBidAmount] = useState<number>(opportunity.minimumBid || 100);
  const [bidMessage, setBidMessage] = useState<string>("");
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Calculate time remaining for the bid
  useEffect(() => {
    if (opportunity.deadline) {
      const deadline = new Date(opportunity.deadline);
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining("Closed");
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      setTimeRemaining(`${hours} hours`);
    } else {
      setTimeRemaining("48 hours");
    }
  }, [opportunity]);

  // Fetch bids for this opportunity
  const { data: bids, isLoading: isBidsLoading } = useQuery({
    queryKey: [`/api/opportunities/${opportunity.id}/bids`],
  });

  // Handle bid submission
  const submitBid = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/bids", {
        opportunityId: opportunity.id,
        userId: 1,  // In a real app, this would be the logged-in user's ID
        amount: bidAmount,
        message: bidMessage,
        status: "pending"
      });
    },
    onSuccess: () => {
      toast({
        title: "Bid submitted",
        description: "Your bid has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/opportunities/${opportunity.id}/bids`] });
      onClose();
    },
    onError: (error: any) => {
      if (error.message.includes("Bid amount must be higher")) {
        const match = error.message.match(/minimumBid: (\d+)/);
        if (match && match[1]) {
          const newMinimum = parseInt(match[1]);
          setBidAmount(newMinimum);
          toast({
            title: "Bid too low",
            description: `Your bid must be at least $${newMinimum}.`,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to submit bid. Please try again.",
          variant: "destructive"
        });
      }
    }
  });

  // Get the current highest bid
  const currentHighestBid = isBidsLoading || !bids?.length
    ? opportunity.minimumBid || 100
    : Math.max(...bids.map((bid: Bid) => bid.amount));

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Place Your Bid</DialogTitle>
          <DialogDescription>
            Submit a bid for this opportunity to work with {opportunity.publication.name}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <div className="flex items-center mb-2">
            <img 
              src={opportunity.publication.logo} 
              alt={opportunity.publication.name} 
              className="h-8 mr-3" 
            />
            <h4 className="font-medium text-gray-900">{opportunity.title}</h4>
          </div>
          <p className="text-sm text-gray-600">
            Current Minimum Bid: <span className="font-medium">{formatCurrency(currentHighestBid)}</span>
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Your Bid Amount</label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <Input
              type="number"
              min={currentHighestBid}
              className="focus:ring-qpurple focus:border-qpurple block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md py-2"
              placeholder="0"
              value={bidAmount}
              onChange={(e) => setBidAmount(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Why are you the right expert? (Optional)</label>
          <Textarea
            rows={3}
            className="shadow-sm focus:ring-qpurple focus:border-qpurple block w-full sm:text-sm border-gray-300 rounded-md resize-none"
            value={bidMessage}
            onChange={(e) => setBidMessage(e.target.value)}
          />
        </div>
        
        {!isBidsLoading && bids && bids.length > 0 && (
          <div className="bg-gray-50 p-3 rounded-md mb-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Bid History</h5>
            <div className="space-y-2">
              {bids.slice(0, 5).map((bid: Bid, index: number) => (
                <div key={bid.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">Anonymous</span>
                  <span className="font-medium">{formatCurrency(bid.amount)}</span>
                </div>
              ))}
              {opportunity.minimumBid > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Starting bid</span>
                  <span className="font-medium">{formatCurrency(opportunity.minimumBid)}</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            <span>Bids close in: <span className="font-medium">{timeRemaining}</span></span>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose} className="mt-2 sm:mt-0">
            Cancel
          </Button>
          <Button 
            onClick={() => submitBid.mutate()}
            disabled={bidAmount < currentHighestBid || submitBid.isPending}
            className="bg-qpurple hover:bg-qpurple/90"
          >
            {submitBid.isPending ? "Submitting..." : "Place Bid"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
