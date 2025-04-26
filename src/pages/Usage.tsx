
import React from 'react';
import Header from '@/components/Header';
import UsageReport from '@/components/UsageReport';

export default function Usage() {
  return (
    <div className="min-h-screen bg-maiBg">
      <Header />
      <main className="py-8">
        <UsageReport />
      </main>
    </div>
  );
}
