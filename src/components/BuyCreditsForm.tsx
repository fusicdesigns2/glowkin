
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PricingTier {
  id: string;
  credits: number;
  price: number;
  popular?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    id: 'basic',
    credits: 100,
    price: 5,
  },
  {
    id: 'standard',
    credits: 500,
    price: 20,
    popular: true,
  },
  {
    id: 'premium',
    credits: 1500,
    price: 50,
  }
];

export default function BuyCreditsForm() {
  const { user, updateCredits } = useAuth();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handlePurchase = async () => {
    if (!selectedTier || !user) return;
    
    const tier = pricingTiers.find(t => t.id === selectedTier);
    if (!tier) return;
    
    setIsProcessing(true);
    
    try {
      // Mock payment processing
      await new Promise(r => setTimeout(r, 2000));
      
      // Update user credits
      updateCredits(user.credits + tier.credits);
      
      toast.success(`Successfully purchased ${tier.credits} credits!`);
      setSelectedTier(null);
    } catch (error) {
      toast.error('Payment failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (!user) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Buy Credits</CardTitle>
          <CardDescription>Please log in to purchase credits</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => window.location.href = "/login"} className="w-full bg-maiRed hover:bg-red-600">
            Log in
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">Choose a Credit Package</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {pricingTiers.map((tier) => (
          <Card 
            key={tier.id}
            className={`relative overflow-hidden ${
              selectedTier === tier.id 
                ? 'border-maiRed ring-2 ring-red-200' 
                : 'border-gray-200'
            } ${
              tier.popular ? 'shadow-lg transform md:scale-105' : ''
            }`}
          >
            {tier.popular && (
              <div className="absolute top-0 right-0 bg-maiGold text-white px-3 py-1 text-xs font-semibold">
                POPULAR
              </div>
            )}
            
            <CardHeader>
              <CardTitle className="text-xl">{tier.credits} Credits</CardTitle>
              <CardDescription>
                <span className="text-2xl font-bold">${tier.price}</span>
                <span className="text-sm text-gray-500"> (${(tier.price / tier.credits * 100).toFixed(1)}¢ per credit)</span>
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Perfect for {tier.credits <= 100 ? 'trying out' : tier.credits <= 500 ? 'regular usage' : 'power users'}
              </p>
              <ul className="text-sm space-y-2">
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Access to all models
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  No daily limits
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Credits never expire
                </li>
              </ul>
            </CardContent>
            
            <CardFooter>
              <Button 
                onClick={() => setSelectedTier(tier.id)} 
                variant={selectedTier === tier.id ? "default" : "outline"}
                className={`w-full ${selectedTier === tier.id ? 'bg-maiRed hover:bg-red-600' : ''}`}
              >
                {selectedTier === tier.id ? 'Selected' : 'Select Package'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <div className="text-center">
        <Button 
          onClick={handlePurchase} 
          disabled={!selectedTier || isProcessing}
          className="bg-maiRed hover:bg-red-600 min-w-[200px]"
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            'Purchase Credits'
          )}
        </Button>
        <p className="text-sm text-gray-500 mt-4">
          Payments are processed securely through Stripe. 
          Credits will be added to your account immediately.
        </p>
      </div>
    </div>
  );
}
