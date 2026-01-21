
import React, { useState, useCallback, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  ArrowRight, 
  RotateCcw, 
  Download, 
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  PlusCircle
} from 'lucide-react';
import { AppState, TextReplacement, PdfMetadata, AiAnalysisResult } from './types';
import { extractText, getPdfPageCount, applyReplacements } from './services/pdfService';
import { analyzePdfText, suggestProfessionalRewrite } from './services/geminiService';

const JpLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 200 200" className={className} fill="currentColor">
    {/* Stylized Arcs on the left */}
    <path 
      d="M70 40 A 80 80 0 0 0 70 160" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="6" 
      strokeLinecap="round" 
    />
    <path 
      d="M55 55 A 60 60 0 0 0 55 145" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="10" 
      strokeLinecap="round" 
      strokeDasharray="60 20"
    />
    <path 
      d="M40 70 A 40 40 0 0 0 40 130" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="4" 
      strokeLinecap="round" 
    />

    {/* Stylized 'j' */}
    <circle cx="105" cy="65" r="5" fill="currentColor" />
    <path 
      d="M105 80 L105 140 C105 155, 90 160, 80 160" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="16" 
      strokeLinecap="butt"
    />

    {/* Stylized 'p' */}
    <path 
      d="M125 80 L125 160" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="16" 
      strokeLinecap="butt"
    />
    <path 
      d="M125 80 C155 80, 155 125, 125 125" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="16" 
      strokeLinecap="butt"
    />
  </svg>
);

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<PdfMetadata | null>(null);
  const [replacements, setReplacements] = useState<TextReplacement[]>([]);
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile || uploadedFile.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      return;
    }

    try {
      setState(AppState.UPLOADING);
      setFile(uploadedFile);
      const pages = await getPdfPageCount(uploadedFile);
      setMetadata({
        name: uploadedFile.name,
        size: Math.round(uploadedFile.size / 1024),
        totalPages: pages
      });

      setState(AppState.ANALYZING);
      const text = await extractText(uploadedFile);
      const aiResult = await analyzePdfText(text);
      setAnalysis(aiResult);
      setState(AppState.EDITING);
    } catch (err) {
      console.error(err);
      setError('Error processing PDF. Some files might be encrypted or protected.');
      setState(AppState.IDLE);
    }
  };

  const addReplacement = (original: string, suggestion: string = '') => {
    const id = Math.random().toString(36).substr(2, 9);
    setReplacements(prev => [...prev, {
      id,
      originalText: original,
      replacementText: suggestion,
      count: 1
    }]);
  };

  const updateReplacement = (id: string, text: string) => {
    setReplacements(prev => prev.map(r => r.id === id ? { ...r, replacementText: text } : r));
  };

  const removeReplacement = (id: string) => {
    setReplacements(prev => prev.filter(r => r.id !== id));
  };

  const handleDownload = async () => {
    if (!file || replacements.length === 0) return;
    
    try {
      setState(AppState.PROCESSING);
      const pdfBytes = await applyReplacements(file, replacements.map(r => ({
        originalText: r.originalText,
        replacementText: r.replacementText
      })));
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `modified_${file.name}`;
      link.click();
      setState(AppState.EDITING);
    } catch (err) {
      console.error(err);
      setError('Failed to generate PDF. Check if the file is protected.');
      setState(AppState.EDITING);
    }
  };

  const reset = () => {
    setFile(null);
    setMetadata(null);
    setReplacements([]);
    setAnalysis(null);
    setError(null);
    setState(AppState.IDLE);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={reset}>
            <div className="w-14 h-14 flex items-center justify-center text-slate-900 transition-transform group-hover:scale-105">
              <JpLogo className="w-full h-full" />
            </div>
            <div className="hidden sm:block border-l border-slate-200 pl-4">
              <h1 className="font-black text-slate-800 text-sm leading-tight tracking-tight uppercase">
                Jp communication<br/>
                <span className="text-indigo-600">PDF REPLACER</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {state === AppState.EDITING && (
              <button 
                onClick={handleDownload}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition shadow-md"
              >
                <Download size={18} />
                <span>Download PDF</span>
              </button>
            )}
            {file && (
              <button 
                onClick={reset}
                className="p-2 text-slate-400 hover:text-slate-600 transition"
                title="Start over"
              >
                <RotateCcw size={20} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-12">
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center space-x-3 text-red-700">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-sm font-medium">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">×</button>
          </div>
        )}

        {state === AppState.IDLE && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-10 animate-in fade-in zoom-in duration-700">
              <JpLogo className="w-40 h-40 text-slate-900" />
            </div>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group w-full max-w-xl p-12 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 hover:border-indigo-400 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-100 flex flex-col items-center"
            >
              <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                <Upload size={40} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3">Drop your PDF here</h2>
              <p className="text-slate-500 max-w-sm mb-8">
                Official Jp communication text replacement tool powered by Gemini AI.
              </p>
              <button className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg group-hover:bg-indigo-600 transition duration-300">
                Select File
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="application/pdf"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        )}

        {(state === AppState.UPLOADING || state === AppState.ANALYZING || state === AppState.PROCESSING) && (
          <div className="flex flex-col items-center justify-center py-32 space-y-8">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={32} className="text-indigo-400 animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-800">
                {state === AppState.UPLOADING ? 'Uploading PDF...' : 
                 state === AppState.ANALYZING ? 'AI is scanning your document...' : 
                 'Synthesizing new PDF...'}
              </h2>
              <p className="text-slate-500 mt-2">Powered by Jp communication engineering.</p>
            </div>
          </div>
        )}

        {state === AppState.EDITING && metadata && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar / AI Suggestions */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-800 flex items-center space-x-2">
                    <Sparkles size={18} className="text-indigo-500" />
                    <span>AI Suggestions</span>
                  </h3>
                  <span className="text-[10px] px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full font-bold">GEMINI 3 FLASH</span>
                </div>
                
                {analysis?.summary && (
                  <p className="text-sm text-slate-500 mb-6 italic bg-slate-50 p-3 rounded-xl">
                    "{analysis.summary}"
                  </p>
                )}

                <div className="space-y-3">
                  {analysis?.entities.map((entity, i) => (
                    <div 
                      key={i} 
                      className="group p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-indigo-200 cursor-pointer transition-all"
                      onClick={() => addReplacement(entity.value, entity.suggestion)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{entity.type}</span>
                        <PlusCircle size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 text-sm">{entity.value}</span>
                        <ArrowRight size={14} className="text-slate-300" />
                        <span className="text-indigo-600 font-medium text-sm">{entity.suggestion}</span>
                      </div>
                    </div>
                  ))}
                  {(!analysis || analysis.entities.length === 0) && (
                    <div className="text-center py-6 text-slate-400">
                      <p className="text-sm">No specific entities found.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-[2rem] text-white overflow-hidden relative">
                <div className="relative z-10">
                  <h3 className="font-bold mb-2">Document Stats</h3>
                  <div className="space-y-2 opacity-80 text-sm">
                    <div className="flex justify-between">
                      <span>Filename</span>
                      <span className="font-mono text-xs">{metadata.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Size</span>
                      <span>{metadata.size} KB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pages</span>
                      <span>{metadata.totalPages}</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-500/20 blur-2xl rounded-full"></div>
              </div>
            </div>

            {/* Main Editor */}
            <div className="lg:col-span-8">
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 min-h-[600px] flex flex-col">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Replacement List</h2>
                    <p className="text-slate-500">Define the terms you want to swap in your PDF.</p>
                  </div>
                  <button 
                    onClick={() => addReplacement('')}
                    className="flex items-center justify-center space-x-2 bg-slate-50 hover:bg-indigo-50 text-indigo-600 px-6 py-3 rounded-2xl font-semibold transition"
                  >
                    <PlusCircle size={20} />
                    <span>Add Manual Entry</span>
                  </button>
                </div>

                <div className="flex-1">
                  {replacements.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-40">
                      <Search size={64} className="mb-4" />
                      <p className="text-lg font-medium">Your replacement list is empty</p>
                      <p className="text-sm">Click an AI suggestion or add a manual entry to start.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {replacements.map((r) => (
                        <div key={r.id} className="flex flex-col md:flex-row items-center gap-4 bg-white p-2 rounded-3xl border border-slate-100 hover:shadow-md transition group animate-in slide-in-from-bottom-2 duration-300">
                          <div className="flex-1 w-full">
                            <label className="text-[10px] font-bold text-slate-400 ml-4 mb-1 block uppercase">Find</label>
                            <input 
                              type="text"
                              value={r.originalText}
                              onChange={(e) => {
                                const newArr = [...replacements];
                                const index = newArr.findIndex(item => item.id === r.id);
                                newArr[index].originalText = e.target.value;
                                setReplacements(newArr);
                              }}
                              placeholder="Original text..."
                              className="w-full bg-slate-50 border-transparent focus:border-indigo-200 focus:ring-0 rounded-2xl px-4 py-3 text-sm font-semibold"
                            />
                          </div>
                          <div className="hidden md:block">
                            <ArrowRight className="text-slate-300" />
                          </div>
                          <div className="flex-1 w-full relative">
                            <label className="text-[10px] font-bold text-slate-400 ml-4 mb-1 block uppercase">Replace with</label>
                            <input 
                              type="text"
                              value={r.replacementText}
                              onChange={(e) => updateReplacement(r.id, e.target.value)}
                              placeholder="New text..."
                              className="w-full bg-indigo-50/50 border-transparent focus:border-indigo-200 focus:ring-0 rounded-2xl px-4 py-3 text-sm font-semibold text-indigo-700"
                            />
                            <button 
                              onClick={async () => {
                                if (!r.originalText) return;
                                const rewritten = await suggestProfessionalRewrite(r.originalText);
                                updateReplacement(r.id, rewritten);
                              }}
                              className="absolute right-2 bottom-1.5 p-1.5 text-indigo-400 hover:text-indigo-600 transition"
                              title="AI Rewrite"
                            >
                              <Sparkles size={16} />
                            </button>
                          </div>
                          <button 
                            onClick={() => removeReplacement(r.id)}
                            className="p-3 text-slate-300 hover:text-red-500 transition self-end md:self-center"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-12 pt-8 border-t border-slate-50 flex items-center justify-between">
                  <p className="text-xs text-slate-400 max-w-sm italic">
                    Note: Precise text replacement in PDF is complex. Best results with documents containing selectable text.
                  </p>
                  {replacements.length > 0 && (
                    <button 
                      onClick={handleDownload}
                      className="group bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-[1.5rem] font-bold shadow-xl shadow-indigo-200 transition-all hover:scale-105 active:scale-95 flex items-center space-x-3"
                    >
                      <span>Process & Save</span>
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Badge */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 glass px-6 py-3 rounded-full shadow-2xl flex items-center space-x-4 border border-indigo-100 animate-bounce-slow">
        <div className="flex -space-x-2">
           {[1,2,3].map(i => (
             <img key={i} src={`https://picsum.photos/seed/${i + 10}/32/32`} className="w-8 h-8 rounded-full border-2 border-white" alt="Avatar" />
           ))}
        </div>
        <p className="text-xs font-semibold text-slate-600">
          <span className="text-indigo-600">4,281</span> PDFs alchemized today
        </p>
      </div>
    </div>
  );
};

export default App;
