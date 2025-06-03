#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixRoutes() {
  try {
    const filePath = path.join(__dirname, 'routes.ts');
    let content = fs.readFileSync(filePath, 'utf8');
    
    console.log('🔧 Fixing server/routes.ts...');
    
    // 1. Fix duplicate imports - remove any extra import lines for the same modules
    const importLines = content.split('\n').filter(line => line.includes('import { insertBidSchema'));
    if (importLines.length > 1) {
      console.log('✅ Removing duplicate imports...');
      // Keep only the first occurrence
      let firstImportFound = false;
      content = content.split('\n').filter(line => {
        if (line.includes('import { insertBidSchema') && line.includes('from "@shared/schema"')) {
          if (!firstImportFound) {
            firstImportFound = true;
            return true;
          }
          return false;
        }
        return true;
      }).join('\n');
    }
    
    // 2. Fix getDb().execute calls - remove the generic type parameter
    console.log('✅ Fixing getDb().execute() calls...');
    // Pattern: getDb().execute<SomeType[]>(sql`...`)
    content = content.replace(/getDb\(\)\.execute<[^>]+>\(/g, 'getDb().execute(');
    
    // Fix the result access pattern - change .rows to direct array access
    content = content.replace(/const validUsers = await getDb\(\)\.execute\(([\s\S]*?)\);\s*if \(!validUsers\.rows \|\| validUsers\.rows\.length === 0\)/g, 
      'const validUsers = await getDb().execute($1);\n        if (!validUsers || validUsers.length === 0)');
    
    content = content.replace(/validUsers\.rows\[0\]/g, '(validUsers[0] as any)');
    content = content.replace(/allUsers\.rows/g, 'allUsers');
    content = content.replace(/invalidUserPlacements\.rows/g, 'invalidUserPlacements');
    content = content.replace(/needsEmailPlacements\.rows/g, 'needsEmailPlacements');
    content = content.replace(/needsStripeCustomerPlacements\.rows/g, 'needsStripeCustomerPlacements');
    
    // 3. Fix all req.isAuthenticated() calls
    console.log('✅ Fixing req.isAuthenticated() calls...');
    // Replace all occurrences of req.isAuthenticated() with isRequestAuthenticated(req)
    content = content.replace(/!req\.isAuthenticated\(\)/g, '!isRequestAuthenticated(req)');
    content = content.replace(/req\.isAuthenticated\(\)/g, 'isRequestAuthenticated(req)');
    
    // 4. Fix error handling - add type assertions for unknown errors
    console.log('✅ Fixing error type assertions...');
    content = content.replace(/catch \(error\) {/g, 'catch (error: any) {');
    content = content.replace(/catch \(aiError\) {/g, 'catch (aiError: any) {');
    content = content.replace(/catch \(stripeError\) {/g, 'catch (stripeError: any) {');
    content = content.replace(/catch \(urlError\) {/g, 'catch (urlError: any) {');
    content = content.replace(/catch \(dbErr\) {/g, 'catch (dbErr: any) {');
    
    // 5. Fix missing property issues on User type
    console.log('✅ Adding non-null assertions for req.user...');
    // After authentication checks, we know req.user exists
    content = content.replace(/req\.user\.id/g, 'req.user!.id');
    content = content.replace(/req\.user\.email/g, 'req.user!.email');
    
    // 6. Fix specific sql template issues with column names
    console.log('✅ Fixing SQL column names...');
    content = content.replace(/p\.user_id/g, 'p."userId"');
    content = content.replace(/u\.user_id/g, 'u.id');
    
    // Write the fixed content back
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✨ All fixes applied successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing routes:', error);
    process.exit(1);
  }
}

fixRoutes(); 