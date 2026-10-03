import React, { useState, useEffect, useRef } from 'react';
import { PaperTexture } from '@paper-design/shaders-react';

export interface PaperShaderParams {
  // Container styling
  blendMode: 'multiply' | 'overlay' | 'soft-light' | 'darken' | 'normal' | 'color-burn';
  opacity: number;
  
  // Paper Colors
  colorBack: string;
  colorPaper: string;
  colorShadow: string;
  
  // Surface Grain & Fibers
  roughness: number;
  roughnessSize: number;
  roughnessRows: number;
  fiber: number;
  fiberSize: number;
  drops: number;
  
  // Folds & Wrinkles
  folds: number;
  foldSizeX: number;
  foldSizeY: number;
  foldOffsetX: number;
  foldOffsetY: number;
  wrinkles: number;
  wrinkleSize: number;
  crumples: number;
  crumpleCount: number;
  
  // Geometry & Angle
  angle: number;
  seed: number;
  scale: number;
  rotation: number;
  distortion: number;
  blending: number;
  fit: 'contain' | 'cover';
}

const PRESETS: Record<string, Partial<PaperShaderParams>> = {
  'Subtle Newsprint (Recommended)': {
    blendMode: 'multiply',
    opacity: 0.65,
    colorBack: '#ffffff00',
    colorPaper: '#ffffff',
    colorShadow: '#9e9689',
    roughness: 0.55,
    roughnessSize: 0.35,
    roughnessRows: 0.25,
    fiber: 0.45,
    fiberSize: 0.4,
    folds: 0.1,
    foldSizeX: 0.5,
    foldSizeY: 0.5,
    foldOffsetX: 0,
    foldOffsetY: 0,
    wrinkles: 0.15,
    wrinkleSize: 0.4,
    crumples: 0.05,
    crumpleCount: 4,
    drops: 0.15,
    angle: 45,
    seed: 42,
    scale: 1.0,
    rotation: 0,
    distortion: 0,
    blending: 1,
    fit: 'cover',
  },
  'Clean Fine Grain': {
    blendMode: 'multiply',
    opacity: 0.5,
    colorBack: '#ffffff00',
    colorPaper: '#ffffff',
    colorShadow: '#7a756d',
    roughness: 0.8,
    roughnessSize: 0.2,
    roughnessRows: 0.0,
    fiber: 0.3,
    fiberSize: 0.25,
    folds: 0,
    foldSizeX: 0,
    foldSizeY: 0,
    foldOffsetX: 0,
    foldOffsetY: 0,
    wrinkles: 0,
    wrinkleSize: 0,
    crumples: 0,
    crumpleCount: 2,
    drops: 0.05,
    angle: 0,
    seed: 120,
    scale: 1.0,
    rotation: 0,
    distortion: 0,
    blending: 1,
    fit: 'cover',
  },
  'Official Default': {
    blendMode: 'multiply',
    opacity: 0.7,
    colorBack: '#d3d2ab',
    colorPaper: '#ffffff',
    colorShadow: '#cccccc',
    roughness: 0.4,
    roughnessSize: 0.5,
    roughnessRows: 0,
    fiber: 0.4,
    fiberSize: 0.5,
    folds: 0.5,
    foldSizeX: 1,
    foldSizeY: 1,
    foldOffsetX: 0,
    foldOffsetY: 0,
    wrinkles: 1,
    wrinkleSize: 0.65,
    crumples: 0,
    crumpleCount: 6,
    drops: 0.4,
    angle: 300,
    seed: 4,
    scale: 0.9,
    rotation: 0,
    distortion: 0.75,
    blending: 1,
    fit: 'cover',
  },
  'Official Flat': {
    blendMode: 'multiply',
    opacity: 0.65,
    colorBack: '#d4cdab',
    colorPaper: '#ffffffa8',
    colorShadow: '#b3b3b3',
    roughness: 1,
    roughnessSize: 0.5,
    roughnessRows: 0.6,
    fiber: 0.7,
    fiberSize: 1,
    folds: 0,
    foldSizeX: 0,
    foldSizeY: 0.44,
    foldOffsetX: 0,
    foldOffsetY: 0,
    wrinkles: 0,
    wrinkleSize: 0,
    crumples: 0,
    crumpleCount: 6,
    drops: 0.2,
    angle: 0,
    seed: 455,
    scale: 0.9,
    rotation: 0,
    distortion: 0,
    blending: 1,
    fit: 'cover',
  },
  'Official Creased': {
    blendMode: 'multiply',
    opacity: 0.7,
    colorBack: '#d3d2ab',
    colorPaper: '#ffffff',
    colorShadow: '#b3b3b3',
    roughness: 0.4,
    roughnessSize: 0.25,
    roughnessRows: 0,
    fiber: 0.4,
    fiberSize: 0.5,
    folds: 0,
    foldSizeX: 0.6,
    foldSizeY: 0.89,
    foldOffsetX: 0.59,
    foldOffsetY: 1,
    wrinkles: 0,
    wrinkleSize: 0.65,
    crumples: 1,
    crumpleCount: 4,
    drops: 0,
    angle: 60,
    seed: 49,
    scale: 0.9,
    rotation: 0,
    distortion: -0.5,
    blending: 1,
    fit: 'cover',
  },
};

