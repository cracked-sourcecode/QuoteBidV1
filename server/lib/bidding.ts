/**
 * Bidding system utility for handling bid logic
 */

// Define bid increment thresholds
interface BidIncrementThreshold {
  threshold: number;
  increment: number;
}

// Thresholds for bid increments based on current bid amount
const BID_INCREMENT_THRESHOLDS: BidIncrementThreshold[] = [
  { threshold: 100, increment: 25 },
  { threshold: 500, increment: 50 },
  { threshold: 1000, increment: 100 },
  { threshold: 5000, increment: 250 },
  { threshold: 10000, increment: 500 }
];

/**
 * Calculate the minimum next bid based on the current bid amount
 * Higher bid amounts have larger required increments
 * 
 * @param currentBid - The current highest bid amount
 * @returns The minimum next bid amount
 */
export function increaseBidAmount(currentBid: number): number {
  // Find the appropriate increment based on the current bid
  let increment = 10; // Default increment for small bids
  
  // Apply different increments based on bid amount thresholds
  for (let i = BID_INCREMENT_THRESHOLDS.length - 1; i >= 0; i--) {
    if (currentBid >= BID_INCREMENT_THRESHOLDS[i].threshold) {
      increment = BID_INCREMENT_THRESHOLDS[i].increment;
      break;
    }
  }
  
  // Calculate the new minimum bid
  return currentBid + increment;
}

/**
 * Validate a bid against the current highest bid
 * 
 * @param bidAmount - The proposed bid amount
 * @param currentHighestBid - The current highest bid
 * @returns Object with validation result and error message if applicable
 */
export function validateBid(bidAmount: number, currentHighestBid: number): { valid: boolean; message?: string } {
  // Check if bid amount is a positive number
  if (bidAmount <= 0) {
    return { valid: false, message: "Bid amount must be greater than zero" };
  }
  
  // Calculate minimum acceptable bid
  const minimumBid = increaseBidAmount(currentHighestBid);
  
  // Check if bid meets the minimum requirement
  if (bidAmount < minimumBid) {
    return { 
      valid: false, 
      message: `Bid amount must be at least ${minimumBid}` 
    };
  }
  
  return { valid: true };
}

/**
 * Calculate bid closing time based on activity
 * This extends the deadline when bids are made close to closing time
 * 
 * @param currentDeadline - The current deadline timestamp
 * @param bidTime - The time the bid was placed
 * @returns New deadline timestamp
 */
export function calculateBidClosingTime(currentDeadline: Date, bidTime: Date): Date {
  const minutesBeforeClose = 30; // Auto-extend if bid is within 30 minutes of closing
  const extensionMinutes = 15; // Extend by 15 minutes
  
  // Calculate time remaining before deadline (in milliseconds)
  const timeToDeadline = currentDeadline.getTime() - bidTime.getTime();
  const minutesToDeadline = timeToDeadline / (1000 * 60);
  
  // If bid is placed within specified window before closing, extend the deadline
  if (minutesToDeadline <= minutesBeforeClose) {
    const newDeadline = new Date(currentDeadline);
    newDeadline.setMinutes(newDeadline.getMinutes() + extensionMinutes);
    return newDeadline;
  }
  
  // Return original deadline if no extension needed
  return currentDeadline;
}
