import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { processVoiceRecording } from "./lib/voice";
import { increaseBidAmount } from "./lib/bidding";
import { z } from "zod";
import { insertBidSchema, insertOpportunitySchema, insertPitchSchema, insertPublicationSchema, insertSavedOpportunitySchema, User, PlacementWithRelations, users, pitches, opportunities, publications, notifications, placements, price_snapshots, variable_registry, pricing_config, push_subscriptions, insertPushSubscriptionSchema } from "@shared/schema";
import { getDb } from "./db";
import { eq, sql, desc, and, ne, asc, isNull, isNotNull, gte, lte, or, inArray, gt } from "drizzle-orm";
import { notificationService } from "./services/notification-service";
import { createSampleNotifications } from "./data/sample-notifications";
import Stripe from "stripe";
import { setupAuth } from "./auth";
import { Resend } from 'resend';
import { sendOpportunityNotification, sendPasswordResetEmail } from './lib/email';

// Initialize Resend if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
import { randomBytes } from 'crypto';
import { requireAdmin } from "./middleware/admin";
import { registerAdmin, deleteAdminUser, createDefaultAdmin } from "./admin-auth";
import { setupAdminAuth, requireAdminAuth } from "./admin-auth-middleware";
import { enforceOnboarding } from "./middleware/enforceOnboarding";
import { jwtAuth } from "./middleware/jwtAuth";
import { ensureAuth } from "./middleware/ensureAuth";
import { getVapidPublicKey } from "../lib/sendWebPush";
import upload from './middleware/upload';
import pdfUpload from './middleware/pdfUpload';
import path from 'path';
import fs from 'fs';
import { saveAgreementPDF, regenerateAgreementsPDF, createAgreementPDF, generateProfessionalPDF } from './pdf-utils';
import { serveAgreementPDF, handleAgreementUpload } from './handlers/agreement-handlers';
import { handleGeneratePDF, handleSignupAgreementUpload, serveAgreementHTML } from './handlers/signup-wizard-handlers';
import { startSignup } from './routes/signupStage';
import signupStageRouter from './routes/signupStage';
import createSubscriptionRouter from './routes/createSubscription';
import signupStateRouter from './routes/signupState';
import signupRouter from './routes/signup';
import messagesRouter from './routes/messages';
import { hashPassword } from './utils/passwordUtils';
import jwt from 'jsonwebtoken';
import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { htmlToText } from 'html-to-text';
// Sample pitches import removed

// Initialize OpenAI client for article info extraction
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * getArticleTitle
 * ----------------
 * Attempts to extract the human‑visible headline for any article URL.
 * 1. Fast heuristics on <h1>/<h2>/<meta og:title>/<title>.
 * 2. If heuristics fail, fall back to OpenAI with a focused extraction prompt.
 *
 * @param url full article URL
 * @returns headline text or 'TITLE_NOT_FOUND'
 */
async function getArticleTitle(url: string): Promise<string> {
  try {
    console.log(`🔍 Extracting title from URL: ${url}`);
    
    const { data: html } = await axios.get(url, { 
      timeout: 15000, 
      headers: { 
        'User-Agent': 'QuoteBidBot/1.0 (+https://quotebid.ai)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    const $ = cheerio.load(html);
    console.log(`📄 HTML loaded, length: ${html.length} characters`);

    // ---- step 1: structural heuristics ---- 
    // Try more specific selectors first for article titles
    const trySelectors = [
      // Yahoo Finance specific selectors
      '.caas-title-wrapper h1',
      '.caas-title h1', 
      '[data-module="ArticleHeader"] h1',
      // Generic article selectors
      'article h1',
      'article header h1',
      'main h1',
      '#content h1',
      '.content h1',
      // Fallback selectors
      'h1:first-of-type',
      'h1'
    ];

    let bestTitle = '';
    let bestScore = 0;

    for (const sel of trySelectors) {
      const elements = $(sel);
      console.log(`🔍 Selector "${sel}" found ${elements.length} elements`);
      
      elements.each((i, element) => {
        const text = $(element).text().trim();
        console.log(`   └─ Element ${i}: "${text}"`);
        
        if (text.length > 10) {
          // Score the title based on various criteria
          let score = 0;
          
          // Length score (prefer reasonable length titles)
          if (text.length >= 20 && text.length <= 150) score += 3;
          if (text.length >= 10 && text.length <= 200) score += 1;
          
          // Avoid publication names
          const lowerText = text.toLowerCase();
          if (lowerText.includes('yahoo finance') || 
              lowerText.includes('yahoo') ||
              lowerText.includes('finance') ||
              lowerText.includes('forbes') ||
              lowerText.includes('cnn') ||
              lowerText.includes('bloomberg') ||
              lowerText === 'finance') {
            score -= 5;
            console.log(`   └─ ❌ Penalized for publication name: "${text}"`);
          }
          
          // Prefer titles that look like article headlines
          if (text.includes(':') || text.includes('–') || text.includes('-')) score += 1;
          if (/\d/.test(text)) score += 1; // Contains numbers
          if (text.split(' ').length >= 4) score += 2; // Has multiple words
          
          console.log(`   └─ Score: ${score} for "${text}"`);
          
          if (score > bestScore) {
            bestScore = score;
            bestTitle = text;
            console.log(`   └─ ✅ New best title: "${bestTitle}" (score: ${bestScore})`);
          }
        }
      });
    }

    if (bestTitle && bestScore > 0) {
      console.log(`🎯 Selected title from HTML selectors: "${bestTitle}"`);
      return bestTitle;
    }

    // Try meta tags
    console.log(`🏷️ Trying meta tags...`);
    const metaTitle = $('meta[property="og:title"]').attr('content')?.trim();
    const twitterTitle = $('meta[name="twitter:title"]').attr('content')?.trim();
    
    console.log(`   og:title: "${metaTitle}"`);
    console.log(`   twitter:title: "${twitterTitle}"`);
    
    if (metaTitle && metaTitle.length > 10 && !metaTitle.toLowerCase().includes('yahoo finance')) {
      console.log(`🎯 Using og:title: "${metaTitle}"`);
      return metaTitle;
    }
    
    if (twitterTitle && twitterTitle.length > 10 && !twitterTitle.toLowerCase().includes('yahoo finance')) {
      console.log(`🎯 Using twitter:title: "${twitterTitle}"`);
      return twitterTitle;
    }

    // Try extracting from URL slug as fallback
    console.log(`🔗 Trying URL slug extraction...`);
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // For Yahoo Finance URLs like /news/5-stocks-invest-capitalize-elon-170225312.html
      const match = pathname.match(/\/news\/([^\/]+)\.html/);
      if (match) {
        const slug = match[1];
        // Remove trailing numbers (like timestamp)
        const cleanSlug = slug.replace(/-\d+$/, '');
        // Convert to title case
        const titleFromSlug = cleanSlug
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        console.log(`🔗 Extracted from URL slug: "${titleFromSlug}"`);
        
        if (titleFromSlug.length > 10) {
          console.log(`🎯 Using URL slug title: "${titleFromSlug}"`);
          return titleFromSlug;
        }
      }
    } catch (urlError: any) {
      console.log(`❌ URL parsing failed: ${urlError}`);
    }

    // Clean page title as last resort
    console.log(`📄 Trying cleaned page title...`);
    const pageTitle = $('title').text().trim();
    console.log(`   Raw page title: "${pageTitle}"`);
    
    if (pageTitle) {
      // More aggressive cleaning
      let cleanedTitle = pageTitle
        .replace(/\s*[-|–—]\s*(Yahoo Finance|Yahoo|Finance|Forbes|CNN|Bloomberg|TechCrunch|Business Insider).*$/i, '')
        .replace(/\s*\|\s*(Yahoo Finance|Yahoo|Finance|Forbes|CNN|Bloomberg|TechCrunch|Business Insider).*$/i, '')
        .replace(/\s*\|\s*Yahoo.*$/i, '')
        .replace(/\s*-\s*Yahoo.*$/i, '')
        .trim();
      
      console.log(`   Cleaned page title: "${cleanedTitle}"`);
      
      if (cleanedTitle && cleanedTitle.length > 5 && !cleanedTitle.toLowerCase().includes('yahoo finance')) {
        console.log(`🎯 Using cleaned page title: "${cleanedTitle}"`);
        return cleanedTitle;
      }
    }

    // ---- step 2: OpenAI fallback ----
    console.log('🤖 No good title found with selectors, trying OpenAI fallback...');
    
    const cleanedText = htmlToText(html, {
      wordwrap: false,
      selectors: [
        { selector: 'head', format: 'skip' },
        { selector: 'script', format: 'skip' },
        { selector: 'style', format: 'skip' },
        { selector: 'nav', format: 'skip' },
        { selector: 'footer', format: 'skip' },
      ],
    }).slice(0, 3000); // Focus on top of article

    const openai = getOpenAIClient();

    const prompt = `Extract the main article headline from this Yahoo Finance article.

URL: ${url}

The article title should NOT be "Yahoo Finance" - that's just the publication name.
Look for the actual story headline that describes what the article is about.

Here's the article content:
${cleanedText.substring(0, 2000)}

Return ONLY the main article headline, nothing else. If you can't find it, return "TITLE_NOT_FOUND".

Article headline:`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        temperature: 0.1,
        max_tokens: 100,
        messages: [
          { role: 'system', content: 'You extract article headlines with precision. Never return publication names like "Yahoo Finance".' },
          { role: 'user', content: prompt },
        ],
      });

      const aiTitle = completion.choices[0]?.message?.content?.trim();
      const finalTitle = aiTitle ? aiTitle.replace(/^"|"$/g, '') : 'TITLE_NOT_FOUND';
      
      console.log(`🤖 OpenAI extracted title: "${finalTitle}"`);
      
      if (finalTitle && finalTitle !== 'TITLE_NOT_FOUND' && !finalTitle.toLowerCase().includes('yahoo finance')) {
        return finalTitle;
      }
    } catch (aiError: any) {
      console.error('🤖 OpenAI error:', aiError);
    }

    console.log('❌ All extraction methods failed');
    return 'TITLE_NOT_FOUND';
  } catch (error: any) {
    console.error('💥 Error extracting article title:', error);
    return 'TITLE_NOT_FOUND';
  }
}

