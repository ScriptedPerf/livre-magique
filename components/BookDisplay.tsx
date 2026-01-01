
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ContentBlock, VoiceName, Keyword } from '../types';
import { geminiService } from '../services/geminiService';
import { BookRecord } from '../services/dbService';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.mjs`;

interface BookDisplayProps {
  book: BookRecord;
  voice: VoiceName;
  fileUrl: string;
  onBack: () => void;
  onUpdateBlock: (updatedBlock: ContentBlock) => void;
}

const BookDisplay: React.FC<BookDisplayProps> = ({ book, voice, fileUrl, onBack, onUpdateBlock }) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);
  const [currentPage, setCurrentPage] = useState<number>(0); 
  const [rendering, setRendering] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [activeKeyword, setActiveKeyword] = useState<Keyword | null>(null);
  const [isKeywordAudioPlaying, setIsKeywordAudioPlaying] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const timerRef = useRef<number | null>(null);

  const { blocks, fileType, title, coverImage } = book;

  const sortedBlocks = useMemo(() => {
    return [...blocks].sort((a, b) => a.pageNumber - b.pageNumber);
  }, [blocks]);

  const totalPages = useMemo(() => {
    if (pdfDoc) return pdfDoc.numPages;
    const pages = sortedBlocks.map(b => b.pageNumber);
    return pages.length > 0 ? Math.max(...pages) : 1;
  }, [sortedBlocks, pdfDoc]);

  const pageBlocks = useMemo(() => {
    return sortedBlocks.filter(b => b.pageNumber === currentPage);
  }, [sortedBlocks, currentPage]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerSize(entry.contentRect);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (fileType.includes('pdf')) {
      pdfjsLib.getDocument(fileUrl).promise.then(setPdfDoc).catch(console.error);
    }
  }, [fileUrl, fileType]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || containerSize.width === 0 || currentPage === 0) return;
    let renderTask: any = null;
    const renderPage = async () => {
      setRendering(true);
      try {
        const page = await pdfDoc.getPage(currentPage);
        const padding = 48; 
        const unscaledViewport = page.getViewport({ scale: 1 });
        const scale = Math.min((containerSize.width - padding) / unscaledViewport.width, (containerSize.height - padding) / unscaledViewport.height);
        const outputScale = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: scale * outputScale });
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d');
        if (!context) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / outputScale}px`;
        canvas.style.height = `${viewport.height / outputScale}px`;
        // Fix for pdfjs-dist v4+: include the canvas element in render parameters
        renderTask = page.render({ canvas: canvas, canvasContext: context, viewport });
        await renderTask.promise;
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') console.error(err);
      } finally {
        setRendering(false);
      }
    };
    renderPage();
    return () => renderTask?.cancel();
  }, [pdfDoc, currentPage, containerSize]);

  const handlePlay = async (block: ContentBlock) => {
    if (playingId === block.id) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    
    setPlayingId(block.id);
    setActiveWordIndex(-1);

    const segments = block.french.split(/(\s+)/).filter(s => s.length > 0);
    const totalChars = segments.reduce((acc, s) => acc + s.length, 0);

    try {
      const generatedAudio = await geminiService.speak(
        block, 
        voice, 
        (duration) => {
          let elapsed = 0;
          timerRef.current = window.setInterval(() => {
            elapsed += 50;
            const progress = elapsed / (duration * 1000);
            let cumulative = 0;
            let found = 0;
            for (let i = 0; i < segments.length; i++) {
              cumulative += segments[i].length;
              if (cumulative / totalChars >= progress) { found = i; break; }
            }
            setActiveWordIndex(found);
            if (progress >= 1 && timerRef.current) window.clearInterval(timerRef.current);
          }, 50);
        },
        () => {
          setPlayingId(null);
          setActiveWordIndex(-1);
          if (timerRef.current) window.clearInterval(timerRef.current);
        }
      );
      if (generatedAudio && !block.audio) {
        onUpdateBlock({ ...block, audio: generatedAudio });
      }
    } catch (error) {
      setPlayingId(null);
      setActiveWordIndex(-1);
    }
  };

  const playKeywordAudio = async (text: string, cached?: string) => {
    if (isKeywordAudioPlaying) return;
    setIsKeywordAudioPlaying(true);
    if (cached) {
      await geminiService.playCachedAudio(cached, () => setIsKeywordAudioPlaying(false));
    } else {
      geminiService.speakText(text, voice, () => setIsKeywordAudioPlaying(false));
    }
  };

  const renderHighlightedText = (text: string, block: ContentBlock, isPlaying: boolean) => {
    const segments = text.split(/(\s+)/).filter(s => s.length > 0);
    return segments.map((word, idx) => {
      const active = isPlaying && activeWordIndex === idx;
      const clean = word.replace(/[.,!?;:()]/g, "").toLowerCase().trim();
      const kw = block.keywords?.find(k => k.word.toLowerCase() === clean);
      
      if (/^\s+$/.test(word)) return <span key={idx} className="whitespace-pre-wrap">{word}</span>;

      return (
        <span 
          key={idx} 
          onClick={(e) => {
            e.stopPropagation();
            if (kw) setActiveKeyword(kw);
          }}
          className={`transition-all px-0.5 rounded cursor-pointer inline-block ${active ? 'bg-yellow-200 text-slate-900 scale-110 shadow-sm z-10' : kw ? 'border-b-2 border-blue-400 font-bold bg-blue-50/30' : ''}`}
        >
          {word}
        </span>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between shadow-sm z-30 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg></button>
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
            <button disabled={currentPage <= 0} onClick={() => { setCurrentPage(p => p - 1); setActiveKeyword(null); }} className="p-1.5 rounded-lg hover:bg-white disabled:opacity-20 transition-all"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg></button>
            <div className="px-4 text-[10px] font-black text-slate-600 min-w-[80px] text-center uppercase tracking-tighter">{currentPage === 0 ? 'Intro' : `P. ${currentPage} / ${totalPages}`}</div>
            <button disabled={currentPage >= totalPages} onClick={() => { setCurrentPage(p => p + 1); setActiveKeyword(null); }} className="p-1.5 rounded-lg hover:bg-white disabled:opacity-20 transition-all"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg></button>
          </div>
        </div>
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[150px]">{title}</h2>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className="w-full md:w-[60%] h-[45%] md:h-full p-4 flex flex-col shrink-0 z-10">
          <div ref={containerRef} className="flex-1 bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden relative flex items-center justify-center">
            {currentPage === 0 ? (
               <div className="w-full h-full relative group">
                  {coverImage ? <img src={`data:image/jpeg;base64,${coverImage}`} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-200 opacity-10"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-32 h-32"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25v14.25" /></svg></div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 flex flex-col justify-end p-12 text-center">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-6 leading-tight">{title}</h1>
                    <button onClick={() => setCurrentPage(1)} className="mx-auto bg-white text-blue-600 font-black py-4 px-10 rounded-2xl shadow-xl transition-transform active:scale-95 uppercase text-xs tracking-widest">Lire le livre</button>
                  </div>
               </div>
            ) : fileType.includes('pdf') ? (
              <div className="w-full h-full relative overflow-auto flex items-center justify-center p-4 bg-slate-50 relative">
                <canvas ref={canvasRef} className="shadow-2xl rounded-sm max-w-full max-h-full transition-opacity duration-500" style={{ opacity: rendering ? 0.6 : 1 }} />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center p-8 bg-slate-50/50 overflow-auto">
                <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-sm border border-slate-100">
                  <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-6 border-b pb-2">Texte Original</h3>
                  <div className="space-y-6">
                    {pageBlocks.map(b => (
                      <p key={b.id} className="text-lg font-serif italic text-slate-700 leading-relaxed border-l-4 border-blue-50 pl-6 whitespace-pre-wrap">
                        {renderHighlightedText(b.french, b, playingId === b.id)}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 border-l border-slate-200 shadow-inner z-20">
          <div className="p-6 md:p-10 space-y-6 max-w-xl mx-auto pb-32">
            {currentPage !== 0 && pageBlocks.length === 0 && (
              <div className="py-20 text-center opacity-40"><p className="text-xs font-black uppercase tracking-widest">Page visuelle</p></div>
            )}
            {pageBlocks.map((block) => (
              <div key={block.id} className="space-y-4 animate-in slide-in-from-right-4 duration-500">
                <div onClick={() => handlePlay(block)} className={`relative p-6 rounded-[2rem] border transition-all cursor-pointer group transform ${playingId === block.id ? 'bg-blue-600 border-blue-600 shadow-2xl scale-[1.02]' : 'bg-white border-slate-200 shadow-lg hover:border-blue-300'}`}>
                  <div className="flex gap-6">
                    <div className="flex-1">
                      <p className={`text-xl font-serif leading-relaxed italic transition-colors whitespace-pre-wrap ${playingId === block.id ? 'text-white' : 'text-slate-800'}`}>
                        {renderHighlightedText(block.french, block, playingId === block.id)}
                      </p>
                      <div className={`mt-5 pt-5 border-t transition-colors ${playingId === block.id ? 'border-blue-500/50' : 'border-slate-100'}`}>
                        <p className={`text-sm font-medium ${playingId === block.id ? 'text-blue-100/80' : 'text-slate-400'}`}>{block.english}</p>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-start pt-2">
                      {playingId === block.id ? (
                        <div className="flex items-end gap-1.5 h-8">
                          <div className="w-1.5 bg-white rounded-full animate-bounce h-3"></div>
                          <div className="w-1.5 bg-white rounded-full animate-bounce h-7 [animation-delay:0.2s]"></div>
                          <div className="w-1.5 bg-white rounded-full animate-bounce h-5 [animation-delay:0.4s]"></div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl relative shadow-sm transition-all group-hover:bg-blue-600 group-hover:text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.5 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" clipRule="evenodd" /></svg>
                            {block.audio && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white"></div>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {block.keywords && block.keywords.length > 0 && (
                  <div className="bg-white/50 border border-slate-100 rounded-[1.5rem] p-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {block.keywords.map((kw, i) => (
                        <button 
                          key={i} 
                          onClick={(e) => { e.stopPropagation(); setActiveKeyword(kw === activeKeyword ? null : kw); }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border relative ${activeKeyword === kw ? 'bg-blue-500 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                        >
                          {kw.word}
                          {kw.audio && <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-blue-400 rounded-full"></div>}
                        </button>
                      ))}
                    </div>
                    {activeKeyword && (
                      <div className="bg-white border border-blue-100 rounded-2xl p-4 shadow-sm animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-3">
                           <div className="flex items-center gap-3">
                             <div className="flex flex-col">
                               <span className="text-sm font-black text-blue-600 uppercase tracking-tight">{activeKeyword.word}</span>
                               <span className="text-[10px] text-slate-400 font-serif italic">{activeKeyword.pronunciation}</span>
                             </div>
                             <button 
                               onClick={(e) => { e.stopPropagation(); playKeywordAudio(activeKeyword.word, activeKeyword.audio); }}
                               className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                             >
                               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>
                             </button>
                           </div>
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">{activeKeyword.translation}</span>
                        </div>
                        <div className="bg-blue-50/30 p-3 rounded-xl relative group">
                          <p className="text-xs text-slate-500 leading-relaxed italic pr-8 whitespace-pre-wrap">« {activeKeyword.explanation} »</p>
                          <button 
                             onClick={(e) => { e.stopPropagation(); playKeywordAudio(activeKeyword.explanation, activeKeyword.explanationAudio); }}
                             className="absolute bottom-2 right-2 p-1 text-blue-300 hover:text-blue-500 transition-colors"
                           >
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" /></svg>
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDisplay;
