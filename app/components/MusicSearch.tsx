import { useState, useEffect } from "react";
import { Search, Music, Play, Square, Loader2 } from "lucide-react";

export type InstagramAudioResult = {
  id: string;
  title: string;
  artist_name: string;
  duration_in_ms?: number;
  preview_url?: string;
};

export default function MusicSearch({
  onSelect,
  selectedAudio,
  onClear
}: {
  onSelect: (audio: InstagramAudioResult) => void;
  selectedAudio: InstagramAudioResult | null;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InstagramAudioResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioEl) {
        audioEl.pause();
      }
    };
  }, [audioEl]);

  const searchMusic = async (searchQuery: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/instagram/audio/search?query=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchMusic(query);
  };

  const handlePlayPreview = (url: string, id: string) => {
    if (playingId === id && audioEl) {
      audioEl.pause();
      setPlayingId(null);
      return;
    }
    if (audioEl) {
      audioEl.pause();
    }
    const newAudio = new Audio(url);
    newAudio.play();
    newAudio.onended = () => setPlayingId(null);
    setAudioEl(newAudio);
    setPlayingId(id);
  };

  if (selectedAudio) {
    return (
      <div className="flex items-center justify-between rounded-[8px] border border-[#4b3cff] bg-[#f8f7ff] p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4b3cff]/10 text-[#4b3cff]">
            <Music size={18} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[13px] font-extrabold text-[#253049] line-clamp-1">{selectedAudio.title}</p>
            <p className="text-[12px] font-semibold text-[#596175] line-clamp-1">{selectedAudio.artist_name}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (audioEl) audioEl.pause();
            setPlayingId(null);
            onClear();
          }}
          className="text-[12px] font-extrabold text-[#df405b] hover:underline"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aab3c6]" size={16} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Instagram Music Library (leave empty for trending)..."
          className="h-10 w-full rounded-[8px] border border-[#dde3ee] bg-white pl-9 pr-24 text-[13px] font-semibold text-black outline-none focus:border-[#4b3cff] focus:ring-2 focus:ring-[#4b3cff]/10"
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute right-1 top-1 flex h-8 items-center justify-center rounded-[6px] bg-[#f0edff] px-3 text-[12px] font-extrabold text-[#4b3cff] hover:bg-[#e6e2ff]"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : "Search"}
        </button>
      </form>

      {results.length > 0 && (
        <div className="max-h-[240px] overflow-y-auto rounded-[8px] border border-[#dde3ee] bg-white">
          {results.map((item) => (
            <div key={item.id} className="flex items-center justify-between border-b border-[#f3f4f8] p-3 last:border-0 hover:bg-[#fafbff]">
              <div className="flex items-center gap-3 overflow-hidden">
                <button
                  type="button"
                  onClick={() => item.preview_url ? handlePlayPreview(item.preview_url, item.id) : null}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.preview_url ? 'bg-[#f0edff] text-[#4b3cff] hover:bg-[#e6e2ff]' : 'bg-[#f3f4f8] text-[#aab3c6] cursor-not-allowed'}`}
                  title={item.preview_url ? "Play preview" : "No preview available"}
                >
                  {playingId === item.id ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
                </button>
                <div className="overflow-hidden">
                  <p className="text-[13px] font-extrabold text-[#253049] truncate">{item.title}</p>
                  <p className="text-[12px] font-semibold text-[#596175] truncate">{item.artist_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="shrink-0 rounded-[6px] border border-[#dde3ee] bg-white px-3 py-1.5 text-[12px] font-extrabold text-[#253049] hover:bg-[#f7f8fc]"
              >
                Select
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
