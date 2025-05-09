
import React from 'react';
import { KeyInfo, Entity, NounChunk, KeyVerb, SVOTriple } from '@/types/chat';
import { Badge } from '@/components/ui/badge';

interface KeyInfoDisplayProps {
  keyInfo: KeyInfo;
}

const KeyInfoDisplay: React.FC<KeyInfoDisplayProps> = ({ keyInfo }) => {
  if (!keyInfo) return null;

  const { entities, nounChunks, keyVerbs, svoTriples, extractionTime, processingModel, error } = keyInfo;

  if (error) {
    return <div className="text-red-500">Error extracting information: {error}</div>;
  }

  // Check if we have any meaningful data to display
  const hasData = 
    (entities && entities.length > 0) || 
    (nounChunks && nounChunks.length > 0) || 
    (keyVerbs && keyVerbs.length > 0) || 
    (svoTriples && svoTriples.length > 0);

  if (!hasData) {
    return <div className="text-gray-500 italic">No key information extracted</div>;
  }

  return (
    <div className="key-info text-xs">
      <h4 className="font-semibold mb-1">Extracted Information</h4>
      
      {entities && entities.length > 0 && (
        <div className="mb-2">
          <h5 className="font-medium text-gray-700">Entities:</h5>
          <div className="flex flex-wrap gap-1 mt-1">
            {entities.map((entity, index) => (
              <Badge key={index} variant="outline" className="text-[10px]">
                {entity.text} <span className="text-gray-500 ml-1">({entity.label})</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {nounChunks && nounChunks.length > 0 && (
        <div className="mb-2">
          <h5 className="font-medium text-gray-700">Key Phrases:</h5>
          <div className="flex flex-wrap gap-1 mt-1">
            {nounChunks.map((chunk, index) => (
              <Badge key={index} variant="outline" className="text-[10px]">
                {chunk.text}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {keyVerbs && keyVerbs.length > 0 && (
        <div className="mb-2">
          <h5 className="font-medium text-gray-700">Action Words:</h5>
          <div className="flex flex-wrap gap-1 mt-1">
            {keyVerbs.map((verb, index) => (
              <Badge key={index} variant="outline" className="text-[10px]">
                {verb.text}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {svoTriples && svoTriples.length > 0 && (
        <div className="mb-2">
          <h5 className="font-medium text-gray-700">Subject-Action-Object:</h5>
          <ul className="list-disc pl-5 mt-1">
            {svoTriples.map((triple, index) => (
              <li key={index} className="text-[10px]">
                <span className="font-medium">{triple.subject}</span> →{' '}
                <span className="italic">{triple.verb}</span> →{' '}
                <span>{triple.object}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="text-[10px] text-gray-500 mt-2">
        Extracted at: {new Date(extractionTime).toLocaleString()}
        {processingModel && ` • Model: ${processingModel}`}
      </div>
    </div>
  );
};

export default KeyInfoDisplay;