// Helper function to safely check if request is authenticated
function isRequestAuthenticated(req: Request): boolean {
  // Explicitly check for the passport isAuthenticated method
  // to avoid any potential recursion issues
  if (typeof req.isAuthenticated === 'function' && req.isAuthenticated !== isRequestAuthenticated) {
    return req.isAuthenticated();
  }
  return false;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // --- PUBLIC REGISTRATION ENDPOINT (must be before any middleware) ---
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    const { email, password, username, fullName, companyName, phone, industry } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    if (!password) return res.status(400).json({ message: 'Password is required' });
    if (!username) return res.status(400).json({ message: 'Username is required' });
    if (!fullName) return res.status(400).json({ message: 'Full name is required' });
    if (!companyName) return res.status(400).json({ message: 'Company name is required' });
    if (!phone) return res.status(400).json({ message: 'Phone number is required' });
    if (!industry) return res.status(400).json({ message: 'Industry is required' });
    try {
      // Check for existing email
      let [userByEmail] = await getDb().select().from(users).where(eq(users.email, email));
      if (userByEmail) {
        return res.status(400).json({ message: 'User with this email already exists', field: 'email' });
      }
      // Check for existing username (case-insensitive)
      let [userByUsername] = await getDb().select().from(users).where(sql`LOWER(${users.username}) = LOWER(${username})`);
      if (userByUsername) {
        return res.status(400).json({ message: 'Username already taken', field: 'username' });
      }
      // Check for existing phone (normalize to digits only)
      const normalizedPhone = phone.replace(/\D/g, '');
      let [userByPhone] = await getDb().select().from(users).where(sql`REPLACE(REPLACE(REPLACE(REPLACE(${users.phone_number}, '+', ''), '-', ''), ' ', ''), '()', '') LIKE ${'%' + normalizedPhone + '%'}`);
      if (userByPhone) {
        return res.status(400).json({ message: 'Phone number already in use', field: 'phone' });
      }
      const hashedPassword = await hashPassword(password);
      await getDb().insert(users).values({
        username,
        fullName,
        email,
        password: hashedPassword,
        company_name: companyName,
        phone_number: phone,
        industry,
        signup_stage: 'payment',
        profileCompleted: false,
        premiumStatus: 'free',
        subscription_status: 'inactive'
      });
      const [user] = await getDb().select().from(users).where(eq(users.email, email));
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          signup_stage: user.signup_stage,
          wizard: true
        },
        process.env.JWT_SECRET || 'quotebid_secret',
        { expiresIn: '7d' }
      );
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          signup_stage: user.signup_stage
        }
      });
    } catch (error: any) {
      console.error('Error registering user:', error);
      res.status(500).json({ message: 'Failed to register user' });
    }
  });

  // Unified signup start endpoint used by new registration flow
  app.post('/api/auth/signup/start', startSignup);

  // --- PUBLIC ENDPOINTS (must be before any middleware) ---
  app.get('/api/test-public', (req, res) => res.json({ ok: true }));

  app.get('/api/users/check-unique', async (req, res) => {
    try {
      const { field, value } = req.query;
      console.log('► [check-unique] field:', field, 'value:', value);

      if (!field || !value || typeof field !== 'string' || typeof value !== 'string') {
        console.log('► [check-unique] Invalid field or value');
        return res.status(400).json({ error: 'Invalid field or value' });
      }
      type ValidField = 'username' | 'email' | 'phone';
      if (!['username', 'email', 'phone'].includes(field)) {
        console.log('► [check-unique] Invalid field name:', field);
        return res.status(400).json({ error: 'Invalid field name' });
      }
      const validField = field as ValidField;
      const column = validField === 'phone' ? 'phone_number' : validField;

      // Normalize the input value based on field type
      let normalizedValue = value;
      if (validField === 'email' || validField === 'username') {
        normalizedValue = value.toLowerCase().trim();
      } else if (validField === 'phone') {
        // Remove non-numeric characters from phone number for consistent comparison
        normalizedValue = value.replace(/\D/g, '');
        // Ensure we're not searching with an empty string
        if (normalizedValue.length === 0) {
          return res.json({ unique: false, error: 'Invalid phone format' });
        }
      }

      // Defensive: check DB connection
      let existingUser: any[] = [];
      try {
        // For username and email: case-insensitive search
        if (validField === 'email' || validField === 'username') {
          existingUser = await getDb()
            .select()
            .from(users)
            .where(sql`LOWER(${users[column]}) = LOWER(${normalizedValue})`)
            .limit(1);
        } 
        // For phone: search for the normalized phone number
        else if (validField === 'phone') {
          existingUser = await getDb()
            .select()
            .from(users)
            .where(sql`REPLACE(REPLACE(REPLACE(REPLACE(${users.phone_number}, '+', ''), '-', ''), ' ', ''), '()', '') LIKE ${'%' + normalizedValue + '%'}`)
            .limit(1);
        }
      } catch (dbErr: any) {
        console.error('► [check-unique] DB error:', dbErr);
        return res.status(500).json({ error: 'Database error' });
      }

      console.log('► [check-unique] Found:', existingUser?.length || 0);
      return res.json({ unique: !existingUser || existingUser.length === 0 });
    } catch (error: any) {
      console.error('► [check-unique] General error:', error);
      return res.status(500).json({ error: 'Failed to check uniqueness' });
    }
  });

  // API Routes for pitch messages
  app.get('/api/pitch-messages/:pitchId', requireAdminAuth, async (req, res) => {
    try {
      const { pitchId } = req.params;
      
      // Check if the pitch exists
      const pitch = await storage.getPitchById(parseInt(pitchId));
      if (!pitch) {
        return res.status(404).json({ error: 'Pitch not found' });
      }
      
      const messages = await storage.getPitchMessages(parseInt(pitchId));
      res.json(messages);
    } catch (error: any) {
      console.error('Error fetching pitch messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.post('/api/pitch-messages/:pitchId', requireAdminAuth, async (req, res) => {
    try {
      const { pitchId } = req.params;
      const { message } = req.body;
      
      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message content is required' });
      }
      
      // Check if the pitch exists
      const pitch = await storage.getPitchById(parseInt(pitchId));
      if (!pitch) {
        return res.status(404).json({ error: 'Pitch not found' });
      }
      
      // Get admin user ID from session
      const adminId = req.session.adminUser?.id;
      if (typeof adminId !== 'number') {
        return res.status(400).json({ error: 'Admin ID not found in session' });
      }
      
      const newMessage = await storage.createPitchMessage({
        pitchId: parseInt(pitchId),
        senderId: adminId,
        isAdmin: true,
        message,
        isRead: false
      });
      
      res.status(201).json(newMessage);
    } catch (error: any) {
      console.error('Error creating pitch message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  app.post('/api/pitch-messages/mark-read/:pitchId', requireAdminAuth, async (req, res) => {
    try {
      const { pitchId } = req.params;
      
      // Check if the pitch exists
      const pitch = await storage.getPitchById(parseInt(pitchId));
      if (!pitch) {
        return res.status(404).json({ error: 'Pitch not found' });
      }
      
      // Get admin user ID from session
      const adminId = req.session.adminUser?.id;
      
      if (!adminId) {
        return res.status(400).json({ error: 'Admin ID not found in session' });
      }
      
      await storage.markPitchMessagesAsRead(parseInt(pitchId), adminId);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({ error: 'Failed to update messages' });
    }
  });
  // Add public PDF routes and signup wizard routes BEFORE authentication setup
  // These routes need to be accessible without authentication
  app.get('/api/onboarding/agreement.pdf', serveAgreementPDF);
  app.post('/api/onboarding/agreement/upload', handleAgreementUpload);
  
  // Register signup stage routes before auth setup
  app.use('/api/signup-stage', signupStageRouter);
  // @claude-fix: Add new subscription route
  app.use('/api/stripe', createSubscriptionRouter);
  app.use('/api/signup/state', signupStateRouter);
  app.use('/api/signup', signupRouter);
  app.use('/api/messages', messagesRouter);
  
  // Serve the agreement HTML template
  app.get('/api/onboarding/agreement.html', serveAgreementHTML);
  
  // Generate PDF from HTML and signature
  app.post('/api/generate-pdf', handleGeneratePDF);
  
  // Upload signed agreement
  app.post('/api/upload-agreement', pdfUpload.single('pdf'), handleSignupAgreementUpload);
  
  // AI-powered article information extraction endpoint
  app.post("/api/ai/extract-article-info", jwtAuth, async (req: Request, res: Response) => {
    try {
      // Check authentication manually since we're having middleware issues
      if (!req.user || !req.user!.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { url } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      console.log('AI extraction request for URL:', url);

      // Use the much better getArticleTitle function
      const title = await getArticleTitle(url);
      
      if (title === 'TITLE_NOT_FOUND') {
        return res.status(400).json({ error: 'Could not extract title from the webpage' });
      }

      console.log('Successfully extracted title:', title);

      // Extract publication name from URL domain
      let publicationName = '';
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        // Common publication mappings
        const publicationMap: { [key: string]: string } = {
          'techcrunch.com': 'TechCrunch',
          'www.techcrunch.com': 'TechCrunch',
          'forbes.com': 'Forbes',
          'www.forbes.com': 'Forbes',
          'cnn.com': 'CNN',
          'www.cnn.com': 'CNN',
          'bbc.com': 'BBC',
          'www.bbc.com': 'BBC',
          'reuters.com': 'Reuters',
          'www.reuters.com': 'Reuters',
          'bloomberg.com': 'Bloomberg',
          'www.bloomberg.com': 'Bloomberg',
          'wsj.com': 'Wall Street Journal',
          'www.wsj.com': 'Wall Street Journal',
          'nytimes.com': 'New York Times',
          'www.nytimes.com': 'New York Times',
          'businessinsider.com': 'Business Insider',
          'www.businessinsider.com': 'Business Insider',
          'marketwatch.com': 'MarketWatch',
          'www.marketwatch.com': 'MarketWatch',
          'cnbc.com': 'CNBC',
          'www.cnbc.com': 'CNBC',
          'yahoo.com': 'Yahoo',
          'finance.yahoo.com': 'Yahoo Finance',
          'news.yahoo.com': 'Yahoo News'
        };
        
        if (publicationMap[hostname]) {
          publicationName = publicationMap[hostname];
        } else {
          // Generic extraction for unknown domains
          const domain = hostname.replace(/^www\./, '');
          const parts = domain.split('.');
          if (parts.length >= 2) {
            const mainDomain = parts[parts.length - 2];
            publicationName = mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
          }
        }
      } catch (urlError: any) {
        console.error('Error extracting publication from URL:', urlError);
        publicationName = 'Unknown Publication';
      }

      // Return the extracted data
      res.json({
        title: title,
        publication: publicationName,
        date: null // We're not extracting dates as requested
      });

    } catch (error: any) {
      console.error('AI extraction error:', error);
      res.status(500).json({ error: 'Failed to extract article information: ' + (error instanceof Error ? error.message : String(error)) });
    }
  });

  // Helper function to extract publication name from URL
  function extractPublicationFromURL(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Define common publication domains
      const publicationMap: { [key: string]: string } = {
        'finance.yahoo.com': 'Yahoo Finance',
        'www.yahoo.com': 'Yahoo',
        'yahoo.com': 'Yahoo',
        'cnn.com': 'CNN',
        'www.cnn.com': 'CNN',
        'bbc.com': 'BBC',
        'www.bbc.com': 'BBC',
        'reuters.com': 'Reuters',
        'www.reuters.com': 'Reuters',
        'bloomberg.com': 'Bloomberg',
        'www.bloomberg.com': 'Bloomberg',
        'wsj.com': 'Wall Street Journal',
        'www.wsj.com': 'Wall Street Journal',
        'nytimes.com': 'New York Times',
        'www.nytimes.com': 'New York Times',
        'forbes.com': 'Forbes',
        'www.forbes.com': 'Forbes',
        'techcrunch.com': 'TechCrunch',
        'www.techcrunch.com': 'TechCrunch',
        'businessinsider.com': 'Business Insider',
        'www.businessinsider.com': 'Business Insider',
        'marketwatch.com': 'MarketWatch',
        'www.marketwatch.com': 'MarketWatch',
        'cnbc.com': 'CNBC',
        'www.cnbc.com': 'CNBC'
      };
      
      if (publicationMap[hostname]) {
        return publicationMap[hostname];
      }
      
      // Generic extraction for unknown domains
      let domain = hostname.replace(/^www\./, '');
      
      // Handle subdomains like finance.yahoo.com
      const parts = domain.split('.');
      if (parts.length > 2 && parts[0] !== 'www') {
        // For subdomains like finance.yahoo.com
        const subdomain = parts[0];
        const mainDomain = parts.slice(1).join('.');
        
        if (mainDomain === 'yahoo.com') {
          return `Yahoo ${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)}`;
        }
      }
      
      // Extract main domain name and capitalize
      const mainDomain = parts[parts.length - 2];
      return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
      
    } catch (error: any) {
      console.error('Error extracting publication from URL:', error);
      return 'Publication';
    }
  }
  
  // Allow JWT-based auth for API requests
  app.use(jwtAuth);
  // Set up regular user authentication
  setupAuth(app);

  // Endpoint to report the current signup stage for the authenticated user
  app.get('/api/auth/progress', ensureAuth, (req: Request, res: Response) => {
    const stage = (req.user as any).signup_stage || 'agreement';
    res.json({ stage });
  });

  // Endpoint to update the signup stage for the authenticated user
  app.patch('/api/auth/stage', ensureAuth, async (req: Request, res: Response) => {
    const { stage } = req.body as { stage?: string };
    if (!stage) {
      return res.status(400).json({ message: 'Stage required' });
    }
    await getDb()
      .update(users)
      .set({ signup_stage: stage })
      .where(eq(users.id, req.user!.id));
    res.json({ success: true });
  });

  // Signup stage router is already registered above; duplicate registration removed
  // to avoid redundant handlers after auth setup.

  // Set up admin authentication
  setupAdminAuth(app);
  
  // Apply onboarding enforcement middleware to protected routes
  // NOTE: We're NOT applying this to all /api routes anymore
  // Instead, we'll apply it selectively to routes that need it
  
  // Notifications API - these need authentication
  app.get("/api/notifications", enforceOnboarding, async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const userId = req.user!.id;
      
      // Get notifications for the user, ordered by most recent first
      const userNotifications = await getDb().select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));

      return res.json(userNotifications);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });
  
  // Count unread notifications
  app.get("/api/notifications/unread-count", async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const userId = req.user!.id;
      
      // Count unread notifications
      const unreadCount = await getDb().select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

      return res.json({ count: Number(unreadCount[0]?.count || 0) });
    } catch (error: any) {
      console.error('Error counting unread notifications:', error);
      return res.status(500).json({ message: 'Failed to count notifications' });
    }
  });
  
  // Mark a notification as read
  app.post("/api/notifications/:id/read", async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const notificationId = parseInt(req.params.id);
      const userId = req.user!.id;

      // Check if notification belongs to user
      const notification = await getDb().select()
        .from(notifications)
        .where(eq(notifications.id, notificationId))
        .then(results => results[0]);

      if (!notification || notification.userId !== userId) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      // Update notification
      await getDb().update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, notificationId));

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      return res.status(500).json({ message: 'Failed to update notification' });
    }
  });
  
  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const userId = req.user!.id;

      // Update all unread notifications
      await getDb().update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, userId));

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      return res.status(500).json({ message: 'Failed to update notifications' });
    }
  });
  
  // Create sample notifications for testing - DISABLED for real testing
  app.post("/api/notifications/create-samples", async (req: Request, res: Response) => {
    return res.status(404).json({ 
      message: 'Sample notification creation is disabled. Real notifications are now generated automatically based on platform events.' 
    });
  });
  
  // Clear all notifications for a user (for demo/testing purposes)
  app.delete("/api/notifications/clear-all", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated?.()) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User ID not found' });
      }

      // Delete all notifications for this user
      await getDb().delete(notifications)
        .where(eq(notifications.userId, userId));

      console.log(`Cleared all notifications for user ${userId}`);
      return res.json({ success: true, message: 'All notifications cleared successfully' });
    } catch (error: any) {
      console.error('Error clearing notifications:', error);
      return res.status(500).json({ message: 'Failed to clear notifications' });
    }
  });
  
  // Register admin registration endpoint
  app.post("/api/admin/register", registerAdmin);
  
  // Add endpoint to delete admin users
  app.post("/api/admin/delete", deleteAdminUser);
  
  // Simple endpoint to create a default admin user (for testing/setup)
  app.post("/api/admin/create-default", createDefaultAdmin);
  
  // Serve static files from the uploads directory
  const uploadsPath = path.join(process.cwd(), 'uploads');
  const avatarsPath = path.join(uploadsPath, 'avatars');
  
  // Ensure the avatars directory exists
  if (!fs.existsSync(avatarsPath)) {
    fs.mkdirSync(avatarsPath, { recursive: true });
    console.log('Created avatars directory at:', avatarsPath);
  }
  
  app.use('/uploads', express.static(uploadsPath));
  app.use('/uploads/avatars', express.static(avatarsPath));

  // Create Stripe instance
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('Missing required Stripe secret: STRIPE_SECRET_KEY');
  }
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: "2025-03-31.basil",
  });
  
  // ============ PAYMENT ENDPOINTS ============

  // Create a payment intent for one-time payments or bid authorization
  app.post("/api/create-payment-intent", async (req: Request, res: Response) => {
    try {
      console.log("Payment intent request body:", req.body);
      const { amount = 1.00, capture_method = "automatic", metadata = {}, pitchId = null } = req.body;
      
      console.log(`Received amount: ${amount} of type ${typeof amount}`);
      
      // Convert amount to cents (Stripe uses the smallest currency unit)
      const amountInCents = Math.round(amount * 100);
      
      // Use the actual bid amount as requested by the client
      const finalAmount = amountInCents;
      
      console.log(`Creating payment intent for $${finalAmount/100} with capture method: ${capture_method}`);
      
      // Check if we have a userId in the metadata to look up the customer ID
      let stripeCustomerId: string | undefined = undefined;
      if (metadata.userId) {
        try {
          // Look up the user's Stripe customer ID
          const user = await storage.getUser(parseInt(metadata.userId));
          if (user && user.stripeCustomerId) {
            stripeCustomerId = user.stripeCustomerId;
            console.log(`Found Stripe customer ID ${stripeCustomerId} for user ${metadata.userId}`);
          }
        } catch (lookupError) {
          console.error("Error looking up user's customer ID:", lookupError);
          // Continue without the customer ID
        }
      }
      
      // Create the payment intent
      const paymentIntentOptions: any = {
        amount: finalAmount,
        currency: "usd",
        capture_method: capture_method as 'automatic' | 'manual',
        // Merge provided metadata with defaults
        metadata: {
          test_mode: 'true', 
          sandbox: 'true',
          ...metadata,
          // Add pitchId to metadata if provided
          ...(pitchId ? { pitchId: pitchId.toString() } : {})
        },
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic'
          }
        }
      };
      
      // If we have a customer ID, use it to enable saved payment methods
      if (stripeCustomerId) {
        paymentIntentOptions.customer = stripeCustomerId;
        paymentIntentOptions.setup_future_usage = 'off_session';
        // Only specify card payment type to avoid requiring additional configuration
        paymentIntentOptions.payment_method_types = ['card'];
      } else {
        // Use automatic payment methods but limit to card to avoid requiring additional configuration
        paymentIntentOptions.payment_method_types = ['card'];
      }
      
      const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);
      
      console.log(`Created payment intent: ${paymentIntent.id} for $${finalAmount/100}`);
      
      // If a pitch ID was provided, link the payment intent to the pitch
      if (pitchId) {
        try {
          // Calculate authorization expiration (6.5 days from now, matching the ticket requirement)
          const authorizationExpiresAt = new Date(Date.now() + 6.5 * 24 * 60 * 60 * 1000);
          
          // Update the pitch with the payment intent ID and expiration
          const updatedPitch = await storage.updatePitchPaymentIntent(
            parseInt(pitchId.toString()), 
            paymentIntent.id, 
            authorizationExpiresAt
          );
          
          console.log(`[SAVE-PI] ${pitchId} ${paymentIntent.id}`);
        } catch (linkError) {
          console.error(`Error linking payment intent to pitch ${pitchId}:`, linkError);
          // Continue without failing - we'll still return the payment intent
        }
      }
      
      res.json({ 
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: finalAmount/100,
        customerId: stripeCustomerId
      });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Get user subscription status
  app.get("/api/user/:userId/subscription", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      let subscriptionStatus = {
        isPremium: false,
        status: user.premiumStatus || 'free',
        expiresAt: user.premiumExpiry || null,
        subscriptionId: user.stripeSubscriptionId || null
      };
      
      // If user has a subscription ID, check its status
      if (user.stripeSubscriptionId) {
        try {
          const subscription: any = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          
          // Update with actual Stripe data
          subscriptionStatus = {
            isPremium: subscription.status === 'active' || subscription.status === 'trialing',
            status: subscription.status,
            expiresAt: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : null,
            subscriptionId: subscription.id
          };
        } catch (error: any) {
          console.error("Error fetching subscription:", error);
          // We'll just use the data from our database
        }
      }
      
      res.json(subscriptionStatus);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching subscription status: " + error.message });
    }
  });
  
  // Cancel subscription
  app.post("/api/users/:userId/subscription/cancel", jwtAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user || !req.user!.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userId = parseInt(req.params.userId);
      if (isNaN(userId) || userId !== req.user!.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      const user = await storage.getUser(userId);
      if (!user || !user.stripeSubscriptionId) {
        return res.status(404).json({ error: 'No active subscription found' });
      }
      
      // Cancel the subscription at period end (allows user to still use the service until the end of the billing period)
      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true
      });
      
      // Update user status
      await getDb().update(users)
        .set({ 
          premiumStatus: 'cancelling'
        })
        .where(eq(users.id, userId));
      
      res.json({ 
        success: true, 
        message: "Subscription will be canceled at the end of the billing period",
        status: 'cancelling',
        expiresAt: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : null
      });
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ error: "Error cancelling subscription: " + error.message });
    }
  });
  
  // Reactivate subscription
  app.post("/api/users/:userId/subscription/reactivate", jwtAuth, async (req: Request, res: Response) => {
    console.log("🔄 REACTIVATION ENDPOINT HIT");
    console.log("📝 Request params:", req.params);
    console.log("👤 User from JWT:", req.user ? { id: req.user!.id, email: req.user!.email } : 'NO USER');
    
    try {
      if (!req.user || !req.user!.id) {
        console.log("❌ Authentication failed - no user");
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userId = parseInt(req.params.userId);
      console.log("🔢 Parsed userId:", userId, "JWT user ID:", req.user!.id);
      
      if (isNaN(userId) || userId !== req.user!.id) {
        console.log("❌ Unauthorized - user ID mismatch");
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      console.log("🔍 Fetching user from database...");
      const user = await storage.getUser(userId);
      if (!user) {
        console.log("❌ User not found in database");
        return res.status(404).json({ error: 'User not found' });
      }

      console.log("👤 User found:", {
        id: user.id,
        email: user.email,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId,
        premiumStatus: user.premiumStatus
      });
      
      if (!user.stripeSubscriptionId) {
        console.log("❌ No subscription found for user");
        return res.status(404).json({ error: 'No subscription found for this user' });
      }
      
      console.log("🔄 Reactivating subscription with Stripe...");
      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: false
      });
      
      console.log("✅ Stripe subscription updated successfully");
      
      // Update user status in database
      console.log("💾 Updating user status in database...");
      await getDb().update(users)
        .set({ 
          premiumStatus: 'premium',
          subscription_status: 'active'
        })
        .where(eq(users.id, userId));
      
      console.log("✅ Database updated successfully");
      
      res.json({ 
        success: true, 
        message: "Subscription reactivated successfully",
        status: 'active'
      });
    } catch (error: any) {
      console.error("❌ Error reactivating subscription:", error);
      res.status(500).json({ error: "Error reactivating subscription: " + error.message });
    }
  });

  // Change user password
  app.patch("/api/users/:userId/password", jwtAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user || !req.user!.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userId = parseInt(req.params.userId);
      if (isNaN(userId) || userId !== req.user!.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }
      
      // Validate new password requirements (same as signup)
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long' });
      }
      
      // Get user from database
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Verify current password
      const { comparePasswords } = await import('./utils/passwordUtils');
      const isCurrentPasswordValid = await comparePasswords(currentPassword, user.password);
      
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      
      // Hash new password
      const { hashPassword } = await import('./utils/passwordUtils');
      const hashedNewPassword = await hashPassword(newPassword);
      
      // Update password in database
      await getDb().update(users)
        .set({ password: hashedNewPassword })
        .where(eq(users.id, userId));
      
      res.json({ 
        success: true, 
        message: 'Password updated successfully' 
      });
    } catch (error: any) {
      console.error("Error changing password:", error);
      res.status(500).json({ error: "Error changing password: " + error.message });
    }
  });

  // Legacy cancel subscription endpoint (keep for backwards compatibility)
  app.post("/api/user/:userId/cancel-subscription", async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = parseInt(req.params.userId);
      if (isNaN(userId) || userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || !user.stripeSubscriptionId) {
        return res.status(404).json({ message: "No active subscription found" });
      }
      
      // Cancel the subscription at period end (allows user to still use the service until the end of the billing period)
      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true
      });
      
      // Update user status
      await getDb().update(users)
        .set({ 
          premiumStatus: 'cancelling'
        })
        .where(eq(users.id, userId));
      
      res.json({ 
        success: true, 
        message: "Subscription will be canceled at the end of the billing period",
        status: 'cancelling',
        expiresAt: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : null
      });
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ message: "Error cancelling subscription: " + error.message });
    }
  });
  
  // Verify and get details from a Stripe Checkout session
  app.post("/api/verify-subscription", async (req: Request, res: Response) => {
    console.log("Verify subscription endpoint called with:", req.body);
    
    try {
      if (!isRequestAuthenticated(req)) {
        console.log("User not authenticated");
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { sessionId, paymentIntentId } = req.body;
      const user = req.user as User;
      
      console.log(`Authentication passed. User ID: ${user.id}. sessionId: ${sessionId || 'none'}, paymentIntentId: ${paymentIntentId || 'none'}`);
      
      // Handle both session-based (Checkout) and direct payment intent (embedded form) verification
      if (sessionId) {
        console.log(`Retrieving checkout session: ${sessionId}`);
        
        // Retrieve the Checkout session
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        console.log("Session retrieved:", {
          id: session.id,
          paymentStatus: session.payment_status,
          hasSubscription: !!session.subscription
        });
        
        // Make sure this session belongs to the authenticated user
        if (session.metadata?.userId && parseInt(session.metadata.userId) !== user.id) {
          console.log(`Session userId mismatch. Session: ${session.metadata.userId}, User: ${user.id}`);
          return res.status(403).json({ message: "This session does not belong to the authenticated user" });
        }
        
        if (session.payment_status !== 'paid') {
          console.log(`Payment not completed. Status: ${session.payment_status}`);
          return res.status(400).json({ message: "Payment not completed" });
        }
        
        // If this has a subscription, get subscription details
        let subscriptionDetails = null;
        if (session.subscription) {
          console.log(`Retrieving subscription details for: ${session.subscription}`);
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          if (subscription) {
            console.log("Subscription retrieved:", {
              id: subscription.id,
              status: subscription.status,
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000)
            });
            
            // Update user record with subscription info if not already done by webhook
            if (!user.stripeSubscriptionId) {
              console.log(`Updating user ${user.id} with subscription ID ${subscription.id}`);
              await getDb().update(users)
                .set({
                  stripeSubscriptionId: subscription.id,
                  premiumStatus: 'active',
                  premiumExpiry: new Date((subscription as any).current_period_end * 1000)
                })
                .where(eq(users.id, user.id));
            }
            
            subscriptionDetails = {
              id: subscription.id,
              status: subscription.status,
              current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString()
            };
          }
        }
        
        const response = {
          success: true,
          userId: user.id,
          customerEmail: session.customer_details?.email,
          paymentStatus: session.payment_status,
          status: 'active',
          ...subscriptionDetails
        };
        console.log("Sending success response for session verification:", response);
        res.json(response);
      } 
      // Handle verification by payment intent ID (from embedded form)
      else if (paymentIntentId) {
        console.log(`Retrieving payment intent: ${paymentIntentId}`);
        
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          console.log("Payment intent retrieved:", {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            metadata: paymentIntent.metadata || {}
          });
          
          // For test cards (which sometimes have statuses like 'requires_capture' or 'processing'), 
          // we'll consider these as 'acceptable' statuses too
          const acceptableStatuses = ['succeeded', 'processing', 'requires_capture'];
          
          if (!acceptableStatuses.includes(paymentIntent.status)) {
            console.log(`Payment not in acceptable status. Status: ${paymentIntent.status}`);
            return res.status(400).json({ 
              message: `Payment not completed. Status: ${paymentIntent.status}. Please try again or contact support.` 
            });
          }
          
          // Log the payment amount for tracking
          console.log(`Payment amount: ${paymentIntent.amount} cents (${paymentIntent.amount/100} USD)`);
          
          // We no longer need to check for a specific amount as we're using the actual bid amount
          
          // Update user record with premium status
          console.log(`Updating user ${user.id} premium status to active`);
          await getDb().update(users)
            .set({
              premiumStatus: 'active',
              // Set premium expiry to 30 days from now for the monthly subscription
              premiumExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            })
            .where(eq(users.id, user.id));
          
          // Return success response with debug info for testing
          const response = {
            success: true,
            userId: user.id,
            paymentStatus: paymentIntent.status,
            paymentAmount: paymentIntent.amount,
            paymentId: paymentIntent.id,
            status: 'active',
            _debug: {
              isTestMode: paymentIntent.livemode === false,
              paymentMethod: paymentIntent.payment_method_types
            },
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          };
          console.log("Sending success response for payment intent verification:", response);
          res.json(response);
        } catch (stripeError: any) {
          console.error("Stripe API error when retrieving payment intent:", stripeError);
          
          // Special handler for test mode to help with debugging
          if (stripeError.type === 'StripeInvalidRequestError' && stripeError.param === 'intent') {
            console.log("This appears to be a test mode issue. Proceeding with fake verification for testing.");
            
            // Update user record with premium status anyway for testing
            await getDb().update(users)
              .set({
                premiumStatus: 'active',
                premiumExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              })
              .where(eq(users.id, user.id));
            
            // Return success response for testing
            res.json({
              success: true,
              userId: user.id,
              paymentStatus: 'simulated_success',
              status: 'active',
              _debug: {
                errorHandled: true,
                originalErrorType: stripeError.type
              },
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });
            
            return;
          }
          
          // Re-throw for normal error handling
          throw stripeError;
        }
      } 
      else {
        console.log("Missing session ID and payment intent ID");
        return res.status(400).json({ message: "Either Session ID or Payment Intent ID is required" });
      }
    } catch (error: any) {
      console.error("Error verifying subscription:", error);
      res.status(500).json({ message: "Error verifying subscription: " + error.message });
    }
  });
  


  // Handle subscription creation or retrieval - Modernized for SaaS 
  app.post('/api/get-or-create-subscription', async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = req.user as User;
      
      // Check if the user already has an active subscription
      if (user.stripeSubscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          
          if (subscription.status === 'active' || subscription.status === 'trialing') {
            // User already has an active subscription
            return res.json({
              subscriptionId: subscription.id,
              clientSecret: null,
              status: 'active',
              message: 'You already have an active subscription'
            });
          }
        } catch (error: any) {
          console.log("Error retrieving subscription, creating new one:", error);
          // Continue to create a new subscription if there was an error
        }
      }
      
      // Create or retrieve a customer for this user
      let customer;
      if (user.stripeCustomerId) {
        try {
          customer = await stripe.customers.retrieve(user.stripeCustomerId);
          if (customer.deleted) {
            throw new Error("Customer was deleted");
          }
        } catch (error: any) {
          // Customer not found or deleted, create a new one
          customer = await stripe.customers.create({
            email: user.email,
            name: user.fullName || user.username,
            metadata: {
              userId: user.id.toString()
            }
          });
          
          // Update user with the new customer ID
          await getDb().update(users)
            .set({ stripeCustomerId: customer.id })
            .where(eq(users.id, user.id));
        }
      } else {
        // No customer ID, create a new one
        customer = await stripe.customers.create({
          email: user.email,
          name: user.fullName || user.username,
          metadata: {
            userId: user.id.toString(),
            registrationDate: new Date().toISOString()
          }
        });
        
        // Update user with the new customer ID
        await getDb().update(users)
          .set({ stripeCustomerId: customer.id })
          .where(eq(users.id, user.id));
      }
      
      // Look for existing product and price or create them
      let price;
      try {
        // Try to find our subscription product
        const products = await stripe.products.list({
          active: true,
          limit: 10
        });
        
        const quoteBidProduct = products.data.find(
          (p) => p.name === 'QuoteBid Platform Access'
        );
        
        if (quoteBidProduct) {
          // Find the price for this product
          const prices = await stripe.prices.list({
            product: quoteBidProduct.id,
            active: true,
            limit: 10
          });
          
          // Use the first active price
          if (prices.data.length > 0) {
            price = prices.data[0];
          }
        }
      } catch (error: any) {
        console.log("Error finding product/price, will create new ones:", error);
      }
      
      // If no existing product/price was found, create them
      if (!price) {
        // Create product
        const product = await stripe.products.create({
          name: 'QuoteBid Platform Access',
          description: 'Monthly subscription to QuoteBid platform'
        });
        
        // Create price
        price = await stripe.prices.create({
          product: product.id,
          currency: 'usd',
          unit_amount: 9999, // $99.99 in cents for the monthly subscription
          recurring: {
            interval: 'month'
          },
          metadata: {
            isTestPrice: 'false'
          }
        });
      }
      
      // Create Checkout Session for the user to subscribe
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        // Redirect after successful payment to the subscription success page
        success_url: `${req.protocol}://${req.get('host')}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.protocol}://${req.get('host')}/subscribe?canceled=true`,
        metadata: {
          userId: user.id.toString()
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        subscription_data: {
          metadata: {
            userId: user.id.toString()
          },
          trial_period_days: 7 // Optional: Add a 7-day free trial
        }
      });
      
      // Update user to pending status
      await getDb().update(users)
        .set({ 
          premiumStatus: 'pending'
        })
        .where(eq(users.id, user.id));
      
      // Return the session URL
      res.json({
        sessionId: session.id,
        url: session.url
      });
      
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(500).json({ message: "Error creating subscription payment: " + error.message });
    }
  });
  // ============ OPPORTUNITIES ENDPOINTS ============
  
  // Get all opportunities with publications and real-time pricing
  app.get("/api/opportunities", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ 
          message: "Authentication required to view opportunities" 
        });
      }

      // Get opportunities with pitch counts and current pricing
      const oppsWithData = await getDb()
        .select({
          id: opportunities.id,
          title: opportunities.title,
          description: opportunities.description,
          status: opportunities.status,
          tier: opportunities.tier,
          industry: opportunities.industry,
          tags: opportunities.tags,
          deadline: opportunities.deadline,
          current_price: opportunities.current_price,
          minimumBid: opportunities.minimumBid,
          createdAt: opportunities.createdAt,
          publicationId: opportunities.publicationId,
          publication: {
            name: publications.name,
            logo: publications.logo,
          },
          pitchCount: sql<number>`count(${pitches.id})`
        })
        .from(opportunities)
        .leftJoin(publications, eq(opportunities.publicationId, publications.id))
        .leftJoin(pitches, and(
          eq(pitches.opportunityId, opportunities.id),
          eq(pitches.isDraft, false)
        ))
        .where(eq(opportunities.status, "open"))
        .groupBy(opportunities.id, publications.id)
        .orderBy(sql`${opportunities.createdAt} DESC`);

      // Calculate deltas from price history for each opportunity
      const enhancedOpps = await Promise.all(oppsWithData.map(async (opp) => {
        // Get price history from last hour for delta calculation
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentPrices = await getDb()
          .select({
            price: price_snapshots.suggested_price,
            timestamp: price_snapshots.tick_time
          })
          .from(price_snapshots)
          .where(and(
            eq(price_snapshots.opportunity_id, opp.id),
            gt(price_snapshots.tick_time, oneHourAgo)
          ))
          .orderBy(sql`${price_snapshots.tick_time} ASC`);

        // Calculate pricing metrics
        const currentPrice = Number(opp.current_price) || Number(opp.minimumBid) || 100;
        let deltaPastHour = 0;
        
        if (recentPrices.length > 0) {
          const oldestPrice = Number(recentPrices[0].price) || currentPrice;
          deltaPastHour = currentPrice - oldestPrice;
        }

        // Calculate percentage change for display
        const percentChange = deltaPastHour !== 0 && currentPrice > 0 
          ? ((deltaPastHour / currentPrice) * 100) 
          : 0;

        return {
          id: opp.id,
          title: opp.title,
          outlet: opp.publication?.name || null,
          outletLogo: opp.publication?.logo ? 
            opp.publication.logo.replace(/^https?:\/\/[^\/]+/, '') : null,
          tier: opp.tier ? parseInt(opp.tier.replace('Tier ', '')) as 1 | 2 | 3 : 1,
          status: opp.status as 'open' | 'closed',
          summary: opp.description || '',
          topicTags: Array.isArray(opp.tags) ? opp.tags : [],
          slotsTotal: 5, // Default value
          slotsRemaining: Math.max(0, 5 - Number(opp.pitchCount)), // Calculate based on pitches
          basePrice: Number(opp.minimumBid) || 100,
          currentPrice,
          deltaPastHour,
          percentChange: Math.round(percentChange),
          trend: deltaPastHour > 0 ? 'up' : deltaPastHour < 0 ? 'down' : 'stable',
          increment: 5, // Dynamic pricing step
          floorPrice: Number(opp.minimumBid) || 100,
          cutoffPrice: currentPrice + 200, // Dynamic based on current price
          deadline: opp.deadline || new Date().toISOString(),
          postedAt: opp.createdAt || new Date().toISOString(),
          createdAt: opp.createdAt || new Date().toISOString(),
          updatedAt: opp.createdAt || new Date().toISOString(),
          publicationId: opp.publicationId,
          industry: opp.industry || 'Business',
          mediaType: 'Article', // Default value
          lastPriceUpdate: recentPrices.length > 0 
            ? recentPrices[recentPrices.length - 1].timestamp 
            : null,
          // Keep publication object for backward compatibility
          publication: opp.publication
        };
      }));
      
      res.json(enhancedOpps);
    } catch (error: any) {
      console.error("Opportunities error:", error);
      res.status(500).json({ 
        message: "Failed to fetch opportunities", 
        error: error.message || "Unknown error" 
      });
    }
  });

  // Get single opportunity with publication
  app.get("/api/opportunities/:id", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ 
          message: "Authentication required to view opportunities" 
        });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid opportunity ID" });
      }
      
      const oppWithPub = await storage.getOpportunityWithPublication(id);
      if (!oppWithPub) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      
      // Transform the data to match what the client expects
      const opportunity = {
        id: oppWithPub.id,
        title: oppWithPub.title,
        outlet: oppWithPub.publication.name,
        outletLogo: oppWithPub.publication.logo ? 
          // Convert absolute URLs to relative URLs
          oppWithPub.publication.logo.replace(/^https?:\/\/[^\/]+/, '') : null,
        tier: oppWithPub.tier ? parseInt(oppWithPub.tier.replace('Tier ', '')) as 1 | 2 | 3 : 1,
        status: oppWithPub.status as 'open' | 'closed',
        summary: oppWithPub.description || '',
        topicTags: Array.isArray(oppWithPub.tags) ? oppWithPub.tags : [],
        slotsTotal: 5, // Default value
        slotsRemaining: 3, // Default value
        basePrice: oppWithPub.minimumBid || 100,
        currentPrice: oppWithPub.minimumBid || 100,
        increment: 50, // Default value
        floorPrice: oppWithPub.minimumBid || 100,
        cutoffPrice: (oppWithPub.minimumBid || 100) + 500, // Default value
        deadline: oppWithPub.deadline || new Date().toISOString(),
        postedAt: oppWithPub.createdAt || new Date().toISOString(),
        createdAt: oppWithPub.createdAt || new Date().toISOString(),
        updatedAt: oppWithPub.createdAt || new Date().toISOString(),
        publicationId: oppWithPub.publicationId,
        industry: oppWithPub.industry || 'Business',
        mediaType: oppWithPub.mediaType || 'Article'
      };
      
      res.json(opportunity);
    } catch (error: any) {
      console.error("Error fetching opportunity:", error);
      res.status(500).json({ message: "Failed to fetch opportunity" });
    }
  });

  // Get bid information for an opportunity
  app.get("/api/opportunities/:id/bid-info", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ 
          message: "Authentication required to view bid information" 
        });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid opportunity ID" });
      }
      
      // Get opportunity details
      const opportunity = await storage.getOpportunity(id);
      if (!opportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      
      // Get current highest bid
      const highestBid = await storage.getHighestBidForOpportunity(id);
      
      // Compute minimum bid (current highest + increment or base price)
      const basePrice = opportunity.minimumBid || 100;
      const increment = 50; // Standard increment
      const currentPrice = highestBid > 0 ? highestBid : basePrice;
      const minBid = currentPrice + increment;
      
      // Slots info - could be dynamic in the future
      const slotsTotal = 5;
      const slotsRemaining = 3;
      
      // Build bid info
      const bidInfo = {
        opportunityId: id,
        currentPrice,
        minBid,
        deadline: opportunity.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        slotsRemaining,
        slotsTotal
      };
      
      res.json(bidInfo);
    } catch (error: any) {
      console.error("Error fetching bid info:", error);
      res.status(500).json({ message: "Failed to fetch bid information" });
    }
  });
  
  // Get price history for an opportunity
  app.get("/api/opportunities/:id/price-history", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ 
          message: "Authentication required to view price history" 
        });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid opportunity ID" });
      }
      
      // Get opportunity details
      const opportunity = await storage.getOpportunity(id);
      if (!opportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      
      // Get bid history
      const bids = await storage.getBidsByOpportunityId(id);
      
      // Sort bids by timestamp
      bids.sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const bDate = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return aDate.getTime() - bDate.getTime();
      });
      
      // Create price history with at least two points
      const priceHistory = [];
      
      // Add starting point (opportunity creation with base price)
      const createdAt = opportunity.createdAt || new Date().toISOString();
      const basePrice = opportunity.minimumBid || 100;
      
      priceHistory.push({
        timestamp: createdAt,
        price: basePrice,
        slotsRemaining: 5 // Default starting slots
      });
      
      // Add points for each bid
      let currentSlots = 5;
      for (const bid of bids) {
        // Each successful bid takes a slot
        currentSlots = Math.max(0, currentSlots - 1);
        
        priceHistory.push({
          timestamp: bid.createdAt,
          price: bid.amount,
          slotsRemaining: currentSlots
        });
      }
      
      // If no bids, add current point
      if (bids.length === 0) {
        priceHistory.push({
          timestamp: new Date().toISOString(),
          price: basePrice,
          slotsRemaining: 5
        });
      }
      
      res.json(priceHistory);
    } catch (error: any) {
      console.error("Error fetching price history:", error);
      res.status(500).json({ message: "Failed to fetch price history" });
    }
  });
  
  // Search opportunities
  app.get("/api/opportunities/search/:query", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ 
          message: "Authentication required to search opportunities" 
        });
      }

      const query = req.params.query;
      const opportunities = await storage.searchOpportunities(query);
      res.json(opportunities);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to search opportunities" });
    }
  });
  
  // ============ PUBLICATIONS ENDPOINTS ============
  
  // Get all publications
  app.get("/api/publications", async (req: Request, res: Response) => {
    try {
      const publications = await storage.getPublications();
      res.json(publications);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch publications" });
    }
  });
  
  // Serve uploaded publication logos
  app.use('/uploads/publications', (req, res, next) => {
    const filePath = path.join(process.cwd(), 'uploads', 'publications', req.path);
    res.sendFile(filePath, (err) => {
      if (err) {
        next();
      }
    });
  });
  
  // Upload publication logo
  app.post('/api/upload/publication-logo', requireAdminAuth, upload.single('logo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      console.log('Processing publication logo upload:', req.file.filename);
      
      // Import sharp dynamically for ES module compatibility
      const { default: sharp } = await import('sharp');
      
      // Get original file path
      const originalPath = req.file.path;
      const filename = req.file.filename;
      const outputPath = path.join(process.cwd(), 'uploads', 'publications', `resized-${filename}`);
      
      console.log('Resizing image from:', originalPath, 'to:', outputPath);
      
      // Resize the image to 200x200 while maintaining aspect ratio
      await sharp(originalPath)
        .resize({
          width: 200,
          height: 200,
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
        })
        .png() // Convert to PNG format
        .toFile(outputPath);
      
      console.log('Image resized successfully');
      
      // Remove the original file after resizing
      fs.unlinkSync(originalPath);
      
      // Rename the resized file to the original filename to maintain URL format
      fs.renameSync(outputPath, originalPath);
      
      // Generate the URL for the uploaded file
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const fileUrl = `${baseUrl}/uploads/publications/${req.file.filename}`;
      
      console.log('Publication logo uploaded and resized successfully:', fileUrl);
      
      res.status(200).json({ 
        message: 'File uploaded and resized successfully',
        fileUrl: fileUrl 
      });
    } catch (error: any) {
      console.error('Failed to process publication logo:', error);
      res.status(500).json({ message: 'Failed to upload and resize file', error: error.message });
    }
  });
  
  // Get single publication
  app.get("/api/publications/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid publication ID" });
      }
      
      const publication = await storage.getPublication(id);
      if (!publication) {
        return res.status(404).json({ message: "Publication not found" });
      }
      
      res.json(publication);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch publication" });
    }
  });
  
  // ============ BIDS ENDPOINTS ============
  
  // Check if a user has already submitted a pitch for an opportunity
  app.get("/api/opportunities/:opportunityId/user-pitch-status", async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const opportunityId = parseInt(req.params.opportunityId);
      const userId = req.user!.id;
      
      if (isNaN(opportunityId)) {
        return res.status(400).json({ message: "Invalid opportunity ID" });
      }
      
      console.log(`Checking pitch status for user ${userId} and opportunity ${opportunityId}`);
      
      // First, check for any pitch for this opportunity regardless of status
      // This is the most comprehensive check to make sure we don't miss anything
      const allPitches = await getDb().select()
        .from(pitches)
        .where(
          and(
            eq(pitches.userId, userId),
            eq(pitches.opportunityId, opportunityId)
          )
        );
        
      console.log(`Found ${allPitches.length} pitches for user ${userId} and opportunity ${opportunityId}`);
      
      if (allPitches.length > 0) {
        // Group pitches by status
        const pitchesByStatus = allPitches.reduce((acc, pitch) => {
          if (!acc[pitch.status]) {
            acc[pitch.status] = [];
          }
          acc[pitch.status].push(pitch);
          return acc;
        }, {} as Record<string, any[]>);
        
        console.log(`Pitches by status:`, Object.keys(pitchesByStatus));
        
        // Priority: non-draft pitches with status not 'draft'
        const nonDraftStatuses = Object.keys(pitchesByStatus).filter(status => status !== 'draft');
        
        if (nonDraftStatuses.length > 0) {
          // Find the first non-draft pitch that's submitted
          const firstNonDraftStatus = nonDraftStatuses[0];
          const pitch = pitchesByStatus[firstNonDraftStatus][0];
          
          console.log(`Found non-draft pitch with status ${pitch.status}:`, pitch);
          
          // Fix any metadata inconsistencies
          if (pitch.isDraft) {
            await getDb().update(pitches)
              .set({ isDraft: false })
              .where(eq(pitches.id, pitch.id));
            
            console.log(`Fixed isDraft flag for pitch ${pitch.id}`);
            pitch.isDraft = false;
          }
          
          // Check if it's a pending pitch - these can still be edited through My Pitches
          if (pitch.status === 'pending') {
            return res.status(200).json({
              hasSubmitted: true,
              isPending: true,
              pitch: pitch,
              message: "You have a pending pitch for this opportunity that can still be edited from My Pitches."
            });
          }
          
          // It's a pitch that's already been processed and can't be edited
          return res.status(200).json({
            hasSubmitted: true,
            isPending: false,
            pitch: pitch,
            message: "You have already submitted a pitch for this opportunity."
          });
        }
        
        // If we only have draft pitches, return the first one
        if (pitchesByStatus['draft'] && pitchesByStatus['draft'].length > 0) {
          const draftPitch = pitchesByStatus['draft'][0];
          console.log(`Only found draft pitch:`, draftPitch);
          
          // Ensure draft is properly flagged
          if (!draftPitch.isDraft) {
            await getDb().update(pitches)
              .set({ isDraft: true })
              .where(eq(pitches.id, draftPitch.id));
            
            console.log(`Fixed isDraft flag for draft pitch ${draftPitch.id}`);
            draftPitch.isDraft = true;
          }
          
          // Just return that we have a draft, not a submitted pitch
          return res.status(200).json({
            hasSubmitted: false,
            isPending: false,
            hasDraft: true,
            pitch: null,
            draftPitch: draftPitch,
            message: "You have a draft pitch for this opportunity."
          });
        }
      }
      
      // User has not submitted a pitch yet
      return res.status(200).json({
        hasSubmitted: false,
        isPending: false,
        hasDraft: false,
        pitch: null,
        message: "No pitch has been submitted for this opportunity."
      });
    } catch (error: any) {
      console.error("Error checking user pitch status:", error);
      return res.status(500).json({ message: "Error checking pitch status" });
    }
  });
  
  // Get bids for an opportunity
  app.get("/api/opportunities/:id/bids", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid opportunity ID" });
      }
      
      const bids = await storage.getBidsByOpportunityId(id);
      res.json(bids);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch bids" });
    }
  });
  
  // Create a new bid
  app.post("/api/bids", async (req: Request, res: Response) => {
    try {
      const validationResult = insertBidSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid bid data", 
          errors: validationResult.error.errors 
        });
      }
      
      const bidData = validationResult.data;
      
      // Add dual user ID formats
      const enhancedBidData = {
        ...bidData,
        user_id: bidData.userId // Add snake_case format for database compatibility
      };
      
      console.log("Creating bid with enhanced data:", enhancedBidData);
      
      // Check if opportunity exists
      const opportunity = await storage.getOpportunity(bidData.opportunityId);
      if (!opportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      
      // Check if bid amount is higher than minimum bid
      const currentHighestBid = await storage.getHighestBidForOpportunity(bidData.opportunityId);
      if (bidData.amount < currentHighestBid) {
        return res.status(400).json({ 
          message: "Bid amount must be higher than current highest bid",
          minimumBid: await increaseBidAmount(currentHighestBid)
        });
      }
      
      // Extract the payment intent ID if provided in the request
      const paymentIntentId = req.body.paymentIntentId || null;

      // Create the bid record
      const newBid = await storage.createBid(enhancedBidData);
      console.log(`Created new bid with ID ${newBid.id}`);
      
      // If no payment intent ID was provided, create one with Stripe
      if (!paymentIntentId && bidData.amount) {
        try {
          // Calculate amount in cents for Stripe
          const amountInCents = Math.round(bidData.amount * 100);
          
          // Create a payment intent with manual capture
          const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: "usd",
            capture_method: "manual",
            metadata: {
              bidId: newBid.id.toString(),
              opportunityId: bidData.opportunityId.toString(),
              userId: bidData.userId.toString(),
              bidType: 'media_coverage'
            },
            payment_method_types: ['card']
          });
          
          console.log(`Created payment intent ${paymentIntent.id} for bid ${newBid.id}`);
          
          // Now create a pitch based on this bid and attach the payment intent
          // First check if a pitch already exists for this user and opportunity
          const existingPitch = await storage.getPitchByUserAndOpportunity(
            bidData.userId,
            bidData.opportunityId
          );
          
          // Calculate authorization expiration (6.5 days from now, matching the ticket requirement)
          const authorizationExpiresAt = new Date(Date.now() + 6.5 * 24 * 60 * 60 * 1000);
          
          if (existingPitch) {
            // Update the existing pitch with the payment intent ID
            console.log(`[SAVE-PI] ${existingPitch.id} ${paymentIntent.id}`);
            await storage.updatePitchPaymentIntent(
              existingPitch.id,
              paymentIntent.id,
              authorizationExpiresAt
            );
          } else {
            // Create a new pitch with the payment intent
            console.log(`Creating new pitch for bid ${newBid.id} with payment intent ${paymentIntent.id}`);
            const pitchData = {
              opportunityId: bidData.opportunityId,
              userId: bidData.userId,
              content: null,
              audioUrl: null,
              transcript: null,
              status: 'pending',
              paymentIntentId: paymentIntent.id,
              bidAmount: bidData.amount,
              authorizationExpiresAt
            };
            
            const newPitch = await storage.createPitch(pitchData);
            console.log(`[SAVE-PI] ${newPitch.id} ${paymentIntent.id}`);
          }
          
          // Return the bid with payment intent info
          return res.status(201).json({
            ...newBid,
            paymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret
          });
        } catch (stripeError: any) {
          console.error('Error creating payment intent for bid:', stripeError);
          // Continue without payment intent if creation fails
        }
      }
      
      // Return the bid without payment information if no payment intent was created
      res.status(201).json(newBid);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create bid" });
    }
  });
  
  // ============ PITCHES ENDPOINTS ============
  
  // Get pitches for an opportunity
  app.get("/api/opportunities/:id/pitches", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid opportunity ID" });
      }
      
      const pitches = await storage.getPitchesByOpportunityId(id);
      res.json(pitches);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch pitches" });
    }
  });

  // Get pitches with user data for an opportunity (includes profile photos)
  app.get("/api/opportunities/:id/pitches-with-users", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`[API DEBUG] Fetching pitches-with-users for opportunity ${id}`);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid opportunity ID" });
      }
      
      const pitchesWithUsers = await storage.getPitchesWithUserDataByOpportunityId(id);
      console.log(`[API DEBUG] Retrieved ${pitchesWithUsers.length} pitches for opportunity ${id}`);
      
      if (pitchesWithUsers.length > 0) {
        console.log(`[API DEBUG] Sample pitch:`, pitchesWithUsers[0]);
      }
      
      res.json(pitchesWithUsers);
    } catch (error: any) {
      console.log(`[API DEBUG] Error fetching pitches:`, error);
      res.status(500).json({ message: "Failed to fetch pitches with user data" });
    }
  });
  
  // Create a new pitch
  app.post("/api/pitches", async (req: Request, res: Response) => {
    try {
      console.log("=== PITCH CREATION REQUEST ===");
      console.log("Auth header present:", !!req.headers.authorization);
      console.log("Is authenticated:", isRequestAuthenticated(req));
      console.log("User from session:", req.user ? { id: req.user!.id, email: req.user!.email } : 'NO USER');
      
      // First, ensure user is authenticated
      if (!isRequestAuthenticated(req) || !req.user) {
        console.error("❌ No authenticated user found for pitch creation");
        return res.status(401).json({ 
          message: "Authentication required", 
          error: "You must be logged in to create a pitch" 
        });
      }
      
      // Get user ID from authenticated session (NOT from request body)
      const userId = req.user!.id;
      console.log("✓ Using authenticated user ID:", userId);
      
      // Extract fields from request - accept both camelCase and snake_case formats
      let opportunityId = req.body.opportunityId || req.body.opportunity_id;
      const content = req.body.content || "";
      const audioUrl = req.body.audioUrl || req.body.audio_url || "";
      const transcript = req.body.transcript || "";
      const status = req.body.status || 'pending';
      
      // Convert values to numbers if they're strings
      if (opportunityId && typeof opportunityId === 'string') opportunityId = parseInt(opportunityId);
      const requestPaymentIntentId = req.body.paymentIntentId || req.body.payment_intent_id;
      const bidAmount = req.body.bidAmount || req.body.bid_amount;
      
      console.log("Extracted data from request:", { 
        userId, 
        opportunityId,
        hasContent: !!content,
        hasAudio: !!audioUrl,
        hasTranscript: !!transcript,
        paymentIntent: requestPaymentIntentId
      });
      
      // Basic validation
      if (!opportunityId || !userId) {
        console.error("Missing required fields:", { opportunityId, userId });
        return res.status(400).json({
          message: "Invalid pitch data",
          errors: [
            { path: ["opportunityId"], message: "Required" },
            { path: ["userId"], message: "Required" }
          ]
        });
      }
      
      console.log("Pitch data extracted successfully");
      
      // Check if opportunity exists
      const opportunity = await storage.getOpportunity(opportunityId);
      if (!opportunity) {
        console.error(`Opportunity not found with ID: ${opportunityId}`);
        return res.status(404).json({ message: "Opportunity not found" });
      }
      
      console.log(`Found opportunity ${opportunity.id} for the pitch`);
      
      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        console.error(`User not found with ID: ${userId}`);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`Found user ${user.id} for the pitch`);
      
      // Check if user has an associated payment method/intent
      let paymentIntentId = null;
      if (requestPaymentIntentId) {
        console.log(`Pitch submitted with payment intent: ${requestPaymentIntentId}`);
        paymentIntentId = requestPaymentIntentId;
      }
      
      // Check if a pitch already exists for this user and opportunity (prevent duplicates)
      const existingPitch = await storage.getPitchByUserAndOpportunity(userId, opportunityId);
      if (existingPitch) {
        console.log(`Found existing pitch ${existingPitch.id} for user ${userId} and opportunity ${opportunityId}, updating it`);
        // Update the existing pitch
        const updatedData = {
          content: content || existingPitch.content,
          audioUrl: audioUrl || existingPitch.audioUrl,
          transcript: transcript || existingPitch.transcript,
          status: status,
          paymentIntentId: paymentIntentId || existingPitch.paymentIntentId,
          bidAmount: bidAmount || existingPitch.bidAmount
        };
        
        const updatedPitch = await storage.updatePitch({
          id: existingPitch.id,
          ...updatedData
        });
        
        // Create notification for pitch update/resubmission
        try {
          const opportunity = await storage.getOpportunity(opportunityId);
          const opportunityTitle = opportunity?.title || 'Unknown Opportunity';
          
          await notificationService.createNotification({
            userId: userId,
            type: 'pitch_status',
            title: '📝 Pitch Updated Successfully!',
            message: `Your pitch for "${opportunityTitle}" has been updated and is being reviewed.`,
            linkUrl: '/my-pitches',
            relatedId: existingPitch.id,
            relatedType: 'pitch',
            icon: 'check-circle',
            iconColor: 'green',
          });
          
          console.log(`Created notification for user ${userId} after pitch ${existingPitch.id} update`);
        } catch (notificationError) {
          console.error('Error creating pitch update notification:', notificationError);
          // Don't fail the request if notification creation fails
        }
        
        return res.status(200).json(updatedPitch);
      }
      
      // Create the pitch data object
      const pitchData = {
        opportunityId,
        userId,
        content: content || null,
        audioUrl: audioUrl || null,
        transcript: transcript || null,
        status: status || 'pending',
        paymentIntentId,
        bidAmount: bidAmount || null
      };
      
      console.log("Creating NEW pitch with data:", pitchData);
      
      // Create the pitch
      const newPitch = await storage.createPitch(pitchData);
      
      console.log("Successfully created pitch with ID:", newPitch.id);
      
      // Create notification for successful pitch submission
      try {
        const opportunity = await storage.getOpportunity(opportunityId);
        const opportunityTitle = opportunity?.title || 'Unknown Opportunity';
        
        await notificationService.createNotification({
          userId: userId,
          type: 'pitch_status',
          title: '📝 Pitch Submitted Successfully!',
          message: `Your pitch for "${opportunityTitle}" has been submitted and is being reviewed.`,
          linkUrl: '/my-pitches',
          relatedId: newPitch.id,
          relatedType: 'pitch',
          icon: 'check-circle',
          iconColor: 'green',
        });
        
        console.log(`Created notification for user ${userId} after pitch ${newPitch.id} submission`);
      } catch (notificationError) {
        console.error('Error creating pitch submission notification:', notificationError);
        // Don't fail the request if notification creation fails
      }
      
      // If no payment intent ID was provided and bid amount exists, create one now
      if (!paymentIntentId && bidAmount) {
        try {
          console.log(`Creating payment intent for pitch ${newPitch.id} with amount ${bidAmount}`);
          
          // Convert amount to cents for Stripe API
          const amountInCents = Math.round(bidAmount * 100);
          
          // Create the payment intent with manual capture
          const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: "usd",
            capture_method: "manual",
            metadata: {
              pitchId: newPitch.id.toString(),
              userId: userId.toString(),
              opportunityId: opportunityId.toString(),
              pitchType: 'media_coverage'
            },
            payment_method_types: ['card']
          });
          
          console.log(`Created payment intent ${paymentIntent.id} for pitch ${newPitch.id}`);
          
          // Calculate authorization expiration (6.5 days from now, matching the ticket requirement)
          const authorizationExpiresAt = new Date(Date.now() + 6.5 * 24 * 60 * 60 * 1000);
          
          // Update the pitch with payment intent ID and expiration
          const updatedPitch = await storage.updatePitchPaymentIntent(
            newPitch.id,
            paymentIntent.id,
            authorizationExpiresAt
          );
          
          if (updatedPitch) {
            console.log(`[SAVE-PI] ${newPitch.id} ${paymentIntent.id}`);
            // Return the updated pitch with client secret for frontend to handle payment
            return res.status(201).json({
              ...updatedPitch,
              paymentIntentId: paymentIntent.id,
              clientSecret: paymentIntent.client_secret
            });
          }
        } catch (stripeError: any) {
          console.error('Error creating payment intent:', stripeError);
          // Continue without payment intent if creation fails
        }
      }
      
      // IMPORTANT: Try to get the pitch back from storage to verify it exists
      const verificationPitch = await storage.getPitch(newPitch.id);
      if (verificationPitch) {
        console.log("Verified pitch exists in database with ID:", verificationPitch.id);
      } else {
        console.error("WARNING: Could not verify pitch exists immediately after creation!");
      }
      
      res.status(201).json(newPitch);
    } catch (error: any) {
      console.error('Error creating pitch:', error);
      res.status(500).json({ message: "Failed to create pitch" });
    }
  });
  
  // Update pitch transcript
  app.patch("/api/pitches/:id/transcript", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid pitch ID" });
      }
      
      const schema = z.object({
        transcript: z.string().min(1)
      });
      
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid transcript data", 
          errors: validationResult.error.errors 
        });
      }
      
      const { transcript } = validationResult.data;
      
      const updatedPitch = await storage.updatePitchTranscript(id, transcript);
      if (!updatedPitch) {
        return res.status(404).json({ message: "Pitch not found" });
      }
      
      res.json(updatedPitch);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update transcript" });
    }
  });
  
  // Process voice recording
  // Create or update a draft pitch
  app.post("/api/pitches/draft", async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ error: 'You must be logged in to save a draft' });
      }
      
      console.log("Received request to save draft pitch:", req.body);
      
      // Extract fields from request - accept both camelCase and snake_case formats
      let userId = req.body.userId || req.body.user_id || req.user!.id;
      let opportunityId = req.body.opportunityId || req.body.opportunity_id;
      const content = req.body.content || "";
      const audioUrl = req.body.audioUrl || req.body.audio_url || "";
      const transcript = req.body.transcript || "";
      const bidAmount = Number(req.body.bidAmount || req.body.bid_amount || 0);
      const pitchType = req.body.pitchType || 'text';
      
      // Default values
      const status = 'draft';
      const isDraft = true;
      
      // Convert values to numbers if they're strings
      userId = typeof userId === 'string' ? parseInt(userId) : userId;
      opportunityId = typeof opportunityId === 'string' ? parseInt(opportunityId) : opportunityId;
      
      // Validate that we have required data
      if (!userId || !opportunityId) {
        return res.status(400).json({ 
          error: 'Missing required fields', 
          details: { userId, opportunityId }
        });
      }
      
      // Insert draft pitch
      const pitchData = {
        opportunityId,
        userId,
        content,
        audioUrl,
        transcript, 
        status,
        isDraft,
        pitchType,
        bidAmount: bidAmount || null,
        updatedAt: new Date()
      };
      
      const result = await storage.createPitch(pitchData);
      console.log("Draft pitch created:", result);
      
      // Return the created draft
      return res.status(201).json(result);
    } catch (error: any) {
      console.error('Error creating draft pitch:', error);
      return res.status(500).json({ error: 'Failed to save draft', details: error.message });
    }
  });
  
  // Update an existing draft pitch
  app.put("/api/pitches/:id/draft", async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ error: 'You must be logged in to update a draft' });
      }
      
      const pitchId = parseInt(req.params.id);
      if (isNaN(pitchId)) {
        return res.status(400).json({ error: 'Invalid pitch ID' });
      }
      
      // Get the existing pitch to verify ownership
      const existingPitch = await storage.getPitch(pitchId);
      
      if (!existingPitch) {
        return res.status(404).json({ error: 'Draft not found' });
      }
      
      // Verify ownership
      if (existingPitch.userId !== req.user!.id) {
        return res.status(403).json({ error: 'You do not own this draft' });
      }
      
      console.log("Updating draft pitch ID:", pitchId, "with data:", req.body);
      
      // Extract fields from request
      const content = req.body.content || existingPitch.content || "";
      const audioUrl = req.body.audioUrl || req.body.audio_url || existingPitch.audioUrl || "";
      const transcript = req.body.transcript || existingPitch.transcript || "";
      const bidAmount = Number(req.body.bidAmount || req.body.bid_amount || existingPitch.bidAmount || 0);
      const pitchType = req.body.pitchType || existingPitch.pitchType || 'text';
      
      // Update the draft pitch
      const updateData = {
        id: pitchId,
        content,
        audioUrl,
        transcript,
        bidAmount,
        pitchType,
        isDraft: true,
        status: 'draft',
        updatedAt: new Date()
      };
      
      const result = await storage.updatePitch({
        ...updateData
      });
      console.log("Draft pitch updated:", result);
      
      return res.status(200).json(result);
    } catch (error: any) {
      const errMsg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: 'Failed to update draft', details: errMsg });
    }
  });
  
  // Get drafts for a user
  app.get("/api/users/:userId/drafts", async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ error: 'You must be logged in to view drafts' });
      }
      
      const userId = parseInt(req.params.userId);
      if (isNaN(userId) || userId !== req.user!.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      const opportunityId = req.query.opportunityId ? parseInt(req.query.opportunityId as string) : undefined;
      
      console.log("Fetching drafts for user:", userId, "and opportunity:", opportunityId);
      
      // Get drafts
      const drafts = await storage.getUserDrafts(userId, opportunityId);
      
      return res.status(200).json(drafts);
    } catch (error: any) {
      console.error('Error fetching drafts:', error);
      return res.status(500).json({ error: 'Failed to fetch drafts', details: error.message });
    }
  });

  // Get drafts for the current authenticated user
  app.get("/api/users/current/drafts", async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req) || !req.user) {
        return res.status(401).json({ error: 'You must be logged in to view drafts' });
      }
      
      const userId = req.user!.id;
      if (!userId) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      
      const opportunityId = req.query.opportunityId ? parseInt(req.query.opportunityId as string) : undefined;
      
      console.log("Fetching drafts for current user:", userId, "and opportunity:", opportunityId);
      
      // Get drafts
      const drafts = await storage.getUserDrafts(userId, opportunityId);
      
      return res.status(200).json(drafts);
    } catch (error: any) {
      console.error('Error fetching drafts for current user:', error);
      return res.status(500).json({ error: 'Failed to fetch drafts', details: error.message });
    }
  });

  app.post("/api/pitches/voice", async (req: Request, res: Response) => {
    try {
      if (!req.body || !req.body.audio) {
        return res.status(400).json({ message: "No audio data provided" });
      }
      
      const audioData = req.body.audio;
      const result = await processVoiceRecording(audioData);
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to process voice recording" });
    }
  });
  
  // ============ SAVED OPPORTUNITIES ENDPOINTS ============
  
  // Get saved opportunities for a user
  app.get("/api/users/:userId/saved", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const saved = await storage.getSavedOpportunitiesByUserId(userId);
      res.json(saved);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch saved opportunities" });
    }
  });
  
  // Save an opportunity
  app.post("/api/saved", async (req: Request, res: Response) => {
    try {
      const validationResult = insertSavedOpportunitySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: validationResult.error.errors 
        });
      }
      
      const savedData = validationResult.data;
      
      // Check if already saved
      const existing = await storage.getSavedOpportunity(savedData.userId, savedData.opportunityId);
      if (existing) {
        return res.status(400).json({ message: "Opportunity already saved" });
      }
      
      const saved = await storage.createSavedOpportunity(savedData);
      res.status(201).json(saved);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to save opportunity" });
    }
  });
  
  // Unsave an opportunity
  app.delete("/api/users/:userId/saved/:opportunityId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const opportunityId = parseInt(req.params.opportunityId);
      
      if (isNaN(userId) || isNaN(opportunityId)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }
      
      const success = await storage.deleteSavedOpportunity(userId, opportunityId);
      if (!success) {
        return res.status(404).json({ message: "Saved opportunity not found" });
      }
      
      res.status(204).end();
    } catch (error: any) {
      res.status(500).json({ message: "Failed to unsave opportunity" });
    }
  });
  
  // Email endpoints removed

  app.post("/api/test-email", async (req: Request, res: Response) => {
    try {
      if (!resend) {
        return res.status(500).json({ 
          success: false, 
          message: 'Resend API key not configured'
        });
      }

      const { email, subject, message } = req.body;
      if (!email) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email is required' 
        });
      }

      // If subject and message are provided, it's a custom support email
      if (subject && message) {
        try {
          if (!resend) {
            return res.status(500).json({ 
              success: false, 
              message: 'Resend API key not configured'
            });
          }
          
          await resend.emails.send({
            from: process.env.EMAIL_FROM || 'QuoteBid <noreply@quotebid.com>',
            to: [email],
            subject: subject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
                  <h1 style="color: #4a5568; margin: 0;">QuoteBid</h1>
                </div>
                <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
                  <h2 style="color: #2d3748;">${subject}</h2>
                  <div style="white-space: pre-wrap;">${message.replace(/\n/g, '<br/>')}</div>
                  <p style="margin-top: 30px;">If you have any questions, please contact our support team.</p>
                </div>
                <div style="text-align: center; padding: 15px; font-size: 12px; color: #718096;">
                  <p>© ${new Date().getFullYear()} QuoteBid. All rights reserved.</p>
                </div>
              </div>
            `
          });
          
          return res.json({ 
            success: true, 
            message: 'Custom support email sent successfully!' 
          });
        } catch (error: any) {
          console.error('Error sending custom email:', error);
          throw error;
        }
      }
      
      // Default test notification email
      const success = await sendOpportunityNotification([email], {
        title: 'Test PR Platform Email',
        description: 'This is a test email from your PR Platform'
      });
      
      if (success) {
        res.json({ 
          success: true, 
          message: 'Test email sent successfully!' 
        });
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message,
        details: error.response?.body || error.toString()
      });
    }
  });

  // ============ USER PROFILE ENDPOINTS ============
  
  // Complete user profile with additional information
  app.patch("/api/users/:userId/profile", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const schema = z.object({
        fullName: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone_number: z.string().optional(),
        bio: z.string().optional(),
        location: z.string().optional(),
        title: z.string().optional(),
        industry: z.string().min(1).optional(),
        linkedIn: z.string().url().optional().or(z.string().length(0)),
        instagram: z.string().url().optional().or(z.string().length(0)),
        facebook: z.string().url().optional().or(z.string().length(0)),
        twitter: z.string().url().optional().or(z.string().length(0)),
        website: z.string().url().optional().or(z.string().length(0)),
        pastPrLinks: z.string().optional(),
        avatar: z.string().optional(),
        profileCompleted: z.boolean().optional(),
        doFollowLink: z.string().optional(),
      });
      
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid profile data", 
          errors: validationResult.error.errors 
        });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Prepare update data
      const updateData = { ...validationResult.data, profileCompleted: true };
      
      // Don't overwrite avatar with empty value - preserve existing avatar
      if (!updateData.avatar && user.avatar) {
        console.log('Preserving existing avatar:', user.avatar);
        updateData.avatar = user.avatar;
      }
      
      console.log('Profile update data:', updateData);
      
      // Update the user's profile
      const updatedUser = await getDb().update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning()
        .then(rows => rows[0]);
      
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Failed to update user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });
  
  // Handle avatar upload
  app.post('/api/users/:userId/avatar', upload.single('avatar'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      // Store only the relative path in the database
      const relativePath = `/uploads/avatars/${req.file.filename}`;
      
      console.log("Avatar uploaded to:", relativePath);
      
      // Update user's avatar in the database with relative path
      const updatedUser = await getDb().update(users)
        .set({ avatar: relativePath })
        .where(eq(users.id, userId))
        .returning()
        .then(rows => rows[0]);
      
      res.status(200).json({ 
        message: 'Avatar uploaded successfully',
        fileUrl: relativePath, // Return the relative path
        user: updatedUser
      });
    } catch (error: any) {
      console.error("Failed to upload avatar:", error);
      res.status(500).json({ message: 'Failed to upload avatar' });
    }
  });
  
  // Handle agreement PDF upload
  app.post('/api/users/:userId/agreement-pdf', async (req: Request, res: Response) => {
    saveAgreementPDF(req, res);
  });
  
  // Get user's existing agreement PDF URL
  app.get('/api/users/:userId/agreement-pdf', async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = parseInt(req.params.userId);
      if (isNaN(userId) || (userId !== req.user!.id && !(req as any).adminUser)) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Get the user record
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return the agreement PDF URL if it exists
      if (user.agreementPdfUrl) {
        res.json({ pdfUrl: user.agreementPdfUrl, signedAt: user.agreementSignedAt });
      } else {
        res.status(404).json({ message: "No signed agreement found for this user" });
      }
    } catch (error: any) {
      console.error("Error fetching agreement PDF URL:", error);
      res.status(500).json({ message: "Error fetching agreement PDF URL: " + error.message });
    }
  });
  
  // Regenerate user agreement PDFs (admin only)
  app.post('/api/admin/regenerate-agreements', async (req: Request, res: Response) => {
    regenerateAgreementsPDF(req, res);
  });
  
  // Update user industry preference
  // Update user premium status
  app.post("/api/users/:userId/update-premium-status", async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const userId = parseInt(req.params.userId);
      if (isNaN(userId) || userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const { status, expiry } = req.body;
      
      // Update user status
      await getDb().update(users)
        .set({ 
          premiumStatus: status,
          premiumExpiry: expiry ? new Date(expiry) : null
        })
        .where(eq(users.id, userId));
      
      res.json({ 
        success: true, 
        message: "Payment processed successfully"
      });
    } catch (error: any) {
      console.error("Error updating premium status:", error);
      res.status(500).json({ message: "Error updating premium status: " + error.message });
    }
  });

  app.patch("/api/users/:userId/industry", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const schema = z.object({
        industry: z.string().min(1)
      });
      
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid industry data", 
          errors: validationResult.error.errors 
        });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update the user's industry
      const updatedUser = await getDb().update(users)
        .set({ industry: validationResult.data.industry })
        .where(eq(users.id, userId))
        .returning()
        .then(rows => rows[0]);
      
      res.json(updatedUser);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update industry preference" });
    }
  });
  
  // Get user's successful placements with full details
  app.get("/api/users/:userId/pitches", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      console.log(`Fetching pitches for user ID: ${userId}`);
      
      // Try to get pitches with full relations first
      try {
        const pitchesWithRelations = await getDb().select()
          .from(pitches)
          .where(eq(pitches.userId, userId))
          .orderBy(desc(pitches.createdAt));
          
        // If we have pitches, enrich them with relations (opportunity, publication)
        if (pitchesWithRelations.length > 0) {
          console.log(`Found ${pitchesWithRelations.length} pitches for user ${userId}`);
          
          // Get all related data in parallel
          const enrichedPitches = await Promise.all(
            pitchesWithRelations.map(async (pitch) => {
              try {
                // Get opportunity
                const [opportunity] = pitch.opportunityId 
                  ? await getDb().select()
                      .from(opportunities)
                      .where(eq(opportunities.id, pitch.opportunityId))
                  : [null];
                
                // Get publication if opportunity exists
                let publication = null;
                if (opportunity?.publicationId) {
                  const [pub] = await getDb().select()
                    .from(publications)
                    .where(eq(publications.id, opportunity.publicationId));
                  publication = pub;
                }
                
                // Return the pitch with its relations and transform article fields
                const enrichedPitch = {
                  ...pitch,
                  opportunity: opportunity ? {
                    ...opportunity,
                    publication: publication || undefined
                  } : undefined,
                  // Transform articleUrl and articleTitle into article object for frontend compatibility
                  article: pitch.articleUrl ? {
                    url: pitch.articleUrl,
                    title: pitch.articleTitle || pitch.articleUrl
                  } : undefined,
                };
                
                // Debug logging for article data
                if (pitch.articleUrl) {
                  console.log(`🔗 USER PITCHES: Pitch ${pitch.id} has article URL: ${pitch.articleUrl}`);
                }
                
                // Debug logging for first pitch
                if (pitch.id === pitchesWithRelations[0].id) {
                  console.log(`[DEBUG] First pitch structure:`, {
                    pitchId: pitch.id,
                    hasOpportunity: !!opportunity,
                    opportunityTitle: opportunity?.title,
                    hasPublication: !!publication,
                    publicationName: publication?.name,
                    finalStructure: {
                      hasOpportunity: !!enrichedPitch.opportunity,
                      hasPublication: !!enrichedPitch.opportunity?.publication,
                      publicationName: enrichedPitch.opportunity?.publication?.name
                    }
                  });
                }
                
                return enrichedPitch;
              } catch (error: any) {
                console.error(`Error getting relations for pitch ${pitch.id}:`, error);
                return pitch; // Return the pitch without relations
              }
            })
          );
          
          return res.json(enrichedPitches);
        } else {
          console.log(`No pitches found for user ${userId}`);
          return res.json([]);
        }
      } catch (error: any) {
        console.error('Error fetching user pitches with relations:', error);
        
        // Fall back to basic pitch retrieval
        const basicPitches = await storage.getPitchesByUserId(userId);
        console.log(`Fallback: Found ${basicPitches.length} basic pitches for user ${userId}`);
        return res.json(basicPitches);
      }
    } catch (error: any) {
      console.error('Error fetching user pitches:', error);
      res.status(500).json({ 
        message: "Error fetching user pitches",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  app.get("/api/users/:userId/placements", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get basic placements
      const userPlacements = await storage.getPlacementsByUserId(userId);
      
      // For each placement, get full details with relations
      const placementsWithDetails = await Promise.all(
        userPlacements.map(async (placement) => {
          const details = await storage.getPlacementWithRelations(placement.id);
          return details;
        })
      );
      
      // Filter out any undefined results and only return paid or complete placements
      const successfulPlacements = placementsWithDetails
        .filter((p): p is PlacementWithRelations => 
          p !== undefined && (p.status === 'paid' || p.status === 'complete')
        );
      
      res.json(successfulPlacements);
    } catch (error: any) {
      console.error("Failed to fetch user placements:", error);
      res.status(500).json({ message: "Failed to fetch user placements", error: error.message });
    }
  });

  // ============ MEDIA COVERAGE ENDPOINTS ============
  
  // Get user's media coverage
  app.get("/api/users/:userId/media-coverage", ensureAuth, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Check if user is accessing their own data or is admin
      const requestingUser = (req as any).user;
      if (requestingUser.id !== userId && !requestingUser.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const mediaCoverage = await storage.getUserMediaCoverage(userId);
      res.json(mediaCoverage);
    } catch (error: any) {
      console.error("Failed to fetch media coverage:", error);
      res.status(500).json({ message: "Failed to fetch media coverage", error: error.message });
    }
  });

  // Create new media coverage entry
  app.post("/api/users/:userId/media-coverage", ensureAuth, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Check if user is accessing their own data or is admin
      const requestingUser = (req as any).user;
      if (requestingUser.id !== userId && !requestingUser.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Validate the request body
      const { insertMediaCoverageSchema } = await import("@shared/schema");
      const validationResult = insertMediaCoverageSchema.safeParse({
        ...req.body,
        userId,
        source: 'manual'
      });

      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid media coverage data",
          errors: validationResult.error.errors
        });
      }

      const mediaCoverageData = validationResult.data;
      const newMediaCoverage = await storage.createMediaCoverage(mediaCoverageData);
      
      res.status(201).json(newMediaCoverage);
    } catch (error: any) {
      console.error("Failed to create media coverage:", error);
      res.status(500).json({ message: "Failed to create media coverage", error: error.message });
    }
  });

  // Update media coverage entry
  app.patch("/api/users/:userId/media-coverage/:id", ensureAuth, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const mediaCoverageId = parseInt(req.params.id);
      
      if (isNaN(userId) || isNaN(mediaCoverageId)) {
        return res.status(400).json({ message: "Invalid user ID or media coverage ID" });
      }

      // Check if user is accessing their own data or is admin
      const requestingUser = (req as any).user;
      if (requestingUser.id !== userId && !requestingUser.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Validate the request body
      const { insertMediaCoverageSchema } = await import("@shared/schema");
      const validationResult = insertMediaCoverageSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid media coverage data",
          errors: validationResult.error.errors
        });
      }

      const updateData = validationResult.data;
      const updatedMediaCoverage = await storage.updateMediaCoverage(mediaCoverageId, updateData);
      
      if (!updatedMediaCoverage) {
        return res.status(404).json({ message: "Media coverage not found" });
      }

      res.json(updatedMediaCoverage);
    } catch (error: any) {
      console.error("Failed to update media coverage:", error);
      res.status(500).json({ message: "Failed to update media coverage", error: error.message });
    }
  });

  // Delete media coverage entry
  app.delete("/api/users/:userId/media-coverage/:id", ensureAuth, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const mediaCoverageId = parseInt(req.params.id);
      
      if (isNaN(userId) || isNaN(mediaCoverageId)) {
        return res.status(400).json({ message: "Invalid user ID or media coverage ID" });
      }

      // Check if user is accessing their own data or is admin
      const requestingUser = (req as any).user;
      if (requestingUser.id !== userId && !requestingUser.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const deleted = await storage.deleteMediaCoverage(mediaCoverageId, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Media coverage not found" });
      }

      res.status(204).send();
    } catch (error: any) {
      console.error("Failed to delete media coverage:", error);
      res.status(500).json({ message: "Failed to delete media coverage", error: error.message });
    }
  });
  
  // ============ ADMIN ENDPOINTS ============
  
  // Admin registration endpoint (hidden, requires a secret key)
  
  // Get all admin users (admin only)
  app.get("/api/admin/admins", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const admins = await storage.getAllAdminUsers();
      res.json(admins);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch admin users" });
    }
  });
  
  // Get all users (admin only)
  app.get("/api/admin/users", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  // Get a single user by ID (admin only)
  app.get("/api/admin/users/:userId", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Admin endpoint to reset a user's password
  app.post("/api/admin/reset-password", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { userId, email } = req.body;
      
      if (!userId || !email) {
        return res.status(400).json({ message: "User ID and email are required" });
      }
      
      // Get the user to ensure they exist and get their username
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Ensure the email matches the user record
      if (user.email !== email) {
        return res.status(400).json({ message: "Email does not match user record" });
      }
      
      // Generate a secure reset token
      const resetToken = randomBytes(32).toString('hex');
      
      // Store the reset token in the database (you'll need to add a resetToken field to your users table)
      // For this implementation, we'll just send the email without storing the token
      
      // Send the password reset email
      const emailSent = await sendPasswordResetEmail(email, resetToken, user.username);
      
      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send password reset email" });
      }
      
      res.json({ 
        success: true, 
        message: "Password reset email sent successfully" 
      });
    } catch (error: any) {
      console.error("Error sending password reset:", error);
      res.status(500).json({ 
        message: "Failed to send password reset email", 
        error: error.message || "Unknown error" 
      });
    }
  });
  
  // Previously an endpoint to update a user's admin status
  // This is no longer needed since we have a separate admin users table
  
  // Admin API to get all publications
  app.get("/api/admin/publications", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const publications = await storage.getPublications();
      res.json(publications);
    } catch (error: any) {
      console.error('Error fetching publications:', error);
      res.status(500).json({ message: 'Failed to fetch publications', error: error });
    }
  });

  // Add a new publication (admin only)
  app.post("/api/admin/publications", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const validationResult = insertPublicationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid publication data", 
          errors: validationResult.error.errors 
        });
      }
      
      const publicationData = validationResult.data;
      const newPublication = await storage.createPublication(publicationData);
      
      res.status(201).json(newPublication);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create publication" });
    }
  });

  // Update a publication (admin only)
  app.patch("/api/admin/publications/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid publication ID" });
      }
      
      // Get current publication to check if it exists
      const publication = await storage.getPublication(id);
      if (!publication) {
        return res.status(404).json({ message: "Publication not found" });
      }
      
      // Validate update data
      const validationResult = insertPublicationSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid publication data", 
          errors: validationResult.error.errors 
        });
      }
      
      // Update publication
      const updatedData = validationResult.data;
      const updatedPublication = await storage.updatePublication(id, updatedData);
      
      res.json(updatedPublication);
    } catch (error: any) {
      console.error('Error updating publication:', error);
      res.status(500).json({ message: "Failed to update publication" });
    }
  });

  // Delete a publication (admin only)
  app.delete("/api/admin/publications/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid publication ID" });
      }
      
      // Get current publication to check if it exists
      const publication = await storage.getPublication(id);
      if (!publication) {
        return res.status(404).json({ message: "Publication not found" });
      }
      
      // Check if there are opportunities using this publication
      const relatedOpportunities = await storage.getOpportunitiesByPublication(id);
      if (relatedOpportunities && relatedOpportunities.length > 0) {
        return res.status(409).json({
          message: "Cannot delete publication with associated opportunities",
          count: relatedOpportunities.length
        });
      }
      
      // Delete publication
      await storage.deletePublication(id);
      
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting publication:', error);
      res.status(500).json({ message: "Failed to delete publication" });
    }
  });
  
  // Add a new opportunity (admin only)
  // Admin API to get all opportunities with publications
  app.get("/api/admin/opportunities", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const opportunities = await storage.getOpportunitiesWithPublications();
      res.json(opportunities);
    } catch (error: any) {
      console.error('Error fetching admin opportunities:', error);
      res.status(500).json({ message: 'Failed to fetch opportunities', error: error });
    }
  });

  app.post("/api/admin/opportunities", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      // Log the incoming data for debugging
      console.log("Opportunity creation request data:", JSON.stringify(req.body));
      
      // ---------- HOT-FIX: force pub ID to number ----------
      if (typeof req.body.publicationId === 'string') {
        req.body.publicationId = Number(req.body.publicationId || 0);
        console.log("HOT-FIX: Converted publicationId from string to number:", req.body.publicationId);
      }
      // ------------------------------------------------------
      
      const validationResult = insertOpportunitySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        console.log("Validation errors:", JSON.stringify(validationResult.error.errors));
        return res.status(400).json({ 
          message: "Invalid opportunity data", 
          errors: validationResult.error.errors 
        });
      }
      
      const opportunityData = validationResult.data;
      
      // Check if publication exists
      const publication = await storage.getPublication(opportunityData.publicationId);
      if (!publication) {
        return res.status(404).json({ message: "Publication not found" });
      }
      
      // Make sure tags is an array
      if (typeof opportunityData.tags === 'string') {
        opportunityData.tags = [opportunityData.tags];
      }
      
      // Ensure deadline is a valid date
      if (opportunityData.deadline && typeof opportunityData.deadline === 'string') {
        try {
          opportunityData.deadline = new Date(opportunityData.deadline);
        } catch (e) {
          console.error("Failed to parse deadline:", e);
        }
      }
      
      console.log("Validated opportunity data:", JSON.stringify(opportunityData));
      const newOpportunity = await storage.createOpportunity(opportunityData);
      console.log("Created opportunity:", JSON.stringify(newOpportunity));
      
      // Notify users in the matching industry
      if (opportunityData.industry) {
        try {
          // Get users who have the matching industry
          const matchingUsers = await storage.getUsersByIndustry(opportunityData.industry);
          
          if (matchingUsers.length > 0) {
            const userEmails = matchingUsers.map((user: User) => user.email);
            
            // Send email notifications
            await sendOpportunityNotification(userEmails, {
              title: newOpportunity.title,
              description: newOpportunity.description
            });
            
            // Create in-app notifications for each matching user
            const notificationPromises = matchingUsers.map(async (user: User) => {
              try {
                await notificationService.createNotification({
                  userId: user.id,
                  type: 'opportunity',
                  title: '🚀 New Opportunity Available!',
                  message: `A new ${opportunityData.industry} opportunity "${newOpportunity.title}" has been posted that matches your profile.`,
                  linkUrl: `/opportunities/${newOpportunity.id}`,
                  relatedId: newOpportunity.id,
                  relatedType: 'opportunity',
                  icon: 'tag',
                  iconColor: 'blue',
                });
                console.log(`Created opportunity notification for user ${user.id} (${user.fullName || user.username})`);
              } catch (error: any) {
                console.error(`Failed to create notification for user ${user.id}:`, error);
              }
            });
            
            await Promise.all(notificationPromises);
            console.log(`Created ${matchingUsers.length} opportunity notifications for new opportunity: ${newOpportunity.title}`);
          }
        } catch (emailError) {
          console.error("Failed to send email notifications:", emailError);
          // Continue anyway, don't fail the opportunity creation
        }
      }
      
      // Return the created opportunity with publication data
      const opportunityWithPublication = await storage.getOpportunityWithPublication(newOpportunity.id);
      
      res.status(201).json(opportunityWithPublication || newOpportunity);
    } catch (error: any) {
      console.error("Failed to create opportunity:", error);
      res.status(500).json({ message: "Failed to create opportunity" });
    }
  });
  
  // Update opportunity status (admin only)
  app.patch("/api/admin/opportunities/:id/status", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid opportunity ID" });
      }
      
      const schema = z.object({
        status: z.string().min(1)
      });
      
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid status data", 
          errors: validationResult.error.errors 
        });
      }
      
      const { status } = validationResult.data;
      
      const updatedOpportunity = await storage.updateOpportunityStatus(id, status);
      if (!updatedOpportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      
      res.json(updatedOpportunity);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update opportunity status" });
    }
  });
  
  // Get a specific pitch by ID (admin only)
  app.get("/api/admin/pitches/:pitchId", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const pitchId = parseInt(req.params.pitchId);
      if (isNaN(pitchId)) {
        return res.status(400).json({ message: "Invalid pitch ID" });
      }
      
      const pitch = await storage.getPitchWithRelations(pitchId);
      if (!pitch) {
        return res.status(404).json({ message: "Pitch not found" });
      }
      
      res.json(pitch);
    } catch (error: any) {
      console.error("Error fetching pitch details:", error);
      res.status(500).json({ message: "Failed to fetch pitch details" });
    }
  });
  
  // Get all pitches (admin only)
  app.get("/api/admin/pitches", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      console.log("Admin requesting all pitches");
      
      // Disable caching for this endpoint to ensure fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      // Get admin info for logging
      const adminUser = (req as any).adminUser;
      console.log(`Admin user authenticated: ${adminUser?.username}`);
      
      // For testing - import sample data if no real pitches exist
      const { samplePitches } = await import('./data/pitches');
      
      try {
        // First try to get pitches with full relations
        console.log("Fetching pitches with relations");
        const pitchesWithRelations = await storage.getAllPitchesWithRelations();
        
        console.log(`Retrieved ${pitchesWithRelations.length} pitches with complete relations`);
        
        // Debug: Log the first pitch to see if relations are included
        if (pitchesWithRelations.length > 0) {
          console.log("First pitch with relations:", {
            id: pitchesWithRelations[0].id,
            userId: pitchesWithRelations[0].userId,
            hasUser: !!pitchesWithRelations[0].user,
            userName: pitchesWithRelations[0].user?.fullName || pitchesWithRelations[0].user?.username,
            hasOpportunity: !!pitchesWithRelations[0].opportunity,
            opportunityTitle: pitchesWithRelations[0].opportunity?.title
          });
          
          // Log the actual user object to see what's being returned
          console.log("First pitch user object:", pitchesWithRelations[0].user);
          console.log("First pitch opportunity object:", pitchesWithRelations[0].opportunity);
        }
        
        // Get raw pitch data to compare against relations data
        const rawPitches = await storage.getAllPitches();
        console.log(`Raw pitch count: ${rawPitches.length}. With relations: ${pitchesWithRelations.length}`);
        if (rawPitches.length > pitchesWithRelations.length) {
          console.log("Some pitches may be missing relations!");
          
          // Identify which pitches might be missing
          const pitchesWithRelationsIds = new Set(pitchesWithRelations.map(p => p.id));
          const missingRelationsPitches = rawPitches.filter(p => !pitchesWithRelationsIds.has(p.id));
          
          if (missingRelationsPitches.length > 0) {
            console.log(`Found ${missingRelationsPitches.length} pitches missing relations:`, 
              missingRelationsPitches.map(p => ({
                id: p.id,
                userId: p.userId,
                user_id: (p as any).user_id,
                opportunityId: p.opportunityId
              })));
          }
        }
        
        if (pitchesWithRelations.length > 0) {
          // Standardize the pitch format to ensure consistent user ID field
          const standardizedPitches = pitchesWithRelations.map(pitch => ({
            ...pitch,
            userId: pitch.userId || (pitch as any).user_id, // Ensure userId is always in camelCase
          }));
          
          // Add detailed logging for pitch user relations
          standardizedPitches.forEach(pitch => {
            if (!pitch.user) {
              console.log(`Pitch ${pitch.id} is missing user relation! User ID: ${pitch.userId}`);
            }
            if (!pitch.opportunity) {
              console.log(`Pitch ${pitch.id} is missing opportunity relation! Opportunity ID: ${pitch.opportunityId}`);
            }
          });
          
          // Log all pitch user IDs
          console.log("Pitch user IDs (with relations):", standardizedPitches.map(p => p.userId).join(", "));
          
          // Return standardized pitches
          return res.json(standardizedPitches);
        }
        
        // If no pitches with relations found, fall back to basic pitch data
        console.log("No pitches with relations found, falling back to basic data");
        const basicPitches = await storage.getAllPitches();
        
        if (basicPitches.length > 0) {
          // Standardize the pitch format
          const standardizedBasicPitches = basicPitches.map(pitch => ({
            ...pitch,
            userId: pitch.userId || (pitch as any).user_id, // Ensure userId is always in camelCase
          }));
          
          console.log(`Found ${standardizedBasicPitches.length} pitches with basic data`);
          // Log all pitch user IDs
          console.log("Pitch user IDs (basic):", standardizedBasicPitches.map(p => p.userId).join(", "));
          
          return res.json(standardizedBasicPitches);
        }
        
        // Last resort fallback to direct database query
        console.log("No pitches found, attempting direct query fallback");
        const { pitches } = await import("@shared/schema");
        const fallbackPitches = await getDb().select().from(pitches);
        
        // Standardize direct query results
        const standardizedFallbackPitches = fallbackPitches.map(pitch => {
          // Handle potential snake_case fields
          const userId = pitch.userId || (pitch as any).user_id;
          const opportunityId = pitch.opportunityId || (pitch as any).opportunity_id;
          
          return {
            ...pitch,
            userId: userId,
            opportunityId: opportunityId,
          };
        });
        
        console.log(`Fallback query found ${standardizedFallbackPitches.length} pitches`);
        return res.json(standardizedFallbackPitches);
      } catch (storageError) {
        console.error("Error fetching pitches with relations:", storageError);
        
        try {
          // Try basic pitches as fallback
          const basicPitches = await storage.getAllPitches();
          
          // Standardize basic pitches
          const standardizedBasicPitches = basicPitches.map(pitch => ({
            ...pitch,
            userId: pitch.userId || (pitch as any).user_id, // Ensure userId is always in camelCase
          }));
          
          console.log(`Fallback to basic pitches returned ${standardizedBasicPitches.length} results`);
          return res.json(standardizedBasicPitches);
        } catch (basicError) {
          // Last resort direct query
          console.error("Error with basic pitches, using direct query:", basicError);
          const { pitches } = await import("@shared/schema");
          const directPitches = await getDb().select().from(pitches);
          
          // Standardize direct query results
          const standardizedDirectPitches = directPitches.map(pitch => {
            const userId = pitch.userId || (pitch as any).user_id;
            return {
              ...pitch,
              userId: userId,
            };
          });
          
          console.log(`Direct query fallback found ${standardizedDirectPitches.length} pitches`);
            
          // Only use sample data when we have no pitches
          if (standardizedDirectPitches.length === 0) {
            console.log(`No pitches found in database, using ${samplePitches.length} sample pitches as fallback`);
            return res.json(samplePitches);
          }
          
          return res.json(standardizedDirectPitches);
        }
      }
    } catch (error: any) {
      console.error("Error fetching all pitches:", error);
      res.status(500).json({ message: "Failed to fetch pitches" });
    }
  });
  
  // Debug endpoint to check the latest pitch
  app.get("/api/debug/latest-pitch", async (req: Request, res: Response) => {
    try {
      const pitches = await storage.getAllPitches();
      
      if (pitches && pitches.length > 0) {
        // Sort pitches by ID descending to get the latest one
        const sortedPitches = [...pitches].sort((a, b) => b.id - a.id);
        const latestPitch = sortedPitches[0];
        
        console.log("Latest pitch:", {
          id: latestPitch.id,
          userId: latestPitch.userId,
          opportunityId: latestPitch.opportunityId,
          content: latestPitch.content ? latestPitch.content.substring(0, 50) + (latestPitch.content.length > 50 ? '...' : '') : '',
          createdAt: latestPitch.createdAt
        });
        
        res.json({
          message: "Latest pitch found",
          pitch: latestPitch,
          totalPitches: pitches.length
        });
      } else {
        res.json({ message: "No pitches found", totalPitches: 0 });
      }
    } catch (error: any) {
      console.error("Error in debug endpoint:", error);
      res.status(500).json({ message: "Error checking latest pitch" });
    }
  });
  
  // Create a new placement
  app.post("/api/admin/placements", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const {
        pitchId,
        userId,
        opportunityId,
        publicationId,
        articleTitle,
        articleUrl,
        amount,
        status = 'ready_for_billing',
        notes,
      } = req.body;

      // Create the placement
      const placement = await storage.createPlacement({
        pitchId,
        userId,
        opportunityId,
        publicationId,
        articleTitle,
        articleUrl,
        amount,
        status,
      });

      res.status(201).json(placement);
    } catch (error: any) {
      console.error("Failed to create placement:", error);
      res.status(500).json({ message: "Failed to create placement", error: error.message });
    }
  });
  
  // Update pitch status (admin only)
  app.patch("/api/admin/pitches/:id/status", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid pitch ID" });
      }
      
      const schema = z.object({
        status: z.string().min(1),
        // Optional fields for successful pitches
        articleTitle: z.string().optional(),
        articleUrl: z.string().optional()
      });
      
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid status data", 
          errors: validationResult.error.errors 
        });
      }
      
      const { status, articleTitle, articleUrl } = validationResult.data;
      
      const updatedPitch = await storage.updatePitchStatus(id, status);
      if (!updatedPitch) {
        return res.status(404).json({ message: "Pitch not found" });
      }
      
      // Create notification for pitch status update
      try {
        const pitch = await storage.getPitch(id);
        if (pitch) {
          const opportunity = await storage.getOpportunity(pitch.opportunityId);
          const opportunityTitle = opportunity?.title || 'Unknown Opportunity';
          
          let notificationTitle = '';
          let notificationMessage = '';
          let iconType = 'info';
          let iconColor = 'blue';
          
          if (status === 'successful' || status === 'Successful Coverage') {
            notificationTitle = '🎉 Pitch Accepted!';
            notificationMessage = `Congratulations! Your pitch for "${opportunityTitle}" has been accepted for publication.`;
            iconType = 'check-circle';
            iconColor = 'green';
          } else if (status === 'rejected' || status === 'declined') {
            notificationTitle = '❌ Pitch Not Selected';
            notificationMessage = `Your pitch for "${opportunityTitle}" was not selected this time. Keep trying!`;
            iconType = 'x-circle';
            iconColor = 'red';
          } else if (status === 'under_review' || status === 'reviewing') {
            notificationTitle = '👀 Pitch Under Review';
            notificationMessage = `Your pitch for "${opportunityTitle}" is currently being reviewed.`;
            iconType = 'info';
            iconColor = 'blue';
          } else {
            notificationTitle = '📄 Pitch Status Updated';
            notificationMessage = `Your pitch for "${opportunityTitle}" status has been updated to: ${status}`;
            iconType = 'info';
            iconColor = 'blue';
          }
          
          await notificationService.createNotification({
            userId: pitch.userId,
            type: 'pitch_status',
            title: notificationTitle,
            message: notificationMessage,
            linkUrl: '/my-pitches',
            relatedId: pitch.id,
            relatedType: 'pitch',
            icon: iconType,
            iconColor: iconColor,
          });
          
          console.log(`Created notification for user ${pitch.userId} after pitch ${id} status changed to ${status}`);
        }
      } catch (notificationError) {
        console.error('Error creating pitch status notification:', notificationError);
        // Don't fail the request if notification creation fails
      }
      
      // If the pitch is marked as successful, create a placement
      console.log("Pitch status being set to:", status);
      if (status === 'successful' || status === 'Successful Coverage') {
        try {
          // Fetch the pitch with related data to get all necessary information
          const pitch = await storage.getPitch(id);
          
          if (!pitch) {
            console.error("Could not find pitch even though it was just updated");
            return res.status(404).json({ message: "Pitch not found" });
          }
          
          // Get the opportunity to get publication ID
          const opportunity = await storage.getOpportunity(pitch.opportunityId);
          if (!opportunity) {
            console.error("Associated opportunity not found");
            return res.status(404).json({ message: "Associated opportunity not found" });
          }
          
          // Get highest bid amount
          const highestBid = await storage.getHighestBidForOpportunity(opportunity.id);
          
          // Create a placement with payment intent ID from the pitch
          await storage.createPlacement({
            pitchId: pitch.id,
            userId: pitch.userId,
            opportunityId: pitch.opportunityId,
            publicationId: opportunity.publicationId,
            amount: highestBid || 0, // Default to 0 if no bids
            articleTitle: articleTitle || opportunity.title,
            articleUrl: articleUrl || '',
            status: 'ready_for_billing',
            // Transfer payment intent ID from the pitch to the placement (if exists)
            paymentIntentId: pitch.paymentIntentId ? pitch.paymentIntentId.toString() : undefined
          });
          
          // If we have article information, also update the pitch directly
          if (articleTitle || articleUrl) {
            const pitchWithArticle = await storage.updatePitchArticle(id, {
              url: articleUrl || '#',
              title: articleTitle || opportunity.title || 'Published Article'
            });
            
            if (pitchWithArticle) {
              console.log(`Updated pitch ${id} with article information: URL=${articleUrl}, Title=${articleTitle}`);
              
              // Create a notification about the new media coverage
              try {
                await notificationService.createNotification({
                  userId: pitch.userId,
                  type: 'media_coverage',
                  title: '📰 New Media Coverage Added!',
                  message: `Your article "${articleTitle || opportunity.title || 'Published Article'}" has been added to your Media Coverage portfolio.`,
                  linkUrl: articleUrl || '/account?notification=media_coverage&refresh=media',
                  relatedId: id,
                  relatedType: 'pitch',
                  icon: 'newspaper',
                  iconColor: 'blue',
                });
                
                console.log(`Created media coverage notification for user ${pitch.userId} for pitch ${id}`);
              } catch (notificationError) {
                console.error('Error creating media coverage notification:', notificationError);
              }
            }
          }
        } catch (placementError) {
          console.error("Error creating placement:", placementError);
          // Still return the updated pitch even if placement creation fails
        }
      }
      
      res.json(updatedPitch);
    } catch (error: any) {
      console.error("Failed to update pitch status:", error);
      res.status(500).json({ message: "Failed to update pitch status", error: error.message });
    }
  });

  // Update or add coverage link to a pitch (admin only)
  app.patch("/api/admin/pitches/:id/coverage", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid pitch ID" });
      }
      
      const schema = z.object({
        url: z.string().url("Must be a valid URL").min(1),
        title: z.string().optional()
      });
      
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid coverage link data", 
          errors: validationResult.error.errors 
        });
      }
      
      const { url, title } = validationResult.data;
      
      // Fetch the pitch to ensure it exists
      const pitch = await storage.getPitch(id);
      if (!pitch) {
        return res.status(404).json({ message: "Pitch not found" });
      }
      
      // Update the pitch with article information
      const updatedPitch = await storage.updatePitchArticle(id, {
        url,
        title: title || url
      });
      
      if (!updatedPitch) {
        return res.status(500).json({ message: "Failed to update pitch coverage" });
      }
      
      // Create a notification about the new media coverage
      try {
        await notificationService.createNotification({
          userId: pitch.userId,
          type: 'media_coverage',
          title: '📰 New Media Coverage Added!',
          message: `Your article "${title || 'Published Article'}" has been added to your Media Coverage portfolio.`,
          linkUrl: url,
          relatedId: id,
          relatedType: 'pitch',
          icon: 'newspaper',
          iconColor: 'blue',
        });
        
        console.log(`Created media coverage notification for user ${pitch.userId} for pitch ${id} coverage update`);
      } catch (notificationError) {
        console.error('Error creating media coverage notification for coverage update:', notificationError);
      }
      
      res.json(updatedPitch);
    } catch (error: any) {
      console.error("Error updating pitch coverage:", error);
      res.status(500).json({ message: "Failed to update pitch coverage: " + error.message });
    }
  });

  // ============ ADMIN CURRENT USER ENDPOINT ============
  
  // Get current admin user
  app.get("/api/admin/current", requireAdminAuth, (req: Request, res: Response) => {
    // The admin user is added to the request by the requireAdminAuth middleware
    const adminUser = (req as any).adminUser;
    if (!adminUser) {
      return res.status(401).json({ message: "Not authenticated as admin" });
    }
    res.json(adminUser);
  });
  
  // This endpoint is retained for admin testing purposes only
  // PDFs are automatically regenerated when needed
  
  // Ensure user has a Stripe customer ID (admin only)
  app.post("/api/admin/users/:userId/ensure-stripe-customer", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // If the user already has a customer ID, return it
      if (user.stripeCustomerId) {
        console.log(`User ${userId} already has Stripe customer ID: ${user.stripeCustomerId}`);
        return res.json({ 
          userId, 
          stripeCustomerId: user.stripeCustomerId,
          message: "User already has a Stripe customer ID"
        });
      }
      
      if (!user.email) {
        return res.status(400).json({ message: "User does not have an email address" });
      }
      
      // Create a new Stripe customer
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.fullName || user.username,
          metadata: {
            userId: user.id.toString()
          }
        });
        
        console.log(`Created Stripe customer for user ${userId}: ${customer.id}`);
        
        // Update the user with the new customer ID
        const [updatedUser] = await getDb().update(users)
          .set({ stripeCustomerId: customer.id })
          .where(eq(users.id, userId))
          .returning();
        
        return res.status(201).json({ 
          userId, 
          stripeCustomerId: customer.id,
          message: "Created new Stripe customer ID for user"
        });
      } catch (stripeError: any) {
        console.error("Stripe customer creation failed:", stripeError);
        return res.status(500).json({ 
          message: `Failed to create Stripe customer: ${stripeError.message}`, 
          error: stripeError
        });
      }
    } catch (error: any) {
      console.error("Error ensuring Stripe customer:", error);
      res.status(500).json({ message: "Failed to ensure Stripe customer: " + error.message });
    }
  });

  // Get user activity statistics (admin only)
  app.get("/api/admin/user-activity", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      // Get all users
      const users = await storage.getAllUsers();
      
      // Get current timestamp
      const now = new Date();
      
      // Calculate time thresholds
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // For a real implementation, we would check login timestamps,
      // but since we don't track that yet, we'll simulate it with registration dates
      // In a production environment, you would track user sessions
      
      // Get active users based on creation date (as a proxy for activity)
      const activeToday = users.filter(user => {
        return user.createdAt && new Date(user.createdAt) > oneDayAgo;
      }).length;
      
      const activeThisWeek = users.filter(user => {
        return user.createdAt && new Date(user.createdAt) > oneWeekAgo;
      }).length;
      
      // Return activity stats
      res.json({
        totalUsers: users.length,
        activeToday,
        activeThisWeek,
        // In a real implementation, add "currentlyOnline" from session data
        currentlyOnline: Math.min(3, Math.floor(users.length / 4)) // Simulated value for demonstration
      });
    } catch (error: any) {
      res.status(500).json({ 
        message: "Failed to get user activity statistics: " + error.message
      });
    }
  });
  
  // ============ PLACEMENTS MANAGEMENT ENDPOINTS ============
  
  // Get all placements with relations (admin only)
  app.get("/api/admin/placements", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const placements = await storage.getAllPlacements();
      res.json(placements);
    } catch (error: any) {
      console.error("Failed to fetch placements:", error);
      res.status(500).json({ message: "Failed to fetch placements", error: error.message });
    }
  });
  
  // Get a single placement with relations (admin only)
  app.get("/api/admin/placements/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid placement ID" });
      }
      
      const placement = await storage.getPlacementWithRelations(id);
      if (!placement) {
        return res.status(404).json({ message: "Placement not found" });
      }
      
      res.json(placement);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch placement: " + error.message });
    }
  });
  
  // Update placement status (admin only)
  app.patch("/api/admin/placements/:id/status", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid placement ID" });
      }
      
      const schema = z.object({
        status: z.string().min(1)
      });
      
      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid status data", 
          errors: validationResult.error.errors 
        });
      }
      
      const { status } = validationResult.data;
      
      const updatedPlacement = await storage.updatePlacementStatus(id, status);
      if (!updatedPlacement) {
        return res.status(404).json({ message: "Placement not found" });
      }
      
      res.json(updatedPlacement);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update placement status: " + error.message });
    }
  });
  
  // Upload article for a placement (admin only)
  app.post("/api/admin/placements/:id/upload", requireAdminAuth, upload.single('file'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid placement ID" });
      }
      
      // Get the placement
      const placement = await storage.getPlacement(id);
      if (!placement) {
        return res.status(404).json({ message: "Placement not found" });
      }
      
      // Get file path if a file was uploaded
      const filePath = req.file ? `/uploads/${req.file.filename}` : null;
      
      // Update the placement with the article URL from request body if provided
      const articleUrl = req.body.articleUrl || placement.articleUrl;
      
      // Update the placement with the article URL and file path
      await storage.updatePlacementArticle(id, {
        articleUrl,
        articleFilePath: filePath || undefined
      });
      
      res.json({
        success: true,
        message: "Article uploaded successfully",
        filePath,
        articleUrl
      });
    } catch (error: any) {
      console.error("Failed to upload article:", error);
      res.status(500).json({ message: "Failed to upload article", error: error.message });
    }
  });

  // Process billing for a placement (admin only)
  app.post("/api/admin/placements/:id/bill", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid placement ID" });
      }
      
      // Get the placement
      let placement = await storage.getPlacementWithRelations(id);
      if (!placement) {
        return res.status(404).json({ message: "Placement not found" });
      }
      
      // Check for invalid user reference and fix it automatically
      if (!placement.user) {
        console.log(`Placement ${id} has missing user reference. Fixing automatically...`);
        
        // Find a valid user with email
        const validUsers = await getDb().execute(
          sql`SELECT id, email FROM users WHERE email IS NOT NULL AND email != '' ORDER BY id ASC LIMIT 1`
        );
        if (!validUsers || validUsers.length === 0) {
          return res.status(500).json({ 
            message: "No valid users with email found. Cannot perform billing without a valid user."
          });
        }
        
        const validUserId = (validUsers[0] as any).id;
        
        // Update the placement with a valid user ID
        await getDb().execute(
          sql`UPDATE placements SET "userId" = ${validUserId} WHERE id = ${id}`
        );
        
        console.log(`Fixed placement ${id}: Updated with valid user ID ${validUserId}`);
        
        // Refresh the placement data to get the new user
        placement = await storage.getPlacementWithRelations(id);
        
        if (!placement || !placement.user) {
          return res.status(500).json({ 
            message: "Failed to fix invalid user reference. Please try again or contact support." 
          });
        }
      }
      
      // Check if the placement is already paid
      if (placement.status === 'paid') {
        return res.status(400).json({ message: "This placement has already been paid" });
      }
      
      // Update article URL if provided
      if (req.body.articleUrl) {
        await storage.updatePlacementArticle(id, { articleUrl: req.body.articleUrl });
      }
      
      // First check if there's a payment intent already associated with the pitch
      // If yes, try to capture that payment intent instead of creating a new one
      const associatedPitch = placement.pitch;
      
      if (associatedPitch && associatedPitch.paymentIntentId) {
        console.log(`Found existing payment intent ${associatedPitch.paymentIntentId} for pitch ${associatedPitch.id}`);
        
        try {
          // Retrieve the payment intent to verify its state
          const paymentIntent = await stripe.paymentIntents.retrieve(associatedPitch.paymentIntentId);
          
          if (paymentIntent.status === 'requires_capture') {
            console.log(`Capturing existing payment intent ${paymentIntent.id}`);
            
            // Capture the authorized payment
            const capturedIntent = await stripe.paymentIntents.capture(paymentIntent.id);
            
            // Update the placement with payment info
            const updatedPlacement = await storage.updatePlacementPayment(
              id,
              capturedIntent.id,
              capturedIntent.id
            );
            
            // Update the status to paid
            const paidPlacement = await storage.updatePlacementStatus(id, 'paid');
            
            return res.json({
              success: true,
              placement: paidPlacement,
              paymentIntent: {
                id: capturedIntent.id,
                status: capturedIntent.status
              },
              paymentSource: 'captured_intent'
            });
          } else {
            console.log(`Payment intent ${paymentIntent.id} is in ${paymentIntent.status} state, creating new payment`);
            // Continue with creating new payment below
          }
        } catch (stripeError: any) {
          console.error("Error retrieving/capturing payment intent:", stripeError);
          // Continue with creating new payment below
        }
      }
      
      // Create a payment intent with Stripe
      // If user doesn't have a Stripe customer ID, create one automatically
      if (!placement.user.stripeCustomerId) {
        // Check if user has email address
        if (!placement.user.email) {
          // Try to update the user with an email address
          await getDb().execute(
            sql`UPDATE users SET email = username || '@example.com' WHERE id = ${placement.user.id} AND (email IS NULL OR email = '')`
          );
          
          // Refresh the user data
          placement = await storage.getPlacementWithRelations(id);
          
          // If still no email, we can't proceed
          if (!placement.user.email) {
            return res.status(400).json({ message: "User does not have an email address, cannot create Stripe customer" });
          }
        }
        
        try {
          // Create a new Stripe customer
          const customer = await stripe.customers.create({
            email: placement.user.email,
            name: placement.user.fullName || placement.user.username,
            metadata: {
              userId: placement.user.id.toString()
            }
          });
          
          console.log(`Created Stripe customer for user ${placement.user.id}: ${customer.id}`);
          
          // Update the user with the new customer ID
          const [updatedUser] = await getDb().update(users)
            .set({ stripeCustomerId: customer.id })
            .where(eq(users.id, placement.user.id))
            .returning();
          
          // Update the placement.user with the new customer ID for this transaction
          placement.user.stripeCustomerId = customer.id;
          console.log(`Updated user with Stripe customer ID: ${customer.id}`);
        } catch (stripeError: any) {
          console.error("Failed to create Stripe customer:", stripeError);
          return res.status(400).json({ 
            message: `Failed to create Stripe customer: ${stripeError.message}`, 
            error: stripeError 
          });
        }
      }
      
      try {
        // Create a payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(placement.amount * 100), // Convert to cents
          currency: 'usd',
          customer: placement.user.stripeCustomerId,
          description: `Payment for article in ${placement.publication.name}`,
          metadata: {
            placementId: placement.id.toString(),
            publicationName: placement.publication.name,
            articleTitle: placement.articleTitle || placement.opportunity.title
          },
          confirm: true, // Try to confirm immediately
          off_session: true // Since this is being done by admin, not user
        });
        
        // Update the placement with payment info
        const updatedPlacement = await storage.updatePlacementPayment(
          id,
          paymentIntent.id,
          paymentIntent.id
        );
        
        // Update the status to paid
        const paidPlacement = await storage.updatePlacementStatus(id, 'paid');
        
        res.json({
          success: true,
          placement: paidPlacement,
          paymentIntent: {
            id: paymentIntent.id,
            status: paymentIntent.status
          },
          paymentSource: 'new_intent'
        });
      } catch (stripeError: any) {
        // Update placement to failed status
        await storage.updatePlacementStatus(id, 'failed');
        
        return res.status(400).json({
          message: `Payment failed: ${stripeError.message}`,
          error: stripeError
        });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Failed to process billing: " + error.message });
    }
  });
  
  // Retry failed payment (admin only)
  app.post("/api/admin/placements/:id/retry-billing", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid placement ID" });
      }
      
      // Get the placement
      let placement = await storage.getPlacementWithRelations(id);
      if (!placement) {
        return res.status(404).json({ message: "Placement not found" });
      }
      
      // Check for invalid user reference and fix it automatically
      if (!placement.user) {
        console.log(`Placement ${id} has missing user reference during retry. Fixing automatically...`);
        
        // Find a valid user with email
        const validUsers = await getDb().execute(
          sql`SELECT id, email FROM users WHERE email IS NOT NULL AND email != '' ORDER BY id ASC LIMIT 1`
        );
        if (!validUsers || validUsers.length === 0) {
          return res.status(500).json({ 
            message: "No valid users with email found. Cannot perform billing without a valid user."
          });
        }
        
        const validUserId = (validUsers[0] as any).id;
        
        // Update the placement with a valid user ID
        await getDb().execute(
          sql`UPDATE placements SET "userId" = ${validUserId} WHERE id = ${id}`
        );
        
        console.log(`Fixed placement ${id} during retry: Updated with valid user ID ${validUserId}`);
        
        // Refresh the placement data to get the new user
        placement = await storage.getPlacementWithRelations(id);
        
        if (!placement || !placement.user) {
          return res.status(500).json({ 
            message: "Failed to fix invalid user reference during retry. Please try again or contact support." 
          });
        }
      }
      
      // Check if the placement is in failed status
      if (placement.status !== 'failed') {
        return res.status(400).json({ message: "Only failed payments can be retried" });
      }
      
      // Create a new payment intent with Stripe
      // If user doesn't have a Stripe customer ID, create one automatically
      if (!placement.user.stripeCustomerId) {
        // Check if user has email address
        if (!placement.user.email) {
          // Try to update the user with an email address
          await getDb().execute(
            sql`UPDATE users SET email = username || '@example.com' WHERE id = ${placement.user.id} AND (email IS NULL OR email = '')`
          );
          
          // Refresh the user data
          placement = await storage.getPlacementWithRelations(id);
          
          // If still no email, we can't proceed
          if (!placement.user.email) {
            return res.status(400).json({ message: "User does not have an email address, cannot create Stripe customer" });
          }
        }
        
        try {
          // Create a new Stripe customer
          const customer = await stripe.customers.create({
            email: placement.user.email,
            name: placement.user.fullName || placement.user.username,
            metadata: {
              userId: placement.user.id.toString()
            }
          });
          
          console.log(`Created Stripe customer for user ${placement.user.id}: ${customer.id}`);
          
          // Update the user with the new customer ID
          const [updatedUser] = await getDb().update(users)
            .set({ stripeCustomerId: customer.id })
            .where(eq(users.id, placement.user.id))
            .returning();
          
          // Update the placement.user with the new customer ID for this transaction
          placement.user.stripeCustomerId = customer.id;
          console.log(`Updated user with Stripe customer ID: ${customer.id}`);
        } catch (stripeError: any) {
          console.error("Failed to create Stripe customer:", stripeError);
          return res.status(400).json({ 
            message: `Failed to create Stripe customer: ${stripeError.message}`, 
            error: stripeError 
          });
        }
      }
      
      try {
        // Create a payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(placement.amount * 100), // Convert to cents
          currency: 'usd',
          customer: placement.user.stripeCustomerId,
          description: `Payment for article in ${placement.publication.name}`,
          metadata: {
            placementId: placement.id.toString(),
            publicationName: placement.publication.name,
            articleTitle: placement.articleTitle || placement.opportunity.title
          },
          confirm: true, // Try to confirm immediately
          off_session: true // Since this is being done by admin, not user
        });
        
        // Update the placement with payment info
        const updatedPlacement = await storage.updatePlacementPayment(
          id,
          paymentIntent.id,
          paymentIntent.id
        );
        
        // Update the status to paid
        const paidPlacement = await storage.updatePlacementStatus(id, 'paid');
        
        res.json({
          success: true,
          placement: paidPlacement,
          paymentIntent: {
            id: paymentIntent.id,
            status: paymentIntent.status
          }
        });
      } catch (stripeError: any) {
        return res.status(400).json({
          message: `Retry payment failed: ${stripeError.message}`,
          error: stripeError
        });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Failed to retry billing: " + error.message });
    }
  });
  
  // Fix invalid user IDs in placements (admin only)
  app.post("/api/admin/fix-placement-users", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      // Get all valid users first, prioritizing those with emails for Stripe integration
      const allUsers = await getDb().execute(
        sql`SELECT id, email, username FROM users ORDER BY 
            CASE WHEN email IS NOT NULL AND email != '' THEN 0 ELSE 1 END, 
            id ASC`
      );
      
      if (!allUsers || allUsers.length === 0) {
        return res.status(500).json({ 
          message: "Failed to fix placements - no valid users found in the system" 
        });
      }
      
      // Get the best user to use as default (one with email)
      const defaultUser = allUsers[0];
      
      console.log(`Using default user ID ${defaultUser.id} for fixing placements`);
      
      // Find all placements with invalid user references - using snake_case column names
      const invalidUserPlacements = await getDb().execute(
        sql`SELECT p.id, p."userId" 
            FROM placements p 
            LEFT JOIN users u ON p."userId" = u.id 
            WHERE u.id IS NULL`
      );
      
      // Stripe customer ID functionality removed as requested
      const needsStripeCustomerPlacements = { rows: [] };
      
      // Find all placements with valid users but missing emails - using snake_case column names
      const needsEmailPlacements = await getDb().execute(
        sql`SELECT p.id, p."userId", u.username
            FROM placements p 
            JOIN users u ON p."userId" = u.id 
            WHERE (u.email IS NULL OR u.email = '')`
      );
      
      const results = {
        invalidUsers: {
          count: invalidUserPlacements?.length || 0,
          fixed: 0
        },
        missingEmails: {
          count: needsEmailPlacements?.length || 0, 
          fixed: 0
        },
        missingStripeCustomers: {
          count: needsStripeCustomerPlacements?.length || 0,
          fixed: 0
        },
        errors: 0,
        details: [] as {id: number, type: string, message: string}[]
      };
      
      // Fix invalid user references
      if (invalidUserPlacements && invalidUserPlacements.length > 0) {
        for (const placement of invalidUserPlacements) {
          try {
            await getDb().execute(
              sql`UPDATE placements SET user_id = ${defaultUser.id} WHERE id = ${placement.id}`
            );
            
            results.invalidUsers.fixed++;
            results.details.push({
              id: placement.id,
              type: 'invalid_user_fixed',
              message: `Updated user_id from ${placement.user_id} to ${defaultUser.id}`
            });
          } catch (error: any) {
            results.errors++;
            results.details.push({
              id: placement.id,
              type: 'error',
              message: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }
      
      // Fix missing emails - make sure users have valid emails for Stripe
      if (needsEmailPlacements && needsEmailPlacements.length > 0) {
        for (const placement of needsEmailPlacements) {
          try {
            // Generate a fallback email using username
            await getDb().execute(
              sql`UPDATE users SET email = ${placement.username + '@example.com'} 
                  WHERE id = ${placement.user_id} AND (email IS NULL OR email = '')`
            );
            
            results.missingEmails.fixed++;
            results.details.push({
              id: placement.id,
              type: 'email_fixed',
              message: `Added fallback email for user ${placement.user_id}`
            });
          } catch (error: any) {
            results.errors++;
            results.details.push({
              id: placement.id,
              type: 'error',
              message: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }
      
      // Create Stripe customers for users who need them
      if (needsStripeCustomerPlacements && needsStripeCustomerPlacements.length > 0) {
        for (const placement of needsStripeCustomerPlacements) {
          try {
            // Create a Stripe customer
            const customer = await stripe.customers.create({
              email: placement.email,
              name: placement.username,
              metadata: {
                userId: placement.user_id.toString()
              }
            });
            
            // Update the user with the Stripe customer ID
            await getDb().execute(
              sql`UPDATE users SET "stripeCustomerId" = ${customer.id} WHERE id = ${placement.user_id}`
            );
            
            results.missingStripeCustomers.fixed++;
            results.details.push({
              id: placement.id,
              type: 'stripe_customer_created',
              message: `Created Stripe customer ${customer.id} for user ${placement.user_id}`
            });
          } catch (error: any) {
            results.errors++;
            results.details.push({
              id: placement.id,
              type: 'error',
              message: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }
      
      // Force refresh to clear any cached data
      if (results.invalidUsers.fixed > 0 || results.missingEmails.fixed > 0 || results.missingStripeCustomers.fixed > 0) {
        console.log("Refreshing database cache after fixing placements");
        // This will ensure future queries get fresh data
        await getDb().execute(sql`SELECT 1`);
      }
      
      res.json({
        status: 'success',
        results
      });
    } catch (error: any) {
      console.error("Failed to fix placement user IDs:", error);
      res.status(500).json({ 
        status: 'error',
        message: "Failed to fix placement user IDs", 
        error: error.message 
      });
    }
  });
  
  // Auto-fix middleware completely disabled as requested
  // No more automatic fixing of user references in placements
  // No more toast notifications will appear
  
  // Force sync of successful pitches to placements (admin only)
  // ============ ANNOTATION ENDPOINTS ============
  
  // Get all annotations for a document
  app.get("/api/annotations/:documentId", async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const documentId = req.params.documentId;
      const annotations = await storage.getAnnotations(documentId);
      
      res.json(annotations);
    } catch (error: any) {
      console.error("Error fetching annotations:", error);
      res.status(500).json({ message: "Failed to fetch annotations: " + error.message });
    }
  });
  
  // Create a new annotation
  app.post("/api/annotations", async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { documentId, documentType, content, position, color } = req.body;
      
      if (!documentId || !documentType || !content || !position) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const annotation = await storage.createAnnotation({
        documentId,
        documentType,
        userId: req.user!.id,
        content,
        position,
        color: color || "yellow"
      });
      
      res.status(201).json(annotation);
    } catch (error: any) {
      console.error("Error creating annotation:", error);
      res.status(500).json({ message: "Failed to create annotation: " + error.message });
    }
  });
  
  // Update an annotation
  app.patch("/api/annotations/:id", async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid annotation ID" });
      }
      
      const annotation = await storage.getAnnotation(id);
      if (!annotation) {
        return res.status(404).json({ message: "Annotation not found" });
      }
      
      // Only the creator can update their annotation
      if (annotation.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized: You can only update your own annotations" });
      }
      
      const updatedAnnotation = await storage.updateAnnotation(id, req.body);
      res.json(updatedAnnotation);
    } catch (error: any) {
      console.error("Error updating annotation:", error);
      res.status(500).json({ message: "Failed to update annotation: " + error.message });
    }
  });
  
  // Mark annotation as resolved
  app.post("/api/annotations/:id/resolve", async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid annotation ID" });
      }
      
      const resolvedAnnotation = await storage.resolveAnnotation(id);
      res.json(resolvedAnnotation);
    } catch (error: any) {
      console.error("Error resolving annotation:", error);
      res.status(500).json({ message: "Failed to resolve annotation: " + error.message });
    }
  });
  
  // Get all comments for an annotation
  app.get("/api/annotations/:id/comments", async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid annotation ID" });
      }
      
      const comments = await storage.getAnnotationComments(id);
      res.json(comments);
    } catch (error: any) {
      console.error("Error fetching annotation comments:", error);
      res.status(500).json({ message: "Failed to fetch comments: " + error.message });
    }
  });
  
  // Update a pitch (content only)
  app.patch("/api/pitches/:id", async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid pitch ID" });
      }
      
      const pitch = await storage.getPitch(id);
      if (!pitch) {
        return res.status(404).json({ message: "Pitch not found" });
      }
      
      // Only the creator can update their pitch
      if (pitch.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized: You can only update your own pitches" });
      }
      
      // Allow updates for both 'pending' and 'draft' status pitches
      if (pitch.status !== 'pending' && pitch.status !== 'draft') {
        return res.status(400).json({ 
          message: "Cannot edit pitch: Only pitches with 'pending' or 'draft' status can be edited" 
        });
      }
      
      // Validate that we have content
      if (!req.body.content || typeof req.body.content !== 'string' || req.body.content.trim() === '') {
        return res.status(400).json({ message: "Pitch content cannot be empty" });
      }
      
      console.log(`Updating pitch ${id} content for user ${req.user!.id}. Current status: ${pitch.status}`);
      console.log(`Content length: ${req.body.content.trim().length}`);
      
      // Only update the content field
      const updatedPitch = await storage.updatePitch({
        id: id,
        content: req.body.content.trim()
      });
      
      if (!updatedPitch) {
        return res.status(500).json({ message: "Failed to update pitch - no valid fields to update" });
      }
      
      console.log(`Successfully updated pitch ${id}`);
      res.json(updatedPitch);
    } catch (error: any) {
      console.error("Error updating pitch:", error);
      res.status(500).json({ message: "Failed to update pitch: " + error.message });
    }
  });
  
  // Submit a pitch (change status from pending to sent)
  app.patch("/api/pitches/:id/submit", async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid pitch ID" });
      }
      
      const pitch = await storage.getPitch(id);
      if (!pitch) {
        return res.status(404).json({ message: "Pitch not found" });
      }
      
      // Only the creator can submit their pitch
      if (pitch.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized: You can only submit your own pitches" });
      }
      
      // Allow submission for both 'pending' and 'draft' statuses
      if (pitch.status !== 'pending' && pitch.status !== 'draft') {
        return res.status(400).json({ 
          message: "Cannot submit pitch: Only pitches with 'pending' or 'draft' status can be submitted" 
        });
      }
      
      // Update the status to 'sent' (updatePitchStatus will also set isDraft to false)
      const updatedPitch = await storage.updatePitchStatus(id, 'sent');
      
      console.log(`Pitch ${id} submitted successfully. Status updated from ${pitch.status} to 'sent', isDraft set to false`);
      res.json(updatedPitch);
    } catch (error: any) {
      console.error("Error submitting pitch:", error);
      res.status(500).json({ message: "Failed to submit pitch: " + error.message });
    }
  });
  
  // ============ ADMIN BILLING ENDPOINTS ============
  
  // Helper function to check if a user is an admin
  function isAdmin(req: Request): boolean {
    return isRequestAuthenticated(req) && req.user && 'role' in req.user && req.user.role === 'admin';
  }
  
  // Get all pitches with payment information for admin billing
  app.get("/api/admin/billing/pitches", async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req) || !isAdmin(req)) {
        return res.status(401).json({ message: "Admin authentication required" });
      }
      
      // Get all pitches with their relations
      const pitches = await storage.getAllPitchesWithRelations();
      
      // Filter and format the pitches for billing
      const billingPitches = pitches
        .filter(pitch => pitch.status === 'successful') // Only successful pitches are billable
        .map(pitch => ({
          id: pitch.id,
          userId: pitch.userId,
          opportunityId: pitch.opportunityId,
          paymentIntentId: pitch.paymentIntentId,
          bidAmount: pitch.bidAmount,
          authorizationExpiresAt: pitch.authorizationExpiresAt,
          billedAt: pitch.billedAt,
          stripeChargeId: pitch.stripeChargeId,
          billingError: pitch.billingError,
          status: pitch.status,
          createdAt: pitch.createdAt,
          user: {
            id: pitch.user.id,
            username: pitch.user.username,
            fullName: pitch.user.fullName,
            email: pitch.user.email,
            stripeCustomerId: pitch.user.stripeCustomerId
          },
          opportunity: {
            id: pitch.opportunity.id,
            title: pitch.opportunity.title,
            publication: pitch.publication ? {
              id: pitch.publication.id,
              name: pitch.publication.name
            } : null
          }
        }));
      
      res.json(billingPitches);
    } catch (error: any) {
      console.error("Error fetching billing pitches:", error);
      res.status(500).json({ message: "Failed to fetch billing data: " + error.message });
    }
  });
  
  // Get payment intent details for a specific pitch
  app.get("/api/admin/billing/pitch/:id/payment", async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req) || !isAdmin(req)) {
        return res.status(401).json({ message: "Admin authentication required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid pitch ID" });
      }
      
      // Get the pitch with payment intent ID
      const pitch = await storage.getPitchWithRelations(id);
      if (!pitch) {
        return res.status(404).json({ message: "Pitch not found" });
      }
      
      if (!pitch.paymentIntentId) {
        return res.status(400).json({ message: "No payment intent associated with this pitch" });
      }
      
      // Get the payment intent details from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(pitch.paymentIntentId);
      
      res.json({
        pitchId: pitch.id,
        paymentIntentId: pitch.paymentIntentId,
        paymentIntent: {
          id: paymentIntent.id,
          amount: paymentIntent.amount / 100, // Convert from cents to dollars
          status: paymentIntent.status,
          capture_method: paymentIntent.capture_method,
          created: new Date(paymentIntent.created * 1000),
          customer: paymentIntent.customer,
          payment_method: paymentIntent.payment_method,
          // Include any additional important payment intent details
          charges: paymentIntent.charges?.data || []
        }
      });
    } catch (error: any) {
      console.error("Error fetching payment intent:", error);
      res.status(500).json({ message: "Failed to fetch payment details: " + error.message });
    }
  });
  
  // Capture payment for a pitch (charge the customer)
  app.post("/api/admin/billing/pitch/:id/capture", async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req) || !isAdmin(req)) {
        return res.status(401).json({ message: "Admin authentication required" });
      }
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid pitch ID" });
      }
      
      // Get the pitch
      const pitch = await storage.getPitchWithRelations(id);
      if (!pitch) {
        return res.status(404).json({ message: "Pitch not found" });
      }
      
      if (!pitch.paymentIntentId) {
        return res.status(400).json({ message: "No payment intent associated with this pitch" });
      }
      
      // Check if it's already been captured
      if (pitch.billedAt) {
        return res.status(400).json({ message: "Payment has already been captured" });
      }
      
      try {
        // Capture the payment intent
        const paymentIntent = await stripe.paymentIntents.capture(pitch.paymentIntentId);
        
        // Update the pitch with billing info
        const updatedPitch = await storage.updatePitchBillingInfo(
          pitch.id,
          paymentIntent.id, // Using payment intent ID as charge ID for now
          new Date()
        );
        
        res.json({
          success: true,
          message: "Payment captured successfully",
          pitch: updatedPitch,
          paymentIntent: {
            id: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            status: paymentIntent.status
          }
        });
      } catch (error: any) {
        // Record the error but don't fail the request
        const errorMessage = error instanceof Error ? error.message : 'Unknown error capturing payment';
        await storage.updatePitchBillingError(pitch.id, errorMessage);
        
        throw error;
      }
    } catch (error: any) {
      console.error("Error capturing payment:", error);
      res.status(500).json({ message: "Failed to capture payment: " + error.message });
    }
  });
  
  // Add comment to an annotation
  app.post("/api/annotations/:id/comments", async (req: Request, res: Response) => {
    try {
      if (!isRequestAuthenticated(req)) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const annotationId = parseInt(req.params.id);
      if (isNaN(annotationId)) {
        return res.status(400).json({ message: "Invalid annotation ID" });
      }
      
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Comment content is required" });
      }
      
      const comment = await storage.createAnnotationComment({
        annotationId,
        userId: req.user!.id,
        content
      });
      
      res.status(201).json(comment);
    } catch (error: any) {
      console.error("Error adding comment:", error);
      res.status(500).json({ message: "Failed to add comment: " + error.message });
    }
  });

  app.post("/api/admin/sync-placements", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      // Get all pitches
      const allPitches = await storage.getAllPitches();
      
      // Filter for successful pitches
      const successfulPitches = allPitches.filter(pitch => 
        pitch.status === 'successful' || pitch.status === 'Successful Coverage'
      );
      
      // Get all valid users for reference
      const allUsers = await storage.getAllUsers();
      const defaultUser = allUsers.length > 0 ? allUsers[0] : null;
      
      if (!defaultUser) {
        return res.status(500).json({ 
          message: "Failed to sync pitches to placements - no valid users found in the system" 
        });
      }
      
      type ResultDetail = {
        pitchId: number;
        status: string;
        placementId?: number;
        message?: string;
      };
      
      const results = {
        totalSuccessfulPitches: successfulPitches.length,
        existingPlacements: 0,
        newPlacements: 0,
        errors: 0,
        details: [] as ResultDetail[]
      };
      
      // For each successful pitch, check if there's a placement
      for (const pitch of successfulPitches) {
        try {
          // Check if there's already a placement for this pitch
          const placements = await storage.getAllPlacements();
          const existingPlacement = placements.find(p => p.pitchId === pitch.id);
          
          if (!existingPlacement) {
            // Get the opportunity to get publication ID
            const opportunity = await storage.getOpportunity(pitch.opportunityId);
            if (!opportunity) {
              results.errors++;
              results.details.push({
                pitchId: pitch.id,
                status: 'error',
                message: 'Associated opportunity not found'
              });
              continue;
            }
            
            // Get highest bid amount
            const highestBid = await storage.getHighestBidForOpportunity(opportunity.id);
            
            // Verify the user ID is valid
            let validUserId = pitch.userId;
            const user = await storage.getUser(pitch.userId);
            
            if (!user) {
              console.log(`User ID ${pitch.userId} not found for pitch ${pitch.id}. Using default user ID ${defaultUser.id}`);
              validUserId = defaultUser.id;
            } else if (!user.stripeCustomerId && user.email) {
              try {
                // Create a new Stripe customer
                const customer = await stripe.customers.create({
                  email: user.email,
                  name: user.fullName || user.username,
                  metadata: {
                    userId: user.id.toString()
                  }
                });
                
                console.log(`Created Stripe customer for user ${user.id}: ${customer.id}`);
                
                // Update the user with the new customer ID
                await getDb().update(users)
                  .set({ stripeCustomerId: customer.id })
                  .where(eq(users.id, user.id));
              } catch (stripeError: any) {
                console.error(`Failed to create Stripe customer for user ${user.id}:`, stripeError);
                // Continue anyway, we'll try again during billing
              }
            }
            
            // Create a placement with valid user ID
            const placement = await storage.createPlacement({
              pitchId: pitch.id,
              userId: validUserId,
              opportunityId: pitch.opportunityId,
              publicationId: opportunity.publicationId,
              amount: highestBid || 0, // Default to 0 if no bids
              articleTitle: opportunity.title,
              articleUrl: '',
              status: 'ready_for_billing'
            });
            
            results.newPlacements++;
            results.details.push({
              pitchId: pitch.id,
              status: 'created',
              placementId: placement.id
            });
          } else {
            results.existingPlacements++;
            results.details.push({
              pitchId: pitch.id,
              status: 'exists',
              placementId: existingPlacement.id
            });
          }
        } catch (error: any) {
          results.errors++;
          results.details.push({
            pitchId: pitch.id,
            status: 'error',
            message: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ 
        message: "Failed to sync pitches to placements", 
        error: error.message 
      });
    }
  });

  // Get billing details for a placement (admin only)
  app.get("/api/admin/billing/:placementId", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const placementId = parseInt(req.params.placementId);
      if (isNaN(placementId)) {
        return res.status(400).json({ message: "Invalid placement ID" });
      }
      
      // Get the placement with relations
      const placement = await storage.getPlacementWithRelations(placementId);
      if (!placement) {
        return res.status(404).json({ message: "Placement not found" });
      }
      
      // SINGLE SOURCE OF TRUTH: Get the pitch row that generated the placement
      // and use its payment intent ID as the single source of truth
      const pitch = await storage.getPitch(placement.pitchId);
      
      if (!pitch?.paymentIntentId) {
        console.log(`No payment intent found for pitch ${placement.pitchId} associated with placement ${placementId}`);
        return res.status(400).json({ 
          message: "No payment intent found for this placement",
          placement,
          error: "missing_payment_intent"
        });
      }
      
      console.log(`Retrieving PI ${pitch.paymentIntentId} for placement ${placementId}`);
      
      // We've already verified that pitch.paymentIntentId exists above, so it's safe to use as string
      const paymentIntentId = pitch.paymentIntentId as string;
      
      // Get the payment intent from Stripe
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        // Calculate Stripe fee (typically 2.9% + 30 cents for US cards)
        const amount = paymentIntent.amount / 100; // Convert from cents to dollars
        const stripeFee = ((amount * 0.029) + 0.30).toFixed(2);
        const netAmount = (amount - parseFloat(stripeFee)).toFixed(2);
        
        // Get card details if available
        let lastFour = null;
        let cardBrand = null;
        
        if (paymentIntent.charges && paymentIntent.charges.data && paymentIntent.charges.data.length > 0) {
          const charge = paymentIntent.charges.data[0];
          if (charge.payment_method_details && charge.payment_method_details.card) {
            lastFour = charge.payment_method_details.card.last4;
            cardBrand = charge.payment_method_details.card.brand;
          }
        }
        
        // Check if the payment intent is still valid for capture
        const isExpired = paymentIntent.status !== 'requires_capture';
        
        return res.json({
          placement,
          pitch,
          paymentIntent: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount,
            stripeFee,
            netAmount,
            lastFour,
            cardBrand,
            isExpired,
            isReadyForCapture: paymentIntent.status === 'requires_capture'
          }
        });
      } catch (err: any) {
        console.error("Error getting billing details:", err);
        
        // Handle Stripe resource_missing errors with a specific status code
        if (err?.code === 'resource_missing' || (err?.raw && err?.raw.code === 'resource_missing')) {
          return res.status(409).json({ 
            message: 'payment_intent_not_found_in_stripe', 
            pitchId: pitch.id,
            error: {
              code: 'resource_missing',
              message: err.message
            }
          });
        }
        
        // For other errors
        return res.status(500).json({ message: "Failed to get billing details: " + err.message });
      }
    } catch (error: any) {
      // Handle any other unexpected errors
      console.error("Unexpected error getting billing details:", error);
      return res.status(500).json({ message: "An unexpected error occurred: " + error.message });
    }
  });
  
  // Capture payment for a placement (admin only)
  app.post("/api/admin/billing/capture", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { placementId } = req.body;
      
      if (!placementId) {
        return res.status(400).json({ message: "Placement ID is required" });
      }
      
      // Get the placement
      const placement = await storage.getPlacementWithRelations(placementId);
      if (!placement) {
        return res.status(404).json({ message: "Placement not found" });
      }
      
      // SINGLE SOURCE OF TRUTH: Get the pitch row that generated the placement
      // and use its payment intent ID as the single source of truth
      const pitch = await storage.getPitch(placement.pitchId);
      
      if (!pitch?.paymentIntentId) {
        console.log(`No payment intent found for pitch ${placement.pitchId} associated with placement ${placementId}`);
        return res.status(400).json({ 
          message: "No payment intent found for this placement",
          error: "missing_payment_intent"
        });
      }
      
      console.log(`Using PI ${pitch.paymentIntentId} for placement ${placementId} capture`);
      
      // Check if the placement is ready for billing
      if (placement.status !== 'ready_for_billing') {
        return res.status(400).json({ 
          message: `Placement is not ready for billing. Current status: ${placement.status}` 
        });
      }
      
      // We've already verified that pitch.paymentIntentId exists above, so it's safe to use as string
      const paymentIntentId = pitch.paymentIntentId as string;
      
      // Get the payment intent from Stripe using the pitch's payment intent ID and capture it
      let capturedPayment;
      let paymentIntent;
      
      try {
        // First retrieve the payment intent
        paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        // Check if it's ready for capture
        if (paymentIntent.status !== 'requires_capture') {
          return res.status(400).json({ 
            message: `Payment cannot be captured. Current status: ${paymentIntent.status}`,
            paymentIntentStatus: paymentIntent.status
          });
        }
        
        // Then capture the payment
        capturedPayment = await stripe.paymentIntents.capture(paymentIntentId);
        
        // Update the placement status to paid
        const updatedPlacement = await storage.updatePlacementStatus(placementId, 'paid');
        
        // Calculate net amount
        const amount = capturedPayment.amount / 100; // Convert from cents to dollars
        const stripeFee = ((amount * 0.029) + 0.30).toFixed(2);
        const netAmount = (amount - parseFloat(stripeFee)).toFixed(2);
        
        // Log the successful capture for verification
        console.log(`Successfully captured payment intent ${paymentIntentId} for placement ${placementId}`);
        
        // Create notification for successful payment
        try {
          const placement = await storage.getPlacementWithRelations(placementId);
          if (placement && placement.user) {
            const opportunityTitle = placement.opportunity?.title || 'Unknown Opportunity';
            
            await notificationService.createNotification({
              userId: placement.user.id,
              type: 'payment',
              title: '💳 Payment Processed Successfully!',
              message: `Your payment of $${amount} for "${opportunityTitle}" has been processed successfully.`,
              linkUrl: '/account?refresh=media',
              relatedId: placementId,
              relatedType: 'placement',
              icon: 'credit-card',
              iconColor: 'green',
            });
            
            console.log(`Created payment success notification for user ${placement.user.id} for placement ${placementId}`);
          }
        } catch (notificationError) {
          console.error('Error creating payment success notification:', notificationError);
          // Don't fail the request if notification creation fails
        }
        
        // Send success response
        return res.json({
          success: true,
          placement: updatedPlacement,
          paymentIntent: {
            id: capturedPayment.id,
            status: capturedPayment.status,
            amount,
            stripeFee,
            netAmount
          }
        });
        
      } catch (err: any) {
        // Handle Stripe resource_missing errors with a specific status code
        if (err?.code === 'resource_missing' || (err?.raw && err?.raw.code === 'resource_missing')) {
          return res.status(409).json({ 
            message: 'payment_intent_not_found_in_stripe', 
            pitchId: pitch.id,
            error: {
              code: 'resource_missing',
              message: err.message
            }
          });
        }
        
        // For other errors, re-throw to be caught by the outer try/catch
        throw err;
      }
      
    } catch (error: any) {
      console.error("Error capturing payment:", error);
      res.status(500).json({ message: "Failed to capture payment: " + error.message });
    }
  });

  // Send notification for a placement (admin only)
  app.post("/api/admin/placements/:id/notify", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid placement ID" });
      }
      
      // Get the placement
      const placement = await storage.getPlacementWithRelations(id);
      if (!placement) {
        return res.status(404).json({ message: "Placement not found" });
      }
      
      // Check if the notification was already sent
      if (placement.notificationSent) {
        return res.status(400).json({ message: "Notification already sent for this placement" });
      }
      
      // Check if the placement is paid
      if (placement.status !== 'paid') {
        return res.status(400).json({ message: "Only paid placements can send notifications" });
      }
      
      // Send email notification with Resend
      if (!resend) {
        return res.status(500).json({ message: "Resend API key not configured" });
      }
      
      try {
        // Send the email
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'QuoteBid <noreply@quotebid.com>',
          to: [placement.user.email],
          subject: `🎉 Your Expertise Was Featured in ${placement.publication.name}!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
                <h1 style="color: #4a5568; margin: 0;">QuoteBid</h1>
              </div>
              <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
                <p style="font-size: 16px;">Congrats ${placement.user.fullName.split(' ')[0]}!</p>
                
                <p style="font-size: 16px; margin-top: 20px;">Your bid of $${placement.amount.toLocaleString()} secured your spot in this breaking story:</p>
                
                <p style="font-size: 16px; margin-top: 10px;">→ ${placement.articleTitle || placement.opportunity.title} – ${placement.publication.name}</p>
                
                ${placement.articleUrl ? `<p style="font-size: 16px; margin-top: 10px;">→ <a href="${placement.articleUrl}" style="color: #4a5568;">${placement.articleUrl}</a></p>` : ''}
                
                <p style="font-size: 16px; margin-top: 20px;">A receipt for $${placement.amount.toLocaleString()} has been charged to your card on file.</p>
                
                <p style="font-size: 16px; margin-top: 10px;">Thank you for trusting our marketplace!</p>
                
                <div style="margin-top: 30px; text-align: center;">
                  <p style="font-size: 14px; color: #718096;">QuoteBid - Connect with top publications</p>
                </div>
              </div>
            </div>
          `
        });
        
        // Update the placement notification status
        const updatedPlacement = await storage.updatePlacementNotification(id, true);
        
        res.json({
          success: true,
          placement: updatedPlacement,
          message: "Notification sent successfully"
        });
      } catch (emailError: any) {
        return res.status(400).json({
          message: `Failed to send notification: ${emailError.message}`,
          error: emailError
        });
      }
      
    } catch (error: any) {
      res.status(500).json({ message: "Failed to send notification: " + error.message });
    }
  });

  // Function to ensure all successful pitches have placements
  const syncSuccessfulPitchesToPlacements = async () => {
    try {
      console.log("Checking for successful pitches without placements...");
      
      // Get all pitches
      const allPitches = await storage.getAllPitches();
      
      // Filter for successful pitches
      const successfulPitches = allPitches.filter(pitch => 
        pitch.status === 'successful' || pitch.status === 'Successful Coverage'
      );
      
      console.log(`Found ${successfulPitches.length} successful pitches`);
      
      // Get all valid users for reference
      const allUsers = await storage.getAllUsers();
      const defaultUser = allUsers.length > 0 ? allUsers[0] : null;
      
      if (!defaultUser) {
        console.error("No valid users found in the system. Skipping sync.");
        return;
      }
      
      // For each successful pitch, check if there's a placement
      for (const pitch of successfulPitches) {
        // Check if there's already a placement for this pitch
        const placements = await storage.getAllPlacements();
        const existingPlacement = placements.find(p => p.pitchId === pitch.id);
        
        if (!existingPlacement) {
          console.log(`Creating placement for pitch ID ${pitch.id}`);
          
          // Get the opportunity to get publication ID
          const opportunity = await storage.getOpportunity(pitch.opportunityId);
          if (!opportunity) {
            console.error(`Associated opportunity not found for pitch ID ${pitch.id}`);
            continue;
          }
          
          // Get highest bid amount
          const highestBid = await storage.getHighestBidForOpportunity(opportunity.id);
          
          // Verify the user ID is valid
          let validUserId = pitch.userId;
          const user = await storage.getUser(pitch.userId);
          
          if (!user) {
            console.log(`User ID ${pitch.userId} not found for pitch ${pitch.id}. Using default user ID ${defaultUser.id}`);
            validUserId = defaultUser.id;
          } else if (!user.stripeCustomerId && user.email) {
            try {
              // Create a new Stripe customer
              const customer = await stripe.customers.create({
                email: user.email,
                name: user.fullName || user.username,
                metadata: {
                  userId: user.id.toString()
                }
              });
              
              console.log(`Created Stripe customer for user ${user.id}: ${customer.id}`);
              
              // Update the user with the new customer ID
              await getDb().update(users)
                .set({ stripeCustomerId: customer.id })
                .where(eq(users.id, user.id));
            } catch (stripeError: any) {
              console.error(`Failed to create Stripe customer for user ${user.id}:`, stripeError);
              // Continue anyway, we'll try again during billing
            }
          }
          
          // Create a placement with valid user ID and payment intent ID
          await storage.createPlacement({
            pitchId: pitch.id,
            userId: validUserId,
            opportunityId: pitch.opportunityId,
            publicationId: opportunity.publicationId,
            amount: highestBid || 0, // Default to 0 if no bids
            articleTitle: opportunity.title,
            articleUrl: '',
            status: 'ready_for_billing',
            // Include the payment intent ID from the pitch (if exists)
            paymentIntentId: pitch.paymentIntentId ? pitch.paymentIntentId.toString() : undefined
          });
          
          console.log(`Placement created for pitch ID ${pitch.id}`);
        } else {
          console.log(`Placement already exists for pitch ID ${pitch.id}`);
        }
      }
      
      console.log("Placement sync completed");
    } catch (error: any) {
      console.error("Error syncing placements:", error);
    }
  };
  
  // Run the sync on server startup
  syncSuccessfulPitchesToPlacements();

  const httpServer = createServer(app);
  
  // ============ STRIPE WEBHOOK HANDLER ============
  
  // This is your Stripe webhook secret for testing your endpoint locally.
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    
    let event;
    
    try {
      // Verify webhook signature
      if (endpointSecret && sig) {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } else {
        // Fall back to parsing the request body if signature verification is not available
        event = JSON.parse(req.body.toString());
      }
    } catch (err: any) {
      console.log(`⚠️ Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        // Handle successful payment intent (for subscription first payment)
        const paymentIntent = event.data.object;
        
        // Check if this is related to a subscription
        if (paymentIntent.invoice) {
          try {
            // Retrieve the invoice to get subscription details
            const invoice = await stripe.invoices.retrieve(paymentIntent.invoice as string);
            const subscriptionId = invoice.subscription;
            const customerId = invoice.customer;
            
            if (subscriptionId && customerId) {
              // Find user with this customer ID
              const [user] = await getDb().select()
                .from(users)
                .where(eq(users.stripeCustomerId, customerId as string));
                
              if (user) {
                // Get subscription details
                const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
                const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);
                
                // Update user with active subscription
                await getDb().update(users)
                  .set({
                    stripeSubscriptionId: subscriptionId as string,
                    subscription_status: 'active',
                    premiumStatus: 'active',
                    premiumExpiry: currentPeriodEnd,
                    hasCompletedPayment: true
                  })
                  .where(eq(users.id, user.id));
                  
                console.log(`✅ Payment succeeded for user ${user.id}, subscription ${subscriptionId} activated`);
              }
            }
          } catch (error: any) {
            console.error(`Failed to process payment intent success:`, error);
          }
        }
        break;
      }
      
      case 'checkout.session.completed': {
        // Payment is successful and the subscription is created
        const session = event.data.object;
        
        // Extract user ID from metadata
        const userId = session.metadata?.userId ? parseInt(session.metadata.userId) : null;
        if (!userId) {
          console.log(`⚠️ No user ID in session metadata:`, session.id);
          break;
        }
        
        // Update the user record
        try {
          // Get subscription ID from session
          const subscriptionId = session.subscription;
          if (subscriptionId) {
            // Fetch the subscription to get details
            const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
            
            // Determine when subscription will end (for billing period)
            const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);
            
            // Update user with subscription information
            await getDb().update(users)
              .set({
                stripeSubscriptionId: subscriptionId as string,
                premiumStatus: 'active',
                premiumExpiry: currentPeriodEnd
              })
              .where(eq(users.id, userId));
              
            console.log(`✅ Updated user ${userId} with subscription ${subscriptionId}`);
          }
        } catch (error: any) {
          console.error(`Failed to update user after checkout completion:`, error);
        }
        break;
      }
      
      case 'invoice.paid': {
        // Continue access to the subscription
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        const customerId = invoice.customer;
        
        if (subscriptionId && customerId) {
          try {
            // Find user with this customer ID
            const [user] = await getDb().select()
              .from(users)
              .where(eq(users.stripeCustomerId, customerId as string));
              
            if (user) {
              // Get subscription details to update expiry
              const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
              const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);
              
              // Update user status
              await getDb().update(users)
                .set({
                  premiumStatus: 'active',
                  premiumExpiry: currentPeriodEnd
                })
                .where(eq(users.id, user.id));
                
              console.log(`✅ User ${user.id} subscription renewed until ${currentPeriodEnd}`);
            }
          } catch (error: any) {
            console.error(`Failed to process invoice payment:`, error);
          }
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        // The payment failed or the customer does not have a valid payment method
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        const customerId = invoice.customer;
        
        if (subscriptionId && customerId) {
          try {
            // Find user with this customer ID
            const [user] = await getDb().select()
              .from(users)
              .where(eq(users.stripeCustomerId, customerId as string));
              
            if (user) {
              // Update user status
              await getDb().update(users)
                .set({
                  premiumStatus: 'payment_failed'
                })
                .where(eq(users.id, user.id));
                
              console.log(`⚠️ User ${user.id} payment failed for subscription ${subscriptionId}`);
            }
          } catch (error: any) {
            console.error(`Failed to process payment failure:`, error);
          }
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        // Subscription canceled or expired
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        if (customerId) {
          try {
            // Find user with this customer ID
            const [user] = await getDb().select()
              .from(users)
              .where(eq(users.stripeCustomerId, customerId as string));
              
            if (user) {
              // Update user status
              await getDb().update(users)
                .set({
                  premiumStatus: 'canceled',
                  premiumExpiry: new Date() // Set to current date (expired)
                })
                .where(eq(users.id, user.id));
                
              console.log(`❌ User ${user.id} subscription canceled`);
            }
          } catch (error: any) {
            console.error(`Failed to process subscription deletion:`, error);
          }
        }
        break;
      }
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    // Return a 200 response to acknowledge receipt of the event
    res.json({received: true});
  });
  
  // Setup WebSocket server for real-time collaboration
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store clients with their associated document
  const clients = new Map<WebSocket, { userId: number; documentId: string }>();
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        
        // Handle different message types
        switch (data.type) {
          case 'join':
            // User joins a document for collaboration
            if (data.userId && data.documentId) {
              clients.set(ws, { userId: data.userId, documentId: data.documentId });
              console.log(`User ${data.userId} joined document ${data.documentId}`);
              
              // Fetch existing annotations for this document
              const annotations = await storage.getAnnotations(data.documentId);
              
              // Send existing annotations to the newly connected client
              ws.send(JSON.stringify({
                type: 'init',
                annotations
              }));
            }
            break;
            
          case 'create-annotation':
            // User creates a new annotation
            if (data.annotation) {
              // Save the annotation to the database
              const newAnnotation = await storage.createAnnotation(data.annotation);
              
              // Broadcast the new annotation to all clients viewing the same document
              const annotationData = {
                type: 'new-annotation',
                annotation: newAnnotation
              };
              
              // Broadcast to all clients viewing the same document
              for (const [client, clientData] of Array.from(clients.entries())) {
                if (clientData.documentId === data.annotation.documentId && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify(annotationData));
                }
              }
            }
            break;
            
          case 'update-annotation':
            // User updates an existing annotation
            if (data.annotation && data.annotation.id) {
              // Update the annotation in the database
              const updatedAnnotation = await storage.updateAnnotation(data.annotation.id, data.annotation);
              
              // Broadcast the update to all clients viewing the same document
              const updateData = {
                type: 'update-annotation',
                annotation: updatedAnnotation
              };
              
              // Broadcast to all clients viewing the same document
              for (const [client, clientData] of Array.from(clients.entries())) {
                if (clientData.documentId === data.annotation.documentId && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify(updateData));
                }
              }
            }
            break;
            
          case 'add-comment':
            // User adds a comment to an annotation
            if (data.comment) {
              // Save the comment to the database
              const newComment = await storage.createAnnotationComment(data.comment);
              
              // Get the annotation to find its document
              const annotation = await storage.getAnnotation(data.comment.annotationId);
              
              if (annotation) {
                // Broadcast the new comment to all clients viewing the same document
                const commentData = {
                  type: 'new-comment',
                  comment: newComment,
                  annotationId: data.comment.annotationId
                };
                
                // Broadcast to all clients viewing the same document
                for (const [client, clientData] of Array.from(clients.entries())) {
                  if (clientData.documentId === annotation.documentId && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(commentData));
                  }
                }
              }
            }
            break;
            
          case 'resolve-annotation':
            // User resolves an annotation
            if (data.annotationId) {
              // Update the annotation in the database
              const resolvedAnnotation = await storage.resolveAnnotation(data.annotationId);
              
              // Broadcast the resolution to all clients viewing the same document
              const resolveData = {
                type: 'resolve-annotation',
                annotationId: data.annotationId,
                resolved: true
              };
              
              // Broadcast to all clients viewing the same document
              for (const [client, clientData] of Array.from(clients.entries())) {
                if (clientData.documentId === resolvedAnnotation.documentId && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify(resolveData));
                }
              }
            }
            break;
        }
      } catch (error: any) {
        console.error('Error handling WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      // Remove client from the clients map
      clients.delete(ws);
      console.log('WebSocket client disconnected');
    });
  });
  
  // Register /api/user route here
  app.get("/api/user", jwtAuth, ensureAuth, (req, res) => {
    console.log('[/api/user] Authorization header:', req.headers['authorization']);
    console.log('[/api/user] req.user:', req.user);
    // Return user without password
    const { password, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
  });
  
  // Debug endpoint to check pitch data integrity
  app.get("/api/admin/debug/pitch-users", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      // Get all pitches
      const allPitches = await storage.getAllPitches();
      
      // Get all users
      const allUsers = await storage.getAllUsers();
      
      // Create a map of user IDs for quick lookup
      const userMap = new Map(allUsers.map(u => [u.id, u]));
      
      // Check each pitch
      const pitchUserAnalysis = allPitches.map(pitch => {
        const userId = pitch.userId || (pitch as any).user_id;
        const userExists = userMap.has(userId);
        const user = userMap.get(userId);
        
        return {
          pitchId: pitch.id,
          userId: userId,
          userExists: userExists,
          userName: user?.fullName || user?.username || 'N/A',
          userEmail: user?.email || 'N/A',
          opportunityId: pitch.opportunityId
        };
      });
      
      // Find pitches with missing users
      const pitchesWithMissingUsers = pitchUserAnalysis.filter(p => !p.userExists);
      
      res.json({
        totalPitches: allPitches.length,
        totalUsers: allUsers.length,
        pitchesWithMissingUsers: pitchesWithMissingUsers.length,
        missingUserDetails: pitchesWithMissingUsers,
        samplePitchAnalysis: pitchUserAnalysis.slice(0, 5) // Show first 5 for debugging
      });
    } catch (error: any) {
      console.error("Error in debug endpoint:", error);
      res.status(500).json({ message: "Error analyzing pitch users", error: error.message });
    }
  });
  
  // Admin API to get all opportunities with publications

  // Admin API to get all opportunities with publications and pitches
  app.get("/api/admin/opportunities-with-pitches", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const opportunities = await storage.getOpportunitiesWithPitches();
      res.json(opportunities);
    } catch (error: any) {
      console.error('Error fetching admin opportunities with pitches:', error);
      res.status(500).json({ message: 'Failed to fetch opportunities with pitches', error: error });
    }
  });
  
  // TEMPORARY: Create admin user for testing (remove in production)
  app.post("/api/admin/create-test-admin", async (req: Request, res: Response) => {
    try {
      // Import necessary modules
      const { scrypt, randomBytes } = await import("crypto");
      const { promisify } = await import("util");
      const scryptAsync = promisify(scrypt);
      
      async function hashPassword(password: string) {
        const salt = randomBytes(16).toString("hex");
        const buf = (await scryptAsync(password, salt, 64)) as Buffer;
        return `${buf.toString("hex")}.${salt}`;
      }
      
      const adminData = {
        username: "admin",
        password: await hashPassword("admin123"),
        email: "admin@rubicon.com",
        fullName: "Admin User",
        role: "admin"
      };
      
      // Delete any existing admin user with the same username
      const { adminUsers } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      await getDb().delete(adminUsers).where(eq(adminUsers.username, "admin"));
      
      // Create the admin user
      const newAdmin = await storage.createAdminUser(adminData);
      
      const { password, ...adminWithoutPassword } = newAdmin;
      
      res.json({
        success: true,
        message: "Test admin created successfully",
        admin: adminWithoutPassword,
        credentials: {
          username: "admin",
          password: "admin123"
        }
      });
    } catch (error: any) {
      console.error("Error creating test admin:", error);
      res.status(500).json({ message: "Failed to create test admin", error: error.message });
    }
  });
  
  // Get customer payment methods
  app.get("/api/users/:userId/payment-methods", jwtAuth, async (req: Request, res: Response) => {
    console.log("💳 PAYMENT METHODS ENDPOINT HIT");
    console.log("📝 Request params:", req.params);
    console.log("👤 User from JWT:", req.user ? { id: req.user!.id, email: req.user!.email } : 'NO USER');
    
    try {
      if (!req.user || !req.user!.id) {
        console.log("❌ Authentication failed - no user");
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userId = parseInt(req.params.userId);
      console.log("🔢 Parsed userId:", userId, "JWT user ID:", req.user!.id);
      
      if (isNaN(userId) || userId !== req.user!.id) {
        console.log("❌ Unauthorized access attempt");
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Get user from database
      const user = await getDb().select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (user.length === 0) {
        console.log("❌ User not found in database");
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = user[0];
      console.log("👤 User found:", {
        id: userData.id,
        email: userData.email,
        stripeCustomerId: userData.stripeCustomerId
      });

      if (!userData.stripeCustomerId) {
        console.log("❌ No Stripe customer ID found");
        return res.json({
          hasPaymentMethods: false,
          paymentMethods: [],
          defaultPaymentMethod: null
        });
      }

      try {
        console.log("📞 Retrieving Stripe customer:", userData.stripeCustomerId);
        
        // Get customer with payment methods
        const customer = await stripe.customers.retrieve(userData.stripeCustomerId, {
          expand: ['invoice_settings.default_payment_method']
        });
        
        console.log("👤 Customer retrieved:", {
          id: customer.id,
          email: (customer as any).email,
          hasDefaultPaymentMethod: !!(customer as any).invoice_settings?.default_payment_method
        });

        // Get all payment methods for the customer
        const paymentMethods = await stripe.paymentMethods.list({
          customer: userData.stripeCustomerId,
          type: 'card',
        });

        console.log("💳 Found payment methods:", paymentMethods.data.length);

        const formattedPaymentMethods = paymentMethods.data.map(pm => ({
          id: pm.id,
          brand: pm.card?.brand || 'unknown',
          last4: pm.card?.last4 || '0000',
          exp_month: pm.card?.exp_month || 0,
          exp_year: pm.card?.exp_year || 0
        }));

        // Find the default payment method
        const defaultPaymentMethod = (customer as any).invoice_settings?.default_payment_method;
        let formattedDefaultPaymentMethod = null;

        if (defaultPaymentMethod) {
          const defaultPm = paymentMethods.data.find(pm => pm.id === defaultPaymentMethod.id);
          if (defaultPm) {
            formattedDefaultPaymentMethod = {
              id: defaultPm.id,
              brand: defaultPm.card?.brand || 'unknown',
              last4: defaultPm.card?.last4 || '0000',
              exp_month: defaultPm.card?.exp_month || 0,
              exp_year: defaultPm.card?.exp_year || 0
            };
          }
        }

        // If no default but we have payment methods, use the first one
        if (!formattedDefaultPaymentMethod && formattedPaymentMethods.length > 0) {
          formattedDefaultPaymentMethod = formattedPaymentMethods[0];
        }

        const result = {
          hasPaymentMethods: formattedPaymentMethods.length > 0,
          paymentMethods: formattedPaymentMethods,
          defaultPaymentMethod: formattedDefaultPaymentMethod
        };

        console.log("✅ Payment methods result:", result);
        return res.json(result);

      } catch (stripeError: any) {
        console.error("❌ Stripe error:", stripeError.message);
        return res.json({
          hasPaymentMethods: false,
          paymentMethods: [],
          defaultPaymentMethod: null
        });
      }

    } catch (error: any) {
      console.error("❌ Payment methods endpoint error:", error);
      return res.status(500).json({ 
        error: "Internal server error",
        message: error.message 
      });
    }
  });
  
  // Get related opportunities by industry/category
  app.get("/api/opportunities/related/:industry", jwtAuth, async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated - use the same pattern as other endpoints
      if (!req.user) {
        return res.status(401).json({ 
          message: "Authentication required to view opportunities" 
        });
      }

      const industry = req.params.industry;
      const currentOpportunityId = parseInt(req.query.exclude as string) || 0;
      
      if (!industry) {
        return res.status(400).json({ message: "Industry parameter is required" });
      }
      
      console.log(`🔍 [RELATED] Fetching related opportunities for industry: "${industry}", excluding ID: ${currentOpportunityId}`);
      
      // Get all opportunities with publications
      const allOpportunities = await storage.getOpportunitiesWithPublications();
      console.log(`📊 [RELATED] Total opportunities in database: ${allOpportunities.length}`);
      
      // Log all opportunities with their industry and tags for debugging
      allOpportunities.forEach(opp => {
        console.log(`📋 [RELATED] Opp ${opp.id}: "${opp.title}" | Industry: "${opp.industry || 'none'}" | Tags: [${Array.isArray(opp.tags) ? opp.tags.join(', ') : 'none'}] | Status: ${opp.status}`);
      });
      
      // Filter opportunities by industry/category and exclude current opportunity
      const relatedOpportunities = allOpportunities.filter(opp => {
        // Skip the current opportunity
        if (opp.id === currentOpportunityId) {
          console.log(`⏭️  [RELATED] Skipping current opportunity ${opp.id}`);
          return false;
        }
        
        // Check if the opportunity matches the industry
        const oppIndustry = opp.industry || '';
        const oppTags = Array.isArray(opp.tags) ? opp.tags : [];
        
        // Match by industry field or tags (case insensitive)
        const industryMatch = oppIndustry.toLowerCase().includes(industry.toLowerCase()) ||
                            oppTags.some(tag => tag.toLowerCase().includes(industry.toLowerCase()));
        
        const statusMatch = opp.status === 'open';
        
        console.log(`🔎 [RELATED] Opp ${opp.id}: Industry match: ${industryMatch} (searching for "${industry}" in "${oppIndustry}" or tags [${oppTags.join(', ')}]) | Status match: ${statusMatch} (${opp.status})`);
        
        // Only show open opportunities
        return industryMatch && statusMatch;
      });
      
      console.log(`✅ [RELATED] Found ${relatedOpportunities.length} matching opportunities before sorting`);
      
      // Sort by creation date (newest first) and limit to 3
      const sortedOpportunities = relatedOpportunities
        .sort((a, b) => {
          const aDate = new Date(a.createdAt || 0).getTime();
          const bDate = new Date(b.createdAt || 0).getTime();
          return bDate - aDate;
        })
        .slice(0, 3);
      
      console.log(`📤 [RELATED] Returning ${sortedOpportunities.length} opportunities:`, 
        sortedOpportunities.map(opp => `${opp.id}: "${opp.title}"`));
      
      res.json(sortedOpportunities);
    } catch (error: any) {
      console.error("Error fetching related opportunities:", error);
      res.status(500).json({ message: "Failed to fetch related opportunities" });
    }
  });
  
  // ============ NEW BILLING MANAGER ENDPOINTS ============
  
  // Get successful pitches ready for billing (new billing manager format)
  app.get("/api/admin/billing/ready", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      console.log("🔍 Fetching placements for billing manager...");
      
      // Get all placements from database with basic query first
      const allPlacements = await getDb().select().from(placements);
      console.log(`📊 Found ${allPlacements.length} total placements in database`);
      
      if (allPlacements.length === 0) {
        console.log("📭 No placements found in database");
        return res.json([]);
      }
      
      // Filter for placements that are ready for billing
      const pendingPlacements = allPlacements.filter(placement => 
        placement.status === 'ready_for_billing'
      );
      console.log(`💰 Found ${pendingPlacements.length} placements with 'ready_for_billing' status`);
      
      // Safely get relations for each placement
      const readyForBilling = [];
      
      for (const placement of pendingPlacements) {
        try {
          console.log(`Processing placement ID: ${placement.id}`);
          
          // Get user safely
          let user = null;
          try {
            if (placement.userId) {
              const userResult = await getDb().select()
                .from(users)
                .where(eq(users.id, placement.userId))
                .limit(1);
              user = userResult[0] || null;
            }
          } catch (userError) {
            console.log(`⚠️ Could not fetch user ${placement.userId} for placement ${placement.id}:`, userError.message);
          }
          
          // Get publication safely
          let publication = null;
          try {
            if (placement.publicationId) {
              const pubResult = await getDb().select()
                .from(publications)
                .where(eq(publications.id, placement.publicationId))
                .limit(1);
              publication = pubResult[0] || null;
            }
          } catch (pubError) {
            console.log(`⚠️ Could not fetch publication ${placement.publicationId} for placement ${placement.id}:`, pubError.message);
          }
          
          // Get opportunity safely
          let opportunity = null;
          try {
            if (placement.opportunityId) {
              const oppResult = await getDb().select()
                .from(opportunities)
                .where(eq(opportunities.id, placement.opportunityId))
                .limit(1);
              opportunity = oppResult[0] || null;
            }
          } catch (oppError) {
            console.log(`⚠️ Could not fetch opportunity ${placement.opportunityId} for placement ${placement.id}:`, oppError.message);
          }
          
          // Build the billing record with safe defaults
          const billingRecord = {
            id: placement.id.toString(),
            userId: placement.userId?.toString() || 'unknown',
            bidAmount: placement.amount || 0,
            billed: placement.status === 'paid',
            createdAt: placement.createdAt || new Date().toISOString(),
            publication: {
              id: publication?.id || null,
              name: publication?.name || 'Unknown Publication'
            },
            title: placement.articleTitle || opportunity?.title || 'Unknown Opportunity',
            customerName: user?.fullName || user?.username || 'Unknown User',
            user: {
              id: user?.id || placement.userId || 0,
              fullName: user?.fullName || 'Unknown User',
              email: user?.email || '',
              username: user?.username || '',
              company_name: user?.company_name || null,
              stripeCustomerId: user?.stripeCustomerId || null
            }
          };
          
          readyForBilling.push(billingRecord);
          console.log(`✅ Successfully processed placement ${placement.id}`);
          
        } catch (placementError) {
          console.error(`❌ Error processing placement ${placement.id}:`, placementError.message);
          // Continue with next placement instead of failing completely
          continue;
        }
      }
      
      console.log(`📊 Successfully processed ${readyForBilling.length} placements ready for billing`);
      res.json(readyForBilling);
    } catch (error: any) {
      console.error("❌ Error fetching billing-ready placements:", error);
      res.status(500).json({ message: "Failed to fetch billing data: " + error.message });
    }
  });
  
  // Get payment methods for a specific user (admin only)
  app.get("/api/admin/billing/payment-methods", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId;
      if (!userId) {
        return res.status(400).json({ message: "userId parameter is required" });
      }
      
      // Get the user
      const user = await storage.getUser(parseInt(userId as string));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.stripeCustomerId) {
        return res.json([]); // No payment methods if no Stripe customer
      }
      
      try {
        // Get customer with payment methods from Stripe
        const customer = await stripe.customers.retrieve(user.stripeCustomerId, {
          expand: ['invoice_settings.default_payment_method']
        });
        
        // Get all payment methods for the customer
        const paymentMethods = await stripe.paymentMethods.list({
          customer: user.stripeCustomerId,
          type: 'card',
        });
        
        // Format payment methods for the UI
        const formattedPaymentMethods = paymentMethods.data.map(pm => ({
          id: pm.id,
          brand: pm.card?.brand || 'unknown',
          last4: pm.card?.last4 || '0000',
          exp_month: pm.card?.exp_month || 0,
          exp_year: pm.card?.exp_year || 0,
          isDefault: (customer as any).invoice_settings?.default_payment_method?.id === pm.id
        }));
        
        console.log(`💳 Found ${formattedPaymentMethods.length} payment methods for user ${userId}`);
        res.json(formattedPaymentMethods);
      } catch (stripeError: any) {
        console.error("Stripe error fetching payment methods:", stripeError);
        res.json([]); // Return empty array if Stripe fails
      }
    } catch (error: any) {
      console.error("Error fetching user payment methods:", error);
      res.status(500).json({ message: "Failed to fetch payment methods: " + error.message });
    }
  });
  
  // Charge a user for a specific pitch using a payment method
  app.post("/api/admin/billing/charge", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { pitchId, paymentMethodId } = req.body;
      
      if (!pitchId || !paymentMethodId) {
        return res.status(400).json({ message: "pitchId and paymentMethodId are required" });
      }
      
      // Get the pitch with relations
      const pitch = await storage.getPitchWithRelations(parseInt(pitchId));
      if (!pitch) {
        return res.status(404).json({ message: "Pitch not found" });
      }
      
      // Check if already billed
      if (pitch.billedAt) {
        return res.status(400).json({ message: "Pitch has already been billed" });
      }
      
      // Ensure pitch is successful
      if (pitch.status !== 'successful') {
        return res.status(400).json({ message: "Only successful pitches can be billed" });
      }
      
      // Get the user
      const user = await storage.getUser(pitch.userId);
      if (!user || !user.stripeCustomerId) {
        return res.status(400).json({ message: "User has no Stripe customer ID" });
      }
      
      try {
        // Create and immediately capture a payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(pitch.bidAmount * 100), // Convert to cents
          currency: 'usd',
          customer: user.stripeCustomerId,
          payment_method: paymentMethodId,
          description: `QuoteBid charge for "${pitch.opportunity?.title || 'Unknown Opportunity'}" in ${pitch.publication?.name || 'Unknown Publication'}`,
          metadata: {
            pitchId: pitch.id.toString(),
            userId: user.id.toString(),
            opportunityTitle: pitch.opportunity?.title || '',
            publicationName: pitch.publication?.name || ''
          },
          confirm: true, // Confirm immediately
          off_session: true, // Since this is admin-initiated, not user-initiated
          return_url: `${req.protocol}://${req.get('host')}/admin/billing`
        });
        
        // Update the pitch with billing info
        const updatedPitch = await storage.updatePitchBillingInfo(
          pitch.id,
          paymentIntent.id,
          new Date()
        );
        
        console.log(`💳 Successfully charged user ${user.id} $${pitch.bidAmount} for pitch ${pitch.id}`);
        
        // Create notification for successful payment
        try {
          await notificationService.createNotification({
            userId: user.id,
            type: 'payment',
            title: '💳 Payment Processed Successfully!',
            message: `Your payment of $${pitch.bidAmount} for "${pitch.opportunity?.title || 'your pitch'}" has been processed successfully.`,
            linkUrl: '/account',
            relatedId: pitch.id,
            relatedType: 'pitch',
            icon: 'credit-card',
            iconColor: 'green',
          });
        } catch (notificationError) {
          console.error('Error creating payment success notification:', notificationError);
          // Don't fail the request if notification creation fails
        }
        
        res.json({
          success: true,
          message: "Payment charged successfully",
          pitch: updatedPitch,
          paymentIntent: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount / 100
          }
        });
      } catch (stripeError: any) {
        console.error("Stripe charge error:", stripeError);
        
        // Record the billing error
        await storage.updatePitchBillingError(pitch.id, stripeError.message);
        
        // Return specific error messages based on Stripe error types
        if (stripeError.code === 'card_declined') {
          return res.status(400).json({ 
            message: "Card was declined. Please try a different payment method or contact the customer." 
          });
        } else if (stripeError.code === 'insufficient_funds') {
          return res.status(400).json({ 
            message: "Insufficient funds. Please contact the customer." 
          });
        } else if (stripeError.code === 'payment_method_unactivated') {
          return res.status(400).json({ 
            message: "Payment method is not activated. Please contact the customer." 
          });
        } else {
          return res.status(400).json({ 
            message: `Payment failed: ${stripeError.message}` 
          });
        }
      }
    } catch (error: any) {
      console.error("Error processing charge:", error);
      res.status(500).json({ message: "Failed to process charge: " + error.message });
    }
  });

  // ============ END NEW BILLING MANAGER ENDPOINTS ============
  
  // Charge a user for a specific placement using a payment method
  
  // Update opportunity (admin only)
  app.put("/api/admin/opportunities/:id", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid opportunity ID" });
      }
      
      const { status, ...updateData } = req.body;
      
      // If only status is being updated, use the specific method
      if (Object.keys(req.body).length === 1 && status !== undefined) {
        const updatedOpportunity = await storage.updateOpportunityStatus(id, status);
        if (!updatedOpportunity) {
          return res.status(404).json({ message: "Opportunity not found" });
        }
        return res.json(updatedOpportunity);
      }
      
      // Otherwise update the full opportunity
      const updatedOpportunity = await storage.updateOpportunity(id, req.body);
      if (!updatedOpportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      
      res.json(updatedOpportunity);
    } catch (error: any) {
      console.error("Error updating opportunity:", error);
      res.status(500).json({ message: "Failed to update opportunity" });
    }
  });
  
  // Update opportunity (admin only) - full update
  
  // ============ NEW BILLING MANAGER ENDPOINTS ============
  
  // Get placements ready for billing with all relations
  app.get("/api/admin/placements/billing", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      console.log("🔍 Fetching placements for billing...");
      
      // Get all placements with full relations
      const placementsQuery = await getDb()
        .select({
          id: placements.id,
          pitchId: placements.pitchId,
          userId: placements.userId,
          opportunityId: placements.opportunityId,
          publicationId: placements.publicationId,
          amount: placements.amount,
          status: placements.status,
          articleTitle: placements.articleTitle,
          articleUrl: placements.articleUrl,
          createdAt: placements.createdAt,
          chargedAt: placements.chargedAt,
          errorMessage: placements.errorMessage,
          // User data
          user: {
            id: users.id,
            fullName: users.fullName,
            email: users.email,
            company_name: users.company_name,
            stripeCustomerId: users.stripeCustomerId,
          },
          // Opportunity data
          opportunity: {
            id: opportunities.id,
            title: opportunities.title,
          },
          // Publication data
          publication: {
            id: publications.id,
            name: publications.name,
            logo: publications.logo,
          },
          // Pitch data
          pitch: {
            id: pitches.id,
            content: pitches.content,
            createdAt: pitches.createdAt,
          }
        })
        .from(placements)
        .leftJoin(users, eq(placements.userId, users.id))
        .leftJoin(opportunities, eq(placements.opportunityId, opportunities.id))
        .leftJoin(publications, eq(placements.publicationId, publications.id))
        .leftJoin(pitches, eq(placements.pitchId, pitches.id))
        .orderBy(desc(placements.createdAt));
      
      // Transform the data into the expected format
      const formattedPlacements = placementsQuery.map(row => ({
        id: row.id,
        pitchId: row.pitchId,
        userId: row.userId,
        amount: row.amount,
        status: row.status,
        articleTitle: row.articleTitle,
        articleUrl: row.articleUrl,
        createdAt: row.createdAt,
        chargedAt: row.chargedAt,
        billingError: row.errorMessage,
        pitch: {
          content: row.pitch?.content || '',
          createdAt: row.pitch?.createdAt || row.createdAt,
        },
        user: row.user || {
          id: row.userId,
          fullName: 'Unknown User',
          email: '',
          company_name: null,
          stripeCustomerId: null,
        },
        opportunity: {
          id: row.opportunity?.id || row.opportunityId,
          title: row.opportunity?.title || 'Unknown Opportunity',
          publication: {
            name: row.publication?.name || 'Unknown Publication',
            logo: row.publication?.logo || null,
          }
        }
      }));
      
      console.log(`✅ Found ${formattedPlacements.length} placements`);
      res.json(formattedPlacements);
    } catch (error: any) {
      console.error("❌ Error fetching placements:", error);
      res.status(500).json({ message: "Failed to fetch placements: " + error.message });
    }
  });
  
  // Charge a placement using the subscription payment method
  app.post("/api/admin/placements/charge", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { placementId } = req.body;
      
      if (!placementId) {
        return res.status(400).json({ message: "placementId is required" });
      }
      
      console.log(`🔍 Processing charge for placement ${placementId}`);
      
      // Get the placement with all relations
      const placementResult = await getDb().select()
        .from(placements)
        .where(eq(placements.id, parseInt(placementId)))
        .limit(1);
        
      if (placementResult.length === 0) {
        return res.status(404).json({ message: "Placement not found" });
      }
      
      const placement = placementResult[0];
      
      // Check if already charged
      if (placement.status === 'paid') {
        return res.status(400).json({ message: "Placement has already been charged" });
      }
      
      // Get the user
      const userResult = await getDb().select()
        .from(users)
        .where(eq(users.id, placement.userId))
        .limit(1);
        
      if (userResult.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const user = userResult[0];
      
      if (!user.stripeCustomerId) {
        return res.status(400).json({ message: "User has no payment method on file" });
      }
      
      try {
        // Get the customer's default payment method
        const customer = await stripe.customers.retrieve(user.stripeCustomerId, {
          expand: ['invoice_settings.default_payment_method']
        });
        
        const defaultPaymentMethod = (customer as any).invoice_settings?.default_payment_method;
        
        if (!defaultPaymentMethod) {
          // Try to get any payment method for the customer
          const paymentMethods = await stripe.paymentMethods.list({
            customer: user.stripeCustomerId,
            type: 'card',
          });
          
          if (paymentMethods.data.length === 0) {
            return res.status(400).json({ message: "No payment methods found for customer" });
          }
          
          // Use the first payment method
          const paymentMethod = paymentMethods.data[0];
          
          // Create invoice first, then pay it
          const invoice = await stripe.invoices.create({
            customer: user.stripeCustomerId,
            description: `QuoteBid placement charge - ${placement.articleTitle || 'Article'}`,
            metadata: {
              placementId: placement.id.toString(),
              userId: user.id.toString(),
            },
            auto_advance: false, // Don't auto-finalize
          });
          
          // Add invoice item
          await stripe.invoiceItems.create({
            customer: user.stripeCustomerId,
            invoice: invoice.id,
            amount: placement.amount,
            currency: 'usd',
            description: `${placement.articleTitle || 'Media Coverage'}`,
          });
          
          // Finalize and pay the invoice
          const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
          const paidInvoice = await stripe.invoices.pay(finalizedInvoice.id, {
            payment_method: paymentMethod.id,
          });
          
          // Update placement status
          await getDb().update(placements)
            .set({
              status: 'paid',
              chargedAt: new Date(),
              paymentId: paidInvoice.payment_intent,
              invoiceId: paidInvoice.id,
            })
            .where(eq(placements.id, placement.id));
          
          console.log(`✅ Successfully charged placement ${placement.id} with invoice ${paidInvoice.id}`);
          
          return res.json({
            success: true,
            amount: placement.amount,
            paymentId: paidInvoice.payment_intent,
            invoiceId: paidInvoice.id,
          });
        } else {
          // Use the default payment method - create invoice first, then pay it
          const invoice = await stripe.invoices.create({
            customer: user.stripeCustomerId,
            description: `QuoteBid placement charge - ${placement.articleTitle || 'Article'}`,
            metadata: {
              placementId: placement.id.toString(),
              userId: user.id.toString(),
            },
            auto_advance: false, // Don't auto-finalize
          });
          
          // Add invoice item
          await stripe.invoiceItems.create({
            customer: user.stripeCustomerId,
            invoice: invoice.id,
            amount: placement.amount,
            currency: 'usd',
            description: `${placement.articleTitle || 'Media Coverage'}`,
          });
          
          // Finalize and pay the invoice
          const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
          const paidInvoice = await stripe.invoices.pay(finalizedInvoice.id, {
            payment_method: defaultPaymentMethod.id,
          });
          
          // Update placement status
          await getDb().update(placements)
            .set({
              status: 'paid',
              chargedAt: new Date(),
              paymentId: paidInvoice.payment_intent,
              invoiceId: paidInvoice.id,
            })
            .where(eq(placements.id, placement.id));
          
          console.log(`✅ Successfully charged placement ${placement.id} with invoice ${paidInvoice.id}`);
          
          return res.json({
            success: true,
            amount: placement.amount,
            paymentId: paidInvoice.payment_intent,
            invoiceId: paidInvoice.id,
          });
        }
      } catch (stripeError: any) {
        console.error("❌ Stripe error:", stripeError);
        
        // Update placement with error
        await getDb().update(placements)
          .set({
            status: 'failed',
            errorMessage: stripeError.message,
          })
          .where(eq(placements.id, placement.id));
        
        // Return user-friendly error messages
        if (stripeError.code === 'card_declined') {
          return res.status(400).json({ 
            message: "Card was declined. Please ask the customer to update their payment method." 
          });
        } else if (stripeError.code === 'insufficient_funds') {
          return res.status(400).json({ 
            message: "Insufficient funds. The customer needs to update their payment method." 
          });
        } else {
          return res.status(400).json({ 
            message: `Payment failed: ${stripeError.message}` 
          });
        }
      }
    } catch (error: any) {
      console.error("❌ Error processing charge:", error);
      res.status(500).json({ message: "Failed to process charge: " + error.message });
    }
  });

  // Download invoice by invoice ID (admin)
  app.get("/api/admin/invoices/:invoiceId/download", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const invoiceId = req.params.invoiceId;
      
      // Retrieve the invoice from Stripe
      const invoice = await stripe.invoices.retrieve(invoiceId);
      
      // Get the PDF URL
      if (invoice.invoice_pdf) {
        // Redirect to the Stripe PDF URL
        return res.redirect(invoice.invoice_pdf);
      } else {
        return res.status(404).json({ message: "Invoice PDF not available" });
      }
      
    } catch (stripeError: any) {
      console.error("Stripe error retrieving invoice:", stripeError);
      
      if (stripeError.type === 'StripeInvalidRequestError') {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      return res.status(500).json({ message: "Error retrieving invoice from Stripe" });
    }
  });

  // Simple test endpoint without auth
  app.get("/api/debug/stripe/:customerId", async (req: Request, res: Response) => {
    try {
      const customerId = req.params.customerId;
      console.log(`🔍 SIMPLE DEBUG: Testing Stripe API for customer: ${customerId}`);
      
      const allCharges = await stripe.charges.list({
        customer: customerId,
        limit: 20,
      });
      
      const successfulCharges = await stripe.charges.list({
        customer: customerId,
        status: 'succeeded',
        limit: 20,
      });
      
      res.json({
        customerId,
        totalCharges: allCharges.data.length,
        successfulCharges: successfulCharges.data.length,
        successful: successfulCharges.data.map(charge => ({
          id: charge.id,
          amount: charge.amount / 100,
          status: charge.status,
          description: charge.description,
          created: new Date(charge.created * 1000)
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // DEBUG: Test Stripe API directly with specific customer ID
  app.get("/api/admin/payments/debug/:customerId", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const customerId = req.params.customerId;
      console.log(`🔍 DEBUG: Testing Stripe API for customer: ${customerId}`);
      
      // Get ALL charges for this customer
      const allCharges = await stripe.charges.list({
        customer: customerId,
        limit: 100,
      });
      
      console.log(`📊 DEBUG: Found ${allCharges.data.length} total charges for ${customerId}`);
      
      const chargeDetails = allCharges.data.map((charge, index) => ({
        index: index + 1,
        id: charge.id,
        amount: charge.amount / 100,
        currency: charge.currency,
        status: charge.status,
        description: charge.description || 'No description',
        created: new Date(charge.created * 1000).toISOString(),
        invoice: charge.invoice || null
      }));
      
      // Also get successful charges only
      const successfulCharges = await stripe.charges.list({
        customer: customerId,
        status: 'succeeded',
        limit: 100,
      });
      
      console.log(`✅ DEBUG: Found ${successfulCharges.data.length} successful charges for ${customerId}`);
      
      res.json({
        customerId,
        totalCharges: allCharges.data.length,
        successfulCharges: successfulCharges.data.length,
        allCharges: chargeDetails,
        successfulOnly: successfulCharges.data.map(charge => ({
          id: charge.id,
          amount: charge.amount / 100,
          status: charge.status,
          description: charge.description,
          created: new Date(charge.created * 1000).toISOString()
        }))
      });
    } catch (error: any) {
      console.error("❌ DEBUG Stripe error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get successful Stripe payments for all customers (optimized for performance)
  app.get("/api/admin/payments/successful", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      // Get limit from query params (default to 50 for performance)
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      
      // Get only active customers with recent activity to reduce load
      const usersWithStripe = await getDb()
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          company_name: users.company_name,
          stripeCustomerId: users.stripeCustomerId
        })
        .from(users)
        .where(sql`${users.stripeCustomerId} IS NOT NULL AND ${users.subscription_status} = 'active'`)
        .limit(20); // Limit to active customers only for better performance

      const allSuccessfulPayments = [];

      // Use Promise.all for concurrent API calls instead of sequential
      const paymentPromises = usersWithStripe.map(async (user) => {
        try {
          // Get only recent successful charges (last 3 months) for better performance
          const charges = await stripe.charges.list({
            customer: user.stripeCustomerId,
            limit: 10, // Reduced limit for faster loading
            created: {
              gte: Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60) // Last 90 days
            }
          });

          // Filter to only truly successful charges
          const succeededCharges = charges.data.filter(charge => 
            charge.status === 'succeeded' &&
            charge.captured === true &&
            !charge.refunded &&
            charge.amount_refunded === 0 &&
            !charge.dispute &&
            !charge.failure_code
          );

          // Add user info to each charge
          return succeededCharges.map(charge => ({
            id: charge.id,
            amount: charge.amount / 100, // Convert from cents
            currency: charge.currency,
            status: charge.status,
            created: new Date(charge.created * 1000),
            description: charge.description || 'Payment',
            receiptUrl: charge.receipt_url,
            invoiceId: charge.invoice || null,
            user: {
              id: user.id,
              fullName: user.fullName,
              email: user.email,
              company_name: user.company_name,
              stripeCustomerId: user.stripeCustomerId
            }
          }));
        } catch (stripeError: any) {
          console.error(`Failed to fetch payments for user ${user.id}:`, stripeError.message);
          return [];
        }
      });

      // Wait for all requests to complete
      const paymentResults = await Promise.all(paymentPromises);
      
      // Flatten and sort results
      const flattenedPayments = paymentResults.flat();
      allSuccessfulPayments.push(...flattenedPayments);

      // Sort by date (newest first) and limit results
      allSuccessfulPayments.sort((a, b) => b.created.getTime() - a.created.getTime());
      
      // Apply final limit
      const limitedPayments = allSuccessfulPayments.slice(0, limit);

      res.json(limitedPayments);
    } catch (error: any) {
      console.error("Error fetching successful payments:", error);
      res.status(500).json({ message: "Failed to fetch payments: " + error.message });
    }
  });

  // Simple revenue chart - just like Stripe UI
  app.get("/api/admin/revenue-chart", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      console.log("📊 Simple revenue chart API called");
      
      // Create simple 7-day revenue data
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        chartData.push({
          date: date.toISOString().split('T')[0],
          revenue: Math.floor(Math.random() * 1000) + 200 // Random revenue $200-$1200
        });
      }
      
      console.log("📊 Sending simple chart data:", chartData);
      res.json(chartData);
    } catch (error: any) {
      console.error("❌ Error in simple revenue chart:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============ END NEW BILLING MANAGER ENDPOINTS ============
  
  // ============ STRIPE CUSTOMER BILLING ENDPOINTS ============
  
  // Get customer's Stripe details and payment methods
  app.get("/api/admin/customers/:userId/stripe-details", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get user from database
      const user = await storage.getUser(userId);
      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({ message: "User not found or no Stripe customer ID" });
      }
      
      // Get Stripe customer details
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      
      // Get customer's payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card',
      });
      
      // Get customer's subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'active',
      });
      
      // Get recent charges
      const charges = await stripe.charges.list({
        customer: user.stripeCustomerId,
        limit: 10,
      });
      
      res.json({
        customer,
        paymentMethods: paymentMethods.data,
        subscriptions: subscriptions.data,
        recentCharges: charges.data,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          company_name: user.company_name,
        }
      });
    } catch (error: any) {
      console.error("Error fetching customer Stripe details:", error);
      res.status(500).json({ message: "Failed to fetch customer details", error: error.message });
    }
  });
  
  // Get customer's complete payment history separated by type
  app.get("/api/admin/customers/:userId/payment-history", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get user from database
      const user = await storage.getUser(userId);
      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({ message: "User not found or no Stripe customer ID" });
      }
      
      // Get all charges for this customer
      const allCharges = await stripe.charges.list({
        customer: user.stripeCustomerId,
        limit: 100, // Get comprehensive history
      });
      
      // Filter to only successful charges
      const successfulCharges = allCharges.data.filter(charge => 
        charge.status === 'succeeded' &&
        charge.captured === true &&
        !charge.refunded &&
        charge.amount_refunded === 0 &&
        !charge.dispute &&
        !charge.failure_code
      );
      
      // Separate subscription payments from one-time payments
      const subscriptionPayments = [];
      const oneTimePayments = [];
      
      for (const charge of successfulCharges) {
        const chargeData = {
          id: charge.id,
          amount: charge.amount / 100,
          currency: charge.currency,
          status: charge.status,
          created: new Date(charge.created * 1000),
          description: charge.description || 'Payment',
          receiptUrl: charge.receipt_url,
          invoiceId: charge.invoice || null,
          metadata: charge.metadata,
        };
        
        // Determine if this is a subscription payment
        const isSubscription = (
          charge.description?.toLowerCase().includes('subscription') ||
          charge.description?.toLowerCase().includes('membership') ||
          charge.description?.toLowerCase().includes('monthly') ||
          charge.amount === 9999 || // $99.99 monthly fee
          charge.metadata?.type === 'subscription'
        );
        
        if (isSubscription) {
          subscriptionPayments.push({
            ...chargeData,
            description: chargeData.description || 'QuoteBid Monthly Subscription'
          });
        } else {
          oneTimePayments.push(chargeData);
        }
      }
      
      // Sort both arrays by date (newest first)
      subscriptionPayments.sort((a, b) => b.created.getTime() - a.created.getTime());
      oneTimePayments.sort((a, b) => b.created.getTime() - a.created.getTime());
      
      // Calculate totals
      const totalAmount = successfulCharges.reduce((sum, charge) => sum + (charge.amount / 100), 0);
      const subscriptionTotal = subscriptionPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const oneTimeTotal = oneTimePayments.reduce((sum, payment) => sum + payment.amount, 0);
      
      res.json({
        subscriptionPayments,
        oneTimePayments,
        totalAmount,
        totalCount: successfulCharges.length,
        subscriptionTotal,
        oneTimeTotal,
        subscriptionCount: subscriptionPayments.length,
        oneTimeCount: oneTimePayments.length,
      });
    } catch (error: any) {
      console.error("Error fetching customer payment history:", error);
      res.status(500).json({ message: "Failed to fetch payment history", error: error.message });
    }
  });
  
  // Create a charge for a successful placement
  app.post("/api/admin/customers/:userId/charge-placement", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      console.log("🎯 CHARGE ENDPOINT HIT!");
      console.log("📋 Request data:", {
        userId: req.params.userId,
        body: req.body
      });
      
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const { amount, description, paymentMethodId, placementId, invoiceData } = req.body;
      
      console.log("📋 Extracted data:", {
        userId,
        amount,
        placementId,
        paymentMethodId: paymentMethodId ? "***" : "MISSING",
        hasInvoiceData: !!invoiceData
      });
      
      if (!amount || !description || !paymentMethodId) {
        return res.status(400).json({ message: "Amount, description, and payment method are required" });
      }
      
      // Get user from database
      const user = await storage.getUser(userId);
      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({ message: "User not found or no Stripe customer ID" });
      }
      
      // Create invoice with enhanced details
      const invoice = await stripe.invoices.create({
        customer: user.stripeCustomerId,
        description: description,
        metadata: {
          userId: userId.toString(),
          placementId: placementId?.toString() || '',
          type: 'placement_charge',
          invoiceNumber: invoiceData?.invoiceNumber || '',
          servicePeriod: invoiceData?.servicePeriod || '',
          publicationLink: invoiceData?.publicationLink || ''
        },
        footer: invoiceData?.invoiceNotes || '',
        auto_advance: false,
      });
      
      // Add main service line item with correct Stripe API parameters
      await stripe.invoiceItems.create({
        customer: user.stripeCustomerId,
        invoice: invoice.id,
        currency: 'usd',
        description: description,
        amount: Math.round((invoiceData?.subtotal || amount) * 100), // Use 'amount' instead of 'unit_amount'
      });
      
      // Add tax line item if applicable
      if (invoiceData?.tax && invoiceData.tax > 0) {
        await stripe.invoiceItems.create({
          customer: user.stripeCustomerId,
          invoice: invoice.id,
          currency: 'usd',
          description: `Tax (${invoiceData.taxRate}%)`,
          amount: Math.round(invoiceData.tax * 100), // Use 'amount' instead of 'unit_amount'
        });
      }
      
      // Finalize and pay the invoice
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
      const paidInvoice = await stripe.invoices.pay(finalizedInvoice.id, {
        payment_method: paymentMethodId,
      });
      
      // CRITICAL: Update pitch to mark as billed so it moves from AR to Successful
      if (placementId) {
        console.log(`💰 STRIPE PAYMENT SUCCESS! Now updating pitch ${placementId}...`);
        
        // Mark pitch as billed with Stripe info
        const updatedPitch = await storage.updatePitchBillingInfo(
          placementId, // This is the pitch ID
          paidInvoice.payment_intent as string || paidInvoice.id, // Use payment intent or invoice ID
          new Date()
        );
        
        if (!updatedPitch) {
          console.error(`❌ CRITICAL: Failed to update pitch ${placementId} billing status!`);
          throw new Error(`Failed to mark pitch ${placementId} as billed`);
        }
        
        // IMPORTANT: Also update the pitch with the publication link if provided
        if (invoiceData?.publicationLink) {
          console.log(`📰 BILLING: Saving publication link to pitch ${placementId}: ${invoiceData.publicationLink}`);
          
          // Use storage method to update pitch article information
          try {
            const updatedPitchWithArticle = await storage.updatePitchArticle(placementId, {
              url: invoiceData.publicationLink,
              title: `Published Article - ${description}`
            });
            
            if (updatedPitchWithArticle) {
              console.log(`✅ BILLING SUCCESS: Updated pitch ${placementId} with publication link and marked as delivered!`);
              console.log(`🔍 BILLING DEBUG: Pitch ${placementId} now has articleUrl: ${updatedPitchWithArticle.articleUrl}, articleTitle: ${updatedPitchWithArticle.articleTitle}`);
            } else {
              console.error(`❌ BILLING ERROR: Failed to update pitch ${placementId} with article info`);
            }
          } catch (error) {
            console.error(`❌ BILLING ERROR: Exception updating pitch ${placementId}:`, error);
          }
        }
        
        // CRITICAL: Update pitch status to "successful" so it shows the article link in the modal
        try {
          const updatedPitchStatus = await storage.updatePitchStatus(placementId, 'successful');
          if (updatedPitchStatus) {
            console.log(`✅ BILLING SUCCESS: Updated pitch ${placementId} status to 'successful'`);
          } else {
            console.error(`❌ BILLING ERROR: Failed to update pitch ${placementId} status to successful`);
          }
        } catch (error) {
          console.error(`❌ BILLING ERROR: Exception updating pitch ${placementId} status:`, error);
        }
        
        console.log(`✅ PITCH ${placementId} IS NOW MARKED AS PAID! It should move to Successful tab.`);
      } else {
        console.error(`❌ NO PLACEMENT ID PROVIDED - CANNOT UPDATE PITCH!`);
      }
      
              // Create notification for the customer about the successful billing with deliverable link
        try {
          let notificationMessage = `Your payment of $${amount} has been processed successfully.`;
          
          // If publication link is provided, include it in the notification
          if (invoiceData?.publicationLink) {
            notificationMessage += ` Click here to view your published article.`;
          }
          
          // Create the notification
          await notificationService.createNotification({
            userId: userId,
            type: 'payment',
            title: '💳 Payment Processed - Content Delivered!',
            message: notificationMessage,
            linkUrl: invoiceData?.publicationLink || '/account',
            relatedId: placementId || null,
            relatedType: 'payment',
            icon: 'credit-card',
            iconColor: 'green',
          });
          
                  // Also create a media coverage notification specifically for the account page
        if (invoiceData?.publicationLink) {
          // Create the media coverage entry automatically
          try {
            await storage.createMediaCoverage({
              userId: userId,
              title: invoiceData.articleTitle || `Published Article - ${placementData?.opportunity?.title || 'Unknown'}`,
              publication: placementData?.publication?.name || 'Unknown Publication',
              url: invoiceData.publicationLink,
              source: 'billing_manager',
              placementId: placementId,
              pitchId: placementData?.pitchId || null,
              isVerified: true, // Mark as verified since it's from billing manager
            });
            
            console.log(`✅ Created media coverage entry for user ${userId}`);
          } catch (error) {
            console.error(`❌ Failed to create media coverage entry:`, error);
          }

          await notificationService.createNotification({
            userId: userId,
            type: 'media_coverage',
            title: '📰 New Media Coverage Added!',
            message: `Your published article has been added to your Media Coverage portfolio.`,
            linkUrl: '/account?notification=media_coverage&refresh=media',
            relatedId: placementId || null,
            relatedType: 'placement',
            icon: 'newspaper',
            iconColor: 'blue',
          });
        }
          
          console.log(`✅ Created billing notification for user ${userId} with publication link: ${invoiceData?.publicationLink || 'none'}`);
        } catch (notificationError) {
          console.error('❌ Error creating billing notification:', notificationError);
          // Don't fail the request if notification creation fails
        }
      
      res.json({
        success: true,
        invoice: paidInvoice,
        paymentIntent: paidInvoice.payment_intent,
        message: `Successfully charged $${amount} to ${user.fullName} - Invoice: ${invoiceData?.invoiceNumber || paidInvoice.id}`
      });
    } catch (error: any) {
      console.error("Error charging customer:", error);
      res.status(500).json({ 
        message: "Failed to charge customer", 
        error: error.message 
      });
    }
  });
  
  // Get all customers with Stripe data for customer directory
  app.get("/api/admin/customers-directory", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const customersWithStripe = [];
      
      for (const user of users) {
        if (user.stripeCustomerId) {
          try {
            // Get basic Stripe customer info
            const customer = await stripe.customers.retrieve(user.stripeCustomerId);
            
            // Get subscription info
            const subscriptions = await stripe.subscriptions.list({
              customer: user.stripeCustomerId,
              status: 'active',
              limit: 1,
            });
            
            // Get recent payment methods
            const paymentMethods = await stripe.paymentMethods.list({
              customer: user.stripeCustomerId,
              type: 'card',
              limit: 1,
            });
            
            customersWithStripe.push({
              id: user.id,
              fullName: user.fullName,
              email: user.email,
              company_name: user.company_name,
              stripeCustomerId: user.stripeCustomerId,
              subscription: subscriptions.data[0] || null,
              primaryPaymentMethod: paymentMethods.data[0] || null,
              customer: customer
            });
          } catch (stripeError) {
            console.warn(`Failed to fetch Stripe data for user ${user.id}:`, stripeError);
            // Include user without Stripe data
            customersWithStripe.push({
              id: user.id,
              fullName: user.fullName,
              email: user.email,
              company_name: user.company_name,
              stripeCustomerId: user.stripeCustomerId,
              subscription: null,
              primaryPaymentMethod: null,
              customer: null
            });
          }
        }
      }
      
      res.json(customersWithStripe);
    } catch (error: any) {
      console.error("Error fetching customers directory:", error);
      res.status(500).json({ message: "Failed to fetch customers directory", error: error.message });
    }
  });

  // ============ ADMIN CURRENT USER ENDPOINT ============
  
  // ============ USER BILLING ENDPOINTS ============
  
  // Get user's placement charges from Stripe (actual successful payments)
  app.get("/api/users/:userId/billing/placement-charges", jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Check authentication
      if (!req.user || !req.user!.id) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Verify user can only access their own billing data
      if (req.user!.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get user's Stripe customer ID
      const user = await storage.getUser(userId);
      if (!user || !user.stripeCustomerId) {
        console.log(`User ${userId} has no Stripe customer ID`);
        return res.json([]); // Return empty array if no Stripe customer
      }

      try {
        console.log(`🔍 Fetching Stripe payments for user ${userId} with customer ID: ${user.stripeCustomerId}`);
        
        // Get charges from Stripe for this customer
        const allCharges = await stripe.charges.list({
          customer: user.stripeCustomerId,
          limit: 100,
        });

        console.log(`📊 Found ${allCharges.data.length} total charges for user ${userId}`);

        // Filter to ONLY truly successful charges with comprehensive filtering
        const succeededCharges = allCharges.data.filter(charge => {
          const isSucceeded = charge.status === 'succeeded';
          const isCaptured = charge.captured === true;
          const isNotRefunded = !charge.refunded && charge.amount_refunded === 0;
          const hasNoDisputes = !charge.dispute;
          const hasNoFailures = !charge.failure_code;
          
          const passes = isSucceeded && isCaptured && isNotRefunded && hasNoDisputes && hasNoFailures;
          
          if (passes) {
            console.log(`   ✅ PASS ${charge.id}: succeeded=${isSucceeded}, captured=${isCaptured}, notRefunded=${isNotRefunded}, noRefundAmount=${charge.amount_refunded === 0}, noDispute=${hasNoDisputes}, noFailure=${hasNoFailures}`);
          }
          
          return passes;
        });

        console.log(`✅ Found ${succeededCharges.length} TRULY GOOD charges for user ${userId} (filtered from ${allCharges.data.length} total)`);

        // Convert Stripe charges to placement charge format with proper invoice IDs
        const placementCharges = await Promise.all(succeededCharges.map(async (charge) => {
          // Special handling for subscription charges
          let description = charge.description || 'Media Coverage';
          if ((description === 'Subscription creation' || description.toLowerCase().includes('subscription')) && charge.amount === 9999) { // $99.99 in cents
            description = 'QuoteBid - Monthly Membership Fee';
          }
          
          // Try to get the proper invoice ID for this charge
          let invoiceId = charge.invoice;
          
          // If the charge doesn't have a direct invoice, try to find it through payment intent
          if (!invoiceId && charge.payment_intent) {
            try {
              const paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent);
              if (paymentIntent.invoice) {
                invoiceId = paymentIntent.invoice as string;
              }
            } catch (piError) {
              // Ignore errors when trying to fetch payment intent
            }
          }
          
          return {
            id: charge.id,
            amount: charge.amount / 100, // Convert from cents
            bidAmount: charge.amount / 100,
            status: 'paid',
            chargedAt: new Date(charge.created * 1000),
            createdAt: new Date(charge.created * 1000),
            paymentId: charge.id,
            invoiceId: invoiceId, // Proper invoice ID or null
            receiptUrl: charge.receipt_url, // Include Stripe receipt URL
            articleTitle: description,
            articleUrl: null,
            opportunity: {
              id: null,
              title: description,
              publication: {
                id: null,
                name: 'Publication' // We don't have publication info in Stripe
              }
            }
          };
        }));

        // Sort by date (newest first)
        placementCharges.sort((a, b) => b.chargedAt.getTime() - a.chargedAt.getTime());

        console.log(`📊 Returning ${placementCharges.length} Stripe charges for user ${userId}`);
        res.json(placementCharges);
      } catch (stripeError: any) {
        console.error(`Stripe error for user ${userId}:`, stripeError);
        return res.status(500).json({ message: "Failed to fetch payment data from Stripe" });
      }
    } catch (error) {
      console.error('Error fetching placement charges:', error);
      res.status(500).json({ message: "Failed to fetch placement charges" });
    }
  });

  // Get receipt URL for a specific placement charge (opens external Stripe receipt)
  app.get("/api/users/:userId/billing/placement-charges/:chargeId/receipt-url", jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const chargeId = req.params.chargeId;
      
      // Verify user authentication
      if (req.user?.id !== userId && !isAdmin(req)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get user to verify they exist and have stripe customer ID
      const user = await storage.getUser(userId);
      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({ message: "User not found or no Stripe customer" });
      }
      
      try {
        // Get the charge directly from Stripe
        const charge = await stripe.charges.retrieve(chargeId);
        
        // Verify this charge belongs to the user
        if (charge.customer !== user.stripeCustomerId) {
          return res.status(403).json({ message: "Charge does not belong to this user" });
        }
        
        // Return the receipt URL - this is the external Stripe receipt page
        if (charge.receipt_url) {
          console.log(`Found receipt URL for charge ${chargeId}: ${charge.receipt_url}`);
          return res.json({ receiptUrl: charge.receipt_url });
        } else {
          return res.status(404).json({ message: "Receipt URL not available for this charge" });
        }
        
      } catch (stripeError: any) {
        console.error("Stripe error retrieving charge:", stripeError);
        
        if (stripeError.type === 'StripeInvalidRequestError') {
          return res.status(404).json({ message: "Charge not found" });
        }
        
        return res.status(500).json({ message: "Error retrieving charge from Stripe" });
      }
      
    } catch (error: any) {
      console.error("Error getting receipt URL:", error);
      res.status(500).json({ message: "Failed to get receipt URL: " + error.message });
    }
  });

  // Download invoice for user (simple approach like admin)
  app.get("/api/users/:userId/invoices/:invoiceId/download", jwtAuth, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const invoiceId = req.params.invoiceId;
      
      // Verify user authentication
      if (req.user?.id !== userId && !isAdmin(req)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get user to verify they exist and have stripe customer ID
      const user = await storage.getUser(userId);
      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({ message: "User not found or no Stripe customer" });
      }
      
      try {
        // Retrieve the invoice from Stripe
        const invoice = await stripe.invoices.retrieve(invoiceId);
        
        // Verify this invoice belongs to the user
        if (invoice.customer !== user.stripeCustomerId) {
          return res.status(403).json({ message: "Invoice does not belong to this user" });
        }
        
        // Get the PDF URL
        if (invoice.invoice_pdf) {
          // Redirect to the Stripe PDF URL
          return res.redirect(invoice.invoice_pdf);
        } else {
          return res.status(404).json({ message: "Invoice PDF not available" });
        }
        
      } catch (stripeError: any) {
        console.error("Stripe error retrieving invoice:", stripeError);
        
        if (stripeError.type === 'StripeInvalidRequestError') {
          return res.status(404).json({ message: "Invoice not found" });
        }
        
        return res.status(500).json({ message: "Error retrieving invoice from Stripe" });
      }
      
    } catch (error: any) {
      console.error("Error downloading invoice:", error);
      res.status(500).json({ message: "Failed to download invoice: " + error.message });
    }
  });

  // ============ PRICING ENGINE API ENDPOINTS ============
  
  // POST /api/opportunity/:id/price - Update opportunity price with audit trail
  app.post("/api/opportunity/:id/price", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { price, snapshot } = req.body;

      // Validate opportunity ID
      const opportunityId = parseInt(id);
      if (isNaN(opportunityId)) {
        return res.status(400).json({ error: "Invalid opportunity ID" });
      }

      // Validate price
      if (typeof price !== "number" || price < 50 || price > 999) {
        return res.status(400).json({ 
          error: "Invalid price - must be a number between $50 and $999" 
        });
      }

      // Check if opportunity exists
      const existingOpp = await getDb()
        .select({ id: opportunities.id })
        .from(opportunities)
        .where(eq(opportunities.id, opportunityId))
        .limit(1);

      if (existingOpp.length === 0) {
        return res.status(404).json({ error: "Opportunity not found" });
      }

      // Update opportunity price and create audit trail in a transaction
      await getDb().transaction(async (trx) => {
        // Update the opportunity's current price and variable snapshot
        await trx
          .update(opportunities)
          .set({
            current_price: price.toString(),
            variable_snapshot: snapshot || null,
          })
          .where(eq(opportunities.id, opportunityId));

        // Insert price snapshot for audit trail
        await trx
          .insert(price_snapshots)
          .values({
            opportunity_id: opportunityId,
            suggested_price: price.toString(),
            snapshot_payload: snapshot || {},
            tick_time: new Date(),
          });
      });

      console.log(`💰 Price updated via API: OPP ${opportunityId} → $${price}`);

      return res.status(200).json({ 
        ok: true, 
        message: `Opportunity ${opportunityId} price updated to $${price}` 
      });

    } catch (error) {
      console.error("❌ Price update API error:", error);
      return res.status(500).json({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // GET /api/opportunities/:id/price-trend - Chart data with time window  
  app.get("/api/opportunities/:id/price-trend", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { window = '7d' } = req.query;
      const opportunityId = parseInt(id);

      if (isNaN(opportunityId)) {
        return res.status(400).json({ error: "Invalid opportunity ID" });
      }

      // Parse time window
      let hoursBack = 168; // 7 days default
      if (typeof window === 'string') {
        const match = window.match(/^(\d+)([hdw])$/);
        if (match) {
          const num = parseInt(match[1]);
          const unit = match[2];
          switch (unit) {
            case 'h': hoursBack = num; break;
            case 'd': hoursBack = num * 24; break;
            case 'w': hoursBack = num * 24 * 7; break;
          }
        }
      }

      const timeBack = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      // Get price history
      const priceHistory = await getDb()
        .select({
          timestamp: price_snapshots.tick_time,
          price: price_snapshots.suggested_price
        })
        .from(price_snapshots)
        .where(and(
          eq(price_snapshots.opportunity_id, opportunityId),
          gt(price_snapshots.tick_time, timeBack)
        ))
        .orderBy(sql`${price_snapshots.tick_time} ASC`);

      // Format for chart consumption
      const chartData = priceHistory.map(point => ({
        t: point.timestamp?.toISOString(),
        p: Number(point.price) || 0
      }));

      // If no history, get current price as single point
      if (chartData.length === 0) {
        const currentOpp = await getDb()
          .select({ current_price: opportunities.current_price })
          .from(opportunities)
          .where(eq(opportunities.id, opportunityId))
          .limit(1);

        if (currentOpp.length > 0) {
          chartData.push({
            t: new Date().toISOString(),
            p: Number(currentOpp[0].current_price) || 0
          });
        }
      }

      res.json(chartData);
    } catch (error) {
      console.error("Error fetching price trend:", error);
      res.status(500).json({ error: "Failed to fetch price trend" });
    }
  });

  // ============ ADMIN PRICING CONTROL ENDPOINTS ============
  
  // GET /api/admin/variables - returns all rows from variable_registry
  app.get("/api/admin/variables", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const variables = await getDb()
        .select()
        .from(variable_registry)
        .orderBy(variable_registry.var_name);
      
      res.json(variables);
    } catch (error: any) {
      console.error("Error fetching pricing variables:", error);
      res.status(500).json({ message: "Failed to fetch pricing variables" });
    }
  });
  
  // PATCH /api/admin/variable/:name - updates weight and nonlinear_fn with zod validation
  app.patch("/api/admin/variable/:name", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      
      // Validate request body
      const updateSchema = z.object({
        weight: z.number().min(-10).max(10).optional(),
        nonlinear_fn: z.string().optional()
      });
      
      const validationResult = updateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid variable data", 
          errors: validationResult.error.errors 
        });
      }
      
      const { weight, nonlinear_fn } = validationResult.data;
      
      // Check if variable exists
      const existingVariable = await getDb()
        .select()
        .from(variable_registry)
        .where(eq(variable_registry.var_name, name))
        .limit(1);
      
      if (existingVariable.length === 0) {
        return res.status(404).json({ message: "Variable not found" });
      }
      
      // Update the variable
      const updatedVariable = await getDb()
        .update(variable_registry)
        .set({
          ...(weight !== undefined && { weight: weight.toString() }),
          ...(nonlinear_fn !== undefined && { nonlinear_fn }),
          updated_at: new Date()
        })
        .where(eq(variable_registry.var_name, name))
        .returning();
      
      console.log(`🔧 Admin updated pricing variable ${name}:`, { weight, nonlinear_fn });
      
      res.json(updatedVariable[0]);
    } catch (error: any) {
      console.error("Error updating pricing variable:", error);
      res.status(500).json({ message: "Failed to update pricing variable" });
    }
  });
  
  // GET /api/admin/config - returns priceStep and tickIntervalMs from pricing_config
  app.get("/api/admin/config", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const config = await getDb()
        .select()
        .from(pricing_config);
      
      // Convert to key-value format
      const configObj: any = {};
      config.forEach(item => {
        configObj[item.key] = item.value;
      });
      
      res.json(configObj);
    } catch (error: any) {
      console.error("Error fetching pricing config:", error);
      res.status(500).json({ message: "Failed to fetch pricing config" });
    }
  });
  
  // PATCH /api/admin/config/:key - updates value
  app.patch("/api/admin/config/:key", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      // Validate based on key
      let validatedValue: any;
      if (key === 'priceStep') {
        if (typeof value !== 'number' || value < 1 || value > 20) {
          return res.status(400).json({ message: "priceStep must be between 1 and 20" });
        }
        validatedValue = value;
      } else if (key === 'tickIntervalMs') {
        if (typeof value !== 'number' || value < 30000 || value > 300000) {
          return res.status(400).json({ message: "tickIntervalMs must be between 30000 and 300000" });
        }
        validatedValue = value;
      } else {
        return res.status(400).json({ message: "Invalid config key" });
      }
      
      // Update or insert the config value
      const updatedConfig = await getDb()
        .insert(pricing_config)
        .values({
          key,
          value: validatedValue,
          updated_at: new Date()
        })
        .onConflictDoUpdate({
          target: pricing_config.key,
          set: {
            value: validatedValue,
            updated_at: new Date()
          }
        })
        .returning();
      
      console.log(`🔧 Admin updated pricing config ${key}:`, validatedValue);
      
      res.json(updatedConfig[0]);
    } catch (error: any) {
      console.error("Error updating pricing config:", error);
      res.status(500).json({ message: "Failed to update pricing config" });
    }
  });
  
  // GET /api/admin/metrics - last 60 minutes of gpt_metrics (for now return mock data)
  app.get("/api/admin/metrics", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      // For now, return mock data since we don't have gpt_metrics table yet
      // In the future, this would query actual GPT metrics from the last 60 minutes
      const now = Date.now();
      const mockMetrics = {
        labels: Array.from({ length: 12 }, (_, i) => {
          const time = new Date(now - (11 - i) * 5 * 60 * 1000); // 5 minute intervals
          return time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        }),
        latencyMs: Array.from({ length: 12 }, () => Math.floor(Math.random() * 1000) + 500), // 500-1500ms
        tokens: Array.from({ length: 12 }, () => Math.floor(Math.random() * 200) + 50) // 50-250 tokens
      };
      
      res.json(mockMetrics);
    } catch (error: any) {
      console.error("Error fetching GPT metrics:", error);
      res.status(500).json({ message: "Failed to fetch GPT metrics" });
    }
  });

  // ============ PUSH NOTIFICATION ENDPOINTS ============
  
  // GET /api/push/vapid-public - Get VAPID public key for client subscription
  app.get("/api/push/vapid-public", async (req: Request, res: Response) => {
    try {
      const publicKey = await getVapidPublicKey();
      res.json({ key: publicKey });
    } catch (error: any) {
      console.error("Error fetching VAPID public key:", error);
      res.status(500).json({ message: "Failed to fetch VAPID public key" });
    }
  });
  
  // POST /api/push/subscribe - Subscribe user to push notifications
  app.post("/api/push/subscribe", jwtAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { subscription } = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ message: "Invalid subscription data" });
      }
      
      // Validate subscription with Zod
      const validationResult = insertPushSubscriptionSchema.safeParse({
        user_id: req.user.id,
        endpoint: subscription.endpoint,
        subscription,
      });
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid subscription format", 
          errors: validationResult.error.errors 
        });
      }
      
      // Upsert subscription (update if endpoint exists, insert if new)
      await getDb()
        .insert(push_subscriptions)
        .values(validationResult.data)
        .onConflictDoUpdate({
          target: push_subscriptions.endpoint,
          set: {
            subscription: validationResult.data.subscription,
            user_id: validationResult.data.user_id,
            created_at: new Date(),
          },
        });
      
      console.log(`📱 Push subscription registered for user ${req.user.id}`);
      res.status(200).json({ ok: true, message: "Push subscription registered" });
      
    } catch (error: any) {
      console.error("Error registering push subscription:", error);
      res.status(500).json({ message: "Failed to register push subscription" });
    }
  });
  
  // DELETE /api/push/unsubscribe - Unsubscribe user from push notifications
  app.delete("/api/push/unsubscribe", jwtAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ message: "Endpoint is required" });
      }
      
      await getDb()
        .delete(push_subscriptions)
        .where(
          and(
            eq(push_subscriptions.user_id, req.user.id),
            eq(push_subscriptions.endpoint, endpoint)
          )
        );
      
      console.log(`📱 Push subscription removed for user ${req.user.id}, endpoint: ${endpoint}`);
      res.status(200).json({ ok: true, message: "Push subscription removed" });
      
    } catch (error: any) {
      console.error("Error removing push subscription:", error);
      res.status(500).json({ message: "Failed to remove push subscription" });
    }
  });

  // ============ ADMIN CURRENT USER ENDPOINT ============
  
  return httpServer;
}
