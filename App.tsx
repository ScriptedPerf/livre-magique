
import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from './services/geminiService';
import { dbService, BookRecord } from './services/dbService';
import { VoiceName } from './types';
import VoiceSelector from './components/VoiceSelector';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface ImportingTask {
  id: string;
  fileName: string;
  status: string;
  progress: number;
}

const App: React.FC = () => {
  const [importingTasks, setImportingTasks] = useState<ImportingTask[]>([]);
  const [library, setLibrary] = useState<BookRecord[]>([]);
  const [activeBook, setActiveBook] = useState<BookRecord | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>("Marie");
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [isManagingLibrary, setIsManagingLibrary] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [activeCharIndex, setActiveCharIndex] = useState(-1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const books = await dbService.getAllBooks();
        setLibrary(books);
      } catch (e) { console.error(e); }
    };
    init();
  }, []);

  const updateTaskStatus = (id: string, status: string, progress: number) => {
    setImportingTasks(prev => prev.map(t => t.id === id ? { ...t, status, progress } : t));
  };

  const removeTask = (id: string) => {
    setTimeout(() => {
      setImportingTasks(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };


  const processFile = async (file: File) => {
    const taskId = `task-${Date.now()}`;
    setImportingTasks(prev => [...prev, { id: taskId, fileName: file.name, status: "Démarrage...", progress: 5 }]);

    try {
      console.log("Processing file:", file.name, "Type:", file.type);
      let pages: any[] = [];
      let bookTitle = file.name.replace(/\.[^/.]+$/, "");

      if (file.type === 'application/pdf') {
        updateTaskStatus(taskId, "Lecture PDF...", 10);
        const pdfData = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const numPages = pdf.numPages;
        console.log("PDF loaded, pages:", numPages);

        const seenWords = new Set<string>();

        for (let i = 1; i <= numPages; i++) {
          updateTaskStatus(taskId, `Analyse Page ${i}/${numPages}...`, (i / numPages) * 100);

          console.log(`Rendering page ${i}...`);
          const page = await pdf.getPage(i);
          // Scale 1.5 is a good balance between quality and performance, ensuring full page context
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          // Render context with white background to handle transparency
          if (!context) throw new Error("Could not create canvas context");
          context.fillStyle = "white";
          context.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({ canvasContext: context, canvas, viewport } as any).promise;

          await page.render({ canvasContext: context, canvas, viewport } as any).promise;
          const imageBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

          console.log(`Calling Gemini for page ${i}...`);
          try {
            const result = await geminiService.processPage(imageBase64, selectedVoice);
            console.log(`Page ${i} processed:`, result.title);

            if (i === 1) bookTitle = result.title;

            // Filter out keywords seen in previous pages
            const uniqueKeywords = (result.keywords || []).filter(k => {
              const normalized = k.word.toLowerCase().trim();
              if (seenWords.has(normalized)) return false;
              seenWords.add(normalized);
              return true;
            });

            pages.push({
              id: `page-${Date.now()}-${i}`,
              title: result.title,
              sentences: result.sentences,
              keywords: uniqueKeywords,
              audio: result.audio,
              image: imageBase64
            });
          } catch (e) {
            console.error(`Error processing page ${i}:`, e);
            // Push a placeholder page so the book isn't ruined
            pages.push({
              id: `page-${Date.now()}-${i}`,
              title: "Page (Erreur)",
              sentences: [{ french: "Désolé, cette page n'a pas pu être analysée.", english: "Sorry, this page could not be analyzed." }],
              audio: "",
              image: imageBase64
            });
          }

          // Delay to respect RPM limits
          if (i < numPages) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } else {
        // Text file processing with advanced segmentation
        updateTaskStatus(taskId, "Création du livre...", 30);
        console.log("Processing text book...");
        const text = await file.text();

        const result = await geminiService.processBookFromText(text, selectedVoice);

        // Generate a fallback cover if needed
        // Generate a clean, simple book page visual
        let fallbackImage = "";
        const canvas = document.createElement('canvas');
        canvas.width = 600; canvas.height = 400; // Smaller height (more landscape/card like)
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Richer Background
          const grad = ctx.createLinearGradient(0, 0, 600, 400);
          grad.addColorStop(0, '#fefce8'); // yellow-50
          grad.addColorStop(1, '#fef9c3'); // yellow-100
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 600, 400);

          // "Noise" texture (dots)
          ctx.fillStyle = "rgba(0,0,0,0.02)";
          for (let i = 0; i < 3000; i++) {
            ctx.fillRect(Math.random() * 600, Math.random() * 400, 1, 1);
          }

          // Decorative Border
          ctx.strokeStyle = '#d97706'; // amber-600
          ctx.lineWidth = 3;
          ctx.strokeRect(15, 15, 570, 370);
          ctx.strokeStyle = '#1e3a8a'; // blue-900
          ctx.lineWidth = 1;
          ctx.strokeRect(22, 22, 556, 356);

          // Decorative Corners
          ctx.fillStyle = '#1e3a8a';
          [22, 578].forEach(x => {
            [22, 378].forEach(y => {
              ctx.beginPath();
              ctx.arc(x, y, 4, 0, Math.PI * 2);
              ctx.fill();
            });
          });

          // Title Text
          ctx.fillStyle = '#1e3a8a'; // blue-900
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = 'bold 36px serif';

          // Decorative Underline
          ctx.beginPath();
          ctx.moveTo(250, 150);
          ctx.lineTo(350, 150);
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Simple wrap with improved spacing
          const words = result.title.split(' ');
          let line = '';
          let y = 190;
          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            if (ctx.measureText(testLine).width > 480 && n > 0) {
              ctx.fillText(line, 300, y);
              line = words[n] + ' ';
              y += 48;
            } else {
              line = testLine;
            }
          }
          ctx.fillText(line, 300, y);

          fallbackImage = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        }

        // Add all generated pages
        result.pages.forEach((p, idx) => {
          pages.push({
            id: `page-${Date.now()}-${idx + 1}`,
            title: p.title,
            sentences: p.sentences,
            keywords: p.keywords,
            audio: p.audio,
            image: p.image || fallbackImage // Use fallback if AI image is missing
          });
        });

        bookTitle = result.title;
      }

      const newBook: BookRecord = {
        id: `book-${Date.now()}`,
        title: bookTitle,
        pages: pages,
        dateAdded: Date.now(),
        coverImage: pages[0]?.image || "",
      };

      console.log("Saving new book to DB:", newBook.title);
      await dbService.saveBook(newBook);
      setLibrary(prev => [newBook, ...prev]);

      updateTaskStatus(taskId, "Terminé !", 100);
      removeTask(taskId);

    } catch (error: any) {
      console.error("Critical error in processFile:", error);
      updateTaskStatus(taskId, `Erreur: ${error.message || 'IA'}`, 0);
      removeTask(taskId);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) return;
    const blob = new Blob([pastedText], { type: 'text/plain' });
    const file = new File([blob], `Histoire_${new Date().toLocaleTimeString()}.txt`, { type: 'text/plain' });
    processFile(file);
    setPastedText("");
    setShowPasteModal(false);
  };

  const openBook = (book: BookRecord) => {
    if (isManagingLibrary) return;
    setActiveBook(book);
  };

  const handleUpdateBook = async (updatedBook: BookRecord) => {
    await dbService.saveBook(updatedBook);
    setActiveBook(updatedBook);
    setLibrary(prev => prev.map(b => b.id === activeBook?.id ? updatedBook : b));
  };

  const exportLibrary = async () => {
    try {
      const books = await dbService.getAllBooks();
      const blob = new Blob([JSON.stringify(books)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `biblio-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (error) { alert("Erreur export."); }
  };

  const handleImportLibrary = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      for (const item of data) {
        await dbService.saveBook(item);
      }
      setLibrary(await dbService.getAllBooks());
    } catch (error) { alert("Erreur import."); }
  };

  const deleteBook = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Voulez-vous vraiment supprimer ce livre ?")) return;

    try {
      console.log("Deleting book:", id);
      await dbService.deleteBook(id);
      console.log("Book deleted successfully from DB");
      setLibrary(prev => prev.filter(b => b.id !== id));
      if (activeBook?.id === id) reset();
    } catch (err) {
      console.error("Error deleting book:", err);
      alert("Erreur: Impossible de supprimer le livre.");
    }
  };

  const reset = () => {
    setActiveBook(null);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col h-screen">
      {/* Dynamic Background */}
      <div className="blob-cont pointer-events-none">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <header className="bg-white/50 backdrop-blur-lg border-b border-white/40 z-40 sticky top-0 shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={reset}>
            <img src="/icon.svg" className="w-10 h-10 rounded-xl shadow-lg border border-white/60 group-hover:scale-105 transition-transform" alt="Logo" />
            <h1 className="text-lg font-black text-slate-800 hidden sm:block tracking-tighter uppercase relative top-px">Livre Magique</h1>
          </div>
          <div className="flex items-center gap-4">
            {importingTasks.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-white/60 border border-blue-100 rounded-full shadow-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">IA active</span>
              </div>
            )}
            <div className="voice-selector flex items-center gap-2">
              <VoiceSelector selectedVoice={selectedVoice} onVoiceChange={setSelectedVoice} />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative z-10">
        <div className="absolute bottom-6 right-6 z-50 flex flex-col gap-3 max-w-xs w-full pointer-events-none">
          {importingTasks.map(task => (
            <div key={task.id} className="pointer-events-auto glass p-4 rounded-2xl animate-in slide-in-from-bottom-4 fade-in duration-300">
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[150px]">{task.fileName}</span>
                  <span className="text-xs font-bold text-slate-800">{task.status}</span>
                </div>
                {task.progress >= 100 && (
                  <div className="bg-emerald-100 text-emerald-600 p-0.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  </div>
                )}
              </div>
              <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${task.progress}%` }} />
              </div>
            </div>
          ))}
        </div>

        {showPasteModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/20 backdrop-blur-xl p-4">
            <div className="bg-white/90 backdrop-blur-2xl w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/50">
              <div className="p-8 border-b border-slate-100/50 flex justify-between items-center">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Créer une histoire</h3>
                <button onClick={() => setShowPasteModal(false)} className="p-2 hover:bg-slate-100/50 rounded-full transition-colors"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-slate-400"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="p-8">
                <textarea className="w-full h-64 p-6 bg-slate-50/50 border-2 border-slate-100 rounded-2xl font-serif text-lg outline-none focus:border-blue-500 transition-colors placeholder:text-slate-300" placeholder="Il était une fois..." value={pastedText} onChange={(e) => setPastedText(e.target.value)} />
              </div>
              <div className="p-8 bg-slate-50/30 flex justify-end gap-4">
                <button onClick={handlePasteSubmit} disabled={!pastedText.trim()} className="px-8 py-3 bg-blue-600 text-white text-sm font-black uppercase rounded-2xl shadow-lg shadow-blue-200 transition-transform active:scale-95 hover:bg-blue-700">Générer le livre</button>
              </div>
            </div>
          </div>
        )}

        {activeBook ? (
          <div className="h-full overflow-y-auto flex flex-col items-center">
            <div className="max-w-4xl w-full p-4 md:p-12 space-y-12 pb-32">
              <div className="flex items-center justify-between sticky top-4 z-20">
                <button onClick={reset} className="glass px-4 py-3 rounded-2xl hover:bg-white transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                  Retour
                </button>
                <div className="glass px-6 py-3 rounded-2xl">
                  <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase">{activeBook.title}</h2>
                </div>
                <div className="w-24"></div>
              </div>

              {activeBook.pages.map((page, idx) => (
                <div key={page.id} className="glass rounded-[3rem] overflow-hidden flex flex-col min-h-[400px] animate-in slide-in-from-bottom-8 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                  <div className="w-full aspect-[4/3] bg-slate-100/50 relative shrink-0">
                    <img src={`data:image/jpeg;base64,${page.image}`} className="w-full h-full object-contain mix-blend-multiply" alt={`Page ${idx + 1}`} />
                    <div className="absolute top-6 left-6 px-4 py-2 bg-white/80 backdrop-blur-md rounded-xl text-slate-900 border border-white text-[10px] font-black uppercase tracking-widest shadow-sm">Page {idx + 1}</div>
                  </div>
                  <div className="flex-1 p-8 md:p-12 flex flex-col justify-between relative group">
                    <div className="flex flex-col gap-8">
                      <div className="space-y-6">
                        {page.sentences.map((s, sentenceIdx) => {
                          const previousLength = page.sentences.slice(0, sentenceIdx).reduce((acc, curr) => acc + curr.french.length + 1, 0); // +1 for join space
                          const isSentenceActive = (activeCharIndex >= previousLength) && (activeCharIndex < previousLength + s.french.length);

                          return (
                            <div key={sentenceIdx} className={`group/line transition-all duration-300 ${isSentenceActive ? 'scale-[1.02]' : 'opacity-80'}`}>
                              <p className={`text-xl font-serif leading-relaxed pl-6 border-l-4 transition-colors ${isSentenceActive ? 'text-blue-900 border-blue-500 font-medium' : 'text-slate-700 border-blue-200'}`}>
                                {(() => {
                                  let scanIndex = 0;
                                  return s.french.split(' ').map((word, wordIdx) => {
                                    const wordLength = word.length;
                                    // Find next occurrence ensuring we skip past used parts
                                    const startLocal = s.french.indexOf(word, scanIndex);
                                    const endLocal = startLocal + wordLength;

                                    // Update scan pointer
                                    if (startLocal !== -1) scanIndex = endLocal;

                                    // Global offsets
                                    const startGlobal = previousLength + startLocal;
                                    const endGlobal = previousLength + endLocal;

                                    // Check if active character is within this word's range
                                    const isWordActive = (activeCharIndex >= startGlobal) && (activeCharIndex <= endGlobal + 1); // +1 buffer

                                    return <span key={wordIdx} className={`transition-all duration-75 rounded px-0.5 ${isWordActive ? "bg-yellow-300 text-black shadow-sm" : ""}`}>{word} </span>
                                  });
                                })()}
                              </p>
                              <p className="text-sm font-sans text-slate-500 mt-1 pl-7 italic">
                                {s.english}
                              </p>
                            </div>
                          )
                        })}
                      </div>

                      {page.keywords && page.keywords.length > 0 && (
                        <div className="mt-4 pt-6 border-t border-slate-200/60">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Mots Clés</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {page.keywords.map((k, i) => (
                              <button
                                key={i}
                                onClick={() => geminiService.browserSpeak(k.word, () => { })}
                                className="flex flex-col bg-white/50 p-3 rounded-xl border border-white hover:bg-white hover:border-blue-200 hover:shadow-lg transition-all text-left group/word"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-bold text-slate-800 group-hover/word:text-blue-700 transition-colors">{k.word}</span>
                                  <div className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-slate-300 group-hover/word:text-blue-500"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 2.625 2.625 0 0 0 0-3.712.75.75 0 0 1 1.06-1.06 4.125 4.125 0 0 0 0-5.83.75.75 0 0 1-1.06-1.06Z" /></svg>
                                    <span className="text-xs font-mono text-slate-500 bg-white/80 px-1.5 py-0.5 rounded border border-slate-100">{k.pronunciation}</span>
                                  </div>
                                </div>
                                <span className="text-xs text-slate-500 mt-1 italic">{k.explanation}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-8 flex justify-end">
                      {(page.sentences.length > 0) ? (
                        <div className="relative">
                          <button
                            onClick={() => {
                              const fullText = page.sentences.map(s => s.french).join(' ');
                              geminiService.playCachedAudio(
                                page.audio,
                                fullText,
                                () => setActiveCharIndex(-1),
                                (index) => setActiveCharIndex(index)
                              );
                            }}
                            className="w-16 h-16 bg-blue-600 rounded-full shadow-lg shadow-blue-200 hover:scale-110 active:scale-90 transition-all flex items-center justify-center text-white"
                            title="Écouter"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 ml-1"><path fillRule="evenodd" d="M4.5 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" clipRule="evenodd" /></svg>
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Audio indisponible</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-6 md:p-12">
            <div className="max-w-6xl mx-auto space-y-12 pb-24">
              <div className="glass p-12 rounded-[2.5rem] text-center group">
                <div className="bg-blue-50/80 p-6 rounded-full inline-block mb-6 group-hover:scale-110 transition-transform shadow-inner"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-blue-600"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg></div>
                <h2 className="text-4xl font-black text-slate-800 mb-8 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Importer un livre</h2>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button onClick={() => fileInputRef.current?.click()} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm uppercase tracking-widest py-4 px-10 rounded-full shadow-lg shadow-blue-200 transition-all hover:shadow-xl hover:-translate-y-1 active:scale-95">PDF ou Texte</button>
                  <button onClick={() => setShowPasteModal(true)} className="bg-white border text-slate-700 font-black text-sm uppercase py-4 px-10 rounded-full shadow-md transition-all hover:shadow-lg hover:-translate-y-1 active:scale-95">Coller du texte</button>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf,text/plain" />
              </div>

              <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2 bg-white/40 px-4 py-2 rounded-full border border-white/50 shadow-sm backdrop-blur-md">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500"><path d="M11.25 4.533A9.707 9.707 0 0 0 6 3.75a9.707 9.707 0 0 0-6 3.75V16.575a1.125 1.125 0 0 0 1.667.986A8.967 8.967 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-13.759v13.759m0-13.759a9.708 9.708 0 0 1 6-3.758 9.708 9.708 0 0 1 6 3.758V16.575a1.125 1.125 0 0 1-1.667.986 8.967 8.967 0 0 0-4.333-.456M12 18.292V4.533" /></svg>
                    <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Ma bibliothèque</h3>
                  </div>
                  <div className="flex bg-white/40 p-1 rounded-full border border-white/50 backdrop-blur-md shadow-sm">
                    <button
                      onClick={() => setIsManagingLibrary(!isManagingLibrary)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${isManagingLibrary ? 'bg-amber-100 text-amber-700 shadow-sm' : 'hover:bg-white/60 text-slate-600'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                      {isManagingLibrary ? 'Terminer' : 'Gérer'}
                    </button>
                    <div className="w-px bg-slate-200/50 my-1 mx-1"></div>
                    <button onClick={exportLibrary} className="flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-white/60 hover:text-blue-600 transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                      Exporter
                    </button>
                    <button onClick={() => importInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-white/60 hover:text-emerald-600 transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" transform="rotate(180 12 12)" /></svg>
                      Importer
                    </button>
                    <input type="file" ref={importInputRef} onChange={handleImportLibrary} className="hidden" accept="application/json" />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                  {library.map(book => (
                    <div key={book.id} onClick={() => openBook(book)} className="group flex flex-col cursor-pointer">
                      <div className="relative aspect-[3/4] glass-card rounded-3xl overflow-hidden group-hover:-translate-y-2 group-hover:shadow-2xl">
                        {book.coverImage ? (
                          <img src={`data:image/jpeg;base64,${book.coverImage}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-white/50 opacity-30"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25v14.25" /></svg></div>
                        )}
                        {isManagingLibrary && (
                          <button onClick={(e) => deleteBook(e, book.id)} className="absolute inset-0 z-20 bg-red-600/90 flex flex-col items-center justify-center text-white backdrop-blur-sm transition-opacity"><span className="font-black uppercase text-xs">Supprimer</span></button>
                        )}
                        <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                      <div className="mt-4 px-2 text-center">
                        <h4 className="font-bold text-slate-800 text-sm line-clamp-2 uppercase tracking-tight leading-tight group-hover:text-blue-600 transition-colors drop-shadow-sm">{book.title}</h4>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