const DEFAULT_PARAMS: PaperShaderParams = {
  blendMode: 'multiply',
  opacity: 0.7,
  colorBack: '#d3d2ab',
  colorPaper: '#ffffff',
  colorShadow: '#cccccc',
  roughness: 0.4,
  roughnessSize: 0.5,
  roughnessRows: 0,
  fiber: 0.4,
  fiberSize: 0.5,
  folds: 0,
  foldSizeX: 1,
  foldSizeY: 1,
  foldOffsetX: 0,
  foldOffsetY: 0,
  wrinkles: 0.64,
  wrinkleSize: 0.47,
  crumples: 0,
  crumpleCount: 6,
  drops: 0.16,
  angle: 300,
  seed: 4, // Will be randomized on mount
  scale: 0.85,
  rotation: 45,
  distortion: 0.75,
  blending: 1,
  fit: 'cover',
};

const SHOW_DEV_TOOLS = false; // Toggle this to true to re-enable the tuning panel

export default function PaperShaderOverlay() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  const [params, setParams] = useState<PaperShaderParams>(() => {
    // Generate a random seed for every page load so artifacts look different
    const randomSeed = Math.floor(Math.random() * 1000) + 1;
    
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('thg_paper_shader_params');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Always override the saved seed with the new random seed
          return { ...DEFAULT_PARAMS, ...parsed, seed: randomSeed };
        } catch {
          // ignore
        }
      }
    }
    return { ...DEFAULT_PARAMS, seed: randomSeed };
  });

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'grain' | 'folds' | 'colors' | 'all'>('presets');
  const [copied, setCopied] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });

  useEffect(() => {
    if (typeof window !== 'undefined' && wrapperRef.current) {
      // Use ResizeObserver to track the actual size of the publication-frame
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          // Add a small buffer to height to ensure it covers everything
          setDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height
          });
        }
      });
      
      // Observe the .publication-frame explicitly because astro-island has display: contents
      const parent = document.querySelector('.publication-frame');
      if (parent) {
        observer.observe(parent);
        // Set initial dimensions immediately
        const rect = parent.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height
        });
      }

      // Signal to the layout that the shader has mounted and is ready,
      // so it can fade in the page smoothly. We use a short timeout to ensure
      // the WebGL canvas has painted its first frame before fading in.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.documentElement.classList.add('shader-loaded');
        });
      });

      return () => {
        observer.disconnect();
      };
    }
  }, []);

  const handleChange = <K extends keyof PaperShaderParams>(key: K, value: PaperShaderParams[K]) => {
    setParams(prev => {
      const next = { ...prev, [key]: value };
      if (typeof window !== 'undefined') {
        localStorage.setItem('thg_paper_shader_params', JSON.stringify(next));
      }
      return next;
    });
  };

  const applyPreset = (presetName: string) => {
    const preset = PRESETS[presetName];
    if (preset) {
      setParams(prev => {
        const next = { ...prev, ...preset };
        if (typeof window !== 'undefined') {
          localStorage.setItem('thg_paper_shader_params', JSON.stringify(next));
        }
        return next;
      });
    }
  };

  const copyConfig = () => {
    const json = JSON.stringify(params, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const resetDefaults = () => {
    setParams(DEFAULT_PARAMS);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('thg_paper_shader_params');
    }
  };

  return (
    <>
      {/* The Official Paper Texture Canvas - Absolute to parent so it sticks to content */}
      <div
        ref={wrapperRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 9990,
          mixBlendMode: params.blendMode,
          opacity: params.opacity,
          overflow: 'hidden',
        }}
      >
        <PaperTexture
          width={dimensions.width}
          height={dimensions.height}
          fit={params.fit}
          scale={params.scale}
          rotation={params.rotation}
          offsetY={0} // No JS scroll sync anymore, perfectly native!
          colorBack={params.colorBack}
          colorPaper={params.colorPaper}
          colorShadow={params.colorShadow}
          blending={params.blending}
          distortion={params.distortion}
          clip={false}
          angle={params.angle}
          seed={params.seed}
          roughness={params.roughness}
          roughnessSize={params.roughnessSize}
          roughnessRows={params.roughnessRows}
          fiber={params.fiber}
          fiberSize={params.fiberSize}
          folds={params.folds}
          foldSizeX={params.foldSizeX}
          foldSizeY={params.foldSizeY}
          foldOffsetX={params.foldOffsetX}
          foldOffsetY={params.foldOffsetY}
          wrinkles={params.wrinkles}
          wrinkleSize={params.wrinkleSize}
          crumples={params.crumples}
          crumpleCount={params.crumpleCount}
          drops={params.drops}
          minPixelRatio={1.5}
        />
      </div>

      {/* Floating Interactive Dev Panel - Still fixed to the screen */}
      {SHOW_DEV_TOOLS && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 10000,
            pointerEvents: 'auto',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
        >
          {/* Toggle Floating Pill Button */}
          {!isOpen && (
            <button
              onClick={() => setIsOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#AF2227',
                color: '#FFFFFF',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '9999px',
                padding: '10px 18px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                transition: 'transform 0.15s ease, background-color 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#8E1B1F')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#AF2227')}
            >
              <span>📜</span>
              <span>Tune Paper Shader</span>
            </button>
          )}

          {/* Opened Verbose Control Panel */}
          {isOpen && (
            <div
              style={{
                width: '380px',
                maxHeight: '85vh',
                backgroundColor: 'rgba(22, 22, 22, 0.96)',
                color: '#ECE6D8',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'rgba(32, 32, 32, 0.7)',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📜</span>
                    <span>Paper Shader Controls</span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                    @paper-design/shaders-react
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={resetDefaults}
                    title="Reset to defaults"
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#AAA',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#FFF',
                      fontSize: '16px',
                      cursor: 'pointer',
                      padding: '0 4px',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Quick Action: Copy Values Button */}
              <div style={{ padding: '12px 16px 0 16px' }}>
                <button
                  onClick={copyConfig}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: copied ? '#2e7d32' : '#AF2227',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {copied ? '✓ Copied Settings for LO!' : '📋 Copy Parameters for LO'}
                </button>
              </div>

              {/* Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  padding: '10px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '11px',
                  overflowX: 'auto',
                }}
              >
                {(['presets', 'grain', 'folds', 'colors', 'all'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: activeTab === tab ? 700 : 500,
                      backgroundColor: activeTab === tab ? 'rgba(255,255,255,0.15)' : 'transparent',
                      color: activeTab === tab ? '#FFF' : 'rgba(255,255,255,0.6)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Scrollable Sliders & Controls Area */}
              <div
                style={{
                  padding: '16px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  fontSize: '11px',
                }}
              >
                {/* TAB: PRESETS */}
                {(activeTab === 'presets' || activeTab === 'all') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#D4C7B0', letterSpacing: '0.05em' }}>
                      QUICK PRESETS
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
                      {Object.keys(PRESETS).map(name => (
                        <button
                          key={name}
                          onClick={() => applyPreset(name)}
                          style={{
                            textAlign: 'left',
                            padding: '8px 12px',
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            color: '#F4EFE6',
                            fontSize: '11px',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')}
                        >
                          {name}
                        </button>
                      ))}
                    </div>

                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <ControlRow
                        label="Layer Blend Mode"
                        value={params.blendMode}
                        control={
                          <select
                            value={params.blendMode}
                            onChange={e => handleChange('blendMode', e.target.value as any)}
                            style={{
                              background: '#333',
                              color: '#FFF',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '4px',
                              padding: '3px 6px',
                              fontSize: '11px',
                            }}
                          >
                            <option value="multiply">multiply (standard dark ink)</option>
                            <option value="soft-light">soft-light (gentle tactile)</option>
                            <option value="overlay">overlay (higher contrast)</option>
                            <option value="darken">darken</option>
                            <option value="normal">normal</option>
                          </select>
                        }
                      />

                      <SliderRow
                        label="Layer Opacity"
                        value={params.opacity}
                        min={0}
                        max={1}
                        step={0.02}
                        onChange={v => handleChange('opacity', v)}
                      />
                    </div>
                  </div>
                )}

                {/* TAB: GRAIN & FIBERS */}
                {(activeTab === 'grain' || activeTab === 'all') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#D4C7B0', letterSpacing: '0.05em' }}>
                      SURFACE GRAIN & FIBER
                    </div>

                    <SliderRow
                      label="Roughness (Fine Grain)"
                      value={params.roughness}
                      min={0}
                      max={1}
                      step={0.02}
                      onChange={v => handleChange('roughness', v)}
                    />

                    <SliderRow
                      label="Roughness Size"
                      value={params.roughnessSize}
                      min={0.01}
                      max={1}
                      step={0.02}
                      onChange={v => handleChange('roughnessSize', v)}
                    />

                    <SliderRow
                      label="Roughness Rows (Paper Lines)"
                      value={params.roughnessRows}
                      min={0}
                      max={1}
                      step={0.02}
                      onChange={v => handleChange('roughnessRows', v)}
                    />

                    <SliderRow
                      label="Fibers (Mottled Thread)"
                      value={params.fiber}
                      min={0}
                      max={1}
                      step={0.02}
                      onChange={v => handleChange('fiber', v)}
                    />

                    <SliderRow
                      label="Fiber Size"
                      value={params.fiberSize}
                      min={0.01}
                      max={1}
                      step={0.02}
                      onChange={v => handleChange('fiberSize', v)}
                    />

                    <SliderRow
                      label="Drops (Dark Speckles)"
                      value={params.drops}
                      min={0}
                      max={1}
                      step={0.02}
                      onChange={v => handleChange('drops', v)}
                    />
                  </div>
                )}

                {/* TAB: FOLDS & CRUMPLES */}
                {(activeTab === 'folds' || activeTab === 'all') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#D4C7B0', letterSpacing: '0.05em' }}>
                      FOLDS, CRUMPLES & CREASES
                    </div>

                    <SliderRow
                      label="Folds (Linear Creases)"
                      value={params.folds}
                      min={0}
                      max={1}
                      step={0.02}
                      onChange={v => handleChange('folds', v)}
                    />

                    <SliderRow
                      label="Fold Size X"
                      value={params.foldSizeX}
                      min={0}
                      max={1}
                      step={0.02}
                      onChange={v => handleChange('foldSizeX', v)}
                    />

                    <SliderRow
                      label="Fold Size Y"
                      value={params.foldSizeY}
                      min={0}
                      max={1}
                      step={0.02}
                      onChange={v => handleChange('foldSizeY', v)}
                    />

                    <SliderRow
                      label="Wrinkles (Facet Pattern)"
                      value={params.wrinkles}
                      min={0}
                      max={1}
                      step={0.02}
                      onChange={v => handleChange('wrinkles', v)}
                    />

                    <SliderRow
                      label="Wrinkle Size"
                      value={params.wrinkleSize}
                      min={0.05}
                      max={1}
                      step={0.02}
                      onChange={v => handleChange('wrinkleSize', v)}
                    />

                    <SliderRow
                      label="Crumples (Irregular Paper)"
                      value={params.crumples}
                      min={0}
                      max={1}
                      step={0.02}
                      onChange={v => handleChange('crumples', v)}
                    />

                    <SliderRow
                      label="Crumple Count"
                      value={params.crumpleCount}
                      min={2}
                      max={15}
                      step={1}
                      onChange={v => handleChange('crumpleCount', Math.round(v))}
                    />

                    <SliderRow
                      label="Lighting Angle (Degrees)"
                      value={params.angle}
                      min={0}
                      max={360}
                      step={1}
                      onChange={v => handleChange('angle', v)}
                    />

                    <SliderRow
                      label="Random Seed"
                      value={params.seed}
                      min={0}
                      max={1000}
                      step={1}
                      onChange={v => handleChange('seed', Math.round(v))}
                    />
                  </div>
                )}

                {/* TAB: COLORS & GEOMETRY */}
                {(activeTab === 'colors' || activeTab === 'all') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#D4C7B0', letterSpacing: '0.05em' }}>
                      COLORS & SHADING
                    </div>

                    <ColorRow
                      label="colorPaper (Base Sheet)"
                      value={params.colorPaper}
                      onChange={v => handleChange('colorPaper', v)}
                    />

                    <ColorRow
                      label="colorShadow (Noise & Creases)"
                      value={params.colorShadow}
                      onChange={v => handleChange('colorShadow', v)}
                    />

                    <ColorRow
                      label="colorBack (Behind Sheet)"
                      value={params.colorBack}
                      onChange={v => handleChange('colorBack', v)}
                    />

                    <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: 700, color: '#D4C7B0', letterSpacing: '0.05em' }}>
                      GEOMETRY & ZOOM
                    </div>

                    <SliderRow
                      label="Texture Scale (Zoom)"
                      value={params.scale}
                      min={0.2}
                      max={3}
                      step={0.05}
                      onChange={v => handleChange('scale', v)}
                    />

                    <SliderRow
                      label="Rotation (Degrees)"
                      value={params.rotation}
                      min={0}
                      max={360}
                      step={1}
                      onChange={v => handleChange('rotation', v)}
                    />
                  </div>
                )}
              </div>

              {/* Footer status */}
              <div
                style={{
                  padding: '10px 16px',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.5)',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>Auto-saved to localStorage</span>
                <span>Click Copy when happy</span>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ControlRow({ label, value, control }: { label: string; value?: any; control: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <span style={{ color: 'rgba(255,255,255,0.85)' }}>{label}</span>
      {control}
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.8)' }}>
        <span>{label}</span>
        <span style={{ color: '#EADDC8', fontWeight: 600 }}>{typeof value === 'number' ? value.toFixed(step < 1 ? 2 : 0) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          accentColor: '#AF2227',
          cursor: 'pointer',
        }}
      />
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hexValue = value.startsWith('#') && (value.length === 7 || value.length === 9) ? value.slice(0, 7) : '#ffffff';

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'rgba(255,255,255,0.8)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          type="color"
          value={hexValue}
          onChange={e => onChange(e.target.value)}
          style={{
            border: 'none',
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            cursor: 'pointer',
            backgroundColor: 'transparent',
          }}
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '80px',
            background: '#333',
            color: '#FFF',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '4px',
            padding: '3px 6px',
            fontSize: '10px',
          }}
        />
      </div>
    </div>
  );
}
