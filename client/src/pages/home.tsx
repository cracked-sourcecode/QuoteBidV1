import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function Home() {
  const { user } = useAuth();
  
  // Ensure opacity is reset when component mounts
  useEffect(() => {
    document.body.style.opacity = '1';
    document.body.classList.remove('navigating');
    return () => {
      document.body.style.opacity = '1';
    };
  }, []);
  
  // Function for handling login
  const handleLogin = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // Use window.location for a clean transition
    window.location.href = '/login';
  };
  
  // Function for handling signup
  const handleSignup = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // Use window.location for a clean transition
    window.location.href = '/register';
  };

  return (
    <div className="min-h-screen relative">
      {/* Background with opacity */}
      <div className="absolute inset-0 bg-[#004684] opacity-70 z-0"></div>
      
      <div className="relative z-10">
        {/* Navigation Bar */}
        <header className="w-full py-4 px-6 md:px-8 absolute top-0 left-0 z-20">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <span className="text-white font-bold text-2xl tracking-tight">
                <span>Quote</span><span className="font-extrabold">Bid</span>
              </span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/10"
                onClick={handleLogin}
              >
                Log In
              </Button>
              <Button 
                className="bg-white text-[#004684] hover:bg-gray-100"
                onClick={handleSignup}
              >
                Sign Up
              </Button>
            </div>
          </div>
        </header>
      
        {/* Hero Section */}
        <div className="relative text-white overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{ 
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
              backgroundSize: "30px 30px"
            }}></div>
          </div>
          
          <div className="max-w-7xl mx-auto py-20 pt-36 px-4 sm:px-6 lg:px-8 relative">
            <div className="relative z-10 flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 md:pr-12 text-center md:text-left mb-12 md:mb-0">
                <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6 bg-clip-text text-white pb-1">
                  Welcome to PR, <span className="text-yellow-300">Reinvented.</span>
                </h1>
                <p className="text-3xl font-semibold mb-8 text-blue-100">
                  The First-Ever Bidding Marketplace for Media Coverage
                </p>
                <p className="text-xl max-w-3xl mb-10 text-gray-100 leading-relaxed">
                  Join a revolutionary platform—where industry experts like you can bid for earned media instead of paying bloated retainers or inflexible flat fees. 
                  Record your pitch directly with our voice recording feature or write it out—it's the first true marketplace for coverage.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <Button 
                    size="lg" 
                    className="text-lg px-8 py-6 bg-white text-[#004684] hover:bg-gray-100 hover:text-[#004684] transition-all shadow-xl"
                    onClick={handleSignup}
                  >
                    Create an Account
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="text-lg px-8 py-6 bg-transparent border-2 border-white text-white hover:bg-white/10 transition-all"
                    onClick={() => {
                      const section = document.getElementById('what-makes-different');
                      section?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    How It Works
                  </Button>
                </div>
              </div>
              
              <div className="md:w-1/2 flex justify-center md:justify-end">
                <div className="relative w-full max-w-md">
                  {/* Decorative elements */}
                  <div className="absolute -bottom-6 -right-6 w-64 h-64 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                  <div className="absolute -top-6 -left-6 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                  
                  {/* Main visual element */}
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl p-8 relative z-10">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-qpurple" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" stroke="currentColor" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h3 className="font-bold text-lg">Live Opportunity</h3>
                          <p className="text-blue-100 text-sm">New York Times</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-medium">Active</span>
                    </div>
                    
                    <h2 className="text-xl font-bold mb-4">Seeking expert quotes on the future of remote work technology</h2>
                    <p className="text-sm text-blue-100 mb-6">Deadline in 2 days · Current bid: $350</p>
                    
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex">
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">B</div>
                        <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold -ml-2">S</div>
                        <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold -ml-2">M</div>
                        <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold -ml-2">+4</div>
                      </div>
                      <span className="text-sm text-blue-100">8 bids so far</span>
                    </div>
                    
                    <div className="flex space-x-2 mb-2">
                      <span className="px-2 py-1 bg-white/10 rounded text-xs">Technology</span>
                      <span className="px-2 py-1 bg-white/10 rounded text-xs">Workplace</span>
                      <span className="px-2 py-1 bg-white/10 rounded text-xs">Remote Work</span>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-white/20">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-qpurple flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h4 className="font-semibold">Voice recording</h4>
                            <p className="text-xs text-blue-100">AI transcription included</p>
                          </div>
                        </div>
                        <Button size="sm" className="text-white bg-[#004684] hover:bg-[#004684]/90 border-none">
                          Preview
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* What Makes This Different Section */}
        <div id="what-makes-different" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="inline-block px-3 py-1 bg-[#004684]/10 text-[#004684] text-sm font-medium rounded-full mb-3">Key Benefits</span>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">What Makes This Different</h2>
              <div className="h-1 w-20 bg-[#004684] mx-auto"></div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center">
                <div className="h-12 w-12 bg-qpurple/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-6 h-6 text-qpurple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">No Retainers. No Flat Fees.</h3>
                <p className="text-gray-600">Set your price. Bid on what you value. Total control over your media budget.</p>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center">
                <div className="h-12 w-12 bg-qpurple/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-6 h-6 text-qpurple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Only Pay for Results</h3>
                <p className="text-gray-600">You're billed only if your quote is used in a published story. No results, no payment.</p>
              </div>
              
              <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center">
                <div className="h-12 w-12 bg-qpurple/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-6 h-6 text-qpurple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">Real Opportunities, Curated</h3>
                <p className="text-gray-600">Our editorial team screens and sources exclusive requests from major outlets like Forbes, WSJ, and more.</p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div id="how-it-works" className="py-24 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="inline-block px-3 py-1 bg-[#004684]/10 text-[#004684] text-sm font-medium rounded-full mb-3">The Process</span>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Here's How It Works</h2>
              <p className="text-xl text-gray-500 max-w-3xl mx-auto">Our platform simplifies media access with a transparent process from start to finish</p>
            </div>

            <div className="grid gap-16">
              {/* Step 1 */}
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="md:w-1/2 text-center md:text-right">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-qpurple text-white text-2xl font-bold mb-4">1</div>
                  <h3 className="text-2xl font-bold mb-3">Explore Verified Media Requests</h3>
                  <p className="text-gray-600">Access live journalist requests from experts at top-tier publications, updated daily.</p>
                </div>
                <div className="md:w-1/2">
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                    <div className="aspect-video bg-blue-50 rounded-lg flex items-center justify-center mb-4 overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-50"></div>
                      
                      <div className="relative z-10 w-full h-full flex items-center justify-center">
                        <div className="w-4/5 h-4/5 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden flex flex-col">
                          {/* Header bar */}
                          <div className="bg-qpurple text-white py-2 px-4 flex items-center justify-between">
                            <div className="font-medium text-sm">Media Opportunities</div>
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 rounded-full bg-white/50"></div>
                              <div className="w-2 h-2 rounded-full bg-white/50"></div>
                              <div className="w-2 h-2 rounded-full bg-white/50"></div>
                            </div>
                          </div>
                          
                          {/* Content area - opportunity listing */}
                          <div className="flex-1 flex flex-col p-3 gap-2">
                            {/* Opportunity item 1 */}
                            <div className="flex items-center bg-gray-50 rounded p-2">
                              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">WSJ</div>
                              <div className="flex-1">
                                <div className="text-xs font-medium text-gray-900 truncate">Tech experts for digital transformation article</div>
                                <div className="text-xs text-gray-500">Wall Street Journal • $500 min bid</div>
                              </div>
                            </div>
                            
                            {/* Opportunity item 2 */}
                            <div className="flex items-center bg-gray-50 rounded p-2">
                              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">FP</div>
                              <div className="flex-1">
                                <div className="text-xs font-medium text-gray-900 truncate">Finance leaders for market trends interview</div>
                                <div className="text-xs text-gray-500">Financial Post • $350 min bid</div>
                              </div>
                            </div>
                            
                            {/* Opportunity item 3 */}
                            <div className="flex items-center bg-gray-50 rounded p-2">
                              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">TC</div>
                              <div className="flex-1">
                                <div className="text-xs font-medium text-gray-900 truncate">AI startup founders for feature story</div>
                                <div className="text-xs text-gray-500">TechCrunch • $420 min bid</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Business</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Tech</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col md:flex-row-reverse gap-8 items-center">
                <div className="md:w-1/2 text-center md:text-left">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-qpurple text-white text-2xl font-bold mb-4">2</div>
                  <h3 className="text-2xl font-bold mb-3">Pitch with Your Voice or Text</h3>
                  <p className="text-gray-600">Record your pitch with our audio feature or type it out. Our AI transcribes voice recordings for you to review.</p>
                </div>
                <div className="md:w-1/2">
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                    <div className="aspect-video bg-blue-50 rounded-lg flex items-center justify-center mb-4 overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-50"></div>
                      
                      <div className="relative z-10 w-full h-full flex items-center justify-center">
                        <div className="w-4/5 h-4/5 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden flex flex-col">
                          {/* Header bar */}
                          <div className="bg-qpurple text-white py-2 px-4 flex items-center justify-between">
                            <div className="font-medium text-sm">Voice Pitch Recorder</div>
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 rounded-full bg-white/50"></div>
                              <div className="w-2 h-2 rounded-full bg-white/50"></div>
                              <div className="w-2 h-2 rounded-full bg-white/50"></div>
                            </div>
                          </div>
                          
                          {/* Content area - voice recording interface */}
                          <div className="flex-1 flex flex-col items-center justify-between p-4">
                            <div className="w-full flex-1 flex items-center justify-center px-4">
                              {/* Audio visualization */}
                              <div className="w-full h-20 flex items-center justify-center space-x-1">
                                <div className="w-1.5 h-4 bg-qpurple/30 rounded-full animate-pulse" style={{animationDelay: "0ms"}}></div>
                                <div className="w-1.5 h-8 bg-qpurple/50 rounded-full animate-pulse" style={{animationDelay: "100ms"}}></div>
                                <div className="w-1.5 h-12 bg-qpurple/70 rounded-full animate-pulse" style={{animationDelay: "200ms"}}></div>
                                <div className="w-1.5 h-16 bg-qpurple rounded-full animate-pulse" style={{animationDelay: "300ms"}}></div>
                                <div className="w-1.5 h-20 bg-qpurple rounded-full animate-pulse" style={{animationDelay: "400ms"}}></div>
                                <div className="w-1.5 h-16 bg-qpurple rounded-full animate-pulse" style={{animationDelay: "500ms"}}></div>
                                <div className="w-1.5 h-12 bg-qpurple/70 rounded-full animate-pulse" style={{animationDelay: "600ms"}}></div>
                                <div className="w-1.5 h-8 bg-qpurple/50 rounded-full animate-pulse" style={{animationDelay: "700ms"}}></div>
                                <div className="w-1.5 h-4 bg-qpurple/30 rounded-full animate-pulse" style={{animationDelay: "800ms"}}></div>
                              </div>
                            </div>
                            
                            <div className="w-full">
                              {/* Transcription preview */}
                              <div className="bg-gray-50 rounded p-2 text-xs text-gray-500 mb-2 text-center italic">
                                "Transcription appears here in real-time as you speak..."
                              </div>
                              
                              {/* Controls */}
                              <div className="flex items-center justify-center gap-4">
                                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white shadow-md">
                                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                                    <path d="M5.5 9C5.5 5.96243 7.96243 3.5 11 3.5C14.0376 3.5 16.5 5.96243 16.5 9V15C16.5 18.0376 14.0376 20.5 11 20.5C7.96243 20.5 5.5 18.0376 5.5 15V9Z" fill="currentColor" />
                                  </svg>
                                </div>
                                <div className="text-xs text-gray-500">00:42 / 02:00</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action Section */}
        <div className="py-24 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="inline-block px-3 py-1 bg-qpurple/10 text-qpurple text-sm font-medium rounded-full mb-3">Start Today</span>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Join the New Era of Media Access</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
                No retainers. No guesswork. Just you, the story, and a price you control.
              </p>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-8 items-stretch">
              {/* Left side: Benefits */}
              <div className="lg:w-1/2 bg-white rounded-2xl shadow-xl p-8 lg:p-12">
                <h3 className="text-2xl font-bold mb-6 text-gray-900">Transform Your Media Strategy</h3>
                
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-qpurple/10 flex items-center justify-center mr-4">
                      <svg className="w-5 h-5 text-qpurple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold mb-1">Get Published in Top Publications</h4>
                      <p className="text-gray-600">Direct connection to journalists from Forbes, Wall Street Journal, Fast Company, and many more.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-qpurple/10 flex items-center justify-center mr-4">
                      <svg className="w-5 h-5 text-qpurple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold mb-1">Voice Recording with AI Transcription</h4>
                      <p className="text-gray-600">Simple voice pitching with automatic transcription makes it easy to share your expertise.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-qpurple/10 flex items-center justify-center mr-4">
                      <svg className="w-5 h-5 text-qpurple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold mb-1">Pay Only for Results</h4>
                      <p className="text-gray-600">You're charged only when your quote is published. No placement, no cost.</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-10">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="flex -space-x-2">
                      <div className="h-10 w-10 rounded-full border-2 border-white bg-blue-500 flex items-center justify-center text-white font-bold">M</div>
                      <div className="h-10 w-10 rounded-full border-2 border-white bg-green-500 flex items-center justify-center text-white font-bold">J</div>
                      <div className="h-10 w-10 rounded-full border-2 border-white bg-purple-500 flex items-center justify-center text-white font-bold">T</div>
                      <div className="h-10 w-10 rounded-full border-2 border-white bg-yellow-500 flex items-center justify-center text-white font-bold">R</div>
                    </div>
                    <span className="text-gray-500">+218 experts already joined</span>
                  </div>
                </div>
              </div>
              
              {/* Right side: Pricing */}
              <div className="lg:w-1/2 bg-white rounded-2xl overflow-hidden shadow-xl relative">
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-qpurple rounded-full mix-blend-multiply filter blur-2xl opacity-10"></div>
                
                <div className="bg-blue-100 text-black p-8 relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">QuoteBid</h3>
                      <p className="text-gray-700 mt-1">Premium Membership</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline">
                        <span className="text-4xl font-extrabold text-qpurple">$99.99</span>
                        <span className="ml-1 text-lg text-gray-700">/month</span>
                      </div>
                      <p className="text-gray-600 text-sm">Billed monthly</p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-200 rounded-lg p-3 mt-6 text-sm">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-gray-900 font-medium">Subscription required to access the marketplace</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-8">
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start">
                      <svg className="w-6 h-6 text-green-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span>Unlimited access to all media opportunities</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-6 h-6 text-green-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span>Voice recording with AI transcription</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-6 h-6 text-green-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span>Dynamic bidding platform with real-time pricing</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-6 h-6 text-green-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span>Payment only when your quotes get published</span>
                    </li>
                  </ul>
                  
                  <div className="space-y-6">
                    <Button 
                      className="w-full py-7 text-base font-semibold bg-[#004684] hover:bg-[#003a70] transition-all" 
                      size="lg"
                      onClick={handleSignup}
                    >
                      Get Full Marketplace Access
                    </Button>
                    
                    <div className="text-center">
                      <p className="text-gray-500 text-sm">
                        Cancel anytime. No contracts. No commitments.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}