import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
    payment_completed: false,
  });

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
            <PaymentStep
              onNext={handleNext}
              onBack={handleBack}
              onPaymentSuccess={handlePaymentSuccess}
            />
          )}
          {currentStep === 1 && (
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