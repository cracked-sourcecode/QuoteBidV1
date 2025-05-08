import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  OPPORTUNITY_TIERS, 
  INDUSTRY_OPTIONS, 
  MEDIA_TYPES 
} from "@/lib/constants";

interface FilterBarProps {
  activeFilter: string;
  onFilterChange: (filter: any) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: "expanded"; // Only "expanded" is supported now
  onViewModeChange: (mode: "expanded") => void; // Simplified to only allow "expanded"

  selectedTier?: string;
  onTierChange?: (tier: string) => void;
  selectedIndustry?: string;
  onIndustryChange?: (industry: string) => void;
  selectedMediaType?: string;
  onMediaTypeChange?: (mediaType: string) => void;
}

export default function FilterBar({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  selectedTier = "all",
  onTierChange = () => {},
  selectedIndustry = "all",
  onIndustryChange = () => {},
  selectedMediaType = "all",
  onMediaTypeChange = () => {}
}: FilterBarProps) {
  // Define filter buttons - removed media-matcher, free, and advanced options
  const filterButtons = [
    {
      id: "all",
      label: "All Opportunities",
      icon: (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-4 w-4 mr-1" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
          />
        </svg>
      )
    },
    {
      id: "saved",
      label: "Saved",
      icon: (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-4 w-4 mr-1" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" 
          />
        </svg>
      )
    },
    {
      id: "pitched",
      label: "Pitched",
      icon: (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-4 w-4 mr-1" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
          />
        </svg>
      )
    }
  ];

  return (
    <div className="mb-6">
      {/* Top Filter Buttons Bar */}
      <div className="bg-white shadow-sm rounded-md py-3 px-4 mb-4 flex items-center">
        <div className="flex gap-3">
          {filterButtons.map((button) => (
            <Button
              key={button.id}
              onClick={() => onFilterChange(button.id)}
              variant={activeFilter === button.id ? "default" : "outline"}
              className={`inline-flex items-center px-4 py-2 text-sm rounded-md transition-colors ${
                activeFilter === button.id
                  ? "bg-[#004684] text-white hover:bg-[#00396d]"
                  : "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              }`}
            >
              {button.icon}
              {button.label}
            </Button>
          ))}
        </div>

        {/* Empty div to maintain spacing */}
        <div className="ml-auto"></div>
      </div>
      
      {/* Search Bar with Advanced Filter Toggle */}
      <div className="bg-white shadow-sm rounded-md p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Input
            type="text"
            placeholder="Search by headline, keyword, or description..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-md border-gray-200 h-10 pl-10 pr-10 border text-base"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          </div>
          {searchQuery && (
            <button 
              className="absolute inset-y-0 right-0 flex items-center pr-3 hover:text-gray-700"
              onClick={() => onSearchChange("")}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-gray-500" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M6 18L18 6M6 6l12 12" 
                />
              </svg>
            </button>
          )}
        </div>
        
        {/* Advanced Search Section */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium">Advanced Search</h3>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                onTierChange("all");
                onIndustryChange("all");
                onMediaTypeChange("all");
                onSearchChange("");
              }}
              className="text-xs"
            >
              Clear Filters
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* Tier Filter */}
            <div className="w-auto">
              <Select
                value={selectedTier}
                onValueChange={onTierChange}
              >
                <SelectTrigger className="h-9 bg-white border border-gray-200 min-w-[120px]">
                  <SelectValue placeholder="All Tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  {OPPORTUNITY_TIERS.map((tier) => (
                    <SelectItem key={tier.value} value={tier.value}>
                      {tier.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Industry Filter */}
            <div className="w-auto">
              <Select
                value={selectedIndustry}
                onValueChange={onIndustryChange}
              >
                <SelectTrigger className="h-9 bg-white border border-gray-200 min-w-[160px]">
                  <SelectValue placeholder="All Industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {INDUSTRY_OPTIONS.map((industry) => (
                    <SelectItem key={industry.value} value={industry.value}>
                      {industry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Media Type Filter */}
            <div className="w-auto">
              <Select
                value={selectedMediaType}
                onValueChange={onMediaTypeChange}
              >
                <SelectTrigger className="h-9 bg-white border border-gray-200 min-w-[140px]">
                  <SelectValue placeholder="All Media Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Media Types</SelectItem>
                  {MEDIA_TYPES.map((mediaType) => (
                    <SelectItem key={mediaType.value} value={mediaType.value}>
                      {mediaType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            

          </div>
        </div>
      </div>
    </div>
  );
}
