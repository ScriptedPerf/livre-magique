
import React, { useState, useRef, useEffect } from 'react';
import { VOICES, VoiceName } from '../types';

interface VoiceSelectorProps {
  selectedVoice: VoiceName;
  onVoiceChange: (voice: VoiceName) => void;
  uiLang: 'FR' | 'EN';
}

const translations = {
  FR: { selectVoice: "Choisir la voix" },
  EN: { selectVoice: "Select Voice" }
};

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoice, onVoiceChange, uiLang }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeVoice = VOICES.find(v => v.name === selectedVoice);
  const t = translations[uiLang];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white hover:shadow-md transition-all text-slate-700"
      >
        <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
        <span className="text-xs font-bold uppercase tracking-wider">{activeVoice?.name}</span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 bg-slate-50 border-b border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t.selectVoice}</span>
          </div>
          <div className="p-1">
            {VOICES.map((voice) => (
              <button
                key={voice.name}
                onClick={() => {
                  onVoiceChange(voice.name);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${selectedVoice === voice.name
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-slate-50 text-slate-600'
                  }`}
              >
                <div className="text-left">
                  <div className="text-sm font-bold">{voice.name}</div>
                  <div className="text-[10px] opacity-70">{voice.description}</div>
                </div>
                {selectedVoice === voice.name && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.74-5.24Z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceSelector;
