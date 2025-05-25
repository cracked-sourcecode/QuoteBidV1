import { apiRequest } from "./queryClient";

export type SignupStage = 'payment' | 'profile' | 'ready' | 'legacy';

export interface SignupStageInfo {
  stage: SignupStage;
  nextStage?: SignupStage;
  message?: string;
}

interface ProfileUpdateData {
  fullName?: string;
  company_name?: string;
  phone_number?: string;
  industry?: string;
  title?: string;
  location?: string;
  bio?: string;
}

/**
 * Get the current signup stage for a user
 * @param email User's email
 * @returns The current signup stage and next stage
 */
export async function getUserSignupStage(email: string): Promise<SignupStageInfo> {
  try {
    const encodedEmail = encodeURIComponent(email);
    const response = await apiRequest('GET', `/api/signup-stage/${encodedEmail}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching signup stage:', error);
    return { stage: 'payment' }; // Default to the first stage on error
  }
}

/**
 * Advance a user to the next signup stage
 * @param email User's email
 * @param action The current stage we're completing
 * @param data Additional data to pass with the stage advancement
 * @returns The updated stage information
 */
export async function advanceSignupStage(email: string, action: SignupStage, data?: any): Promise<SignupStageInfo> {
  try {
    const encodedEmail = encodeURIComponent(email);
    const response = await apiRequest('POST', `/api/signup-stage/${encodedEmail}/advance`, { action, ...data });
    return await response.json();
  } catch (error) {
    console.error('Error advancing signup stage:', error);
    return { stage: action }; // Return the same stage on error
  }
}

/**
 * Update user profile information during signup
 * @param email User's email
 * @param profileData Profile data to update
 * @returns Result of the update operation
 */
export async function updateSignupProfile(email: string, profileData: ProfileUpdateData): Promise<{success: boolean}> {
  try {
    const encodedEmail = encodeURIComponent(email);
    const response = await apiRequest('PATCH', `/api/signup-stage/${encodedEmail}/profile`, profileData);
    return await response.json();
  } catch (error) {
    console.error('Error updating profile during signup:', error);
    return { success: false };
  }
}

/**
 * Helper function to store user email in localStorage during signup flow
 * This is needed because we don't have JWTs at this point in the process
 */
export function storeSignupEmail(email: string): void {
  localStorage.setItem('signup_email', email);
}

/**
 * Get user email from localStorage during signup flow
 */
export function getSignupEmail(): string | null {
  return localStorage.getItem('signup_email');
}

/**
 * Helper function to store user name in localStorage during signup flow
 * This is used for generating the PDF agreement
 */
export function storeSignupName(name: string): void {
  localStorage.setItem('signup_name', name);
}

/**
 * Get user name from localStorage during signup flow
 */
export function getSignupName(): string | null {
  return localStorage.getItem('signup_name');
}

/**
 * Helper function to store registration data in localStorage during signup flow
 * This is used to store the initial registration data before account creation
 */
export function storeSignupData(data: any): void {
  localStorage.setItem('signup_data', JSON.stringify(data));
}

/**
 * Get registration data from localStorage during signup flow
 */
export function getSignupData(): any | null {
  const data = localStorage.getItem('signup_data');
  return data ? JSON.parse(data) : null;
}

/**
 * Clear signup data from localStorage after signup is complete or abandoned
 */
export function clearSignupData(): void {
  localStorage.removeItem('signup_email');
  localStorage.removeItem('signup_name');
  localStorage.removeItem('signup_data');
}

/**
 * Helper function to redirect user to the appropriate page based on their signup stage
 * @param stage Current signup stage
 * @returns The URL to redirect to
 */
export function getRedirectUrlForStage(stage: SignupStage): string {
  switch (stage) {
    case 'payment':
      return '/payment';
    case 'profile':
      return '/profile-setup';
    case 'ready':
    case 'legacy':
      return '/';
    default:
      return '/payment';
  }
}

/**
 * Determine the next application route based on a signup stage
 */
export function nextRouteForStage(stage: SignupStage): string {
  switch (stage) {
    case 'payment':
      return '/profile-setup';
    case 'profile':
      return '/opportunities';
    default:
      return '/opportunities';
  }
}