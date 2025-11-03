import React, { useState, useEffect, useCallback } from 'react';
import { InfoIcon } from './icons/InfoIcon';

interface ApiKeySelectorProps {
  children: React.ReactNode;
}

// Fix: The previous inline type for `window.aistudio` was conflicting with
// another global declaration. Using a named `AIStudio` interface ensures
// consistency across declarations.
declare global {
    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }
    interface Window {
        // FIX: Made `aistudio` optional to resolve a declaration conflict.
        // The implementation already checks for its existence, making this change safe.
        aistudio?: AIStudio;
    }
}

const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ children }) => {
  const [hasKey, setHasKey] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkApiKey = useCallback(async () => {
    setIsChecking(true);
    if(window.aistudio) {
        const keyStatus = await window.aistudio.hasSelectedApiKey();
        setHasKey(keyStatus);
    } else {
        // Fallback for local development or if script fails to load
        setHasKey(!!process.env.API_KEY);
    }
    setIsChecking(false);
  }, []);
  
  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  const handleSelectKey = async () => {
    if(window.aistudio) {
        await window.aistudio.openSelectKey();
        // Optimistically assume key is selected and re-render children
        setHasKey(true);
    }
  };

  if (isChecking) {
    return (
      <div className="flex justify-center items-center p-8 bg-gray-800 rounded-lg">
        <p className="text-lg">Checking API key status...</p>
      </div>
    );
  }

  if (!hasKey) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg border border-purple-500/30 text-center">
        <div className="flex items-center justify-center mb-4 text-purple-400">
            <InfoIcon />
            <h3 className="text-xl font-semibold ml-2">API Key Required for Video Generation</h3>
        </div>
        <p className="text-gray-300 mb-4">
          To use Veo video generation, you must select a valid API key. This will be used for all video-related API calls.
        </p>
        <p className="text-sm text-gray-400 mb-6">
          For more information on billing, please visit the{' '}
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:underline"
          >
            official documentation
          </a>.
        </p>
        <button
          onClick={handleSelectKey}
          className="bg-purple-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-purple-700 transition-colors duration-300"
        >
          Select API Key
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default ApiKeySelector;
