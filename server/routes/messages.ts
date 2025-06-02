import express from 'express';
import { getDb } from '../db.js';
import { pitchMessages, pitches, users, adminUsers } from '../../shared/schema.js';
import { eq, desc, and, or, sql } from 'drizzle-orm';
import { ensureAuth } from '../middleware/ensureAuth.js';
import { requireAdminAuth } from '../admin-auth-middleware.js';

const router = express.Router();

// Get all messages for a specific pitch (User endpoint)
router.get('/pitch/:pitchId', ensureAuth, async (req, res) => {
  try {
    const pitchId = parseInt(req.params.pitchId);
    const userId = req.user?.id;

    if (!pitchId) {
      return res.status(400).json({ error: 'Pitch ID is required' });
    }

    // Verify the user owns this pitch
    const pitch = await getDb()
      .select()
      .from(pitches)
      .where(eq(pitches.id, pitchId))
      .limit(1);

    if (!pitch.length || pitch[0].userId !== userId) {
      return res.status(403).json({ error: 'Access denied to this pitch' });
    }

    // Get messages with sender information
    const messages = await getDb()
      .select({
        id: pitchMessages.id,
        pitchId: pitchMessages.pitchId,
        senderId: pitchMessages.senderId,
        isAdmin: pitchMessages.isAdmin,
        message: pitchMessages.message,
        createdAt: pitchMessages.createdAt,
        isRead: pitchMessages.isRead,
        senderName: sql<string>`CASE WHEN ${pitchMessages.isAdmin} = true THEN 'Admin User' ELSE ${users.fullName} END`,
        senderAvatar: sql<string | null>`CASE WHEN ${pitchMessages.isAdmin} = true THEN NULL ELSE ${users.avatar} END`,
      })
      .from(pitchMessages)
      .leftJoin(users, eq(pitchMessages.senderId, users.id))
      .where(eq(pitchMessages.pitchId, pitchId))
      .orderBy(pitchMessages.createdAt);

    res.json(messages);
  } catch (error) {
    console.error('Error fetching pitch messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a new message (User endpoint)
router.post('/pitch/:pitchId', ensureAuth, async (req, res) => {
  try {
    const pitchId = parseInt(req.params.pitchId);
    const userId = req.user?.id;
    const { message } = req.body;

    if (!pitchId || !message?.trim()) {
      return res.status(400).json({ error: 'Pitch ID and message are required' });
    }

    // Verify the user owns this pitch
    const pitch = await getDb()
      .select()
      .from(pitches)
      .where(eq(pitches.id, pitchId))
      .limit(1);

    if (!pitch.length || pitch[0].userId !== userId) {
      return res.status(403).json({ error: 'Access denied to this pitch' });
    }

    // Create the message
    const [newMessage] = await getDb()
      .insert(pitchMessages)
      .values({
        pitchId,
        senderId: userId,
        isAdmin: false,
        message: message.trim(),
        isRead: false,
      })
      .returning();

    // Get user info for response
    const user = await getDb()
      .select({ fullName: users.fullName, avatar: users.avatar })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const responseMessage = {
      ...newMessage,
      senderName: user[0]?.fullName || 'Unknown User',
      senderAvatar: user[0]?.avatar || null,
    };

    res.status(201).json(responseMessage);
  } catch (error) {
    console.error('Error creating pitch message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get all messages for a specific pitch (Admin endpoint)
router.get('/admin/pitch/:pitchId', requireAdminAuth, async (req, res) => {
  try {
    const pitchId = parseInt(req.params.pitchId);

    if (!pitchId) {
      return res.status(400).json({ error: 'Pitch ID is required' });
    }

    // Check if the pitch exists
    const pitch = await getDb()
      .select()
      .from(pitches)
      .where(eq(pitches.id, pitchId))
      .limit(1);

    if (!pitch.length) {
      return res.status(404).json({ error: 'Pitch not found' });
    }

    // Get messages with sender information
    const messages = await getDb()
      .select({
        id: pitchMessages.id,
        pitchId: pitchMessages.pitchId,
        senderId: pitchMessages.senderId,
        isAdmin: pitchMessages.isAdmin,
        message: pitchMessages.message,
        createdAt: pitchMessages.createdAt,
        isRead: pitchMessages.isRead,
        senderName: sql<string>`CASE WHEN ${pitchMessages.isAdmin} = true THEN 'Admin User' ELSE ${users.fullName} END`,
        senderAvatar: sql<string | null>`CASE WHEN ${pitchMessages.isAdmin} = true THEN NULL ELSE ${users.avatar} END`,
      })
      .from(pitchMessages)
      .leftJoin(users, eq(pitchMessages.senderId, users.id))
      .where(eq(pitchMessages.pitchId, pitchId))
      .orderBy(pitchMessages.createdAt);

    res.json(messages);
  } catch (error) {
    console.error('Error fetching pitch messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a new message (Admin endpoint)
router.post('/admin/pitch/:pitchId', requireAdminAuth, async (req, res) => {
  try {
    const pitchId = parseInt(req.params.pitchId);
    const { message } = req.body;

    if (!pitchId || !message?.trim()) {
      return res.status(400).json({ error: 'Pitch ID and message are required' });
    }

    // Check if the pitch exists
    const pitch = await getDb()
      .select()
      .from(pitches)
      .where(eq(pitches.id, pitchId))
      .limit(1);

    if (!pitch.length) {
      return res.status(404).json({ error: 'Pitch not found' });
    }

    // Get admin user ID from session
    const adminId = req.session.adminUser?.id;
    if (typeof adminId !== 'number') {
      return res.status(400).json({ error: 'Admin ID not found in session' });
    }

    // Create the message
    const [newMessage] = await getDb()
      .insert(pitchMessages)
      .values({
        pitchId,
        senderId: adminId,
        isAdmin: true,
        message: message.trim(),
        isRead: false,
      })
      .returning();

    const responseMessage = {
      ...newMessage,
      senderName: 'Admin User',
      senderAvatar: null,
    };

    res.status(201).json(responseMessage);
  } catch (error) {
    console.error('Error creating pitch message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read (Admin endpoint)
router.post('/admin/pitch/:pitchId/mark-read', requireAdminAuth, async (req, res) => {
  try {
    const pitchId = parseInt(req.params.pitchId);
    const adminId = req.session.adminUser?.id;

    if (!pitchId) {
      return res.status(400).json({ error: 'Pitch ID is required' });
    }

    if (!adminId) {
      return res.status(400).json({ error: 'Admin ID not found in session' });
    }

    // Mark all unread messages from users as read
    await getDb()
      .update(pitchMessages)
      .set({ isRead: true })
      .where(and(
        eq(pitchMessages.pitchId, pitchId),
        eq(pitchMessages.isAdmin, false),
        eq(pitchMessages.isRead, false)
      ));

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to update messages' });
  }
});

// Get all conversations with unread counts (Admin endpoint)
router.get('/admin/conversations', requireAdminAuth, async (req, res) => {
  try {
    // Get all pitches that have messages with latest message info
    const conversationsQuery = await getDb()
      .select({
        pitchId: pitches.id,
        pitchContent: pitches.content,
        pitchStatus: pitches.status,
        pitchCreatedAt: pitches.createdAt,
        opportunityId: pitches.opportunityId,
        userId: users.id,
        userFullName: users.fullName,
        userAvatar: users.avatar,
        lastMessage: pitchMessages.message,
        lastMessageDate: pitchMessages.createdAt,
      })
      .from(pitches)
      .innerJoin(users, eq(pitches.userId, users.id))
      .leftJoin(pitchMessages, eq(pitches.id, pitchMessages.pitchId))
      .orderBy(desc(pitchMessages.createdAt));

    // Transform to expected format
    const conversations = conversationsQuery.map(row => ({
      pitchId: row.pitchId,
      pitch: {
        id: row.pitchId,
        content: row.pitchContent,
        status: row.pitchStatus,
        createdAt: row.pitchCreatedAt,
        opportunityId: row.opportunityId,
      },
      user: {
        id: row.userId,
        fullName: row.userFullName,
        avatar: row.userAvatar,
      },
      lastMessage: row.lastMessage,
      lastMessageDate: row.lastMessageDate,
      unreadCount: 0, // We'll calculate this separately if needed
    }));

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

export default router; 