import { format, differenceInDays } from "date-fns";
import { Circle, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressTrackerProps {
  status: string;
  createdAt: string;
}

function getStatusInfo(status: string): {
  color: string;
  stepCount: number;
  stepReached: number;
  isRejected: boolean;
} {
  // Define step reached based on status
  const statusStep: Record<string, number> = {
    pending: 1,
    approved: 2,
    rejected: 2,
    successful: 3,
    "successful placement": 4
  };

  // Get step count and reached step
  const normalizedStatus = status.toLowerCase();
  let stepReached = statusStep[normalizedStatus] || 1;
  
  // Define color and step count based on status path
  let color = "bg-blue-500";
  let stepCount = 4; // Default for successful path
  let isRejected = false;
  
  if (status.toLowerCase() === "rejected") {
    color = "bg-red-500";
    isRejected = true;
    stepCount = 3; // Shorter path for rejected
  }
  
  return { color, stepCount, stepReached, isRejected };
}

function formatElapsedTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const daysDiff = differenceInDays(now, date);
  
  if (daysDiff === 0) {
    return "Today";
  } else if (daysDiff === 1) {
    return "Yesterday";
  } else if (daysDiff < 7) {
    return `${daysDiff} days ago`;
  } else {
    return format(date, "MMM d, yyyy");
  }
}

export default function ProgressTracker({ status, createdAt }: ProgressTrackerProps) {
  const { color, stepCount, stepReached, isRejected } = getStatusInfo(status);
  
  // Define the steps labels based on whether it's rejected or successful path
  const stepsLabels = isRejected
    ? ["Received", "Review", "Rejected"]
    : ["Received", "Review", "Approved", "Published"];

  return (
    <div className="w-full py-4">
      {/* Status Text */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <div className={cn(
            "h-2.5 w-2.5 rounded-full mr-2",
            status.toLowerCase() === "pending" ? "bg-yellow-500" :
            status.toLowerCase() === "rejected" ? "bg-red-500" :
            status.toLowerCase() === "approved" ? "bg-green-500" :
            status.toLowerCase() === "successful" || status.toLowerCase() === "successful placement" ? "bg-purple-500" :
            "bg-gray-500"
          )} />
          <span className="text-sm font-medium capitalize">{status}</span>
        </div>
        <span className="text-xs text-slate-500">{formatElapsedTime(createdAt)}</span>
      </div>

      {/* Progress Bar */}
      <div className="relative flex items-center mt-4">
        {/* Progress Bar Line */}
        <div className="absolute h-1 bg-slate-200 w-full rounded-full" />
        
        {/* Filled Progress */}
        <div 
          className={cn(
            "absolute h-1 rounded-full transition-all duration-500",
            isRejected ? "bg-red-500" : color
          )}
          style={{ width: `${((stepReached - 1) / (stepCount - 1)) * 100}%` }}
        />
        
        {/* Step Dots */}
        {Array.from({ length: stepCount }).map((_, index) => {
          const isCompleted = index + 1 <= stepReached;
          const isCurrent = index + 1 === stepReached;
          
          return (
            <div 
              key={index}
              className={cn(
                "relative flex items-center justify-center w-8 h-8 rounded-full z-10 transition-all duration-300",
                index === 0 ? "mr-auto" :
                index === stepCount - 1 ? "ml-auto" : "mx-auto",
                isCompleted && !isRejected ? "text-white" : "text-slate-400"
              )}
            >
              <div 
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full border-2",
                  isCompleted && !isRejected ? `${color} border-blue-500` :
                  isCompleted && isRejected ? "bg-red-500 border-red-500" :
                  "bg-white border-slate-300"
                )}
              >
                {isCompleted ? (
                  isRejected && index + 1 === stepReached ? (
                    <X className="h-4 w-4 text-white" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </div>

              {/* Step Label */}
              <div
                className={cn(
                  "absolute mt-10 text-xs font-medium",
                  isCompleted ? "text-slate-700" : "text-slate-500"
                )}
              >
                {stepsLabels[index]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}