import React, { useState, useEffect } from 'react';
import { X, Search, Check, Play, Film, ShieldCheck, Sparkles, Filter, Loader2 } from 'lucide-react';

export interface ValorantSkin {
  id: string;
  name: string;
  weapon: string;
  collection: string;
  tier?: string;
  image_url: string;
  video_url?: string;
  variants?: string[];
}

interface SkinSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSkins: string[];
  onConfirmSelection: (selectedSkinNames: string[]) => void;
}

export const SkinSelectorModal: React.FC<SkinSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedSkins: initialSelection,
  onConfirmSelection,
}) => {
  const [skins, setSkins] = useState<ValorantSkin[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [weaponFilter, setWeaponFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>(initialSelection || []);

  // Video Inspection Modal State
  const [inspectingSkin, setInspectingSkin] = useState<ValorantSkin | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelected(initialSelection || []);
      fetchSkins();
    }
  }, [isOpen]);

  const fetchSkins = async (searchTerm = '', weapon = 'all') => {
    setLoading(true);
    try {
      let url = '/api/skins?';
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
      if (weapon !== 'all') url += `weapon=${encodeURIComponent(weapon)}&`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSkins(data.skins || []);
      }
    } catch (err) {
      console.warn('Failed to fetch skins:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    fetchSkins(val, weaponFilter);
  };

  const handleWeaponChange = (w: string) => {
    setWeaponFilter(w);
    fetchSkins(search, w);
  };

  const toggleSelectSkin = (skinName: string) => {
    if (selected.includes(skinName)) {
      setSelected((prev) => prev.filter((s) => s !== skinName));
    } else {
      setSelected((prev) => [...prev, skinName]);
    }
  };

  const handleConfirm = () => {
    onConfirmSelection(selected);
    onClose();
  };

  if (!isOpen) return null;

  const weapons = ['all', 'Vandal', 'Phantom', 'Operator', 'Melee', 'Ghost', 'Sheriff'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="skin-selector-title"
        className="relative w-full max-w-4xl rounded-2xl bg-[#090b14] border border-purple-500/30 p-6 sm:p-8 shadow-2xl my-8 text-white space-y-6 max-h-[90vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 id="skin-selector-title" className="text-xl font-black font-rajdhani text-white uppercase tracking-wider">
                Valorant Skin Catalog & Inventory Selector
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                Select verified skins to associate with your account listing ({selected.length} Selected)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close skin selector"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="space-y-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by skin name or bundle (e.g. Kuronami, Reaver, Araxys)..."
              className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Weapon Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {weapons.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => handleWeaponChange(w)}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-rajdhani font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                  weaponFilter === w
                    ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.4)]'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Grid of Skins (Scrollable) */}
        <div className="flex-1 overflow-y-auto min-h-[280px] pr-1">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400 space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              <p className="text-xs font-mono">Querying Valorant skin database...</p>
            </div>
          ) : skins.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 text-xs font-mono">
              No skins matching search criteria.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {skins.map((skin) => {
                const isSelected = selected.includes(skin.name);
                return (
                  <div
                    key={skin.id}
                    className={`relative rounded-xl border p-3 flex flex-col justify-between transition-all group ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.3)]'
                        : 'bg-black/40 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-black/60 border border-white/5 flex items-center justify-center p-2">
                        <img
                          src={skin.image_url}
                          alt={skin.name}
                          className="w-full h-full object-contain filter group-hover:scale-105 transition-transform"
                        />
                        {skin.video_url && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectingSkin(skin);
                            }}
                            className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 hover:bg-purple-600 text-[10px] font-mono text-purple-200 flex items-center gap-1 transition-colors cursor-pointer"
                            title="Play Upgrade Video"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>Video</span>
                          </button>
                        )}
                      </div>

                      <div>
                        <div className="font-bold text-xs font-rajdhani text-white truncate" title={skin.name}>
                          {skin.name}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono truncate">
                          {skin.weapon} • {skin.collection}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSelectSkin(skin.name)}
                      className={`min-h-[36px] w-full mt-3 py-1.5 rounded-lg text-xs font-bold font-rajdhani uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                      <span>{isSelected ? 'Selected' : 'Select'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Summary & Action Footer */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-400 font-mono">
            {selected.length === 0 ? (
              <span>No skins selected yet.</span>
            ) : (
              <span className="text-purple-300">
                {selected.length} skins added: <strong className="text-white">{selected.slice(0, 3).join(', ')}{selected.length > 3 ? ` +${selected.length - 3} more` : ''}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold font-rajdhani uppercase cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="min-h-[44px] px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold font-rajdhani uppercase text-sm shadow-lg cursor-pointer"
            >
              Save Selection ({selected.length})
            </button>
          </div>
        </div>
      </div>

      {/* Video / Media Inspection Modal */}
      {inspectingSkin && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
          <div className="relative w-full max-w-xl rounded-2xl bg-[#0c0d1c] border border-purple-500/50 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold font-rajdhani text-white">{inspectingSkin.name}</h4>
                <div className="text-xs text-gray-400 font-mono">
                  {inspectingSkin.weapon} • {inspectingSkin.collection} • {inspectingSkin.tier || 'Exclusive'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingSkin(null)}
                aria-label="Close skin video"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player that stops cleanly at the end without looping */}
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10 relative">
              {inspectingSkin.video_url ? (
                <video
                  src={inspectingSkin.video_url}
                  controls
                  autoPlay
                  loop={false}
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={inspectingSkin.image_url}
                  alt={inspectingSkin.name}
                  className="w-full h-full object-contain p-4"
                />
              )}
            </div>

            <p className="text-xs text-gray-400 font-rajdhani">
              * Official skin cosmetic rendering. Video automatically stops at completion.
            </p>

            <button
              type="button"
              onClick={() => {
                toggleSelectSkin(inspectingSkin.name);
                setInspectingSkin(null);
              }}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold font-rajdhani uppercase text-sm text-white"
            >
              {selected.includes(inspectingSkin.name) ? 'Remove from Listing' : 'Add to Listing Inventory'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
