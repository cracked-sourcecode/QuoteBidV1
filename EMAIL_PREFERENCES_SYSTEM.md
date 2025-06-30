# 📧 QuoteBid Email Preferences System

## Overview
The email preferences system allows users to control which types of emails they receive from QuoteBid through three main categories: **Alerts**, **Billing**, and **Notifications**. Each email template is categorized and respects user preferences.

## 🗂️ Email Categories

### 📢 **Alerts** (3 emails)
**User Control**: Can disable via `/account` → Alerts toggle
**Purpose**: Price drops and urgent opportunity notifications

- `new-opportunity-alert.html` - New opportunities matching user's expertise  
- `saved-opportunity-alert.html` - Price changes on saved opportunities
- `opportunity-alert.html` - Qwoted-style opportunity notifications (NEW)

### 📬 **Notifications** (6 emails)  
**User Control**: Can disable via `/account` → Notifications toggle
**Purpose**: Pitch journey and platform updates

- `draft-reminder.html` - Reminder to complete pitch draft
- `pitch-sent.html` - Pitch sent and price secured  
- `pitch-submitted.html` - Pitch submitted to reporter
- `pitch-interested.html` - Reporter showed interest
- `pitch-rejected.html` - Pitch was not selected
- `article-published.html` - Success! Pitch published in article

### 💳 **Billing** (2 emails)
**User Control**: Can disable via `/account` → Billing toggle  
**Purpose**: Payment confirmations and billing notifications

- `billing-confirmation.html` - Receipt for successful placement billing
- `subscription-renewal-failed.html` - Payment failure for subscription renewal (NEW)

### 🔧 **Utility** (2 emails)
**User Control**: ❌ **Always sent** (security/account management)
**Purpose**: Critical account functionality

- `welcome.html` - Welcome email for new users
- `password-reset.html` - Password reset functionality

## 🎯 Database Schema

```sql
-- users table has JSONB column for email preferences
emailPreferences: {
  "alerts": true,        -- Controls alerts category emails
  "notifications": true, -- Controls notifications category emails  
  "billing": true        -- Controls billing category emails
}
```

## 🔗 API Endpoints

### GET `/api/users/:userId/email-preferences`
**Purpose**: Fetch user's current email preferences
**Auth**: JWT required (user can only access their own preferences)
**Response**:
```json
{
  "alerts": true,
  "notifications": true, 
  "billing": true
}
```

### PATCH `/api/users/:userId/email-preferences` 
**Purpose**: Update user's email preferences
**Auth**: JWT required (user can only modify their own preferences)
**Body**:
```json
{
  "alerts": boolean,
  "notifications": boolean,
  "billing": boolean
}
```

## 🎨 UI Implementation

### Location: `/account` page → Email Preferences section
- **Component**: `client/src/components/EmailPreferences.tsx`
- **Design**: Three toggle switches for each category
- **Behavior**: Real-time updates via PATCH API

### Toggle States:
- ✅ **ON**: User receives emails in this category
- ❌ **OFF**: User does not receive emails in this category  
- 🔒 **Utility emails**: Always sent regardless of preferences

## ⚙️ Email Sending Logic

### Preference Checking
```typescript
// Function in server/lib/email.ts
async function checkUserEmailPreference(
  email: string, 
  preferenceType: 'alerts' | 'notifications' | 'billing'
): Promise<boolean>
```

### Category Mapping
```typescript
const preferenceMap = {
  'opportunity': 'notifications',     // New opportunities
  'pitch_status': 'notifications',    // Pitch journey updates  
  'payment': 'billing',              // Payment confirmations
  'media_coverage': 'notifications', // Article published
  'price_drop': 'alerts'            // Price alerts
};
```

### Email Flow
1. **Email triggered** → Check user's preference for category
2. **If enabled** → Send email  
3. **If disabled** → Skip email (return success)
4. **Utility emails** → Always send (bypass preferences)

## 🆕 New Additions

### Subscription Renewal Failure Email
- **File**: `subscription-renewal-failed.html`
- **Category**: Billing  
- **Purpose**: Notify when subscription payment fails
- **Design**: Red warning theme with clear action buttons
- **Variables**: `{{userFirstName}}`, `{{subscriptionPlan}}`, `{{monthlyAmount}}`, `{{nextAttemptDate}}`, `{{cardLast4}}`

### Qwoted-Style Opportunity Alert
- **File**: `opportunity-alert.html`  
- **Category**: Alerts
- **Purpose**: Clean, professional opportunity notifications
- **Design**: Matches Qwoted email style with QuoteBid branding

## 🧪 Testing

### Email Preferences Test Script
```bash
node test-email-preferences.mjs
```

**Tests**:
- ✅ Email categorization (13 total emails)
- ✅ Template file accessibility  
- ✅ API endpoint structure
- ✅ Subscription renewal email inclusion

## 🚀 Production Ready Features

### ✅ **Implemented**
- Database schema with JSONB preferences
- API endpoints for GET/PATCH preferences  
- UI toggles in account settings
- Email categorization and preference checking
- All 13 email templates mobile-optimized
- New subscription renewal failure email
- Qwoted-style opportunity alert email

### 🔧 **How It Works**
1. User toggles preferences in `/account`
2. Frontend calls PATCH API to update database
3. When emails are triggered, system checks user preferences
4. Only sends emails if user has that category enabled
5. Utility emails (welcome, password reset) always send for security

## 📊 Email Template Summary

| Category | Count | User Control | Purpose |
|----------|-------|--------------|---------|
| Alerts | 3 | ✅ Yes | Price drops, urgent opportunities |
| Notifications | 6 | ✅ Yes | Pitch journey, platform updates |  
| Billing | 2 | ✅ Yes | Payments, subscription issues |
| Utility | 2 | ❌ Always Send | Account security, critical functions |
| **Total** | **13** | **11 Controllable** | **Complete email system** |

## 🎯 Business Impact

### Retention Benefits
- **No subscription success emails** → Prevents payment reminder fatigue
- **User control** → Reduces unsubscribes, improves engagement
- **Categorized preferences** → Users can customize experience

### Technical Benefits  
- **Mobile-optimized** → All templates work on mobile devices
- **Click tracking** → Alert emails track pricing engine engagement
- **Preference respect** → Improves deliverability and user satisfaction

---

## 🏁 Status: **PRODUCTION READY** ✅

The email preferences system is fully implemented and ready for production use. Users can control their email experience while critical account functions remain protected. 