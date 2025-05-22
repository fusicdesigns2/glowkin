
import { useState } from 'react';
import { funFactsArray } from '@/data/funFacts';

export const useFunFacts = () => {
  const [funFacts] = useState<string[]>(funFactsArray);
  const [currentFunFact, setCurrentFunFact] = useState<string>(funFactsArray[0]);

  const refreshFunFact = () => {
    const randomIndex = Math.floor(Math.random() * funFacts.length);
    setCurrentFunFact(funFacts[randomIndex]);
  };

  return {
    funFacts,
    currentFunFact,
    refreshFunFact
  };
};
