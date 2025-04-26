
import React from 'react';
import Header from '@/components/Header';
import BuyCreditsForm from '@/components/BuyCreditsForm';

export default function BuyCredits() {
  return (
    <div className="min-h-screen bg-maiBg">
      <Header />
      <main className="py-8">
        <BuyCreditsForm />
      </main>
    </div>
  );
}
