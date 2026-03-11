import React from 'react';
import { useCustomizer, ThemePalette, LayoutSettings } from '../../context/CustomizerContext';
import { 
  Palette, 
  Layout, 
  Type, 
  Image as ImageIcon, 
  RotateCcw, 
  Save, 
  Eye, 
  EyeOff,
  Maximize,
  Grid,
  Circle
} from 'lucide-react';

const PRESET_PALETTES = [
  {
    name: 'Cyberpunk',
    palette: {
      bg: '#0a0a0a',
      card: '#121212',
      accent: '#00f0ff',
      secondary: '#7000ff',
      text: '#e0e0e0',
      muted: '#a0a0a0',
      border: '#2a2a2a',
    }
  },
  {
    name: 'Royal Purple',
    palette: {
      bg: '#050214',
      card: '#0d0829',
      accent: '#A855F7',
      secondary: '#6366f1',
      text: '#f8fafc',
      muted: '#94a3b8',
      border: '#1e1b4b',
    }
  },
  {
    name: 'Emerald City',
    palette: {
      bg: '#020617',
      card: '#0f172a',
      accent: '#10b981',
      secondary: '#06b6d4',
      text: '#f1f5f9',
      muted: '#64748b',
      border: '#1e293b',
    }
  },
  {
    name: 'Crimson Fury',
    palette: {
      bg: '#0c0404',
      card: '#1a0a0a',
      accent: '#ef4444',
      secondary: '#f97316',
      text: '#fee2e2',
      muted: '#7f1d1d',
      border: '#450a0a',
    }
  }
];

