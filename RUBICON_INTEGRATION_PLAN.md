# Rubicon PR Group → QuoteBid Integration Plan

## Current Flow (Problem)
```
User → quotebid.co → Direct registration → Platform access
```

## Desired Flow (Solution)
```
User → rubiconprgroup.com → Registration → Invitation code → quotebid.co → Platform access
```

## Implementation Options

### Option A: Invitation Code System (Easiest)

#### 1. Update QuoteBid Registration
- Add "Invitation Code" field to signup
- Validate code before allowing registration
- Hide registration page without valid code

#### 2. Rubicon PR Group Integration
- Generate unique invitation codes
- Send codes via email after Rubicon signup
- Track code usage

#### 3. Code Examples

**QuoteBid Registration Update:**
```javascript
// Add to registration endpoint
app.post('/api/register', async (req, res) => {
  const { invitationCode, ...userData } = req.body;
  
  // Validate invitation code
  const validCode = await validateInvitationCode(invitationCode);
  if (!validCode) {
    return res.status(400).json({ 
      message: 'Valid invitation code required' 
    });
  }
  
  // Proceed with registration...
  // Mark invitation code as used
  await markCodeAsUsed(invitationCode);
});
```

**Landing Page for Direct Access:**
```javascript
// Redirect unauthorized access
app.get('/', (req, res) => {
  if (!req.user && !req.query.invite) {
    return res.redirect('https://rubiconprgroup.com/signup?platform=quotebid');
  }
  // Serve app normally
});
```

### Option B: Domain-Based Authentication

#### 1. Rubicon PR Group Backend
```javascript
// After user signs up on rubiconprgroup.com
app.post('/signup', async (req, res) => {
  // Create user account
  const user = await createUser(userData);
  
  // Generate QuoteBid access token
  const accessToken = jwt.sign({
    rubiconUserId: user.id,
    email: user.email,
    accessLevel: 'quotebid',
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  }, process.env.SHARED_SECRET);
  
  // Email user with QuoteBid access link
  await sendEmail({
    to: user.email,
    subject: 'Access Your QuoteBid Account',
    html: `
      <h1>Welcome to QuoteBid!</h1>
      <p>Click below to complete your QuoteBid setup:</p>
      <a href="https://quotebid.co/activate?token=${accessToken}">
        Access QuoteBid Platform
      </a>
    `
  });
});
```

#### 2. QuoteBid Token Validation
```javascript
// New endpoint for Rubicon referrals
app.get('/activate', async (req, res) => {
  const { token } = req.query;
  
  try {
    const decoded = jwt.verify(token, process.env.SHARED_SECRET);
    
    // Check if user already exists
    let user = await getUserByEmail(decoded.email);
    
    if (!user) {
      // Create QuoteBid account automatically
      user = await createUser({
        email: decoded.email,
        rubiconUserId: decoded.rubiconUserId,
        source: 'rubicon',
        verified: true
      });
    }
    
    // Log user in and redirect to platform
    req.login(user, () => {
      res.redirect('/dashboard');
    });
    
  } catch (error) {
    res.redirect('https://rubiconprgroup.com/signup?error=invalid_token');
  }
});
```

## Immediate Steps

### 1. Update QuoteBid Landing Page
```javascript
// Add to client/src/App.tsx or create new landing
function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          QuoteBid Access Required
        </h1>
        <p className="text-gray-300 mb-8">
          Register with Rubicon PR Group to access QuoteBid
        </p>
        <a 
          href="https://rubiconprgroup.com/signup?platform=quotebid"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
        >
          Get Access via Rubicon PR Group
        </a>
      </div>
    </div>
  );
}
```

### 2. Block Direct Registration
- Remove public signup pages
- Add invitation code requirement
- Redirect unauthorized access to rubiconprgroup.com

### 3. Environment Variables
```env
# Add to .env
RUBICON_SHARED_SECRET=your-shared-secret
RUBICON_API_URL=https://rubiconprgroup.com/api
REQUIRE_INVITATION=true
```

## Timeline
- **Day 1:** Block direct registration, add landing page
- **Day 2:** Implement invitation code system
- **Day 3:** Test Rubicon integration
- **Day 4:** Deploy and monitor

## Benefits
✅ Control user acquisition through Rubicon PR Group
✅ Qualify users before QuoteBid access
✅ Maintain separate brand identities
✅ Track user source and attribution
✅ Gradual rollout capability

Want me to implement Option A (invitation codes) as the quickest solution? 