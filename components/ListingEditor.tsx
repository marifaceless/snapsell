
import React from 'react';
import { ListingIntelligence } from '../types';

interface Props {
  listing: ListingIntelligence;
  onChange: (updated: ListingIntelligence) => void;
}

export const ListingEditor: React.FC<Props> = ({ listing, onChange }) => {
  const updateField = (path: string[], value: any) => {
    const newListing = { ...listing };
    let current: any = newListing;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    onChange(newListing);
  };

  const getFormattedText = () => {
    return `
TITLE: ${listing.platform_listing.title}

DESCRIPTION:
${listing.platform_listing.short_description}

KEY FEATURES:
${listing.platform_listing.bullets.map(b => `• ${b}`).join('\n')}

TAGS: 
${listing.platform_listing.tags.join(', ')}

CONDITION CHECKLIST:
${listing.platform_listing.condition_checklist.map(c => `[ ] ${c}`).join('\n')}

SUGGESTED CATEGORY: ${listing.likely_category}
    `.trim();
  };

  const copyFormatted = () => {
    navigator.clipboard.writeText(getFormattedText());
    alert('Listing copied to clipboard!');
  };

  const exportToTxt = () => {
    const element = document.createElement("a");
    const file = new Blob([getFormattedText()], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `listing-${listing.platform_listing.title.toLowerCase().substring(0, 20).replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h3 className="font-bold text-2xl tracking-tight text-[#141414]">Listing Intelligence</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Marketplace optimized copy</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={copyFormatted}
              className="text-[10px] font-bold uppercase tracking-widest px-5 py-2.5 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
              Copy Text
            </button>
            <button 
              onClick={exportToTxt}
              className="text-[10px] font-bold uppercase tracking-widest px-5 py-2.5 bg-[#1F3D2B] text-white rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export .TXT
            </button>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(listing, null, 2));
                alert('JSON copied!');
              }}
              className="text-[10px] font-bold uppercase tracking-widest px-5 py-2.5 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-all"
            >
              Copy JSON
            </button>
          </div>
        </div>

        <div className="space-y-8">
          <div className="group">
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1 tracking-widest">Optimized Title</label>
            <input
              type="text"
              className="w-full p-4 rounded-2xl border border-gray-100 text-base font-medium focus:outline-none focus:border-[#1F3D2B] focus:ring-4 focus:ring-[#1F3D2B]/5 transition-all bg-[#FAFAF7]/50"
              value={listing.platform_listing.title}
              onChange={(e) => updateField(['platform_listing', 'title'], e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1 tracking-widest">Description</label>
            <textarea
              rows={5}
              className="w-full p-4 rounded-2xl border border-gray-100 text-sm leading-relaxed focus:outline-none focus:border-[#1F3D2B] focus:ring-4 focus:ring-[#1F3D2B]/5 transition-all resize-none bg-[#FAFAF7]/50"
              value={listing.platform_listing.short_description}
              onChange={(e) => updateField(['platform_listing', 'short_description'], e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-4 ml-1 tracking-widest">Key Feature Bullets</label>
            <div className="space-y-3">
              {listing.platform_listing.bullets.map((bullet, idx) => (
                <div key={idx} className="flex items-center gap-4 group">
                  <span className="text-[#1F3D2B] font-bold">•</span>
                  <input
                    type="text"
                    className="flex-1 p-3 rounded-xl border border-gray-100 text-sm focus:outline-none focus:border-[#1F3D2B] transition-all bg-white group-hover:border-gray-200"
                    value={bullet}
                    onChange={(e) => {
                      const newBullets = [...listing.platform_listing.bullets];
                      newBullets[idx] = e.target.value;
                      updateField(['platform_listing', 'bullets'], newBullets);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-50">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-3 ml-1 tracking-widest">Suggested Category</label>
              <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-gray-50 text-xs font-bold text-gray-600 uppercase tracking-tight">
                {listing.likely_category}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-3 ml-1 tracking-widest">Search Tags</label>
              <div className="flex flex-wrap gap-2">
                {listing.platform_listing.tags.map((tag, idx) => (
                  <span key={idx} className="px-3 py-1.5 bg-white text-[10px] font-bold uppercase rounded-lg border border-gray-100 text-gray-500 shadow-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-4 ml-1 tracking-widest">Condition Verification</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {listing.platform_listing.condition_checklist.map((item, idx) => (
                <label key={idx} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-50 hover:bg-[#FAFAF7] hover:border-[#1F3D2B]/20 cursor-pointer transition-all bg-white group shadow-sm">
                  <input type="checkbox" className="w-5 h-5 rounded-lg text-[#1F3D2B] border-gray-200 focus:ring-[#1F3D2B] transition-all cursor-pointer" />
                  <span className="text-xs font-medium text-gray-600 group-hover:text-[#141414]">{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
