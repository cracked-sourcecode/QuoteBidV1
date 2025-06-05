import { pgTable, text, serial, integer, boolean, timestamp, jsonb, primaryKey, pgEnum, numeric, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Define signup stage enum
export const signupStageEnum = pgEnum('signup_stage', ['payment', 'profile', 'ready']);

// Notifications table for user alerts and updates
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // opportunity, pitch_status, payment, system
  title: text("title").notNull(),
  message: text("message").notNull(),
  linkUrl: text("link_url"),
  relatedId: integer("related_id"), // ID of the related record (opportunity, pitch, etc.)
  relatedType: text("related_type"), // Type of the related record (opportunity, pitch, etc.)
  isRead: boolean("is_read").default(false),
  icon: text("icon").default("info"), // icon name - info, success, warning, error
  iconColor: text("icon_color").default("blue"), // color class for the icon
  createdAt: timestamp("created_at").defaultNow(),
});

export const signupState = pgTable("signup_state", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  status: text("status").default('started'),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// Regular users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  avatar: text("avatar"),
  bio: text("bio"),
  location: text("location"),
  title: text("title"),
  industry: text("industry"),
  linkedIn: text("linkedin_url"),
  instagram: text("instagram_url"),
  facebook: text("facebook_url"),
  twitter: text("twitter_url"),
  website: text("website_url"),
  otherProfileUrl: text("other_profile_url"),
  doFollowLink: text("do_follow_link"),
  pastPrLinks: text("past_pr_links"),
  profileCompleted: boolean("profile_completed").default(false),
  isAdmin: boolean("is_admin").default(false), // Flag to identify admin users
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  premiumStatus: text("premium_status").default("free"),
  premiumExpiry: timestamp("premium_expiry"),
  signup_stage: text("signup_stage").default('payment'),
  company_name: text("company_name"),
  phone_number: text("phone_number"),
  subscription_status: text("subscription_status").default("inactive"),
  isPaid: boolean("is_paid").default(false),
  hasAgreedToTerms: boolean("has_agreed_to_terms").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Separate table for admin users
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").default("admin"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const publications = pgTable("publications", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logo: text("logo").notNull(),
  website: text("website"),
  description: text("description"),
  category: text("category"),
  tier: text("tier"), // Tier 1, Tier 2, or Tier 3 for publication classification
  // Pricing engine additions
  outlet_avg_price: numeric("outlet_avg_price", { precision: 10, scale: 2 }),
  success_rate_outlet: numeric("success_rate_outlet", { precision: 5, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  publicationId: integer("publication_id").notNull(),
  title: text("title").notNull(),
  requestType: text("request_type").notNull(),  // Quote Request, Interview Request, etc.
  mediaType: text("media_type"),  // Article, TV, Podcast
  description: text("description").notNull(),
  status: text("status").notNull().default("open"),
  tier: text("tier"),  // Tier 1, 2, or 3 for categorizing opportunity value
  industry: text("industry"),  // Industry category like "Capital Markets", "Crypto", etc.
  tags: text("tags").array(),
  deadline: timestamp("deadline"),
  minimumBid: integer("minimum_bid"),
  // Pricing engine additions
  current_price: numeric("current_price", { precision: 10, scale: 2 }),
  inventory_level: integer("inventory_level").notNull().default(0),
  category: text("category"),
  variable_snapshot: jsonb("variable_snapshot"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bids = pgTable("bids", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").notNull(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(),
  message: text("message"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pitches = pgTable("pitches", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content"),          // For text-based pitches
  audioUrl: text("audio_url"),       // For audio pitches
  transcript: text("transcript"),    // Transcription of audio pitches
  status: text("status").notNull().default("pending"),
  isDraft: boolean("is_draft").default(false),  // Flag to mark draft pitches
  pitchType: text("pitch_type").default("text"), // 'text' or 'voice' to track input type
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(), // Track last update time
  successfulAt: timestamp("successful_at"), // Track when pitch was marked as successful
  paymentIntentId: text("payment_intent_id"),  // Store Stripe payment intent ID for bid processing
  bidAmount: integer("bid_amount"),   // Store the bid amount associated with this pitch
  authorizationExpiresAt: timestamp("authorization_expires_at"), // When the payment authorization expires
  billedAt: timestamp("billed_at"),  // When the payment was successfully billed
  stripeChargeId: text("stripe_charge_id"), // The Stripe charge ID after successful billing
  billingError: text("billing_error"), // Any error message during billing process
  articleUrl: text("article_url"),   // URL to the published article from this pitch
  articleTitle: text("article_title"), // Title of the published article
});

export const savedOpportunities = pgTable("saved_opportunities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  opportunityId: integer("opportunity_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Table for tracking successful placements that need billing
// Table for storing conversation messages between admin and users regarding pitches
export const pitchMessages = pgTable("pitch_messages", {
  id: serial("id").primaryKey(),
  pitchId: integer("pitch_id").notNull(),
  senderId: integer("sender_id").notNull(), // User ID or admin ID who sent the message
  isAdmin: boolean("is_admin").notNull(), // Whether this message was sent by an admin
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  isRead: boolean("is_read").default(false),
});

export const placements = pgTable("placements", {
  id: serial("id").primaryKey(),
  pitchId: integer("pitch_id").notNull(),
  userId: integer("user_id").notNull(),
  opportunityId: integer("opportunity_id").notNull(),
  publicationId: integer("publication_id").notNull(),
  amount: integer("amount").notNull(),   // The bid amount to be charged
  status: text("status").notNull().default("ready_for_billing"), // ready_for_billing, paid, error
  articleTitle: text("article_title"),   // Title of the published article
  articleUrl: text("article_url"),       // URL to the published article
  articleFilePath: text("article_file_path"), // Path to uploaded article file
  screenshotUrl: text("screenshot_url"), // Screenshot of the placement
  publicationDate: timestamp("publication_date"), // When the article was published
  invoiceId: text("invoice_id"),         // Stripe invoice ID
  paymentId: text("payment_id"),         // Stripe payment ID
  paymentIntentId: text("payment_intent_id"), // Stripe payment intent ID for delayed capture
  notificationSent: boolean("notification_sent").default(false),
  metrics: jsonb("metrics").default({}), // Store metrics like reach, shares, etc.
  createdAt: timestamp("created_at").defaultNow(),
  chargedAt: timestamp("charged_at"),    // When the payment was processed
  errorMessage: text("error_message"),   // Store error messages from payment processing
});

// ── Pricing Engine Tables ──────────────────────────────────────────

// Variable weights (hot-pluggable)
export const variable_registry = pgTable("variable_registry", {
  var_name: text("var_name").primaryKey(),
  weight: numeric("weight"),
  nonlinear_fn: text("nonlinear_fn"),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Global price knobs
export const pricing_config = pgTable("pricing_config", {
  key: text("key").primaryKey(),
  value: jsonb("value"),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Tick audit log
export const price_snapshots = pgTable("price_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  opportunity_id: integer("opportunity_id").notNull().references(() => opportunities.id, { onDelete: 'cascade' }),
  suggested_price: numeric("suggested_price", { precision: 10, scale: 2 }),
  snapshot_payload: jsonb("snapshot_payload"),
  tick_time: timestamp("tick_time").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true })
  .extend({
    username: z.string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be at most 30 characters")
      .regex(/^[a-z0-9_-]{3,30}$/, "Username must contain only lowercase letters, numbers, underscores, and hyphens")
      .transform(val => val.toLowerCase()), // Ensure username is stored in lowercase
  });
export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({ id: true, createdAt: true });
export const insertPublicationSchema = createInsertSchema(publications).omit({ id: true, createdAt: true });
export const insertOpportunitySchema = createInsertSchema(opportunities)
  .omit({ id: true, createdAt: true })
  .extend({
    // Override publicationId field to coerce strings to numbers
    publicationId: z.coerce.number(),
    // Override deadline field to properly handle date validation
    deadline: z.string().or(z.date()).transform((val) => {
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    }),
  });
export const insertBidSchema = createInsertSchema(bids).omit({ id: true, createdAt: true });
export const insertPitchSchema = createInsertSchema(pitches).omit({ id: true, createdAt: true })
  .extend({
    paymentIntentId: z.string().optional(),
    authorizationExpiresAt: z.string().or(z.date()).optional().transform((val) => {
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    }),
    successfulAt: z.string().or(z.date()).optional().transform((val) => {
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    }),
    billingError: z.string().optional(),
  });
export const insertSavedOpportunitySchema = createInsertSchema(savedOpportunities).omit({ id: true, createdAt: true });
export const insertSignupStateSchema = createInsertSchema(signupState).omit({ updatedAt: true });
export const insertPlacementSchema = createInsertSchema(placements)
  .omit({ id: true, createdAt: true, chargedAt: true })
  .extend({
    // Override date fields to properly handle validation
    publicationDate: z.string().or(z.date()).optional().transform((val) => {
      if (typeof val === 'string') {
        return new Date(val);
      }
      return val;
    }),
    paymentIntentId: z.string().optional(),
    errorMessage: z.string().optional(),
  });

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertPitchMessageSchema = createInsertSchema(pitchMessages).omit({ id: true, createdAt: true });

// Pricing engine schemas
export const insertVariableRegistrySchema = createInsertSchema(variable_registry).omit({ updated_at: true });
export const insertPricingConfigSchema = createInsertSchema(pricing_config).omit({ updated_at: true });
export const insertPriceSnapshotSchema = createInsertSchema(price_snapshots).omit({ id: true, tick_time: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type PitchMessage = typeof pitchMessages.$inferSelect;
export type InsertPitchMessage = z.infer<typeof insertPitchMessageSchema>;

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;

export type Publication = typeof publications.$inferSelect;
export type InsertPublication = typeof publications.$inferInsert;

export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;

export type Bid = typeof bids.$inferSelect;
export type InsertBid = z.infer<typeof insertBidSchema>;

export type Pitch = typeof pitches.$inferSelect;
export type InsertPitch = z.infer<typeof insertPitchSchema>;

export type SavedOpportunity = typeof savedOpportunities.$inferSelect;
export type InsertSavedOpportunity = z.infer<typeof insertSavedOpportunitySchema>;
export type SignupState = typeof signupState.$inferSelect;
export type InsertSignupState = z.infer<typeof insertSignupStateSchema>;

export type Placement = typeof placements.$inferSelect;
export type InsertPlacement = z.infer<typeof insertPlacementSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Pricing engine types
export type VariableRegistry = typeof variable_registry.$inferSelect;
export type InsertVariableRegistry = z.infer<typeof insertVariableRegistrySchema>;

export type PricingConfig = typeof pricing_config.$inferSelect;
export type InsertPricingConfig = z.infer<typeof insertPricingConfigSchema>;

export type PriceSnapshot = typeof price_snapshots.$inferSelect;
export type InsertPriceSnapshot = z.infer<typeof insertPriceSnapshotSchema>;

// Define relationships between tables
export const usersRelations = relations(users, ({ many, one }) => ({
  bids: many(bids),
  pitches: many(pitches),
  savedOpportunities: many(savedOpportunities),
  placements: many(placements),
  notifications: many(notifications),
  signupState: one(signupState),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const signupStateRelations = relations(signupState, ({ one }) => ({
  user: one(users, {
    fields: [signupState.userId],
    references: [users.id],
  }),
}));

export const publicationsRelations = relations(publications, ({ many }) => ({
  opportunities: many(opportunities),
}));

export const opportunitiesRelations = relations(opportunities, ({ one, many }) => ({
  publication: one(publications, {
    fields: [opportunities.publicationId],
    references: [publications.id],
  }),
  bids: many(bids),
  pitches: many(pitches),
  savedOpportunities: many(savedOpportunities),
  placements: many(placements),
  priceSnapshots: many(price_snapshots),
}));

export const bidsRelations = relations(bids, ({ one }) => ({
  opportunity: one(opportunities, {
    fields: [bids.opportunityId],
    references: [opportunities.id],
  }),
  user: one(users, {
    fields: [bids.userId],
    references: [users.id],
  }),
}));

export const pitchesRelations = relations(pitches, ({ one, many }) => ({
  opportunity: one(opportunities, {
    fields: [pitches.opportunityId],
    references: [opportunities.id],
  }),
  user: one(users, {
    fields: [pitches.userId],
    references: [users.id],
  }),
  placements: many(placements),
  messages: many(pitchMessages),
}));

export const pitchMessagesRelations = relations(pitchMessages, ({ one }) => ({
  pitch: one(pitches, {
    fields: [pitchMessages.pitchId],
    references: [pitches.id],
  }),
}));

export const savedOpportunitiesRelations = relations(savedOpportunities, ({ one }) => ({
  opportunity: one(opportunities, {
    fields: [savedOpportunities.opportunityId],
    references: [opportunities.id],
  }),
  user: one(users, {
    fields: [savedOpportunities.userId],
    references: [users.id],
  }),
}));

export const placementsRelations = relations(placements, ({ one }) => ({
  pitch: one(pitches, {
    fields: [placements.pitchId],
    references: [pitches.id],
  }),
  opportunity: one(opportunities, {
    fields: [placements.opportunityId],
    references: [opportunities.id],
  }),
  user: one(users, {
    fields: [placements.userId],
    references: [users.id],
  }),
  publication: one(publications, {
    fields: [placements.publicationId],
    references: [publications.id],
  }),
}));

// Extend opportunity type with publication data
export type OpportunityWithPublication = Opportunity & {
  publication: Publication;
  savedCount: number;
};

// Extend opportunity type with publication and pitch data
export type OpportunityWithPublicationAndPitches = OpportunityWithPublication & {
  pitches: Array<{
    id: number;
    userId: number;
    opportunityId: number;
    content: string | null;
    audioUrl: string | null;
    transcript: string | null;
    status: string;
    bidAmount: number | null;
    createdAt: Date | null;
    paymentIntentId: string | null;
    user: {
      id: number;
      fullName: string;
      username: string;
      avatar?: string | null;
      title?: string | null;
      company_name?: string | null;
    };
  }>;
  pitchCount: number;
  highestBid: number;
};

// Extend pitch type with related data
export type PitchWithRelations = Pitch & {
  opportunity: Opportunity;
  user: User;
  publication?: Publication;
};

// Extend placement type with related data
export type PlacementWithRelations = Placement & {
  publication: Publication;
  opportunity: Opportunity;
  user: User;
  pitch: Pitch;
};

// Annotation table for real-time collaboration
export const annotations = pgTable("annotations", {
  id: serial("id").primaryKey(),
  documentId: text("document_id").notNull(), // ID of the document being annotated
  documentType: text("document_type").notNull(), // Type: pitch, placement, opportunity, etc.
  userId: integer("user_id").notNull(), // User who made the annotation
  content: text("content").notNull(), // The annotation text
  position: jsonb("position").notNull(), // Position data {x, y, width, height}
  color: text("color").default("yellow"), // Color of the annotation
  resolved: boolean("resolved").default(false), // Whether the annotation is resolved
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const annotationComments = pgTable("annotation_comments", {
  id: serial("id").primaryKey(),
  annotationId: integer("annotation_id").notNull(), // The annotation this comment belongs to
  userId: integer("user_id").notNull(), // User who wrote the comment
  content: text("content").notNull(), // Comment text
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertAnnotationSchema = createInsertSchema(annotations)
  .omit({ id: true, createdAt: true, updatedAt: true });

export const insertAnnotationCommentSchema = createInsertSchema(annotationComments)
  .omit({ id: true, createdAt: true });

// Types
export type Annotation = typeof annotations.$inferSelect;
export type InsertAnnotation = z.infer<typeof insertAnnotationSchema>;

export type AnnotationComment = typeof annotationComments.$inferSelect;
export type InsertAnnotationComment = z.infer<typeof insertAnnotationCommentSchema>;

// Define relationships
export const annotationsRelations = relations(annotations, ({ one, many }) => ({
  user: one(users, {
    fields: [annotations.userId],
    references: [users.id],
  }),
  comments: many(annotationComments),
}));

export const annotationCommentsRelations = relations(annotationComments, ({ one }) => ({
  annotation: one(annotations, {
    fields: [annotationComments.annotationId],
    references: [annotations.id],
  }),
  user: one(users, {
    fields: [annotationComments.userId],
    references: [users.id],
  }),
}));

// Pricing engine relations
export const priceSnapshotsRelations = relations(price_snapshots, ({ one }) => ({
  opportunity: one(opportunities, {
    fields: [price_snapshots.opportunity_id],
    references: [opportunities.id],
  }),
}));