export default function AdminCustomizer() {
  const { 
    theme, 
    layout, 
    content,
    isEditMode, 
    setEditMode, 
    updateTheme, 
    updateLayout, 
    updateContent,
    resetToDefault 
  } = useCustomizer();

  const handleColorChange = (key: keyof ThemePalette, value: string) => {
    updateTheme({ [key]: value });
  };

  const handleLayoutChange = (key: keyof LayoutSettings, value: any) => {
    updateLayout({ [key]: value });
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-white uppercase italic tracking-tighter">Site <span className="text-gaming-accent">Customizer</span></h1>
          <p className="text-gaming-muted font-mono text-xs mt-1">Design & Content Orchestration Matrix</p>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setEditMode(!isEditMode)}
            className={`px-6 py-3 rounded-xl border transition-all flex items-center space-x-3 group ${isEditMode
              ? 'bg-gaming-accent text-black border-gaming-accent font-black shadow-[0_0_20px_rgba(0,240,255,0.3)]'
              : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              }`}
          >
            {isEditMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="text-xs font-mono uppercase tracking-widest">
              {isEditMode ? 'Exit Live Edit' : 'Enter Live Edit'}
            </span>
          </button>
          
          <button
            onClick={resetToDefault}
            className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"
            title="Reset to Defaults"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Site Identity */}
        <div className="bg-gaming-card border border-gaming-border rounded-3xl p-8 space-y-8 lg:col-span-2">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-gaming-accent/10 rounded-lg">
              <Type className="h-5 w-5 text-gaming-accent" />
            </div>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Site Identity</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-bold text-gaming-muted uppercase tracking-widest text-gaming-muted">Site Display Name</label>
              <input
                type="text"
                value={content['global']?.['site_name'] || 'ConsoleZone'}
                onChange={(e) => updateContent('global', 'site_name', e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:border-gaming-accent outline-none font-bold"
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-gaming-muted uppercase tracking-widest text-gaming-muted">Support Email</label>
              <input
                type="text"
                value={content['global']?.['support_email'] || 'support@consolezone.com'}
                onChange={(e) => updateContent('global', 'support_email', e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:border-gaming-accent outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Color Palette Controls */}
        <div className="bg-gaming-card border border-gaming-border rounded-3xl p-8 space-y-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-gaming-accent/10 rounded-lg">
              <Palette className="h-5 w-5 text-gaming-accent" />
            </div>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Color Palette</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {PRESET_PALETTES.map((preset) => (
              <button
                key={preset.name}
                onClick={() => updateTheme(preset.palette)}
                className="flex items-center space-x-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-gaming-accent transition-all group"
              >
                <div className="flex -space-x-2">
                  <div className="w-4 h-4 rounded-full border border-black" style={{ backgroundColor: preset.palette.bg }} />
                  <div className="w-4 h-4 rounded-full border border-black" style={{ backgroundColor: preset.palette.accent }} />
                  <div className="w-4 h-4 rounded-full border border-black" style={{ backgroundColor: preset.palette.secondary }} />
                </div>
                <span className="text-xs font-bold text-gray-400 group-hover:text-white">{preset.name}</span>
              </button>
            ))}
          </div>

          <div className="space-y-4 pt-4">
            {Object.entries(theme).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">{key} Color</h4>
                  <p className="text-[10px] text-gaming-muted font-mono uppercase mt-1">{value}</p>
                </div>
                <div className="relative">
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => handleColorChange(key as keyof ThemePalette, e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Layout & Typography Controls */}
        <div className="space-y-8">
          <div className="bg-gaming-card border border-gaming-border rounded-3xl p-8 space-y-8">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-gaming-accent/10 rounded-lg">
                <Layout className="h-5 w-5 text-gaming-accent" />
              </div>
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">Layout Matrix</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gaming-muted uppercase tracking-widest">Container Max Width</label>
                  <span className="text-[10px] font-mono text-gaming-accent bg-gaming-accent/10 px-2 py-0.5 rounded">{layout.maxWidth}</span>
                </div>
                <select
                  value={layout.maxWidth}
                  onChange={(e) => handleLayoutChange('maxWidth', e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-gaming-accent outline-none"
                >
                  <option value="1024px">Compact (1024px)</option>
                  <option value="1280px">Standard (1280px)</option>
                  <option value="1536px">Wide (1536px)</option>
                  <option value="100%">Full Width (100%)</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gaming-muted uppercase tracking-widest">Global Border Radius</label>
                  <span className="text-[10px] font-mono text-gaming-accent bg-gaming-accent/10 px-2 py-0.5 rounded">{layout.borderRadius}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {['0px', '0.5rem', '1rem', '2.5rem'].map((radius) => (
                    <button
                      key={radius}
                      onClick={() => handleLayoutChange('borderRadius', radius)}
                      className={`p-3 rounded-lg border transition-all ${layout.borderRadius === radius ? 'bg-gaming-accent border-gaming-accent text-black' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                    >
                      <div className="w-full h-4 border-2 border-current" style={{ borderRadius: radius }} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gaming-muted uppercase tracking-widest">Full Width Topbar</label>
                  <button
                    onClick={() => handleLayoutChange('fullWidthNavbar', !layout.fullWidthNavbar)}
                    className={`w-12 h-6 rounded-full transition-all relative ${layout.fullWidthNavbar ? 'bg-gaming-accent' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${layout.fullWidthNavbar ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gaming-muted uppercase tracking-widest">Grid Spacing</label>
                  <span className="text-[10px] font-mono text-gaming-accent bg-gaming-accent/10 px-2 py-0.5 rounded">{layout.gridGap}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="0.5"
                    max="4"
                    step="0.5"
                    value={parseFloat(layout.gridGap)}
                    onChange={(e) => handleLayoutChange('gridGap', `${e.target.value}rem`)}
                    className="flex-grow accent-gaming-accent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info */}
          <div className="bg-gradient-to-br from-gaming-accent/10 to-gaming-secondary/10 border border-gaming-accent/20 rounded-3xl p-8">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2 uppercase tracking-tighter">
              <Type className="h-4 w-4 text-gaming-accent" />
              Live Editing Enabled
            </h3>
            <p className="text-sm text-gaming-muted leading-relaxed">
              When <span className="text-gaming-accent font-bold">Live Edit Mode</span> is active, you can click on any text or image on the site to edit it directly. Changes are saved instantly to your local profile.
            </p>
            <div className="mt-6 flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-[10px] font-mono text-gaming-accent">
                <div className="w-2 h-2 rounded-full bg-gaming-accent animate-pulse" />
                <span>SYNC_ACTIVE</span>
              </div>
              <div className="flex items-center space-x-2 text-[10px] font-mono text-gaming-muted uppercase">
                <span>LOCAL_STORAGE_ENCRYPTED</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content Management Matrix */}
        <div className="bg-gaming-card border border-gaming-border rounded-3xl p-8 space-y-8 lg:col-span-2">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-gaming-accent/10 rounded-lg">
              <Type className="h-5 w-5 text-gaming-accent" />
            </div>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Global Content Matrix</h2>
          </div>

          <div className="space-y-12">
            {[
              { 
                id: 'home', 
                name: 'Home Page', 
                fields: [
                  { id: 'hero_title', label: 'Main Hero Title', type: 'text', default: 'LEVEL UP YOUR GAMING' },
                  { id: 'hero_subtitle', label: 'Sub-Hero Title', type: 'text', default: 'Premium Console Rentals Delivered to Your Doorstep' },
                  { id: 'hero_bg', label: 'Main Hero Background Image', type: 'image', default: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc' },
                  { id: 'flash_sale_title', label: 'Flash Sale Title', type: 'text', default: 'GET 20% OFF ON YOUR FIRST RENTAL' },
                ] 
              },
              { 
                id: 'rentals', 
                name: 'Rentals Page', 
                fields: [
                  { id: 'hero_title', label: 'Page Main Title', type: 'text', default: 'RENTALS' },
                  { id: 'hero_subtitle', label: 'Page Sub-Title', type: 'text', default: 'Select from our elite fleet of current-gen and classic consoles' },
                  { id: 'hero_image', label: 'Hero Background Image', type: 'image', default: 'https://picsum.photos/seed/gaming/1920/1080?blur=4' },
                ] 
              },
              { 
                id: 'shop', 
                name: 'Shop Page', 
                fields: [
                  { id: 'title', label: 'Shop Main Title', type: 'text', default: 'Shop Gear' },
                  { id: 'subtitle', label: 'Shop Sub-Title', type: 'text', default: 'Browse the latest gaming hardware and accessories.' },
                ] 
              }
            ].map((page) => (
              <div key={page.id} className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="h-[1px] flex-grow bg-white/5" />
                  <h3 className="text-sm font-black text-gaming-accent uppercase tracking-[0.3em] italic">{page.name} Configuration</h3>
                  <div className="h-[1px] flex-grow bg-white/5" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {page.fields.map((field) => (
                    <div key={field.id} className="space-y-2 bg-white/[0.02] p-4 rounded-2xl border border-white/5 group hover:border-gaming-accent/30 transition-all">
                      <label className="text-[10px] font-bold text-gaming-muted uppercase tracking-widest flex justify-between">
                        {field.label}
                        <span className="text-gaming-accent/40 font-mono">ID: {field.id}</span>
                      </label>
                      {field.type === 'text' ? (
                        <input
                          type="text"
                          value={content[page.id]?.[field.id] || field.default}
                          onChange={(e) => updateContent(page.id, field.id, e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-gaming-accent outline-none"
                        />
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-10 bg-black rounded-lg overflow-hidden shrink-0 border border-white/10">
                              <img src={content[page.id]?.[field.id] || field.default} className="w-full h-full object-cover" alt="Preview" />
                            </div>
                            <input
                              type="text"
                              value={content[page.id]?.[field.id] || field.default}
                              onChange={(e) => updateContent(page.id, field.id, e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-mono text-white focus:border-gaming-accent outline-none"
                              placeholder="Image URL..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Media & Assets Control */}
        <div className="bg-gaming-card border border-gaming-border rounded-3xl p-8 space-y-8 lg:col-span-2">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-gaming-accent/10 rounded-lg">
              <ImageIcon className="h-5 w-5 text-gaming-accent" />
            </div>
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Media Control Center</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { page: 'home', id: 'hero_bg', label: 'Home Hero Background', default: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc' },
              { page: 'book', id: 'hero_bg', label: 'Booking Page Banner', default: 'https://picsum.photos/seed/gaming/1920/1080' },
              { page: 'rentals', id: 'hero_image', label: 'Rentals Hero Image', default: 'https://picsum.photos/seed/gaming/1920/1080?blur=4' },
            ].map((img) => (
              <div key={`${img.page}-${img.id}`} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden group">
                <div className="aspect-video w-full bg-black relative">
                  <img 
                    src={content[img.page]?.[img.id] || img.default} 
                    alt={img.label} 
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest bg-gaming-accent px-3 py-1 rounded">Update Asset</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <label className="text-[10px] font-bold text-gaming-muted uppercase tracking-widest">{img.label}</label>
                  <input
                    type="text"
                    value={content[img.page]?.[img.id] || ''}
                    placeholder="Enter Image URL..."
                    onChange={(e) => updateContent(img.page, img.id, e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-gaming-accent outline-none font-mono"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
