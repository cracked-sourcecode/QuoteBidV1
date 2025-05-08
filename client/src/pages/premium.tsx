import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Premium() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Elevate Your Media Connections</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Join Qwoted Premium to unlock exclusive pitching features and gain a competitive edge
          in landing media opportunities
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-12 mb-16">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-start mb-4">
              <div className="bg-qpurple/10 p-3 rounded-full mr-4">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6 text-qpurple" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Voice Pitch Recording</h3>
                <p className="text-gray-600">Record professional voice pitches directly in your browser and get AI-powered transcripts instantly.</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-start mb-4">
              <div className="bg-qpurple/10 p-3 rounded-full mr-4">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6 text-qpurple" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Strategic Bidding System</h3>
                <p className="text-gray-600">Gain access to our advanced bidding system that lets you compete for high-value media opportunities.</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-start mb-4">
              <div className="bg-qpurple/10 p-3 rounded-full mr-4">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6 text-qpurple" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Real-time Notifications</h3>
                <p className="text-gray-600">Get instant alerts when you're outbid or when new opportunities matching your expertise are posted.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-start mb-4">
              <div className="bg-qpurple/10 p-3 rounded-full mr-4">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6 text-qpurple" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" 
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Pitch Transcript Refinement</h3>
                <p className="text-gray-600">Edit and refine your voice pitch transcripts before submitting to ensure perfect communication.</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-start mb-4">
              <div className="bg-qpurple/10 p-3 rounded-full mr-4">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6 text-qpurple" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Performance Analytics</h3>
                <p className="text-gray-600">Access detailed analytics on your pitch success rates, bidding history, and opportunity engagement.</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-start mb-4">
              <div className="bg-qpurple/10 p-3 rounded-full mr-4">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6 text-qpurple" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Premium Access</h3>
                <p className="text-gray-600">Get priority access to high-value opportunities before they become available to non-premium users.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 relative">
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-qpurple text-white px-4 py-1 rounded-full text-sm font-medium">
            Most Popular
          </div>
          <h2 className="text-2xl font-bold text-center mb-4">Monthly Premium</h2>
          <div className="text-center mb-6">
            <span className="text-4xl font-bold">$24.99</span>
            <span className="text-gray-600 ml-1">/month</span>
            <p className="text-gray-500 mt-1">Cancel anytime</p>
          </div>
          
          <ul className="space-y-3 mb-8">
            <li className="flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-green-500 mr-2" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                  clipRule="evenodd" 
                />
              </svg>
              <span>All premium features</span>
            </li>
            <li className="flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-green-500 mr-2" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                  clipRule="evenodd" 
                />
              </svg>
              <span>Unlimited voice recordings</span>
            </li>
            <li className="flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-green-500 mr-2" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                  clipRule="evenodd" 
                />
              </svg>
              <span>Real-time bidding notifications</span>
            </li>
            <li className="flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-green-500 mr-2" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                  clipRule="evenodd" 
                />
              </svg>
              <span>Priority opportunity access</span>
            </li>
          </ul>
          
          <Button asChild className="w-full" size="lg">
            <Link href="/subscribe">
              Subscribe Monthly
            </Link>
          </Button>
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-2xl font-bold text-center mb-4">Annual Premium</h2>
          <div className="text-center mb-6">
            <span className="text-4xl font-bold">$99.99</span>
            <span className="text-gray-600 ml-1">/year</span>
            <p className="text-gray-500 mt-1">Save over 66%</p>
          </div>
          
          <ul className="space-y-3 mb-8">
            <li className="flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-green-500 mr-2" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                  clipRule="evenodd" 
                />
              </svg>
              <span>All premium features</span>
            </li>
            <li className="flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-green-500 mr-2" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                  clipRule="evenodd" 
                />
              </svg>
              <span>Unlimited voice recordings</span>
            </li>
            <li className="flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-green-500 mr-2" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                  clipRule="evenodd" 
                />
              </svg>
              <span>Priority email support</span>
            </li>
            <li className="flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 text-green-500 mr-2" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                  clipRule="evenodd" 
                />
              </svg>
              <span>Premium user badge</span>
            </li>
          </ul>
          
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link href="/checkout">
              Pay Annually
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="text-center">
        <h3 className="text-lg font-medium mb-4">Still have questions?</h3>
        <p className="text-gray-600 max-w-2xl mx-auto mb-6">
          Contact our support team to learn more about our premium features
          and how they can help you connect with top media opportunities.
        </p>
        <Button variant="outline">Contact Support</Button>
      </div>
    </div>
  );
}