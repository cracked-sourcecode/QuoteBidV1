import express from 'express';
import { requireAdminAuth } from '../admin-auth-middleware';
import { DatabaseStorage } from '../storage';
import { samplePublications } from '../data/publications';

const router = express.Router();
const storage = new DatabaseStorage();

// Seed publications endpoint
router.post('/seed-publications', requireAdminAuth, async (req, res) => {
  try {
    // Check if publications already exist
    const existingPublications = await storage.getPublications();
    
    if (existingPublications.length > 0) {
      return res.json({ 
        message: 'Publications already seeded', 
        count: existingPublications.length 
      });
    }
    
    // Insert sample publications
    const insertedPublications = [];
    for (const pub of samplePublications) {
      if (pub.name && pub.logo) {
        const inserted = await storage.createPublication({
          name: pub.name,
          logo: pub.logo,
          website: pub.website || null,
          description: pub.description || null,
          category: pub.category || null,
          tier: pub.tier || null
        });
        insertedPublications.push(inserted);
      }
    }
    
    res.json({ 
      message: 'Publications seeded successfully', 
      count: insertedPublications.length,
      publications: insertedPublications 
    });
  } catch (error) {
    console.error('Error seeding publications:', error);
    res.status(500).json({ error: 'Failed to seed publications' });
  }
});

export default router; 