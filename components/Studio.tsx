
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Condition, 
  Platform, 
  BackgroundStyle, 
  StudioConfig, 
  ImageResult, 
  ListingIntelligence 
} from '../types';
import { ANGLE_PROMPTS_SYSTEM_PROMPT, buildAnglePromptsUserText, buildListingUserText, LISTING_SYSTEM_PROMPT } from '../constants';
import { generateAnglePrompts, generateImageWithFallback, generateListingIntelligence } from '../services/pollinationsService';
import { ListingEditor } from './ListingEditor';

// Access heic2any from global scope
declare const heic2any: any;

interface Props {
  apiKey: string;
  onLogout: () => void;
}

export const Studio: React.FC<Props> = ({ apiKey, onLogout }) => {
  const [config, setConfig] = useState<StudioConfig>({
    itemName: '',
    brand: '',
    condition: Condition.New,
    categoryHint: '',
    platform: Platform.FB,
    backgroundStyle: BackgroundStyle.PureWhite,
    imageSize: 1024,
    seed: Math.floor(Math.random() * 100000),
    referenceImageUrls: [],
    safeMode: true,
  });

  const [images, setImages] = useState<ImageResult[]>([
    { id: 'Front', label: 'Front', url: null, status: 'idle', fallbackUsed: false },
    { id: '3/4 Angle', label: '3/4 Angle', url: null, status: 'idle', fallbackUsed: false },
    { id: 'Side', label: 'Side', url: null, status: 'idle', fallbackUsed: false },
    { id: 'Detail', label: 'Detail', url: null, status: 'idle', fallbackUsed: false },
  ]);

  const [listing, setListing] = useState<ListingIntelligence | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'photos' | 'listing'>('photos');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [referenceUrlInput, setReferenceUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageObjectUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      for (const url of imageObjectUrlsRef.current) URL.revokeObjectURL(url);
      imageObjectUrlsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    };
  }, [uploadPreview]);

  const trackImageObjectUrl = (url: string | null) => {
    if (url && url.startsWith('blob:')) imageObjectUrlsRef.current.add(url);
  };

  const revokeImageObjectUrl = (url: string | null) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
      imageObjectUrlsRef.current.delete(url);
    }
  };

  const downloadImage = async (url: string, label: string) => {
    try {
      if (url.startsWith('blob:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${config.itemName || 'product'}-${label.toLowerCase().replace(' ', '-')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${config.itemName || 'product'}-${label.toLowerCase().replace(' ', '-')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed', err);
      window.open(url, '_blank');
    }
  };

  const addReferenceUrl = (rawUrl: string) => {
    const url = rawUrl.trim();
    if (!url) return;

    setConfig(prev => {
      if (prev.referenceImageUrls.includes(url)) return prev;
      return { ...prev, referenceImageUrls: [...prev.referenceImageUrls, url] };
    });
    setReferenceUrlInput('');
  };

  const uploadImage = async (file: File) => {
    setIsUploading(true);
    const previewUrl = URL.createObjectURL(file);
    setUploadPreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return previewUrl;
    });

    try {
      let fileToUpload: File | Blob = file;
      
      // Handle HEIC conversion
      const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                     file.name.toLowerCase().endsWith('.heif') || 
                     file.type === 'image/heic' || 
                     file.type === 'image/heif';
      
      if (isHeic && typeof heic2any !== 'undefined') {
        try {
          console.log('Converting HEIC...');
          const converted = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.8
          });
          const blob = Array.isArray(converted) ? converted[0] : converted;
          fileToUpload = new File([blob], "image.jpg", { type: "image/jpeg" });
        } catch (e) {
          console.error('HEIC conversion failed:', e);
        }
      } else {
        // Ensure standard files are properly wrapped
        const type = file.type || "image/jpeg";
        fileToUpload = new File([file], file.name || "image.jpg", { type });
      }

      const formData = new FormData();
      // Imgur expects 'image'
      formData.append('image', fileToUpload);

      // Using generic public Client-ID for anonymous upload
      // This is better for demos than Cloudinary which requires signed presets often
      const response = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: {
          Authorization: 'Client-ID e74929424854589', // Public demo key
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.data?.error || `Upload failed: ${response.status}`);
      }

      // Ensure HTTPS
      const secureUrl = result.data.link.replace('http://', 'https://');
      addReferenceUrl(secureUrl);
    } catch (error: any) {
      console.error('Upload error details:', error);
      alert(`Upload Limit/Error: ${error.message}\n\nThis app uses a public free upload key which may be busy. \n\nSOLUTION: Upload your image to postimages.org (free) and paste the 'Direct Link' here.`);
    } finally {
      setIsUploading(false);
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadImage(file);
    }
  }, []);

  const handleCreateListing = async () => {
    if (config.referenceImageUrls.length === 0) {
      alert('Please provide at least one product reference photo (URL or upload) first.');
      return;
    }

    setIsGenerating(true);
    setListing(null);
    setImages(prev =>
      prev.map(img => {
        revokeImageObjectUrl(img.url);
        return { ...img, status: 'loading', url: null, fallbackUsed: false, error: undefined, prompt: undefined, modelUsed: undefined };
      })
    );

    try {
      const intelligence = await generateListingIntelligence({
        apiKey,
        systemPrompt: LISTING_SYSTEM_PROMPT,
        userText: buildListingUserText(config),
        referenceImageUrls: config.referenceImageUrls,
      });
      setListing(intelligence);

      const promptPack = await generateAnglePrompts({
        apiKey,
        systemPrompt: ANGLE_PROMPTS_SYSTEM_PROMPT,
        userText: buildAnglePromptsUserText({ context: config, listingPhotoStylePrompt: intelligence?.photo_style_prompt }),
        referenceImageUrls: config.referenceImageUrls,
      });

      const imagePromises = images.map(async (img, index) => {
        const prompt = promptPack?.prompts?.[img.label] || '';
        if (!prompt) {
          setImages(prev => prev.map(p => (p.id === img.id ? { ...p, status: 'error', error: 'Missing prompt for this angle.' } : p)));
          return;
        }

        try {
          const result = await generateImageWithFallback({
            apiKey,
            prompt,
            width: config.imageSize,
            height: config.imageSize,
            seed: config.seed + index,
            safe: config.safeMode,
            referenceImageUrls: config.referenceImageUrls,
            negativePrompt: promptPack.negative_prompt,
          });

          trackImageObjectUrl(result.objectUrl);
          setImages(prev =>
            prev.map(p =>
              p.id === img.id
                ? {
                    ...p,
                    url: result.objectUrl,
                    status: 'success',
                    fallbackUsed: result.fallbackUsed,
                    error: result.warning,
                    prompt,
                    modelUsed: result.modelUsed,
                  }
                : p
            )
          );
        } catch (error: any) {
          setImages(prev =>
            prev.map(p =>
              p.id === img.id ? { ...p, status: 'error', error: error?.message || 'Failed to render studio view', prompt } : p
            )
          );
        }
      });

      await Promise.allSettled(imagePromises);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to generate listing/images.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto min-h-screen grid grid-cols-1 lg:grid-cols-[420px_1fr]">
      <aside className="bg-white border-r border-gray-100 p-8 h-screen overflow-y-auto sticky top-0 shadow-sm z-10">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1F3D2B] flex items-center justify-center text-white font-bold shadow-sm">S</div>
            <h1 className="text-xl font-bold tracking-tight text-[#141414]">SnapSell</h1>
          </div>
          <button onClick={onLogout} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors">Forget Key</button>
        </div>

        <div className="space-y-10">
          <section>
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Product Reference</h2>
              {config.referenceImageUrls.length > 0 && (
                <button
                  onClick={() => setConfig(prev => ({ ...prev, referenceImageUrls: [] }))}
                  className="text-[10px] font-bold text-[#1F3D2B] hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Image URL (Best Reliability)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="w-full p-3 rounded-xl border border-gray-100 text-xs focus:border-[#1F3D2B] focus:ring-4 focus:ring-[#1F3D2B]/5 focus:outline-none transition-all bg-[#FAFAF7]"
                    placeholder="Paste a direct image link (ends with .jpg/.png/etc)"
                    value={referenceUrlInput}
                    onChange={(e) => setReferenceUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addReferenceUrl(referenceUrlInput)}
                  />
                  <button
                    type="button"
                    onClick={() => addReferenceUrl(referenceUrlInput)}
                    className="px-4 rounded-xl bg-white border border-gray-100 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-40"
                    disabled={!referenceUrlInput.trim()}
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-gray-300"><span className="bg-white px-2">Or Upload</span></div>
              </div>

              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative aspect-video rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-4 group ${
                  isDragging ? 'border-[#1F3D2B] bg-[#1F3D2B]/5' : 
                  (config.referenceImageUrls.length > 0 || uploadPreview) ? 'border-[#1F3D2B]/20 bg-white' : 'border-gray-200 bg-[#FAFAF7] hover:bg-gray-50'
                }`}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/png,image/jpeg,image/jpg,image/heic,image/heif" />
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-2 border-[#1F3D2B]/10 border-t-[#1F3D2B] rounded-full animate-spin" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase animate-pulse">Uploading to Imgur...</span>
                  </div>
                ) : uploadPreview ? (
                  <div className="w-full h-full relative overflow-hidden rounded-lg">
                    <img src={uploadPreview} alt="Upload preview" className="w-full h-full object-contain opacity-70" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold uppercase tracking-widest bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm">Upload Another</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className={`w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 transition-transform ${isDragging ? 'scale-110' : 'group-hover:scale-110'}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    </div>
                    <p className="text-[10px] font-bold text-gray-700 uppercase tracking-tighter">{isDragging ? 'Drop here' : 'Click to upload'}</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Powered by Imgur</p>
                  </div>
                )}
              </div>

              {config.referenceImageUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {config.referenceImageUrls.map((url, idx) => (
                    <div key={`${url}-${idx}`} className="relative rounded-xl overflow-hidden border border-gray-100 bg-white">
                      <img src={url} alt={`Reference ${idx + 1}`} className="w-full h-20 object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setConfig(prev => ({
                            ...prev,
                            referenceImageUrls: prev.referenceImageUrls.filter((u, i) => !(u === url && i === idx)),
                          }))
                        }
                        className="absolute top-1 right-1 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-lg"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-5">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Item Context</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Item Name</label>
                <input 
                  type="text" 
                  className="w-full p-3 rounded-xl border border-gray-100 text-sm focus:border-[#1F3D2B] focus:ring-4 focus:ring-[#1F3D2B]/5 focus:outline-none transition-all"
                  placeholder="e.g. Sony WH-1000XM5 Headphones"
                  value={config.itemName}
                  onChange={(e) => setConfig({ ...config, itemName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Brand</label>
                  <input 
                    type="text" 
                    className="w-full p-3 rounded-xl border border-gray-100 text-sm focus:border-[#1F3D2B] focus:ring-4 focus:ring-[#1F3D2B]/5 focus:outline-none transition-all"
                    placeholder="e.g. Sony"
                    value={config.brand}
                    onChange={(e) => setConfig({ ...config, brand: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5 ml-1">Condition</label>
                  <select 
                    className="w-full p-3 rounded-xl border border-gray-100 text-sm bg-white focus:border-[#1F3D2B] focus:outline-none transition-all"
                    value={config.condition}
                    onChange={(e) => setConfig({ ...config, condition: e.target.value as Condition })}
                  >
                    {Object.values(Condition).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Studio Setup</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(BackgroundStyle).map(bg => (
                <button
                  key={bg}
                  onClick={() => setConfig({ ...config, backgroundStyle: bg })}
                  className={`p-3 text-[10px] font-bold uppercase rounded-xl border transition-all ${
                    config.backgroundStyle === bg 
                      ? 'border-[#1F3D2B] text-[#1F3D2B] bg-[#1F3D2B]/5 ring-2 ring-[#1F3D2B]/10 border-2' 
                      : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </section>

          <section className="border-t border-gray-50 pt-4">
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
            >
              Advanced Settings
              <span>{showAdvanced ? '−' : '+'}</span>
            </button>
            {showAdvanced && (
              <div className="mt-4 space-y-5 animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Safe Mode</label>
                  <button 
                    onClick={() => setConfig({...config, safeMode: !config.safeMode})}
                    className={`w-10 h-5 rounded-full relative transition-colors ${config.safeMode ? 'bg-[#1F3D2B]' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.safeMode ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1">Output Size (1:1 Ratio)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[1024, 768].map(size => (
                      <button
                        key={size}
                        onClick={() => setConfig({...config, imageSize: size as 768 | 1024})}
                        className={`p-2 text-[10px] font-bold rounded-lg border transition-all ${
                          config.imageSize === size 
                            ? 'border-[#1F3D2B] text-[#1F3D2B] bg-[#1F3D2B]/5' 
                            : 'bg-white text-gray-400 border-gray-100'
                        }`}
                      >
                        {size}px
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <div className="pt-6">
            <button
              onClick={handleCreateListing}
              disabled={isGenerating || isUploading || config.referenceImageUrls.length === 0}
              className="w-full bg-[#1F3D2B] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:opacity-95 shadow-md shadow-[#1F3D2B]/10 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating Pack...
                </>
              ) : 'Create Listing Pack'}
            </button>
            <p className="text-[10px] text-center text-gray-400 mt-4 font-bold uppercase tracking-widest opacity-60">4 Studio angles + marketplace copy</p>
          </div>
        </div>
      </aside>

      <main className="p-8 lg:p-14 overflow-y-auto bg-[#FAFAF7]">
        <div className="flex border-b border-gray-200 mb-10">
          <button 
            onClick={() => setActiveTab('photos')}
            className={`px-8 py-4 font-bold text-sm border-b-2 transition-all relative ${activeTab === 'photos' ? 'border-[#1F3D2B] text-[#1F3D2B]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            Studio Images
            {activeTab === 'photos' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1F3D2B]" />}
          </button>
          <button 
            onClick={() => setActiveTab('listing')}
            className={`px-8 py-4 font-bold text-sm border-b-2 transition-all relative ${activeTab === 'listing' ? 'border-[#1F3D2B] text-[#1F3D2B]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            Listing Pack
            {activeTab === 'listing' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1F3D2B]" />}
          </button>
        </div>

        {activeTab === 'photos' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {images.map(img => (
              <div key={img.id} className="bg-white rounded-[2rem] border border-gray-200 overflow-hidden flex flex-col group hover:shadow-2xl hover:shadow-[#1F3D2B]/5 transition-all duration-500">
                <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-white">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#141414]">{img.label}</span>
                  {img.fallbackUsed && (
                    <div className="group/tip relative">
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-100 font-bold uppercase tracking-tighter">Studio Refined</span>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 p-3 bg-[#141414] text-white text-[10px] rounded-xl opacity-0 pointer-events-none group-hover/tip:opacity-100 transition-all shadow-xl z-20 leading-relaxed">
                        {img.error || "A secondary model was used to maintain item accuracy and details."}
                      </div>
                    </div>
                  )}
                </div>
                <div className="aspect-square relative flex items-center justify-center bg-[#FAFAF7]">
                  {img.status === 'idle' && (
                    <div className="text-gray-300 flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center">
                         <svg className="w-6 h-6 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Ready to generate</span>
                    </div>
                  )}
                  {img.status === 'loading' && (
                    <div className="flex flex-col items-center gap-6">
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-[#1F3D2B]/5 border-t-[#1F3D2B] rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#1F3D2B]">AI</div>
                      </div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Rendering {img.label}...</span>
                    </div>
                  )}
                  {img.status === 'success' && img.url && (
                    <img src={img.url} alt={img.label} className="w-full h-full object-contain animate-in fade-in zoom-in-95 duration-1000" />
                  )}
                  {img.status === 'error' && (
                    <div className="text-red-400 text-xs font-bold text-center p-8 bg-red-50/50 rounded-2xl border border-red-50">
                      {img.error || 'Failed to render studio view'}
                    </div>
                  )}
                </div>
                <div className="p-5 border-t border-gray-50 flex gap-3 bg-white">
                  <button 
                    disabled={img.status !== 'success'} 
                    onClick={() => img.url && downloadImage(img.url, img.label)} 
                    className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest bg-[#1F3D2B] text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download
                  </button>
                  <button 
                    disabled={img.status !== 'success' || !img.prompt} 
                    onClick={() => { if (img.prompt) { navigator.clipboard.writeText(img.prompt); alert('Prompt copied!'); } }} 
                    className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-30"
                  >
                    Copy Prompt
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {!listing ? (
              <div className="py-32 text-center">
                <div className="w-20 h-20 bg-white border border-gray-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-gray-200 shadow-sm">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h3 className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-2">Ready to compile</h3>
                <p className="text-gray-400 text-xs max-w-xs mx-auto">Generate a pack to see optimized marketplace copy.</p>
              </div>
            ) : (
              <ListingEditor listing={listing} onChange={setListing} />
            )}
          </div>
        )}
      </main>
    </div>
  );
};
