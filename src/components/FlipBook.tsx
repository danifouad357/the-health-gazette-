import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.min.mjs';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PageFlip } from '@gullabs/flipbook-core';

// Configure PDF.js worker via Vite's asset URL resolver
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface FlipBookProps {
  pdfUrl: string;
}

interface Annotation {
  id: string;
  page: number;
  text: string;
  date: string;
}

export default function FlipBook({ pdfUrl }: FlipBookProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const flipBookInstanceRef = useRef<any>(null);
  const pdfDocumentRef = useRef<any>(null);
  const baseSizeRef = useRef<{ width: number; height: number }>({ width: 595, height: 842 });

  const [loading, setLoading] = useState(true);
  const [progressText, setProgressText] = useState('Fetching The Gazette...');
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  // --- INTERACTIVE ENGINE SETTINGS ---
  const [showSettings, setShowSettings] = useState(false);
  const [engineSettings, setEngineSettings] = useState({
    maxShadowOpacity: 0.65,
    hardCovers: true,
    usePortrait: true,
    allowTouchScroll: true,
    flippingTime: 850,
    playAudio: true,
  });

  // --- RESEARCH SIDEBAR STATE ---
  const [showSidebar, setShowSidebar] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  // Load annotations from cache on mount
  useEffect(() => {
    const saved = localStorage.getItem('gazette-annotations');
    if (saved) {
      try { setAnnotations(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  // Save annotations to cache when changed
  useEffect(() => {
    localStorage.setItem('gazette-annotations', JSON.stringify(annotations));
  }, [annotations]);

  const saveNote = () => {
    if (!newNote.trim()) return;
    
    if (editingNoteId) {
      setAnnotations(annotations.map(n => n.id === editingNoteId ? { ...n, text: newNote.trim() } : n));
      setEditingNoteId(null);
    } else {
      const note: Annotation = {
        id: Math.random().toString(36).substring(2, 9),
        page: currentPage,
        text: newNote.trim(),
        date: new Date().toISOString(),
      };
      setAnnotations([...annotations, note]);
    }
    setNewNote('');
  };

  const editNote = (note: Annotation) => {
    setEditingNoteId(note.id);
    setNewNote(note.text);
  };

  const deleteNote = (id: string) => {
    setAnnotations(annotations.filter(a => a.id !== id));
    if (editingNoteId === id) {
      setEditingNoteId(null);
      setNewNote('');
    }
  };

  const exportNotes = () => {
    const blob = new Blob([JSON.stringify(annotations, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gazette-research-notes.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importNotes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (Array.isArray(data)) setAnnotations(data);
      } catch (err) {
        alert('Invalid notes file');
      }
    };
    reader.readAsText(file);
  };

  const jumpToPage = (pageIndex: number) => {
    if (flipBookInstanceRef.current) {
      flipBookInstanceRef.current.turnToPage(pageIndex);
    }
  };

  // --- AUDIO LOGIC ---
  const playFlipSound = () => {
    if (!engineSettings.playAudio) return;
    const snd = new Audio('/sounds/page-flip.mp3');
    snd.volume = 0.6;
    snd.play().catch(() => { /* ignore autoplay blocks */ });
  };

  // --- BULLETPROOF SIZING CALCULATION ---
  // Calculates the EXACT width and height that guarantees the book fits 100% inside the viewport
  // with ZERO cropping on width OR height!
  const recalculateBookSize = useCallback(() => {
    if (!stageRef.current || !containerRef.current) return;

    const stage = stageRef.current;
    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;

    if (stageWidth <= 0 || stageHeight <= 0) return;

    // Safety margins so the book never touches the edges
    const marginX = 40; // 20px each side
    const marginY = 40; // 20px top and bottom

    const maxW = Math.max(100, stageWidth - marginX);
    const maxH = Math.max(100, stageHeight - marginY);

    const { width: bw, height: bh } = baseSizeRef.current;

    // Determine portrait (single page) vs landscape (two-page spread)
    const isPortrait = maxW < 768;
    const spreadRatio = isPortrait ? (bw / bh) : ((2 * bw) / bh);

    // Initial scale candidate based on width
    let targetW = maxW;
    let targetH = targetW / spreadRatio;

    // If height exceeds available height, scale down based on height!
    if (targetH > maxH) {
      targetH = maxH;
      targetW = targetH * spreadRatio;
    }

    // Explicitly set pixel dimensions on containerRef so PageFlip wrapper NEVER overflows!
    const roundedW = Math.floor(targetW);
    const roundedH = Math.floor(targetH);

    containerRef.current.style.width = `${roundedW}px`;
    containerRef.current.style.height = `${roundedH}px`;

    if (flipBookInstanceRef.current) {
      try {
        flipBookInstanceRef.current.update();
      } catch (err) {}
    }
  }, []);

  // Set up ResizeObserver on the stage so any window resize, zoom, or sidebar scoot
  // immediately and smoothly updates the book size!
  useEffect(() => {
    if (!stageRef.current) return;

    const ro = new ResizeObserver(() => {
      recalculateBookSize();
    });

    ro.observe(stageRef.current);

    return () => {
      ro.disconnect();
    };
  }, [recalculateBookSize, loading]);

  useEffect(() => {
    let isCancelled = false;

    async function loadAndRenderPDF() {
      try {
        setLoading(true);
        setError(null);
        setProgressText('Opening document...');

        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          withCredentials: false,
        });

        const pdf = await loadingTask.promise;
        pdfDocumentRef.current = pdf;
        if (isCancelled) return;

        const firstPage = await pdf.getPage(1);
        const baseViewport = firstPage.getViewport({ scale: 1 });
        const baseWidth = baseViewport.width;
        const baseHeight = baseViewport.height;
        baseSizeRef.current = { width: baseWidth, height: baseHeight };

        const count = pdf.numPages;
        setTotalPages(count);

        const pageImages: string[] = [];

        // Offscreen canvas for rendering each page
        const offCanvas = document.createElement('canvas');
        const ctx = offCanvas.getContext('2d');
        if (!ctx) throw new Error('Could not create canvas context');

        const noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = 120;
        noiseCanvas.height = 120;
        const nCtx = noiseCanvas.getContext('2d');
        if (nCtx) {
          const imgData = nCtx.createImageData(120, 120);
          for (let i = 0; i < imgData.data.length; i += 4) {
            const val = Math.floor(Math.random() * 255);
            imgData.data[i] = val;
            imgData.data[i + 1] = val;
            imgData.data[i + 2] = val;
            imgData.data[i + 3] = 14; 
          }
          nCtx.putImageData(imgData, 0, 0);
        }

        for (let i = 1; i <= count; i++) {
          if (isCancelled) return;
          setProgressText(`Printing page ${i} of ${count} on newsprint...`);

          const page = await pdf.getPage(i);
          // Scale 2.0 provides ultra crisp text on all screens
          const viewport = page.getViewport({ scale: 2.0 });

          offCanvas.width = viewport.width;
          offCanvas.height = viewport.height;

          ctx.clearRect(0, 0, offCanvas.width, offCanvas.height);

          ctx.fillStyle = '#f7f3e8';
          ctx.fillRect(0, 0, offCanvas.width, offCanvas.height);

          await page.render({
            canvasContext: ctx,
            viewport,
          }).promise;

          ctx.save();
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = '#f4ede0';
          ctx.fillRect(0, 0, offCanvas.width, offCanvas.height);

          ctx.fillStyle = 'rgba(180, 150, 110, 0.08)';
          ctx.fillRect(0, 0, offCanvas.width, offCanvas.height);

          if (nCtx) {
            const pattern = ctx.createPattern(noiseCanvas, 'repeat');
            if (pattern) {
              ctx.fillStyle = pattern;
              ctx.fillRect(0, 0, offCanvas.width, offCanvas.height);
            }
          }

          const vignette = ctx.createRadialGradient(
            offCanvas.width / 2, offCanvas.height / 2, offCanvas.width * 0.35,
            offCanvas.width / 2, offCanvas.height / 2, offCanvas.width * 0.75
          );
          vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
          vignette.addColorStop(1, 'rgba(70, 50, 25, 0.07)');
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, offCanvas.width, offCanvas.height);
          ctx.restore();

          pageImages.push(offCanvas.toDataURL('image/jpeg', 0.88));
        }

        // PHYSICAL BOOK REQUIREMENT: Pages must be even! 
        // If a user uploads a 1-page or odd-page PDF, the engine will crash.
        // We inject a blank "back cover" or spacer page to fix the math.
        if (pageImages.length % 2 !== 0) {
          const blankCanvas = document.createElement('canvas');
          blankCanvas.width = baseWidth;
          blankCanvas.height = baseHeight;
          const bCtx = blankCanvas.getContext('2d');
          if (bCtx) {
            bCtx.fillStyle = '#f7f3e8';
            bCtx.fillRect(0, 0, blankCanvas.width, blankCanvas.height);
            pageImages.push(blankCanvas.toDataURL('image/jpeg', 0.88));
          }
        }

        if (isCancelled || !containerRef.current) return;
        setProgressText('Binding Gazette volume...');

        if (flipBookInstanceRef.current) {
          try { flipBookInstanceRef.current.destroy(); } catch (e) {}
          flipBookInstanceRef.current = null;
        }

        containerRef.current.innerHTML = '';

        // Calculate and set the exact pixel bounds BEFORE PageFlip builds its wrapper!
        recalculateBookSize();

        // Initialize PageFlip with autoSize: false so it never forces width: 100%!
        const pageFlip = new PageFlip(containerRef.current, {
          width: baseWidth,       
          height: baseHeight,     
          sizing: 'responsive', 
          autoSize: false, // CRITICAL: Stop PageFlip from forcing 100% width!
          minWidth: 100,
          maxWidth: 3000, 
          minHeight: 100,
          maxHeight: 3000,
          maxShadowOpacity: engineSettings.maxShadowOpacity, 
          hardCovers: engineSettings.hardCovers,       
          allowTouchScroll: engineSettings.allowTouchScroll,
          usePortrait: engineSettings.usePortrait,      
          flippingTime: engineSettings.flippingTime,      
          initialPage: 0,
        });

        flipBookInstanceRef.current = pageFlip;

        pageFlip.on('flip', () => {
          if (!isCancelled && flipBookInstanceRef.current) {
            setCurrentPage(flipBookInstanceRef.current.getCurrentPageIndex());
          }
        });

        pageFlip.on('changeState', (e: any) => {
          if (e.data === 'flipping') {
            playFlipSound();
          }
        });

        const pageElements = pageImages.map(src => {
          const div = document.createElement('div');
          div.className = 'gazette-page';
          div.style.width = '100%';
          div.style.height = '100%';
          div.style.overflow = 'hidden';
          div.style.backgroundColor = '#f7f3e8';
          const img = document.createElement('img');
          img.src = src;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'contain'; 
          img.style.display = 'block';
          img.draggable = false;
          div.appendChild(img);
          return div;
        });

        pageFlip.loadFromHTML(pageElements);
        
        // Re-run sizing to ensure perfect alignment after pages are mounted
        setTimeout(recalculateBookSize, 50);

        setLoading(false);
      } catch (err: any) {
        console.error('Failed to load PDF Flipbook:', err);
        if (!isCancelled) {
          setError(err?.message || 'Could not load magazine');
          setLoading(false);
        }
      }
    }

    setTimeout(loadAndRenderPDF, 100);

    return () => {
      isCancelled = true;
      if (flipBookInstanceRef.current) {
        try { flipBookInstanceRef.current.destroy(); } catch (e) {}
        flipBookInstanceRef.current = null;
      }
    };
  }, [pdfUrl, engineSettings, recalculateBookSize]);

  return (
    <div 
      className="gazette-ereader-container" 
      style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'row', 
        position: 'relative', 
        overflow: 'hidden' 
      }}
    >
      {/* RESEARCH SIDEBAR */}
      <aside 
        style={{ 
          width: showSidebar ? '350px' : '0px',
          opacity: showSidebar ? 1 : 0, 
          background: '#fcfaf6', 
          borderRight: showSidebar ? '1px solid #d9d1c1' : 'none',
          transition: 'width 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease', 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%', 
          overflow: 'hidden',
          flexShrink: 0,
          zIndex: 50 
        }}
      >
        <div style={{ width: '350px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e5ded2', background: '#f4eee2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontFamily: 'Georgia, serif', color: '#1e1812', fontSize: '1.2rem' }}>Research Desk</h3>
            <button onClick={() => setShowSidebar(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
          </div>
          
          <div style={{ padding: '15px', borderBottom: '1px solid #e5ded2' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#8b2635', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Notes for Page {currentPage === 0 ? 'Cover' : currentPage + 1}
            </h4>
            <textarea 
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add an annotation or research note to this page..."
              style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '4px', border: '1px solid #d9d1c1', background: '#fff', resize: 'none', fontFamily: 'sans-serif', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button 
                onClick={saveNote}
                style={{ flex: 1, padding: '8px', background: '#1e1812', color: '#f7f3e8', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {editingNoteId ? 'Update Note' : 'Attach Note'}
              </button>
              {editingNoteId && (
                <button 
                  onClick={() => { setEditingNoteId(null); setNewNote(''); }}
                  style={{ padding: '8px', background: '#d9d1c1', color: '#1e1812', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
            {annotations.length === 0 ? (
              <p style={{ color: '#888', fontStyle: 'italic', fontSize: '0.9rem', textAlign: 'center', marginTop: '20px' }}>No notes yet.</p>
            ) : (
              annotations.map(note => (
                <div key={note.id} style={{ background: '#fff', border: '1px solid #e5ded2', padding: '12px', borderRadius: '4px', marginBottom: '10px', position: 'relative', borderLeft: '3px solid #8b2635' }}>
                  <div style={{ position: 'absolute', top: '5px', right: '5px', display: 'flex', gap: '5px' }}>
                    <button onClick={() => editNote(note)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.8rem' }}>✎</button>
                    <button onClick={() => deleteNote(note.id)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
                  </div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#333', paddingRight: '35px' }}>{note.text}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>{new Date(note.date).toLocaleDateString()}</span>
                    <button 
                      onClick={() => jumpToPage(note.page)}
                      style={{ background: '#f4eee2', border: '1px solid #d9d1c1', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', color: '#8b2635' }}
                    >
                      Jump to P.{note.page + 1}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: '15px', borderTop: '1px solid #e5ded2', display: 'flex', gap: '10px', background: '#f4eee2' }}>
            <button onClick={exportNotes} style={{ flex: 1, padding: '8px', background: '#fff', border: '1px solid #d9d1c1', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
              ↓ Export
            </button>
            <label style={{ flex: 1, padding: '8px', background: '#fff', border: '1px solid #d9d1c1', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'center' }}>
              ↑ Import
              <input type="file" accept=".json" onChange={importNotes} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      </aside>

      {/* MAIN READER AREA */}
      <div 
        style={{ 
          flex: 1, 
          position: 'relative', 
          display: 'flex', 
          flexDirection: 'column', 
          minWidth: 0, 
          height: '100%',
          overflow: 'hidden'
        }}
      >
        {/* ENGINE SETTINGS MODAL */}
        <div style={{ position: 'absolute', top: '12px', right: '16px', zIndex: 1000 }}>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            style={{ 
              background: 'rgba(30, 24, 18, 0.85)', 
              color: '#e5ded2', 
              border: '1px solid rgba(255, 255, 255, 0.2)', 
              padding: '6px 12px', 
              borderRadius: '9999px', 
              cursor: 'pointer', 
              fontFamily: 'sans-serif',
              fontSize: '12px',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          >
            {showSettings ? 'Close Settings ✕' : '⚙️ Engine Settings'}
          </button>
          
          {showSettings && (
            <div style={{ background: '#f4eee2', border: '1px solid #c9bda8', padding: '15px', marginTop: '8px', borderRadius: '8px', width: '280px', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', fontFamily: 'sans-serif', fontSize: '13px' }}>
              <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #ddd', paddingBottom: '5px', color: '#1e1812' }}>Physics Controls</h4>
              
              <label style={{ display: 'block', marginBottom: '10px' }}>
                Shadow Opacity: <b>{engineSettings.maxShadowOpacity}</b>
                <input 
                  type="range" min="0" max="1" step="0.05" value={engineSettings.maxShadowOpacity} style={{ width: '100%' }}
                  onChange={e => setEngineSettings({...engineSettings, maxShadowOpacity: parseFloat(e.target.value)})} 
                />
              </label>

              <label style={{ display: 'block', marginBottom: '10px' }}>
                Flip Speed (ms): <b>{engineSettings.flippingTime}</b>
                <input 
                  type="range" min="200" max="2000" step="50" value={engineSettings.flippingTime} style={{ width: '100%' }}
                  onChange={e => setEngineSettings({...engineSettings, flippingTime: parseInt(e.target.value)})} 
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={engineSettings.hardCovers} onChange={e => setEngineSettings({...engineSettings, hardCovers: e.target.checked})} />
                <span style={{ marginLeft: '6px' }}>Hard Covers</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={engineSettings.usePortrait} onChange={e => setEngineSettings({...engineSettings, usePortrait: e.target.checked})} />
                <span style={{ marginLeft: '6px' }}>Force Portrait (Mobile)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={engineSettings.allowTouchScroll} onChange={e => setEngineSettings({...engineSettings, allowTouchScroll: e.target.checked})} />
                <span style={{ marginLeft: '6px' }}>Touch Swiping</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={engineSettings.playAudio} onChange={e => setEngineSettings({...engineSettings, playAudio: e.target.checked})} />
                <span style={{ marginLeft: '6px' }}>Page Turn Audio</span>
              </label>
            </div>
          )}
        </div>

        {loading && (
          <div className="ereader-loading-card" style={{ margin: 'auto', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="vintage-spinner" style={{ alignSelf: 'center' }} />
            <p className="loading-eyebrow" style={{ textAlign: 'center' }}>THE HEALTH GAZETTE ARCHIVE</p>
            <h3 className="loading-headline" style={{ textAlign: 'center' }}>{progressText}</h3>
          </div>
        )}

        {error && (
          <div className="ereader-error-card" style={{ margin: 'auto', textAlign: 'center', padding: '2rem' }}>
            <h3 style={{ color: 'red' }}>Failed to open Gazette</h3>
            <p style={{ color: 'black' }}>{error}</p>
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '1rem' }}>
              Hint: If this says "Failed to fetch" or "CORS", make sure http://localhost:4321 is added to your Sanity CORS Origins!
            </p>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              Open raw PDF instead
            </a>
          </div>
        )}

        {/* 
          STAGE CONTAINER:
          Occupies all available space above the dock.
          The ResizeObserver measures this container and calculates target dimensions
          so the book is ALWAYS 100% visible inside it without clipping!
        */}
        <div 
          ref={stageRef}
          className={`flipbook-stage ${loading ? 'stage-hidden' : 'stage-visible'}`} 
          style={{ 
            flex: 1, 
            width: '100%',
            height: '100%',
            minHeight: 0,
            minWidth: 0,
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div 
            ref={containerRef} 
            style={{ 
              position: 'relative',
              margin: 'auto',
              boxShadow: '0 20px 50px -10px rgba(0,0,0,0.3)',
              borderRadius: '2px',
              transition: 'width 0.15s ease-out, height 0.15s ease-out'
            }} 
          />
        </div>

        {/* 
          TACTILE DOCK BAR:
          Lives in its own dedicated space underneath the stage.
          It CANNOT overlap the book because the stage height is strictly calculated above it!
        */}
        {!loading && !error && (
          <div style={{ flexShrink: 0, padding: '8px 0 16px 0', display: 'flex', justifyContent: 'center', zIndex: 100 }}>
            <nav 
              className="reader-dock" 
              style={{ 
                position: 'relative', 
                bottom: 'auto', 
                left: 'auto', 
                transform: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.5rem 1.25rem',
                background: 'rgba(30, 24, 18, 0.92)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '9999px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)'
              }}
            >
              <button 
                type="button" 
                onClick={() => setShowSidebar(!showSidebar)} 
                className="dock-btn" 
                style={{ color: '#e8a9a9' }}
              >
                {showSidebar ? 'Close Tools' : '🔬 Research Tools'}
              </button>
              <button 
                type="button" 
                onClick={() => flipBookInstanceRef.current?.flipPrev()} 
                className="dock-btn"
              >
                ‹ Prev
              </button>
              <div className="dock-page-indicator">
                <span className="dock-num">
                  {currentPage === 0 ? 'Cover' : currentPage >= totalPages ? 'Back Cover' : `Page ${currentPage + 1} of ${totalPages}`}
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => flipBookInstanceRef.current?.flipNext()} 
                className="dock-btn"
              >
                Next ›
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
