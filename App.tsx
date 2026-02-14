
import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from './services/geminiService';
import { dbService } from './services/dbService';
import { VoiceName, BookRecord, LearningItem, LearningCategory } from './types';
import { ALPHABET_ITEMS, SHAPE_ITEMS, NUMBER_ITEMS } from './constants';
import VoiceSelector from './components/VoiceSelector';
import TracingCanvas from './components/TracingCanvas';
import * as pdfjsLib from 'pdfjs-dist';
import confetti from 'canvas-confetti';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface ImportingTask {
  id: string;
  fileName: string;
  status: string;
  progress: number;
}

type Language = 'FR' | 'EN';
type AppView = 'library' | 'magic-learning';

const translations = {
  FR: {
    title: "Livre Magique",
    magicLearning: "Alphabet Magique",
    library: "Ma Bibliothèque",
    aiActive: "IA active",
    importBook: "Importer un livre",
    pdfOrText: "Importer un PDF",
    pasteText: "Coller du texte",
    createStory: "Créer une histoire",
    generateBook: "Générer le livre",
    placeholderOnceUponATime: "Il était une fois...",
    back: "Retour",
    page: "Page",
    keywords: "Mots Clés",
    audioUnavailable: "Audio indisponible",
    myLibrary: "Ma bibliothèque",
    manage: "Gérer",
    finish: "Terminer",
    export: "Exporter",
    import: "Importer",
    delete: "Supprimer",
    confirmDelete: "Voulez-vous vraiment supprimer ce livre ?",
    starting: "Démarrage...",
    readingPdf: "Lecture PDF...",
    analyzingPage: "Analyse Page",
    creatingBook: "Création du livre...",
    done: "Terminé !",
    exportError: "Erreur export.",
    importError: "Erreur import.",
    deleteError: "Erreur: Impossible de supprimer le livre.",
    errorIA: "Erreur: IA",
    frenchOnly: "Texte en français uniquement",
    next: "Suivant",
    previous: "Précédent",
    traceMe: "Trace-moi !",
    alphabet: "Alphabet",
    shapes: "Formes",
    numbers: "Chiffres",
  },
  EN: {
    title: "Magic Book",
    magicLearning: "Magic Alphabet",
    library: "My Library",
    aiActive: "AI Active",
    importBook: "Import a Book",
    pdfOrText: "Import PDF",
    pasteText: "Paste Text",
    createStory: "Create a Story",
    generateBook: "Generate Book",
    placeholderOnceUponATime: "Once upon a time...",
    back: "Back",
    page: "Page",
    keywords: "Keywords",
    audioUnavailable: "Audio Unavailable",
    myLibrary: "My Library",
    manage: "Manage",
    finish: "Finish",
    export: "Export",
    import: "Import",
    delete: "Delete",
    confirmDelete: "Are you sure you want to delete this book?",
    starting: "Starting...",
    readingPdf: "Reading PDF...",
    analyzingPage: "Analyzing Page",
    creatingBook: "Creating Book...",
    done: "Done!",
    exportError: "Export error.",
    importError: "Import error.",
    deleteError: "Error: Could not delete the book.",
    errorIA: "Error: AI",
    frenchOnly: "French text only",
    next: "Next",
    previous: "Previous",
    traceMe: "Trace Me!",
    alphabet: "Alphabet",
    shapes: "Shapes",
    numbers: "Numbers",
  }
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('library');
  const [importingTasks, setImportingTasks] = useState<ImportingTask[]>([]);
  const [library, setLibrary] = useState<BookRecord[]>([]);
  const [activeBook, setActiveBook] = useState<BookRecord | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>("Marie");
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [isManagingLibrary, setIsManagingLibrary] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [uiLang, setUiLang] = useState<Language>('FR');
  const [activeCharIndex, setActiveCharIndex] = useState(-1);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Magic Learning State
  const [activeCategory, setActiveCategory] = useState<LearningCategory>('alphabet');
  const [selectedItem, setSelectedItem] = useState<LearningItem | null>(null);

  const t = translations[uiLang];
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
    setImportingTasks(prev => [...prev, { id: taskId, fileName: file.name, status: t.starting, progress: 5 }]);

    try {
      let pages: any[] = [];
      let bookTitle = file.name.replace(/\.[^/.]+$/, "");

      if (file.type === 'application/pdf') {
        updateTaskStatus(taskId, t.readingPdf, 10);
        const pdfData = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        const numPages = pdf.numPages;

        const seenWords = new Set<string>();

        for (let i = 1; i <= numPages; i++) {
          updateTaskStatus(taskId, `${t.analyzingPage} ${i}/${numPages}...`, (i / numPages) * 100);
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) throw new Error("Could not create canvas context");
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          context.fillStyle = "white";
          context.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: context, canvas, viewport } as any).promise;
          const imageBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

          try {
            const result = await geminiService.processPage(imageBase64, selectedVoice);
            if (i === 1) bookTitle = result.title;
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
            pages.push({
              id: `page-${Date.now()}-${i}`,
              title: "Page (Erreur)",
              sentences: [{ french: "Désolé, cette page n'a pas pu être analysée.", english: "Sorry, this page could not be analyzed." }],
              audio: "",
              image: imageBase64
            });
          }
          if (i < numPages) await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } else {
        updateTaskStatus(taskId, t.creatingBook, 30);
        const text = await file.text();
        const result = await geminiService.processBookFromText(text, selectedVoice);
        let fallbackImage = "";
        try {
          const loadCover = (): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = '/default-cover.png';
          });
          const img = await loadCover();
          const canvas = document.createElement('canvas');
          canvas.width = img.width; canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#1e3a8a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const fontSize = Math.floor(canvas.width / 15);
            ctx.font = `bold ${fontSize}px "Lora", serif`;
            const words = result.title.split(' ');
            let line = '';
            const maxLineWidth = canvas.width * 0.4;
            const lineHeight = fontSize * 1.2;
            const lines: string[] = [];
            for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + ' ';
              if (ctx.measureText(testLine).width > maxLineWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
              } else { line = testLine; }
            }
            lines.push(line);
            const totalTextHeight = lines.length * lineHeight;
            let currentY = (canvas.height - totalTextHeight) / 2 + (lineHeight / 2);
            for (const l of lines) {
              ctx.fillText(l.trim(), canvas.width / 2, currentY);
              currentY += lineHeight;
            }
            fallbackImage = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
          }
        } catch (e) {
          const canvas = document.createElement('canvas');
          canvas.width = 600; canvas.height = 400;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#fefce8'; ctx.fillRect(0, 0, 600, 400);
            ctx.fillStyle = '#000'; ctx.fillText(result.title, 300, 200);
            fallbackImage = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
          }
        }
        result.pages.forEach((p, idx) => {
          pages.push({
            id: `page-${Date.now()}-${idx + 1}`,
            title: p.title,
            sentences: p.sentences,
            keywords: p.keywords,
            audio: p.audio,
            image: p.image || fallbackImage
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
      await dbService.saveBook(newBook);
      setLibrary(prev => [newBook, ...prev]);
      updateTaskStatus(taskId, t.done, 100);
      removeTask(taskId);
    } catch (error: any) {
      updateTaskStatus(taskId, `Erreur: ${error.message || t.errorIA}`, 0);
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
    geminiService.stopAudio();
    setCurrentPageIndex(0);
    setActiveBook(book);
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
    } catch (error) { alert(t.exportError); }
  };

  const handleImportLibrary = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      for (const item of data) await dbService.saveBook(item);
      setLibrary(await dbService.getAllBooks());
    } catch (error) { alert(t.importError); }
  };

  const deleteBook = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await dbService.deleteBook(id);
      setLibrary(prev => prev.filter(b => b.id !== id));
      if (activeBook?.id === id) reset();
    } catch (err) { alert(t.deleteError); }
  };

  const reset = () => {
    geminiService.stopAudio();
    setActiveBook(null);
    setSelectedItem(null);
    setCurrentPageIndex(0);
    setActiveCharIndex(-1);
  };

  // Magic Learning Logic
  const playFullPhonics = async (item: LearningItem) => {
    geminiService.stopAudio(); // Ensure cleanup before starting
    const phrase = activeCategory === 'alphabet'
      ? `<speak>${item.label} <break time="800ms"/> comme ${item.word}</speak>`
      : activeCategory === 'shapes'
        ? `Le ${item.word}`
        : `${item.label}`;

    try {
      await geminiService.speakText(phrase, 'Kore');
      if (activeCategory !== 'numbers') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#60a5fa', '#f472b6', '#fbbf24']
        });
      }
    } catch (e) {
      console.error("Audio error", e);
    }
  };

  const handleItemClick = (item: LearningItem) => {
    geminiService.stopAudio(); // Stop any previous letter-sound that might be playing
    setSelectedItem(item);
    playFullPhonics(item);
  };

  const playLetterSound = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    geminiService.speakText(text, 'Kore');
  };

  const renderMagicLearning = () => {
    const items = activeCategory === 'alphabet' ? ALPHABET_ITEMS : activeCategory === 'shapes' ? SHAPE_ITEMS : NUMBER_ITEMS;
    const currentIndex = selectedItem ? items.findIndex(i => i.id === selectedItem.id) : -1;

    const goToPrev = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (currentIndex === -1) return;
      const prevIndex = (currentIndex - 1 + items.length) % items.length;
      const newItem = items[prevIndex];
      setSelectedItem(newItem);
      playFullPhonics(newItem);
    };

    const goToNext = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (currentIndex === -1) return;
      const nextIndex = (currentIndex + 1) % items.length;
      const newItem = items[nextIndex];
      setSelectedItem(newItem);
      playFullPhonics(newItem);
    };

    return (
      <div className="h-full flex flex-col items-center">
        <div className="max-w-6xl w-full p-4 md:p-12 space-y-8">
          <div className="flex justify-center gap-4 mb-8">
            {(['alphabet', 'shapes', 'numbers'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setSelectedItem(null); }}
                className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/50 text-slate-500 hover:bg-white'}`}
              >
                {t[cat]}
              </button>
            ))}
          </div>

          {!selectedItem ? (
            <div className={`grid gap-6 ${activeCategory === 'alphabet' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6' : 'grid-cols-2 sm:grid-cols-5 lg:grid-cols-10'}`}>
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`group relative aspect-square glass-card rounded-[2rem] p-6 flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 ${item.color}`}
                >
                  <span className={`text-5xl font-black mb-2 transition-transform group-hover:scale-110 ${item.secondaryColor}`}>{item.label}</span>
                  {activeCategory === 'alphabet' && (
                    <img src={item.image} className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-xl shadow-sm my-2 border-2 border-white/50" alt={item.word} />
                  )}
                  <span className={`text-xs font-black uppercase tracking-widest opacity-60 ${item.secondaryColor}`}>{item.word}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-12 items-start justify-center animate-in fade-in zoom-in-95 duration-500">
              <div className="w-full lg:w-1/2 space-y-8 text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-4 mb-8">
                  <button onClick={goToPrev} className="glass p-3 rounded-full hover:bg-white hover:scale-110 active:scale-90 transition-all text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                  </button>

                  <button onClick={() => setSelectedItem(null)} className="glass px-6 py-3 rounded-2xl hover:bg-white transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 inline-flex">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                    {t.back}
                  </button>

                  <button onClick={goToNext} className="glass p-3 rounded-full hover:bg-white hover:scale-110 active:scale-90 transition-all text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                  </button>
                </div>

                <div className={`p-12 rounded-[3.5rem] shadow-xl inline-block ${selectedItem.color}`}>
                  <h2
                    onClick={(e) => playLetterSound(e, selectedItem.label)}
                    className={`text-9xl sm:text-[12rem] font-black cursor-pointer hover:scale-110 active:scale-90 transition-transform ${selectedItem.secondaryColor}`}
                  >
                    {selectedItem.label}
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3
                      onClick={(e) => playLetterSound(e, selectedItem.word)}
                      className="text-4xl sm:text-6xl font-black text-slate-800 tracking-tighter uppercase cursor-pointer hover:text-blue-600 transition-colors"
                    >
                      {selectedItem.word}
                    </h3>
                    {selectedItem.englishWord && (
                      <p className="text-xl sm:text-2xl font-bold text-slate-400 tracking-widest uppercase mt-1">
                        {selectedItem.englishWord}
                      </p>
                    )}
                  </div>
                  <div className={`bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg border border-white p-2 flex items-center justify-center ${activeCategory === 'numbers' ? 'min-h-[400px] h-auto' : 'h-64 sm:h-[400px]'}`}>
                    {activeCategory === 'alphabet' ? (
                      <img
                        src={selectedItem.image}
                        className="w-full h-full object-contain rounded-xl shadow-sm"
                        alt={selectedItem.word}
                        onError={(e) => {
                          // Fallback to a generic high-quality abstract gradient if image fails
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${selectedItem.label}&background=random&size=400&font-size=0.5`;
                        }}
                      />
                    ) : activeCategory === 'shapes' ? (
                      <div className="w-64 h-64 flex items-center justify-center">
                        {/* Dynamic SVG Shape Rendering */}
                        <svg viewBox="0 0 100 100" className={`w-full h-full drop-shadow-xl ${selectedItem.secondaryColor.replace('text-', 'fill-')}`}>
                          {selectedItem.id === 'cercle' && <circle cx="50" cy="50" r="45" />}
                          {selectedItem.id === 'carre' && <rect x="10" y="10" width="80" height="80" rx="4" />}
                          {selectedItem.id === 'triangle' && <polygon points="50,10 90,90 10,90" strokeLinejoin="round" strokeWidth="8" />}
                          {selectedItem.id === 'etoile' && <polygon points="50,5 61,35 95,35 68,55 79,85 50,70 21,85 32,55 5,35 39,35" strokeLinejoin="round" strokeWidth="4" />}
                          {selectedItem.id === 'coeur' && <path d="M50 88.9L44.2 83.3C21.4 62.7 6.4 49 6.4 32.3C6.4 18.6 17.1 7.9 30.8 7.9C38.5 7.9 45.9 11.5 50 17.2C54.1 11.5 61.5 7.9 69.2 7.9C82.9 7.9 93.6 18.6 93.6 32.3C93.6 49 78.6 62.7 55.8 83.4L50 88.9Z" />}
                          {selectedItem.id === 'rectangle' && <rect x="5" y="25" width="90" height="50" rx="4" />}
                          {selectedItem.id === 'losange' && <polygon points="50,5 85,50 50,95 15,50" />}
                          {selectedItem.id === 'ovale' && <ellipse cx="50" cy="50" rx="45" ry="30" />}
                          {selectedItem.id === 'lune' && <path d="M70 15C60 25 60 75 70 85C40 85 20 60 20 50C20 40 40 15 70 15Z" transform="rotate(-15 50 50)" />}
                          {selectedItem.id === 'trapeze' && <polygon points="25,20 75,20 90,80 10,80" />}
                        </svg>
                      </div>
                    ) : (
                      <div className="w-full h-full p-6 bg-white/40 rounded-3xl">
                        {/* Dynamic Number Counting Visualization */}
                        <div className="grid grid-cols-10 gap-x-2 gap-y-3 sm:gap-x-4 sm:gap-y-4 justify-items-center">
                          {Array.from({ length: parseInt(selectedItem.label) }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full shadow-md flex items-center justify-center animate-in zoom-in duration-300 ${['bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400', 'bg-purple-400'][Math.floor(i / 10) % 5]}`}
                              style={{
                                animationDelay: `${i * 10}ms`,
                                border: '2px solid white'
                              }}
                            >
                              <div className="w-1.5 h-1.5 bg-white/60 rounded-full" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-1/2 flex flex-col items-center space-y-6">
                <div className="text-center">
                  <span className="text-xs font-black text-pink-500 uppercase tracking-widest mb-2 block">{t.traceMe}</span>
                </div>
                <TracingCanvas
                  letter={selectedItem.label}
                  color={selectedItem.secondaryColor}
                  onComplete={() => {
                    confetti({
                      particleCount: 150,
                      spread: 80,
                      colors: ['#3b82f6', '#ec4899', '#10b981', '#f59e0b'],
                      origin: { y: 0.6 },
                      startVelocity: 30,
                    });
                    geminiService.speakText(
                      ["Bravo !", "Excellent !", "Super !", "Magnifique !"][Math.floor(Math.random() * 4)],
                      'Kore'
                    );
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
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
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group" onClick={reset}>
            <img src="/icon.svg" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl shadow-lg border border-white/60 group-hover:scale-105 transition-transform" alt="Logo" />
            <div className="flex flex-col">
              <h1 className="text-sm sm:text-lg font-black text-slate-800 tracking-tighter uppercase relative top-px">{t.title}</h1>
              <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Atelier Magique</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* View Toggle */}
            <div className="flex bg-slate-100/50 p-1 rounded-full border border-slate-200/50 mr-2 sm:mr-4">
              <button
                onClick={() => { setView('library'); reset(); }}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${view === 'library' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {t.library}
              </button>
              <button
                onClick={() => { setView('magic-learning'); reset(); }}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${view === 'magic-learning' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {t.magicLearning}
              </button>
            </div>

            <button
              onClick={() => setUiLang(prev => prev === 'FR' ? 'EN' : 'FR')}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/60 border border-slate-100 rounded-full shadow-sm hover:bg-white transition-all text-[10px] font-black uppercase tracking-widest text-slate-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138A24.564 24.564 0 0 1 12 10.25" /></svg>
              {uiLang}
            </button>
            <div className="hidden sm:block">
              <VoiceSelector selectedVoice={selectedVoice} onVoiceChange={setSelectedVoice} uiLang={uiLang} />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative z-10">
        {/* Task overlay */}
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

        {view === 'library' ? (
          activeBook ? (
            <div className="h-full overflow-y-auto flex flex-col items-center">
              <div className="max-w-7xl w-full p-4 md:p-8 space-y-6 sm:space-y-8 pb-32">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
                  <button onClick={reset} className="glass px-4 py-3 rounded-2xl hover:bg-white transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                    {t.back}
                  </button>
                  <div className="glass px-6 py-3 rounded-2xl flex items-center justify-center gap-4 flex-1">
                    <h2 className="text-sm sm:text-xl font-black text-slate-800 tracking-tighter uppercase truncate max-w-[200px]">{activeBook.title}</h2>
                    <div className="w-px h-4 bg-slate-200"></div>
                    <span className="text-[10px] sm:text-xs font-black text-blue-600 uppercase tracking-widest">{t.page} {currentPageIndex + 1} / {activeBook.pages.length}</span>
                  </div>
                  <button onClick={() => deleteBook(activeBook.id)} className="glass px-4 py-3 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                  </button>
                </div>

                {activeBook.pages[currentPageIndex] && (
                  <div className="glass rounded-[2rem] sm:rounded-[3rem] overflow-hidden flex flex-col lg:flex-row min-h-[500px] lg:h-[75vh] animate-in fade-in zoom-in-95 duration-500 shadow-2xl">
                    <div className="w-full lg:w-1/2 h-64 sm:h-96 lg:h-full bg-slate-100/50 relative shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200/50">
                      <img src={`data:image/jpeg;base64,${activeBook.pages[currentPageIndex].image}`} className="w-full h-full object-contain mix-blend-multiply p-4" alt={`${t.page} ${currentPageIndex + 1}`} />
                    </div>
                    <div className="flex-1 w-full lg:w-1/2 p-6 sm:p-10 lg:p-12 lg:overflow-y-auto flex flex-col justify-between custom-scrollbar">
                      <div className="space-y-6">
                        {activeBook.pages[currentPageIndex].sentences.map((s, idx) => {
                          const previousLength = activeBook.pages[currentPageIndex].sentences.slice(0, idx).reduce((acc, curr) => acc + curr.french.length + 1, 0);
                          const isSentenceActive = (activeCharIndex >= previousLength) && (activeCharIndex < previousLength + s.french.length);
                          return (
                            <div key={idx} className={`transition-all duration-300 ${isSentenceActive ? 'scale-102 opacity-100' : 'opacity-80'}`}>
                              <p className={`text-xl sm:text-2xl font-serif leading-relaxed pl-6 border-l-4 ${isSentenceActive ? 'text-blue-900 border-blue-500' : 'text-slate-700 border-blue-200'}`}>
                                {s.french.split(' ').map((word, wIdx) => {
                                  // Simplified word highlight tracking
                                  return <span key={wIdx}>{word} </span>
                                })}
                              </p>
                              <p className="text-sm font-sans text-slate-500 mt-2 pl-7 italic">{s.english}</p>
                            </div>
                          );
                        })}
                      </div>

                      {activeBook.pages[currentPageIndex].keywords && activeBook.pages[currentPageIndex].keywords.length > 0 && (
                        <div className="mt-8 border-t border-slate-100 pt-6 animate-in slide-in-from-bottom-2 duration-500 delay-100">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-400"><path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" /></svg>
                            {t.keywords}
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {activeBook.pages[currentPageIndex].keywords.map((kw, kIdx) => (
                              <div
                                key={kIdx}
                                onClick={(e) => playLetterSound(e, kw.word)}
                                className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
                              >
                                <div>
                                  <div className="flex items-baseline gap-2">
                                    <span className="font-bold text-slate-700 capitalize">{kw.word}</span>
                                    {kw.pronunciation && <span className="text-xs text-slate-400 font-mono">/{kw.pronunciation}/</span>}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1">{kw.explanation}</p>
                                </div>
                                <button className="p-2 text-blue-500 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 bg-blue-50 rounded-full">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" /><path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z" /></svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-12 flex items-center justify-between gap-6">
                        <div className="flex gap-4">
                          <button
                            disabled={currentPageIndex === 0}
                            onClick={() => { geminiService.stopAudio(); setCurrentPageIndex(p => p - 1); setActiveCharIndex(-1); }}
                            className={`glass px-6 py-3 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${currentPageIndex === 0 ? 'opacity-30' : 'hover:bg-white hover:scale-105 active:scale-95 text-slate-600'}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                            {t.previous}
                          </button>
                          <button
                            disabled={currentPageIndex === activeBook.pages.length - 1}
                            onClick={() => { geminiService.stopAudio(); setCurrentPageIndex(p => p + 1); setActiveCharIndex(-1); }}
                            className={`glass px-6 py-3 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${currentPageIndex === activeBook.pages.length - 1 ? 'opacity-30' : 'hover:bg-white hover:scale-105 active:scale-95 text-slate-600'}`}
                          >
                            {t.next}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            const page = activeBook.pages[currentPageIndex];
                            geminiService.playCachedAudio(page.audio || "", page.sentences.map(s => s.french).join(' '), () => setActiveCharIndex(-1), (idx) => setActiveCharIndex(idx));
                          }}
                          className="w-16 h-16 bg-blue-600 rounded-full shadow-lg hover:scale-110 active:scale-90 transition-all flex items-center justify-center text-white"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 ml-1"><path fillRule="evenodd" d="M4.5 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" clipRule="evenodd" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-6 md:p-12">
              <div className="max-w-6xl mx-auto space-y-12 pb-24">
                <div className="glass p-12 rounded-[2.5rem] text-center group">
                  <div className="bg-blue-50/80 p-6 rounded-full inline-block mb-6 group-hover:scale-110 transition-transform shadow-inner"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-blue-600"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg></div>
                  <h2 className="text-4xl font-black text-slate-800 mb-8 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">{t.importBook}</h2>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button onClick={() => fileInputRef.current?.click()} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm uppercase tracking-widest py-4 px-10 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 active:scale-95">{t.pdfOrText}</button>
                    <button onClick={() => setShowPasteModal(true)} className="bg-white border text-slate-700 font-black text-sm uppercase py-4 px-10 rounded-full shadow-md hover:shadow-lg hover:-translate-y-1 active:scale-90 transition-all">{t.pasteText}</button>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf,text/plain" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                  {library.map(book => (
                    <div key={book.id} onClick={() => openBook(book)} className="group cursor-pointer">
                      <div className="relative aspect-[3/4] glass-card rounded-3xl overflow-hidden group-hover:-translate-y-2 group-hover:shadow-2xl transition-all">
                        {book.coverImage ? <img src={`data:image/jpeg;base64,${book.coverImage}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" /> : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25v14.25" /></svg></div>}
                      </div>
                      <h4 className="mt-4 font-bold text-slate-800 text-sm text-center uppercase tracking-tight group-hover:text-blue-600 truncate">{book.title}</h4>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        ) : renderMagicLearning()}
      </main>

      {/* Story Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/20 backdrop-blur-xl p-4">
          <div className="bg-white/90 backdrop-blur-2xl w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/50 max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{t.createStory}</h3>
              <button onClick={() => setShowPasteModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-slate-400"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-8 flex-1 overflow-hidden">
              <textarea className="w-full h-full min-h-[300px] p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl font-serif text-lg outline-none focus:border-blue-500 transition-colors placeholder:text-slate-300 resize-none" placeholder={t.placeholderOnceUponATime} value={pastedText} onChange={(e) => setPastedText(e.target.value)} />
            </div>
            <div className="p-8 bg-slate-50 flex justify-end">
              <button onClick={handlePasteSubmit} disabled={!pastedText.trim()} className="px-10 py-4 bg-blue-600 text-white text-sm font-black uppercase rounded-2xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all">{t.generateBook}</button>
            </div>
          </div>
        </div>
      )}

      <footer className="absolute bottom-4 left-6 z-40 pointer-events-none">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-50">Version 2.0.0 (Magique)</span>
      </footer>
    </div>
  );
};

export default App;
