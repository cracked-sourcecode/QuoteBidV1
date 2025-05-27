import dotenv from 'dotenv';
dotenv.config();

import { initializeDatabase } from '../db';
import { storage } from '../storage';
import { hashPassword, comparePasswords } from '../utils/passwordUtils';

async function testUserLogin() {
  try {
    // Initialize database
    initializeDatabase();
    
    // Get user by username
    const user = await storage.getUserByUsername('juanc');
    
    if (!user) {
      console.log('User "juanc" not found');
      return;
    }
    
    console.log('User found:', {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      hasPassword: !!user.password,
      passwordLength: user.password?.length
    });
    
    // Test password
    const testPasswords = ['password123', 'password', '123456', 'juanc'];
    
    for (const testPassword of testPasswords) {
      const isValid = await comparePasswords(testPassword, user.password);
      console.log(`Testing password "${testPassword}": ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    }
    
    // Create a test user with known password
    console.log('\nCreating test user with known password...');
    const hashedPassword = await hashPassword('testpass123');
    
    try {
      const testUser = await storage.createUser({
        username: 'testuser',
        password: hashedPassword,
        email: 'testuser@example.com',
        fullName: 'Test User',
        profileCompleted: true,
        signup_stage: 'ready'
      });
      
      console.log('Test user created:', {
        id: testUser.id,
        username: testUser.username,
        email: testUser.email
      });
      console.log('You can now login with username: "testuser" and password: "testpass123"');
    } catch (error: any) {
      if (error.message?.includes('duplicate')) {
        console.log('Test user already exists');
      } else {
        console.error('Error creating test user:', error);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testUserLogin(); 