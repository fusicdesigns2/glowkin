
import React, { useState } from 'react';
import Header from '@/components/Header';
import ChatInterface from '@/components/ChatInterface';
import ThreadList from '@/components/ThreadList';
import { useAuth } from '@/contexts/AuthContext';
import { Loading } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export default function Index() {
  const { user, isLoading } = useAuth();
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const togglePanel = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-maiBg flex items-center justify-center">
        <Loading size="lg" text="Loading application..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-maiBg flex flex-col">
      <Header />
      
      <main className="flex-grow flex">
        {user ? (
          <div className="flex w-full relative">
            {isPanelOpen && <ThreadList />}
            <Button 
              onClick={togglePanel} 
              variant="ghost" 
              size="icon" 
              className="absolute top-2 left-2 z-50 bg-[#403E43] text-white hover:bg-[#403E43]/80"
            >
              {isPanelOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
            <div className={`flex-grow transition-all duration-300 ${isPanelOpen ? 'ml-64' : 'ml-0'} bg-[#0000FF]/5`}>
              <ChatInterface />
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto p-8">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4 text-maiRed">Welcome to Mai Mai</h1>
              <p className="text-xl text-gray-600 mb-8">
                Your pay-as-you-go AI assistant. Get answers without breaking the bank.
              </p>
              
              <div className="flex justify-center space-x-4">
                <button 
                  onClick={() => window.location.href = "/register"} 
                  className="px-6 py-3 bg-maiRed text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
                >
                  Get Started
                </button>
                <button 
                  onClick={() => window.location.href = "/login"} 
                  className="px-6 py-3 bg-white text-maiDarkText border border-gray-300 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Log In
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="mb-4 text-maiGold">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Pay As You Go</h3>
                <p className="text-gray-600">
                  Only pay for what you use. No subscriptions, no hidden fees.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="mb-4 text-maiRed">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Smart Answers</h3>
                <p className="text-gray-600">
                  Powered by the latest AI models for accurate, helpful responses.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="mb-4 text-maiBlue">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Secure & Private</h3>
                <p className="text-gray-600">
                  Your conversations and data are securely protected.
                </p>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
              <h2 className="text-2xl font-bold mb-6">Get 5 Free Credits When You Sign Up</h2>
              <p className="text-gray-600 mb-6">
                Try Mai Mai risk-free with 5 complimentary credits. Experience the power of AI without
                committing to an expensive subscription.
              </p>
              <button 
                onClick={() => window.location.href = "/register"}
                className="px-6 py-3 bg-maiRed text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
              >
                Create Your Account
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-[#403E43] text-white py-4 px-6 text-center">
        <p>&copy; {new Date().getFullYear()} Mai Mai. All rights reserved.</p>
      </footer>
    </div>
  );
}
