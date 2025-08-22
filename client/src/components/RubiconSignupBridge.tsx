import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, CreditCard, Building2, ArrowLeft } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface SignupData {
  company: string;
  industry: string;
  role: string;
  description: string;
}

function PaymentForm({ signupData, onSuccess }: { signupData: SignupData; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    try {
      // Create payment method
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (pmError) {
        setError(pmError.message || 'Payment failed');
        return;
      }

      // Set up subscription via Rubicon
      const rubiconBaseUrl = process.env.VITE_RUBICON_INTEGRATION === 'true' 
        ? (process.env.VITE_RUBICON_BASE_URL || 'https://www.rubiconprgroup.com')
        : 'https://www.rubiconprgroup.com';

      const response = await fetch(`${rubiconBaseUrl}/api/quotebid/setup-subscription`, {
        method: 'POST',
        credentials: 'include', // Include cookies for auth
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          companyInfo: signupData
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Payment failed');
        return;
      }

      // Handle 3D Secure if needed
      if (result.client_secret) {
        const { error: confirmError } = await stripe.confirmCardPayment(result.client_secret);
        if (confirmError) {
          setError(confirmError.message || 'Payment confirmation failed');
          return;
        }
      }

      // Complete setup on QuoteBid side
      const setupResponse = await fetch('/api/quotebid/complete-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyInfo: signupData })
      });

      const setupResult = await setupResponse.json();

      if (!setupResponse.ok) {
        setError(setupResult.error || 'Setup completion failed');
        return;
      }

      onSuccess();

    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Complete Your QuoteBid Setup</h3>
        <p className="text-gray-600">
          Secure your access to premium PR opportunities
        </p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-semibold">QuoteBid Professional</h4>
            <p className="text-sm text-gray-600">Full platform access</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">$99</div>
            <div className="text-sm text-gray-600">/month</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Label>Payment Method</Label>
        <div className="border rounded-md p-3">
          <CardElement 
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': { color: '#aab7c4' },
                },
              },
            }}
          />
        </div>
        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}
      </div>

      <Button 
        onClick={handleSubmit} 
        className="w-full"
        disabled={!stripe || loading}
        size="lg"
      >
        {loading ? 'Processing...' : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Complete Setup - $99/month
          </>
        )}
      </Button>

      <div className="text-xs text-gray-500 text-center">
        Cancel anytime • Secure payment via Stripe
      </div>
    </div>
  );
}

function CompanyForm({ onNext, onBack }: { onNext: (data: SignupData) => void; onBack: () => void }) {
  const [company, setCompany] = useState('');
  const [industry, setIndustry] = useState('');
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');

  const industries = [
    'Accounting',
    'Capital Markets', 
    'Crypto',
    'Culinary',
    'Doctor',
    'Fitness',
    'Law',
    'Mortgage',
    'Politics',
    'Real Estate'
  ];

  const handleNext = () => {
    onNext({ company, industry, role, description });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Building2 className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold">Company Information</h3>
        <p className="text-gray-600">Help us customize your QuoteBid experience</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="company">Company Name *</Label>
          <Input
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Your company name"
            required
          />
        </div>

        <div>
          <Label htmlFor="industry">Industry *</Label>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger>
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {industries.map((ind) => (
                <SelectItem key={ind} value={ind}>{ind}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="role">Your Role</Label>
          <Input
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g., Marketing Director, PR Manager"
          />
        </div>

        <div>
          <Label htmlFor="description">Company Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of your company (optional)"
            rows={3}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Rubicon
        </Button>
        <Button 
          onClick={handleNext} 
          className="flex-1"
          disabled={!company || !industry}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

function SuccessScreen({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      
      <div>
        <h3 className="text-xl font-bold text-gray-900">Welcome to QuoteBid!</h3>
        <p className="text-gray-600 mt-2">
          Your account is ready. Let's start building your PR success!
        </p>
      </div>

      <div className="bg-green-50 p-4 rounded-lg">
        <p className="text-sm text-green-700">
          ✓ Payment method added<br />
          ✓ Company profile created<br />
          ✓ Full platform access activated
        </p>
      </div>

      <Button onClick={onComplete} className="w-full" size="lg">
        Enter QuoteBid Dashboard
      </Button>
    </div>
  );
}

export default function RubiconSignupBridge() {
  const [currentStep, setCurrentStep] = useState<'company' | 'payment' | 'success'>('company');
  const [signupData, setSignupData] = useState<SignupData>({
    company: '',
    industry: '',
    role: '',
    description: ''
  });

  const handleCompanyNext = (data: SignupData) => {
    setSignupData(data);
    setCurrentStep('payment');
  };

  const handlePaymentSuccess = () => {
    setCurrentStep('success');
  };

  const handleComplete = () => {
    // Redirect to QuoteBid dashboard
    window.location.href = '/app';
  };

  const handleBackToRubicon = () => {
    window.location.href = process.env.VITE_RUBICON_BASE_URL || 'https://www.rubiconprgroup.com';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>QuoteBid Setup</CardTitle>
            <p className="text-sm text-gray-600">Complete your account setup to get started</p>
          </CardHeader>
          
          <CardContent>
            <Elements stripe={stripePromise}>
              {currentStep === 'company' && (
                <CompanyForm 
                  onNext={handleCompanyNext}
                  onBack={handleBackToRubicon}
                />
              )}
              {currentStep === 'payment' && (
                <PaymentForm 
                  signupData={signupData}
                  onSuccess={handlePaymentSuccess}
                />
              )}
              {currentStep === 'success' && (
                <SuccessScreen onComplete={handleComplete} />
              )}
            </Elements>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}