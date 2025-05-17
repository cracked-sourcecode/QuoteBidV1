import { 
  users, type User, type InsertUser,
  adminUsers, type AdminUser, type InsertAdminUser,
  publications, type Publication, type InsertPublication,
  opportunities, type Opportunity, type InsertOpportunity,
  bids, type Bid, type InsertBid,
  pitches, type Pitch, type InsertPitch,
  savedOpportunities, type SavedOpportunity, type InsertSavedOpportunity,
  placements, type Placement, type InsertPlacement,
  annotations, type Annotation, type InsertAnnotation,
  annotationComments, type AnnotationComment, type InsertAnnotationComment,
  pitchMessages, type PitchMessage, type InsertPitchMessage,
  type OpportunityWithPublication,
  type PlacementWithRelations,
  type PitchWithRelations
} from "@shared/schema";
import { getDb } from "./db";
import { eq, ne, and, or, desc, sql, like, ilike, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByIndustry(industry: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  
  // Admin Users
  getAdminUser(id: number): Promise<AdminUser | undefined>;
  getAdminUserByUsername(username: string): Promise<AdminUser | undefined>;
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  getAllAdminUsers(): Promise<AdminUser[]>;
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;
  
  // Publications
  getPublication(id: number): Promise<Publication | undefined>;
  getPublications(): Promise<Publication[]>;
  createPublication(publication: InsertPublication): Promise<Publication>;
  updatePublication(id: number, data: Partial<Publication>): Promise<Publication | undefined>;
  deletePublication(id: number): Promise<void>;
  getOpportunitiesByPublication(publicationId: number): Promise<Opportunity[] | undefined>;
  
  // Opportunities
  getOpportunity(id: number): Promise<Opportunity | undefined>;
  getOpportunityWithPublication(id: number): Promise<OpportunityWithPublication | undefined>;
  getOpportunities(): Promise<Opportunity[]>;
  getOpportunitiesWithPublications(): Promise<OpportunityWithPublication[]>;
  createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity>;
  updateOpportunityStatus(id: number, status: string): Promise<Opportunity | undefined>;
  searchOpportunities(query: string): Promise<OpportunityWithPublication[]>;
  
  // Bids
  getBid(id: number): Promise<Bid | undefined>;
  getBidsByOpportunityId(opportunityId: number): Promise<Bid[]>;
  createBid(bid: InsertBid): Promise<Bid>;
  getHighestBidForOpportunity(opportunityId: number): Promise<number>;
  
  // Pitches
  getPitch(id: number): Promise<Pitch | undefined>;
  getPitchById(id: number): Promise<Pitch | undefined>; // Alias for getPitch
  getPitchWithRelations(id: number): Promise<PitchWithRelations | undefined>;
  getPitchesByOpportunityId(opportunityId: number): Promise<Pitch[]>;
  getPitchesByUserId(userId: number): Promise<Pitch[]>;
  getPitchByUserAndOpportunity(userId: number, opportunityId: number): Promise<Pitch | undefined>;
  getAllPitches(): Promise<Pitch[]>;
  getAllPitchesWithRelations(): Promise<PitchWithRelations[]>;
  createPitch(pitch: InsertPitch): Promise<Pitch>;
  updatePitch(data: Partial<Pitch> & { id: number }): Promise<Pitch | undefined>;
  updatePitchTranscript(id: number, transcript: string): Promise<Pitch | undefined>;
  updatePitchStatus(id: number, status: string): Promise<Pitch | undefined>;
  updatePitchPaymentIntent(id: number, paymentIntentId: string, authorizationExpiresAt: Date): Promise<Pitch | undefined>;
  updatePitchBillingInfo(id: number, stripeChargeId: string, billedAt: Date): Promise<Pitch | undefined>;
  updatePitchBillingError(id: number, billingError: string): Promise<Pitch | undefined>;
  updatePitchArticle(id: number, articleData: { url: string, title?: string }): Promise<Pitch | undefined>;
  getPitchByPaymentIntentId(paymentIntentId: string): Promise<Pitch | undefined>;
  getUserDrafts(userId: number, opportunityId?: number): Promise<Pitch[]>;
  
  // Pitch Messages
  getPitchMessages(pitchId: number): Promise<PitchMessage[]>;
  getPitchMessage(id: number): Promise<PitchMessage | undefined>;
  createPitchMessage(message: InsertPitchMessage): Promise<PitchMessage>;
  markPitchMessagesAsRead(pitchId: number, userId: number): Promise<void>;
  getUnreadMessageCountForUser(userId: number): Promise<number>;
  
  // Saved Opportunities
  getSavedOpportunity(userId: number, opportunityId: number): Promise<SavedOpportunity | undefined>;
  getSavedOpportunitiesByUserId(userId: number): Promise<SavedOpportunity[]>;
  createSavedOpportunity(savedOpportunity: InsertSavedOpportunity): Promise<SavedOpportunity>;
  deleteSavedOpportunity(userId: number, opportunityId: number): Promise<boolean>;
  getSavedCountForOpportunity(opportunityId: number): Promise<number>;
  
  // Placements
  getPlacement(id: number): Promise<Placement | undefined>;
  getPlacementWithRelations(id: number): Promise<PlacementWithRelations | undefined>;
  getPlacementsByUserId(userId: number): Promise<Placement[]>;
  getPlacementsByStatus(status: string): Promise<PlacementWithRelations[]>;
  getAllPlacements(): Promise<PlacementWithRelations[]>;
  createPlacement(placement: InsertPlacement): Promise<Placement>;
  updatePlacementStatus(id: number, status: string): Promise<Placement | undefined>;
  updatePlacementArticle(id: number, data: { articleUrl?: string, articleFilePath?: string }): Promise<Placement | undefined>;
  updatePlacementNotification(id: number, notificationSent: boolean): Promise<Placement | undefined>;
  updatePlacementPayment(id: number, invoiceId: string, paymentId: string): Promise<Placement | undefined>;
  updatePlacementPaymentIntent(id: number, paymentIntentId: string): Promise<Placement | undefined>;
  updatePlacementError(id: number, errorMessage: string): Promise<Placement | undefined>;
  
  // Annotations
  getAnnotation(id: number): Promise<Annotation | undefined>;
  getAnnotations(documentId: string): Promise<Annotation[]>;
  createAnnotation(annotation: InsertAnnotation): Promise<Annotation>;
  updateAnnotation(id: number, data: Partial<InsertAnnotation>): Promise<Annotation>;
  resolveAnnotation(id: number): Promise<Annotation>;
  
  // Annotation Comments
  getAnnotationComments(annotationId: number): Promise<AnnotationComment[]>;
  createAnnotationComment(comment: InsertAnnotationComment): Promise<AnnotationComment>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await getDb().select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await getDb().select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await getDb().select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async getUsersByIndustry(industry: string): Promise<User[]> {
    return await getDb()
      .select()
      .from(users)
      .where(eq(users.industry, industry));
  }
  
  async getAllUsers(): Promise<User[]> {
    return await getDb()
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await getDb().insert(users).values(insertUser).returning();
    return user;
  }
  
  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    try {
      const [user] = await getDb()
        .update(users)
        .set(data)
        .where(eq(users.id, id))
        .returning();
      return user;
    } catch (error) {
      console.error("Error updating user:", error);
      return undefined;
    }
  }
  
  // Admin Users
  async getAdminUser(id: number): Promise<AdminUser | undefined> {
    const [adminUser] = await getDb().select().from(adminUsers).where(eq(adminUsers.id, id));
    return adminUser;
  }

  async getAdminUserByUsername(username: string): Promise<AdminUser | undefined> {
    const [adminUser] = await getDb().select().from(adminUsers).where(eq(adminUsers.username, username));
    return adminUser;
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    const [adminUser] = await getDb().select().from(adminUsers).where(eq(adminUsers.email, email));
    return adminUser;
  }
  
  async getAllAdminUsers(): Promise<AdminUser[]> {
    return await getDb()
      .select()
      .from(adminUsers)
      .orderBy(desc(adminUsers.createdAt));
  }

  async createAdminUser(insertAdminUser: InsertAdminUser): Promise<AdminUser> {
    const [adminUser] = await getDb().insert(adminUsers).values(insertAdminUser).returning();
    return adminUser;
  }

  async updateStripeCustomerId(userId: number, customerId: string): Promise<User> {
    const [user] = await getDb()
      .update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: number, { customerId, subscriptionId }: { customerId: string, subscriptionId: string }): Promise<User> {
    const [user] = await getDb()
      .update(users)
      .set({ 
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        premiumStatus: "premium"
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Publications
  async getPublication(id: number): Promise<Publication | undefined> {
    const [publication] = await getDb().select().from(publications).where(eq(publications.id, id));
    return publication;
  }

  async getPublications(): Promise<Publication[]> {
    return await getDb().select().from(publications).orderBy(desc(publications.id));
  }

  async createPublication(insertPublication: InsertPublication): Promise<Publication> {
    const [publication] = await getDb().insert(publications).values(insertPublication).returning();
    return publication;
  }
  
  async updatePublication(id: number, data: Partial<Publication>): Promise<Publication | undefined> {
    try {
      const [publication] = await getDb()
        .update(publications)
        .set(data)
        .where(eq(publications.id, id))
        .returning();
      return publication;
    } catch (error) {
      console.error("Error updating publication:", error);
      return undefined;
    }
  }
  
  async deletePublication(id: number): Promise<void> {
    try {
      await getDb()
        .delete(publications)
        .where(eq(publications.id, id));
    } catch (error) {
      console.error("Error deleting publication:", error);
      throw error;
    }
  }
  
  async getOpportunitiesByPublication(publicationId: number): Promise<Opportunity[] | undefined> {
    try {
      return await getDb()
        .select()
        .from(opportunities)
        .where(eq(opportunities.publicationId, publicationId));
    } catch (error) {
      console.error("Error getting opportunities by publication:", error);
      return undefined;
    }
  }

  // Opportunities
  async getOpportunity(id: number): Promise<Opportunity | undefined> {
    const [opportunity] = await getDb().select().from(opportunities).where(eq(opportunities.id, id));
    return opportunity;
  }

  async getOpportunityWithPublication(id: number): Promise<OpportunityWithPublication | undefined> {
    const [opportunity] = await getDb()
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, id));

    if (!opportunity) {
      return undefined;
    }

    const [publication] = await getDb()
      .select()
      .from(publications)
      .where(eq(publications.id, opportunity.publicationId));

    if (!publication) {
      return undefined;
    }

    const savedCount = await this.getSavedCountForOpportunity(id);

    return {
      ...opportunity,
      publication,
      savedCount
    };
  }

  async getOpportunities(): Promise<Opportunity[]> {
    return await getDb().select().from(opportunities).orderBy(desc(opportunities.createdAt));
  }

  async getOpportunitiesWithPublications(): Promise<OpportunityWithPublication[]> {
    // Get all opportunities, ordered by creation date (newest first)
    const allOpportunities = await getDb()
      .select()
      .from(opportunities)
      .orderBy(desc(opportunities.createdAt));

    // Fetch all opportunity data with related publications and saved counts
    const opportunitiesWithPublications = await Promise.all(
      allOpportunities.map(async (opportunity) => {
        // Get the publication for this opportunity
        const [publication] = await getDb()
          .select()
          .from(publications)
          .where(eq(publications.id, opportunity.publicationId));
        
        // Get saved count
        const savedCount = await this.getSavedCountForOpportunity(opportunity.id);
        
        // Combine the data
        return {
          ...opportunity,
          publication,
          savedCount
        };
      })
    );

    // Ensure consistent sorting by creation date (newest first) as the Promise.all can return results in any order
    const sortedOpportunities = opportunitiesWithPublications.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // descending order (newest first)
    });

    return sortedOpportunities;
  }

  async createOpportunity(insertOpportunity: InsertOpportunity): Promise<Opportunity> {
    const [opportunity] = await getDb().insert(opportunities).values(insertOpportunity).returning();
    return opportunity;
  }

  async updateOpportunityStatus(id: number, status: string): Promise<Opportunity | undefined> {
    const [opportunity] = await getDb()
      .update(opportunities)
      .set({ status })
      .where(eq(opportunities.id, id))
      .returning();
    return opportunity;
  }

  async searchOpportunities(query: string): Promise<OpportunityWithPublication[]> {
    if (!query || query.trim() === '') {
      return this.getOpportunitiesWithPublications();
    }
    
    const searchTerm = `%${query}%`;
    
    // First, find all matching opportunities
    const matchingOpps = await getDb()
      .select()
      .from(opportunities)
      .where(
        or(
          ilike(opportunities.title, searchTerm),
          ilike(opportunities.description, searchTerm),
          ilike(opportunities.requestType, searchTerm)
        )
      )
      .orderBy(desc(opportunities.createdAt));
    
    // Also find opportunities by publication name
    const pubMatches = await getDb()
      .select({
        oppId: opportunities.id
      })
      .from(opportunities)
      .innerJoin(publications, eq(opportunities.publicationId, publications.id))
      .where(ilike(publications.name, searchTerm));
    
    const pubMatchIds = pubMatches.map(match => match.oppId);
    
    // Combine both result sets, removing duplicates
    const allMatchIds = new Set([
      ...matchingOpps.map(opp => opp.id),
      ...pubMatchIds
    ]);
    
    // Now get full data for each matching opportunity
    const results = await Promise.all(
      Array.from(allMatchIds).map(async (id) => {
        return await this.getOpportunityWithPublication(id);
      })
    );
    
    // Filter out any undefined results and sort by creation date
    return results
      .filter((result): result is OpportunityWithPublication => result !== undefined)
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }

  // Bids
  async getBid(id: number): Promise<Bid | undefined> {
    const [bid] = await getDb().select().from(bids).where(eq(bids.id, id));
    return bid;
  }

  async getBidsByOpportunityId(opportunityId: number): Promise<Bid[]> {
    return await getDb()
      .select()
      .from(bids)
      .where(eq(bids.opportunityId, opportunityId))
      .orderBy(desc(bids.amount));
  }

  async createBid(insertBid: InsertBid): Promise<Bid> {
    const [bid] = await getDb().insert(bids).values(insertBid).returning();
    return bid;
  }

  async getHighestBidForOpportunity(opportunityId: number): Promise<number> {
    const result = await getDb()
      .select({ maxBid: sql<number>`max(${bids.amount})` })
      .from(bids)
      .where(eq(bids.opportunityId, opportunityId));

    if (!result[0].maxBid) {
      const [opportunity] = await getDb()
        .select({ minimumBid: opportunities.minimumBid })
        .from(opportunities)
        .where(eq(opportunities.id, opportunityId));
      return opportunity?.minimumBid || 0;
    }

    return result[0].maxBid;
  }

  // Pitches
  async getPitch(id: number): Promise<Pitch | undefined> {
    const [pitch] = await getDb().select().from(pitches).where(eq(pitches.id, id));
    return pitch;
  }
  
  async getPitchById(id: number): Promise<Pitch | undefined> {
    return this.getPitch(id); // Alias for getPitch
  }
  
  async getPitchWithRelations(id: number): Promise<PitchWithRelations | undefined> {
    try {
      console.log(`Getting pitch with relations for ID ${id}`);
      
      // Get the pitch
      const [pitch] = await getDb().select().from(pitches).where(eq(pitches.id, id));
      if (!pitch) {
        console.log(`No pitch found with ID ${id}`);
        return undefined;
      }
      
      // Extract userId from pitch - try both camelCase and snake_case formats
      const userId = pitch.userId || (pitch as any).user_id;
      console.log(`Looking for user with ID ${userId} for pitch ${id}`);
      
      // Get related user
      const [user] = await getDb().select().from(users).where(eq(users.id, userId));
      if (!user) {
        console.log(`No user found for pitch ${id} with userId ${userId}`);
        
        // Try to find a default user to avoid breaking the UI
        const [defaultUser] = await getDb().select().from(users).limit(1);
        if (!defaultUser) {
          console.log(`No default user found, cannot display pitch ${id}`);
          return undefined;
        }
        
        console.log(`Using default user ${defaultUser.id} for pitch ${id}`);
        
        // Continue with opportunity lookup using default user
        const [opportunity] = await getDb()
          .select()
          .from(opportunities)
          .where(eq(opportunities.id, pitch.opportunityId));
          
        if (!opportunity) {
          console.log(`No opportunity found for pitch ${id} with opportunityId ${pitch.opportunityId}`);
          return undefined;
        }
        
        // Get publication (optional)
        let publication: Publication | undefined;
        if (opportunity.publicationId) {
          [publication] = await getDb()
            .select()
            .from(publications)
            .where(eq(publications.id, opportunity.publicationId));
        }
        
        // Return pitch with default user
        console.log(`Successfully retrieved relations for pitch ${id} using default user`);
        return {
          ...pitch,
          user: defaultUser,
          opportunity,
          publication
        };
      }
      
      // Get related opportunity
      const [opportunity] = await getDb()
        .select()
        .from(opportunities)
        .where(eq(opportunities.id, pitch.opportunityId));
        
      if (!opportunity) {
        console.log(`No opportunity found for pitch ${id} with opportunityId ${pitch.opportunityId}`);
        return undefined;
      }
      
      // Get publication (optional)
      let publication: Publication | undefined;
      if (opportunity.publicationId) {
        [publication] = await getDb()
          .select()
          .from(publications)
          .where(eq(publications.id, opportunity.publicationId));
      }
      
      // Return pitch with all relations
      console.log(`Successfully retrieved all relations for pitch ${id}`);
      return {
        ...pitch,
        user,
        opportunity,
        publication
      };
    } catch (error) {
      console.error(`Error getting pitch with relations for ID ${id}:`, error);
      return undefined;
    }
  }

  async getPitchesByOpportunityId(opportunityId: number): Promise<Pitch[]> {
    return await getDb()
      .select()
      .from(pitches)
      .where(eq(pitches.opportunityId, opportunityId))
      .orderBy(desc(pitches.createdAt));
  }

  async getPitchesByUserId(userId: number): Promise<Pitch[]> {
    return await getDb()
      .select()
      .from(pitches)
      .where(eq(pitches.userId, userId))
      .orderBy(desc(pitches.createdAt));
  }
  
  async getPitchByUserAndOpportunity(userId: number, opportunityId: number): Promise<Pitch | undefined> {
    const [pitch] = await getDb()
      .select()
      .from(pitches)
      .where(
        and(
          eq(pitches.userId, userId),
          eq(pitches.opportunityId, opportunityId)
        )
      );
    return pitch;
  }
  
  async updatePitch(data: Partial<Pitch> & { id: number }): Promise<Pitch | undefined> {
    try {
      const { id, ...updateData } = data;
      const [updated] = await getDb()
        .update(pitches)
        .set(updateData)
        .where(eq(pitches.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating pitch:', error);
      return undefined;
    }
  }

  async createPitch(insertPitch: InsertPitch): Promise<Pitch> {
    console.log("Creating new pitch with data:", insertPitch);
    
    // Determine the user ID to use, ensuring we have a valid ID
    // Try both camelCase and snake_case versions
    const userId = insertPitch.userId || (insertPitch as any).user_id;
    if (!userId) {
      console.error("ERROR: No valid userId found in pitch data:", insertPitch);
      throw new Error("User ID is required to create a pitch");
    }
    
    console.log(`Using userId ${userId} for new pitch`);
    
    // Verify user exists to avoid foreign key constraints
    const userExists = await this.getUser(userId);
    if (!userExists) {
      console.error(`ERROR: User with ID ${userId} not found in database`);
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Format pitch data correctly for database insert
    // IMPORTANT: We need to use snake_case for database fields
    // Handle both snake_case and camelCase variations in the input
    const pitchData = {
      opportunity_id: insertPitch.opportunityId || (insertPitch as any).opportunity_id, 
      user_id: userId,
      content: insertPitch.content || null,
      audio_url: insertPitch.audioUrl || (insertPitch as any).audio_url || null,
      transcript: insertPitch.transcript || null,
      status: insertPitch.status || 'pending',
      payment_intent_id: insertPitch.paymentIntentId || (insertPitch as any).payment_intent_id || null,
      bid_amount: insertPitch.bidAmount || (insertPitch as any).bid_amount || null
    };
    
    console.log("Formatted pitch data for DB insertion:", pitchData);
    
    // Insert pitch and return the full record
    // Convert the pitchData to match the expected schema structure
    // This is necessary because Drizzle expects certain field names
    const dbInsertPitch = {
      opportunityId: pitchData.opportunity_id,
      userId: pitchData.user_id,
      content: pitchData.content,
      audioUrl: pitchData.audio_url,
      transcript: pitchData.transcript,
      status: pitchData.status,
      paymentIntentId: pitchData.payment_intent_id,
      bidAmount: pitchData.bid_amount
    };
    
    const [pitch] = await getDb().insert(pitches).values(dbInsertPitch).returning();
    console.log("Successfully created pitch with ID:", pitch.id);
    
    // Get the complete pitch with relations to confirm it's fully inserted
    const verifiedPitch = await this.getPitchWithRelations(pitch.id);
    if (verifiedPitch) {
      console.log("Verified pitch exists with relations:", verifiedPitch.id);
    } else {
      console.warn("Warning: Pitch was created but couldn't be verified with relations");
    }
    
    return pitch;
  }

  async updatePitchTranscript(id: number, transcript: string): Promise<Pitch | undefined> {
    const [updatedPitch] = await getDb()
      .update(pitches)
      .set({ transcript })
      .where(eq(pitches.id, id))
      .returning();
    return updatedPitch;
  }
  
  async getAllPitches(): Promise<Pitch[]> {
    console.log("Fetching all pitches from database");
    try {
      // Use a direct query for Pitch objects only
      const results = await getDb()
        .select({
          id: pitches.id,
          opportunityId: pitches.opportunityId,
          userId: pitches.userId,
          content: pitches.content,
          audioUrl: pitches.audioUrl,
          transcript: pitches.transcript,
          status: pitches.status,
          createdAt: pitches.createdAt,
          paymentIntentId: pitches.paymentIntentId,
          bidAmount: pitches.bidAmount
        })
        .from(pitches)
        .orderBy(desc(pitches.createdAt));
      
      console.log(`Retrieved ${results.length} pitches from database`);
      
      // Check if the data structure matches what the front-end expects
      if (results.length > 0) {
        const samplePitch = results[0];
        console.log("Sample pitch structure:", 
          Object.keys(samplePitch).join(", "));
        console.log("Sample pitch userId:", samplePitch.userId);
      }
      
      return results as Pitch[];
    } catch (error) {
      console.error("Error fetching all pitches:", error);
      return [];
    }
  }
  
  async getAllPitchesWithRelations(): Promise<PitchWithRelations[]> {
    console.log("Fetching all pitches with relations from database");
    try {
      // First get all pitches
      const allPitches = await getDb()
        .select()
        .from(pitches)
        .orderBy(desc(pitches.createdAt));
      
      console.log(`Retrieved ${allPitches.length} pitches, now fetching relations...`);
      
      // Then fetch relations for each pitch
      type PitchWithOptionalRelations = Pitch & {
        user: User;
        opportunity: Opportunity;
        publication?: Publication;
      } | null;
      
      // Get a default user to use as fallback if needed
      const [defaultUser] = await getDb().select().from(users).limit(1);
      if (!defaultUser) {
        console.log("No users found in database, cannot display pitches with relations");
        return [];
      }
      
      const results: PitchWithOptionalRelations[] = await Promise.all(
        allPitches.map(async (pitch) => {
          try {
            // IMPORTANT: Database uses snake_case, so extract it properly
            // First convert the pitch to any to access the user_id field or use userId property if available
            const rawPitch = pitch as any;
            const userId = pitch.userId || rawPitch.user_id;
            console.log(`Looking for user with ID ${userId} for pitch ${pitch.id}`);
            
            // Get user data
            let user;
            if (userId) {
              [user] = await getDb
                .select()
                .from(users)
                .where(eq(users.id, userId));
            }
            
            // If no user found, use default user but log warning
            if (!user) {
              console.log(`Warning: No user found for pitch ${pitch.id} with userId ${userId}, using default user`);
              
              // Get opportunity data
              const [opportunity] = await getDb
                .select()
                .from(opportunities)
                .where(eq(opportunities.id, pitch.opportunityId));
                
              if (!opportunity) {
                console.log(`Warning: No opportunity found for pitch ${pitch.id} with opportunityId ${pitch.opportunityId}`);
                return null;
              }
              
              // Get publication data (optional)
              let publication: Publication | undefined;
              if (opportunity.publicationId) {
                [publication] = await getDb
                  .select()
                  .from(publications)
                  .where(eq(publications.id, opportunity.publicationId));
              }
              
              // Return with default user
              return {
                ...pitch,
                user: defaultUser, // Use default user
                userId: defaultUser.id, // Update the userId field
                opportunity,
                publication
              };
            }
            
            // Get opportunity data
            const [opportunity] = await getDb
              .select()
              .from(opportunities)
              .where(eq(opportunities.id, pitch.opportunityId));
              
            if (!opportunity) {
              console.log(`Warning: No opportunity found for pitch ${pitch.id} with opportunityId ${pitch.opportunityId}`);
              return null;
            }
            
            // Get publication data (optional)
            let publication: Publication | undefined;
            if (opportunity.publicationId) {
              [publication] = await getDb
                .select()
                .from(publications)
                .where(eq(publications.id, opportunity.publicationId));
            }
            
            // Return the complete object with relations
            return {
              ...pitch,
              user,
              opportunity,
              publication
            };
          } catch (error) {
            console.error(`Error fetching relations for pitch ${pitch.id}:`, error);
            return null;
          }
        })
      );
      
      // Filter out null results and convert to the expected type
      const validResults = results.filter((item): item is PitchWithOptionalRelations & {id: number} => 
        item !== null && 
        typeof item === 'object' && 
        'id' in item && 
        'opportunity' in item && 
        'user' in item
      ) as PitchWithRelations[];
      
      console.log(`Successfully retrieved ${validResults.length} pitches with complete relations`);
      
      return validResults;
    } catch (error) {
      console.error("Error fetching all pitches with relations:", error);
      return [];
    }
  }
  
  async updatePitchStatus(id: number, status: string): Promise<Pitch | undefined> {
    // When pitch status changes to anything other than draft, make sure isDraft is false
    const isDraft = status === 'draft';
    
    const [updatedPitch] = await getDb()
      .update(pitches)
      .set({ 
        status,
        isDraft // Explicitly set isDraft based on status
      })
      .where(eq(pitches.id, id))
      .returning();
    return updatedPitch;
  }

  async updatePitchPaymentIntent(id: number, paymentIntentId: string, authorizationExpiresAt: Date): Promise<Pitch | undefined> {
    const [updatedPitch] = await getDb()
      .update(pitches)
      .set({ 
        paymentIntentId,
        authorizationExpiresAt
      })
      .where(eq(pitches.id, id))
      .returning();
    return updatedPitch;
  }

  async updatePitchBillingInfo(id: number, stripeChargeId: string, billedAt: Date): Promise<Pitch | undefined> {
    const [updatedPitch] = await getDb()
      .update(pitches)
      .set({ 
        stripeChargeId,
        billedAt
      })
      .where(eq(pitches.id, id))
      .returning();
    return updatedPitch;
  }

  async updatePitchBillingError(id: number, billingError: string): Promise<Pitch | undefined> {
    const [updatedPitch] = await getDb()
      .update(pitches)
      .set({ billingError })
      .where(eq(pitches.id, id))
      .returning();
    return updatedPitch;
  }

  async updatePitchArticle(id: number, articleData: { url: string, title?: string }): Promise<Pitch | undefined> {
    try {
      const [updatedPitch] = await getDb()
        .update(pitches)
        .set({ 
          articleUrl: articleData.url,
          articleTitle: articleData.title || articleData.url
        })
        .where(eq(pitches.id, id))
        .returning();
      return updatedPitch;
    } catch (error) {
      console.error("Error updating pitch article:", error);
      return undefined;
    }
  }

  async getPitchByPaymentIntentId(paymentIntentId: string): Promise<Pitch | undefined> {
    const [pitch] = await getDb()
      .select()
      .from(pitches)
      .where(eq(pitches.paymentIntentId, paymentIntentId));
    return pitch;
  }
  
  async getUserDrafts(userId: number, opportunityId?: number): Promise<Pitch[]> {
    try {
      // First check if the user already has a submitted pitch for the requested opportunity
      // If they do, we shouldn't show them any drafts for that opportunity
      if (opportunityId) {
        const submittedPitch = await getDb
          .select()
          .from(pitches)
          .where(
            and(
              eq(pitches.userId, userId),
              eq(pitches.opportunityId, opportunityId),
              eq(pitches.isDraft, false),
              ne(pitches.status, 'pending') // Any status other than pending means it's been submitted
            )
          )
          .limit(1);
        
        // If a submitted pitch exists, return no drafts for this opportunity
        if (submittedPitch.length > 0) {
          console.log(`User ${userId} already has a submitted pitch for opportunity ${opportunityId} with status ${submittedPitch[0].status}. No drafts will be returned.`);
          return [];
        }
      }
      
      let conditions = [
        eq(pitches.userId, userId),
        eq(pitches.isDraft, true)
      ];
      
      // Filter by opportunity if provided
      if (opportunityId) {
        conditions.push(eq(pitches.opportunityId, opportunityId));
      }
      
      // Build query with all conditions
      const drafts = await getDb()
        .select()
        .from(pitches)
        .where(and(...conditions))
        .orderBy(desc(pitches.updatedAt));
      
      return drafts;
    } catch (error) {
      console.error('Error getting user drafts:', error);
      return [];
    }
  }

  // Saved Opportunities
  async getSavedOpportunity(userId: number, opportunityId: number): Promise<SavedOpportunity | undefined> {
    const [savedOpportunity] = await getDb
      .select()
      .from(savedOpportunities)
      .where(
        and(
          eq(savedOpportunities.userId, userId),
          eq(savedOpportunities.opportunityId, opportunityId)
        )
      );
    return savedOpportunity;
  }

  async getSavedOpportunitiesByUserId(userId: number): Promise<SavedOpportunity[]> {
    return await getDb
      .select()
      .from(savedOpportunities)
      .where(eq(savedOpportunities.userId, userId))
      .orderBy(desc(savedOpportunities.createdAt));
  }

  async createSavedOpportunity(insertSavedOpportunity: InsertSavedOpportunity): Promise<SavedOpportunity> {
    const [savedOpportunity] = await getDb
      .insert(savedOpportunities)
      .values(insertSavedOpportunity)
      .returning();
    return savedOpportunity;
  }

  async deleteSavedOpportunity(userId: number, opportunityId: number): Promise<boolean> {
    // First check if it exists
    const exists = await this.getSavedOpportunity(userId, opportunityId);
    if (!exists) {
      return false;
    }
    
    // Then delete it
    await getDb
      .delete(savedOpportunities)
      .where(
        and(
          eq(savedOpportunities.userId, userId),
          eq(savedOpportunities.opportunityId, opportunityId)
        )
      );
    
    return true;
  }

  async getSavedCountForOpportunity(opportunityId: number): Promise<number> {
    const result = await getDb()
      .select({ count: sql<number>`count(*)` })
      .from(savedOpportunities)
      .where(eq(savedOpportunities.opportunityId, opportunityId));
    return parseInt(result[0].count.toString());
  }

  // Placements
  async getPlacement(id: number): Promise<Placement | undefined> {
    const [placement] = await getDb()
      .select()
      .from(placements)
      .where(eq(placements.id, id));
    return placement;
  }

  async getPlacementWithRelations(id: number): Promise<PlacementWithRelations | undefined> {
    try {
      console.log(`Looking for placement with ID: ${id}`);
      const [placement] = await getDb()
        .select()
        .from(placements)
        .where(eq(placements.id, id));
      
      if (!placement) {
        console.log(`Placement not found with ID: ${id}`);
        return undefined;
      }
      
      console.log(`Found placement ID: ${id}, getting relations...`);
      
      // Get relations, with error handling for each step
      const [user] = await getDb()
        .select()
        .from(users)
        .where(eq(users.id, placement.userId));
      if (!user) {
        console.error(`User not found for placement ${id} with userId ${placement.userId}`);
        // Continue without failing - we'll at least return what we have
      }
      
      const [pitch] = await getDb()
        .select()
        .from(pitches)
        .where(eq(pitches.id, placement.pitchId));
      if (!pitch) {
        console.error(`Pitch not found for placement ${id} with pitchId ${placement.pitchId}`);
        // Continue without failing
      }
      
      const [opportunity] = await getDb()
        .select()
        .from(opportunities)
        .where(eq(opportunities.id, placement.opportunityId));
      if (!opportunity) {
        console.error(`Opportunity not found for placement ${id} with opportunityId ${placement.opportunityId}`);
        // Continue without failing
      }
      
      const [publication] = await getDb()
        .select()
        .from(publications)
        .where(eq(publications.id, placement.publicationId));
      if (!publication) {
        console.error(`Publication not found for placement ${id} with publicationId ${placement.publicationId}`);
        // Continue without failing
      }
      
      console.log(`Successfully retrieved all relations for placement ${id}`);
      
      return {
        ...placement,
        user: user || undefined,
        pitch: pitch || undefined,
        opportunity: opportunity || undefined,
        publication: publication || undefined
      };
    } catch (error) {
      console.error(`Error getting placement with relations for ID ${id}:`, error);
      return undefined;
    }
  }

  async getPlacementsByUserId(userId: number): Promise<Placement[]> {
    return await getDb()
      .select()
      .from(placements)
      .where(eq(placements.userId, userId))
      .orderBy(desc(placements.createdAt));
  }

  async getPlacementsByStatus(status: string): Promise<PlacementWithRelations[]> {
    const placementsWithStatus = await getDb()
      .select()
      .from(placements)
      .where(eq(placements.status, status))
      .orderBy(desc(placements.createdAt));
    
    // For each placement, get its related data
    const result = await Promise.all(
      placementsWithStatus.map(placement => this.getPlacementWithRelations(placement.id))
    );
    
    // Filter out any undefined results
    return result.filter((p): p is PlacementWithRelations => p !== undefined);
  }

  async getAllPlacements(): Promise<PlacementWithRelations[]> {
    const allPlacements = await getDb()
      .select()
      .from(placements)
      .orderBy(desc(placements.createdAt));
    
    // For each placement, get its related data
    const result = await Promise.all(
      allPlacements.map(placement => this.getPlacementWithRelations(placement.id))
    );
    
    // Filter out any undefined results
    return result.filter((p): p is PlacementWithRelations => p !== undefined);
  }

  async createPlacement(insertPlacement: InsertPlacement): Promise<Placement> {
    const [placement] = await getDb()
      .insert(placements)
      .values(insertPlacement)
      .returning();
    return placement;
  }

  async updatePlacementStatus(id: number, status: string): Promise<Placement | undefined> {
    const [updatedPlacement] = await getDb
      .update(placements)
      .set({ status })
      .where(eq(placements.id, id))
      .returning();
    return updatedPlacement;
  }
  
  async updatePlacementArticle(id: number, data: { articleUrl?: string, articleFilePath?: string }): Promise<Placement | undefined> {
    const [updatedPlacement] = await getDb
      .update(placements)
      .set(data)
      .where(eq(placements.id, id))
      .returning();
    return updatedPlacement;
  }

  async updatePlacementNotification(id: number, notificationSent: boolean): Promise<Placement | undefined> {
    const [updatedPlacement] = await getDb
      .update(placements)
      .set({ notificationSent })
      .where(eq(placements.id, id))
      .returning();
    return updatedPlacement;
  }

  async updatePlacementPayment(id: number, invoiceId: string, paymentId: string): Promise<Placement | undefined> {
    const now = new Date();
    const [updatedPlacement] = await getDb
      .update(placements)
      .set({ 
        invoiceId,
        paymentId,
        status: 'paid',
        chargedAt: now
      })
      .where(eq(placements.id, id))
      .returning();
    return updatedPlacement;
  }
  
  async updatePlacementPaymentIntent(id: number, paymentIntentId: string): Promise<Placement | undefined> {
    const [updatedPlacement] = await getDb
      .update(placements)
      .set({ paymentIntentId })
      .where(eq(placements.id, id))
      .returning();
    return updatedPlacement;
  }
  
  async updatePlacementError(id: number, errorMessage: string): Promise<Placement | undefined> {
    const [updatedPlacement] = await getDb
      .update(placements)
      .set({ 
        errorMessage,
        status: 'error'
      })
      .where(eq(placements.id, id))
      .returning();
    return updatedPlacement;
  }

  // ========================
  // Annotation Methods
  // ========================
  
  async getAnnotation(id: number): Promise<Annotation | undefined> {
    const [annotation] = await getDb()
      .select()
      .from(annotations)
      .where(eq(annotations.id, id));
    return annotation;
  }
  
  async getAnnotations(documentId: string): Promise<Annotation[]> {
    return await getDb()
      .select()
      .from(annotations)
      .where(eq(annotations.documentId, documentId))
      .orderBy(desc(annotations.createdAt));
  }
  
  async createAnnotation(insertAnnotation: InsertAnnotation): Promise<Annotation> {
    const [annotation] = await getDb()
      .insert(annotations)
      .values({
        ...insertAnnotation,
        updatedAt: new Date()
      })
      .returning();
    return annotation;
  }
  
  async updateAnnotation(id: number, data: Partial<InsertAnnotation>): Promise<Annotation> {
    const [annotation] = await getDb()
      .update(annotations)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(annotations.id, id))
      .returning();
    return annotation;
  }
  
  async resolveAnnotation(id: number): Promise<Annotation> {
    const [annotation] = await getDb()
      .update(annotations)
      .set({
        resolved: true,
        updatedAt: new Date()
      })
      .where(eq(annotations.id, id))
      .returning();
    return annotation;
  }
  
  // ========================
  // Annotation Comment Methods
  // ========================
  
  async getAnnotationComments(annotationId: number): Promise<AnnotationComment[]> {
    return await getDb()
      .select()
      .from(annotationComments)
      .where(eq(annotationComments.annotationId, annotationId))
      .orderBy(desc(annotationComments.createdAt));
  }
  
  async createAnnotationComment(insertComment: InsertAnnotationComment): Promise<AnnotationComment> {
    const [comment] = await getDb
      .insert(annotationComments)
      .values(insertComment)
      .returning();
    return comment;
  }
  
  // ========================
  // Pitch Message Methods
  // ========================
  
  async getPitchMessages(pitchId: number): Promise<PitchMessage[]> {
    try {
      // Get messages for this pitch
      const messages = await getDb()
        .select()
        .from(pitchMessages)
        .where(eq(pitchMessages.pitchId, pitchId))
        .orderBy(pitchMessages.createdAt);
        
      // For each message, get user details
      const messagesWithSenderInfo = await Promise.all(
        messages.map(async (message) => {
          // Get sender info
          const [sender] = await getDb
            .select()
            .from(users)
            .where(eq(users.id, message.senderId));
            
          return {
            ...message,
            senderName: sender?.fullName || (message.isAdmin ? 'Reporter' : 'You'),
            senderAvatar: sender?.avatar || null
          };
        })
      );
      
      return messagesWithSenderInfo;
    } catch (error) {
      console.error('Error fetching pitch messages:', error);
      return [];
    }
  }
  
  async getPitchMessage(id: number): Promise<PitchMessage | undefined> {
    const [message] = await getDb
      .select()
      .from(pitchMessages)
      .where(eq(pitchMessages.id, id));
    return message;
  }
  
  async createPitchMessage(message: InsertPitchMessage): Promise<PitchMessage> {
    const [newMessage] = await getDb
      .insert(pitchMessages)
      .values(message)
      .returning();
    return newMessage;
  }
  
  async markPitchMessagesAsRead(pitchId: number, userId: number): Promise<void> {
    // Mark messages as read that weren't sent by the current user
    await getDb
      .update(pitchMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(pitchMessages.pitchId, pitchId),
          ne(pitchMessages.senderId, userId)
        )
      );
  }
  
  async getUnreadMessageCountForUser(userId: number): Promise<number> {
    // Get all pitches for this user
    const userPitches = await this.getPitchesByUserId(userId);
    const pitchIds = userPitches.map(pitch => pitch.id);
    
    if (pitchIds.length === 0) {
      return 0;
    }
    
    // Count unread messages that weren't sent by this user
    const [result] = await getDb
      .select({ count: sql`count(*)` })
      .from(pitchMessages)
      .where(
        and(
          inArray(pitchMessages.pitchId, pitchIds),
          ne(pitchMessages.senderId, userId),
          eq(pitchMessages.isRead, false)
        )
      );
      
    return Number(result?.count || 0);
  }
}

export const storage = new DatabaseStorage();
