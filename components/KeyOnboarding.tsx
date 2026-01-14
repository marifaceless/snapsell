
import React, { useState } from 'react';

interface Props {
  onKeySaved: (key: string) => void;
}

export const KeyOnboarding: React.FC<Props> = ({ onKeySaved }) => {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleSave = async () => {
    setError(null);
    const trimmedKey = key.trim();
    
    if (!trimmedKey) {
      setError('Please enter a Pollinations API key.');
      return;
    }

    // Updated Validation: Allow both pk_ and sk_
    if (!trimmedKey.startsWith('pk_') && !trimmedKey.startsWith('sk_')) {
      setError('Invalid key format. Key should start with pk_ or sk_.');
      return;
    }

    setIsValidating(true);
    try {
      // Validate key by making a small request to Pollinations
      const encodedPrompt = encodeURIComponent('ping');
      const response = await fetch(`https://gen.pollinations.ai/text/${encodedPrompt}?key=${trimmedKey}`);
      
      if (response.status === 401 || response.status === 403) {
        setError('Invalid Pollinations API key. Please check your key and try again.');
      } else if (!response.ok) {
        setError(`Connection error (${response.status}). Please try again later.`);
      } else {
        // Key is valid, store locally
        localStorage.setItem('snap_sell_pk', trimmedKey);
        onKeySaved(trimmedKey);
      }
    } catch (err) {
      setError('Failed to connect to Pollinations. Check your internet connection.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#FAFAF7]">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-gray-100 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-[#1F3D2B] flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-[#1F3D2B]/20">S</div>
          <h1 className="text-3xl font-bold tracking-tight text-[#141414]">SnapSell</h1>
        </div>
        
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-2 text-[#141414]">Connect your API key</h2>
          <p className="text-[#5C5C5C] text-sm leading-relaxed">
            Your key stays on this device. Stored locally in your browser. Supports both <code className="bg-gray-100 px-1 rounded text-xs">pk_</code> and <code className="bg-gray-100 px-1 rounded text-xs">sk_</code> keys.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-2 text-gray-400">Pollinations Key</label>
            <div className="relative group">
              <input
                type={showKey ? "text" : "password"}
                className={`w-full p-4 rounded-2xl border ${error ? 'border-red-500 bg-red-50/10' : 'border-gray-200 bg-[#FAFAF7]'} focus:ring-4 focus:ring-[#1F3D2B]/5 focus:border-[#1F3D2B] focus:outline-none transition-all duration-300 font-mono text-sm`}
                placeholder="pk_... or sk_..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                disabled={isValidating}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-[#1F3D2B] transition-colors"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            {key.trim().startsWith('sk_') && !error && (
              <p className="mt-2 text-[10px] text-amber-600 font-medium italic">
                Note: Secret keys are being used locally. Ensure you are on a trusted device.
              </p>
            )}
            {error && (
              <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                </div>
                <p className="text-xs text-red-600 font-bold leading-relaxed">{error}</p>
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={!key.trim() || isValidating}
            className="w-full bg-[#1F3D2B] text-white py-4.5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:opacity-95 shadow-xl shadow-[#1F3D2B]/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isValidating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying Key...
              </>
            ) : (
              'Connect Studio'
            )}
          </button>

          <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest mt-8 font-bold opacity-60">
            Security First • Browser Storage Only
          </p>
        </div>
        
        <div className="mt-10 pt-8 border-t border-gray-100 flex justify-center gap-6">
          <a 
            href="https://pollinations.ai" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-gray-400 hover:text-[#1F3D2B] uppercase tracking-widest transition-colors"
          >
            Get a key
          </a>
          <div className="w-1 h-1 bg-gray-200 rounded-full mt-1.5"></div>
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-gray-400 hover:text-[#1F3D2B] uppercase tracking-widest transition-colors"
          >
            Billing
          </a>
        </div>
      </div>
    </div>
  );
};
