import { Request, Response, NextFunction } from 'express';

/**
 * QuoteBid Lockdown Middleware
 * 
 * Ensures QuoteBid is completely hidden from the outside world.
 * Only allows access via Rubicon SSO or existing valid sessions.
 * 
 * Redirects any direct access attempts to Rubicon's main site.
 */
export function rubiconLockdownMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip lockdown if Rubicon integration is disabled (for development/testing)
  if (process.env.RUBICON_INTEGRATION !== 'true') {
    return next();
  }

  const path = req.path;
  const isSSO = path === '/sso/consume';
  const isAPI = path.startsWith('/api/');
  const isStatic = path.startsWith('/assets/') || path.includes('.') || path === '/favicon.ico';
  
  // Allow SSO consume endpoint - this is the only entry point from Rubicon
  if (isSSO) {
    console.log(`🔓 Allowing SSO consume: ${req.url}`);
    return next();
  }

  // Allow static assets (CSS, JS, images)
  if (isStatic) {
    return next();
  }

  // Check if user has an active QuoteBid session
  const hasValidSession = req.user && req.user.id;
  
  if (hasValidSession) {
    console.log(`🔓 User ${req.user.id} has valid session, allowing: ${req.url}`);
    return next();
  }

  // For API calls without session, return 401 instead of redirect
  if (isAPI) {
    console.log(`🔒 API call without session blocked: ${req.url}`);
    return res.status(401).json({ 
      error: 'QuoteBid access requires Rubicon authentication',
      redirectUrl: 'https://www.rubiconprgroup.com'
    });
  }

  // Redirect all other direct access attempts to Rubicon
  const rubiconUrl = process.env.RUBICON_BASE_URL || 'https://www.rubiconprgroup.com';
  
  console.log(`🔒 Direct access blocked, redirecting to Rubicon: ${req.url} → ${rubiconUrl}`);
  
  // Preserve UTM parameters and forward them to Rubicon
  const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
  const finalUrl = queryString 
    ? `${rubiconUrl}?${queryString}`
    : rubiconUrl;
    
  res.redirect(302, finalUrl);
}