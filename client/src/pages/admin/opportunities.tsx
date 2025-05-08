import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Loader2 } from "lucide-react";
import { OpportunityForm } from "@/components/admin/opportunity-form";
import { Opportunity, OpportunityWithPublication } from "@shared/schema";

export default function AdminOpportunities() {
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch opportunities with publications
  const { data: opportunities, isLoading } = useQuery<OpportunityWithPublication[]>({
    queryKey: ["/api/opportunities"],
    staleTime: 30000, // 30 seconds
  });

  // Mutation for creating a new opportunity
  const createOpportunityMutation = useMutation({
    mutationFn: async (values: any) => {
      // Process tags if provided as a comma-separated string
      if (values.tags && typeof values.tags === "string") {
        values.tags = values.tags.split(",").map((tag: string) => tag.trim()).filter(Boolean);
      }
      
      const response = await apiRequest("POST", "/api/admin/opportunities", values);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create opportunity");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      setIsAdding(false);
    },
  });

  // Handler for form submission
  const handleCreateOpportunity = async (values: any) => {
    await createOpportunityMutation.mutateAsync(values);
  };

  // Get counts for each tier
  const tierCounts = {
    "Tier 1": opportunities?.filter(opp => opp.tier === "Tier 1").length || 0,
    "Tier 2": opportunities?.filter(opp => opp.tier === "Tier 2").length || 0,
    "Tier 3": opportunities?.filter(opp => opp.tier === "Tier 3").length || 0,
    "Unassigned": opportunities?.filter(opp => !opp.tier).length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage PR Opportunities</h1>
        
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add New Opportunity
          </Button>
        )}
      </div>
      
      {isAdding ? (
        <div className="mt-6">
          <OpportunityForm 
            onSubmit={handleCreateOpportunity} 
          />
          <div className="mt-4 flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => setIsAdding(false)}
              className="mr-2"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tier 1 Opportunities</CardTitle>
                <CardDescription>Premium media placements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tierCounts["Tier 1"]}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tier 2 Opportunities</CardTitle>
                <CardDescription>Standard placements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tierCounts["Tier 2"]}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tier 3 Opportunities</CardTitle>
                <CardDescription>Basic placements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tierCounts["Tier 3"]}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
                <CardDescription>Need tier assignment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tierCounts["Unassigned"]}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="all" className="mt-6">
            <TabsList>
              <TabsTrigger value="all">All Opportunities</TabsTrigger>
              <TabsTrigger value="tier1">Tier 1</TabsTrigger>
              <TabsTrigger value="tier2">Tier 2</TabsTrigger>
              <TabsTrigger value="tier3">Tier 3</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-4">
              {renderOpportunityList(opportunities, isLoading)}
            </TabsContent>
            
            <TabsContent value="tier1" className="mt-4">
              {renderOpportunityList(
                opportunities?.filter(opp => opp.tier === "Tier 1"), 
                isLoading
              )}
            </TabsContent>
            
            <TabsContent value="tier2" className="mt-4">
              {renderOpportunityList(
                opportunities?.filter(opp => opp.tier === "Tier 2"), 
                isLoading
              )}
            </TabsContent>
            
            <TabsContent value="tier3" className="mt-4">
              {renderOpportunityList(
                opportunities?.filter(opp => opp.tier === "Tier 3"), 
                isLoading
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function renderOpportunityList(opportunities: OpportunityWithPublication[] | undefined, isLoading: boolean) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!opportunities || opportunities.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No opportunities found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {opportunities.map((opportunity) => (
        <Card key={opportunity.id} className="overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{opportunity.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {opportunity.publication.name} • {new Date(opportunity.createdAt as Date).toLocaleDateString()}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {opportunity.tier && (
                    <Badge variant={
                      opportunity.tier === "Tier 1" ? "default" : 
                      opportunity.tier === "Tier 2" ? "secondary" : 
                      "outline"
                    }>
                      {opportunity.tier}
                    </Badge>
                  )}
                  
                  <Badge variant="outline">{opportunity.requestType}</Badge>
                  
                  {opportunity.industry && (
                    <Badge variant="outline">{opportunity.industry}</Badge>
                  )}
                  
                  {opportunity.status && (
                    <Badge variant={opportunity.status === "open" ? "success" as const : "destructive" as const}>
                      {opportunity.status.charAt(0).toUpperCase() + opportunity.status.slice(1)}
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm line-clamp-2">{opportunity.description}</p>
                
                {opportunity.deadline && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Deadline: {new Date(opportunity.deadline as Date).toLocaleDateString()}
                  </p>
                )}
              </div>
              
              <div className="text-right">
                <div className="text-lg font-bold">
                  ${opportunity.minimumBid?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  Min. Bid
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}