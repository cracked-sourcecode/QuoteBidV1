import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AgreementStep from './steps/AgreementStep';
import PaymentStep from './steps/PaymentStep';
import ProfileStep from './steps/ProfileStep';
import { useToast } from '../contexts/ToastContext';

const SignupWizard: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    phone: '',
    company_name: '',
    industry: '',
    agreement_signed: false,
    payment_completed: false,
  });

  const agreementText = `TERMS AND CONDITIONS

1. Acceptance of Terms
By accessing and using QuoteBid, you agree to be bound by these Terms and Conditions.

2. User Responsibilities
- Provide accurate and complete information
- Maintain the security of your account
- Use the platform in compliance with all applicable laws

3. Service Description
QuoteBid provides a platform for connecting businesses with service providers.

4. Payment Terms
- All fees are non-refundable
- Subscription fees are billed in advance
- Payment processing is handled securely through Stripe

5. Privacy Policy
Your use of QuoteBid is also governed by our Privacy Policy.

6. Intellectual Property
All content and materials available on QuoteBid are protected by intellectual property rights.

7. Limitation of Liability
QuoteBid is not liable for any indirect, incidental, or consequential damages.

8. Termination
We reserve the right to terminate or suspend accounts at our discretion.

9. Changes to Terms
We may modify these terms at any time. Continued use constitutes acceptance.

10. Governing Law
These terms are governed by the laws of the United States.`;

  const handleNext = () => {
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handlePaymentSuccess = () => {
    setFormData((prev) => ({ ...prev, payment_completed: true }));
    handleNext();
  };

  const handleComplete = async (profileData: any) => {
    try {
      const finalData = {
        ...formData,
        ...profileData,
      };

      await register(finalData);
      showToast('Account created successfully!', 'success');
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      showToast('Failed to create account. Please try again.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          {currentStep === 0 && (
            <AgreementStep
              onNext={handleNext}
              onBack={handleBack}
              agreementText={agreementText}
            />
          )}
          {currentStep === 1 && (
            <PaymentStep
              onNext={handleNext}
              onBack={handleBack}
              onPaymentSuccess={handlePaymentSuccess}
            />
          )}
          {currentStep === 2 && (
            <ProfileStep
              onNext={handleNext}
              onBack={handleBack}
              onComplete={handleComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SignupWizard; 