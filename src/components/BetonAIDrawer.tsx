import {
  Calculator,
  ExternalLink,
  Globe,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AIChatMode, GroundingSource, Listing } from '../types.ts';
import { formatPhoneForTel, formatPhoneForWhatsApp } from '../utils/helpers.ts';
import { BetonAILogo } from './BetonAILogo.tsx';
import { VoiceInputButton } from './VoiceInputButton.tsx';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  matchedListings?: Listing[];
  groundingSources?: GroundingSource[];
}

interface BetonAIDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  onOpenListing: (listing: Listing) => void;
}

const MODE_OPTIONS: {
  id: AIChatMode;
  label: string;
  icon: React.ReactNode;
  hint: string;
}[] = [
  {
    id: 'general',
    label: 'Sayt Bazası',
    icon: <Sparkles size={12} />,
    hint: 'Real elanlar və usta məsləhəti',
  },
  {
    id: 'fast',
    label: 'Sürətli',
    icon: <Zap size={12} />,
    hint: 'Ani m³ hesabı və qısa cavab',
  },
  {
    id: 'search',
    label: 'Google Axtarış',
    icon: <Globe size={12} />,
    hint: 'Aktual tikinti normaları və hava',
  },
  {
    id: 'maps',
    label: 'Google Xəritə',
    icon: <MapPin size={12} />,
    hint: 'Yaxınlıqdakı beton zavodları və ünvanlar',
  },
];

const QUICK_PROMPTS: Record<AIChatMode, string[]> = {
  general: [
    'Bakıda beton pompası olan ən yaxşı usta kimdir?',
    'Monolit işi üçün əlaqə nömrəsi ver',
    '10x12 metr sahəyə 20 sm qalınlıqda nə qədər beton gedər?',
  ],
  fast: [
    '8x10 m sahəyə 15 sm qalınlıqda neçə m³ beton gedir?',
    'M300 ilə M350 betonun əsas fərqi nədir?',
  ],
  search: [
    'Bakıda bu həftə beton tökmək üçün hava şəraiti necədir?',
    'İsti havada beton töküləndə nələrə diqqət edilməlidir?',
  ],
  maps: [
    'Bakı yaxınlığında hansı hazır beton zavodları var?',
    'Abşeron və Xırdalanda tikinti materialları bazası haradadır?',
  ],
};

export function BetonAIDrawer({
  isOpen,
  onToggle,
  onOpenListing,
}: BetonAIDrawerProps) {
  const [mode, setMode] = useState<AIChatMode>('general');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Salam! Mən Beton AI — "Beton İşləri" platformasının ağıllı tikinti məsləhətçisiyəm. Səsli və ya yazılı sual verə, m³ hesablayıb saytdakı real ustaları, yaxud Google Axtarış və Google Xəritə məlumatlarını əldə edə bilərsiniz.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceError, setVoiceError] = useState('');

  // Built-in Concrete m3 Calculator
  const [showCalc, setShowCalc] = useState(false);
  const [calcLength, setCalcLength] = useState('10');
  const [calcWidth, setCalcWidth] = useState('12');
  const [calcThicknessCm, setCalcThicknessCm] = useState('20');

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const parsedVolume = (() => {
    const l = parseFloat(calcLength) || 0;
    const w = parseFloat(calcWidth) || 0;
    const h = (parseFloat(calcThicknessCm) || 0) / 100;
    return Number((l * w * h).toFixed(2));
  })();

  const reserveVolume = Number((parsedVolume * 1.05).toFixed(2));

  async function getOptionalLocation(): Promise<
    { lat: number; lng: number } | undefined
  > {
    if (mode !== 'maps' || !navigator.geolocation) return undefined;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => resolve(undefined),
        { timeout: 3000 }
      );
    });
  }

  async function sendMessage(textToSend: string) {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setVoiceError('');
    setLoading(true);

    try {
      const userLocation = await getOptionalLocation();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          mode,
          userLocation,
          history: nextHistory
            .filter((m) => m.id !== 'welcome')
            .map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'model',
            text: data.error || 'Cavab alınarkən xəta baş verdi.',
          },
        ]);
      } else {
        const cleanText = String(data.reply || '').replace(
          /\[\[ELAN:[a-zA-Z0-9_-]+\]\]/g,
          ''
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `m-${Date.now()}`,
            role: 'model',
            text: cleanText.trim(),
            matchedListings: data.matchedListings || [],
            groundingSources: data.groundingSources || [],
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          text: 'Serverlə əlaqə kəsildi. Zəhmət olmasa yenidən cəhd edin.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const activeModeObj = MODE_OPTIONS.find((m) => m.id === mode) || MODE_OPTIONS[0];

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={onToggle}
          title="Beton AI"
          aria-label="Beton AI"
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-[#E7E2DA] bg-[#FAF7F2] shadow-lg hover:border-[#6B7A3F] transition-transform hover:-translate-y-0.5 cursor-pointer"
        >
          <BetonAILogo size="md" />
        </button>
      )}

      {isOpen && (
        <aside
          className="fixed bottom-4 right-4 z-50 flex h-[640px] max-h-[86vh] w-[calc(100vw-2rem)] max-w-[440px] flex-col overflow-hidden rounded-2xl border border-[#E7E2DA] bg-[#FAF7F2] shadow-2xl"
          aria-label="Beton AI Köməkçi"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-[#E7E2DA] bg-[#E7E2DA]/55 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <BetonAILogo size="md" />
              <div>
                <h3 className="font-display text-sm font-bold text-[#3A3A3A]">
                  Beton AI Məsləhətçi
                </h3>
                <p className="text-[11px] text-[#3A3A3A]/65">
                  {activeModeObj.hint}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowCalc((v) => !v)}
                title="Beton həcmi kalkulyatoru"
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  showCalc
                    ? 'bg-[#6B7A3F] text-[#FAF7F2]'
                    : 'border border-[#E7E2DA] bg-[#FAF7F2] text-[#3A3A3A]'
                }`}
              >
                <Calculator size={13} />
                <span>m³</span>
              </button>
              <button
                type="button"
                onClick={onToggle}
                aria-label="Bağla"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] text-[#3A3A3A] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Mode Selector Strip (Sayt Bazası | Sürətli | Google Axtarış | Google Xəritə) */}
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b border-[#E7E2DA] bg-white/70 px-3 py-2">
            {MODE_OPTIONS.map((opt) => {
              const active = mode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMode(opt.id)}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#6B7A3F] text-[#FAF7F2]'
                      : 'border border-[#E7E2DA] bg-[#FAF7F2] text-[#3A3A3A] hover:border-[#6B7A3F]'
                  }`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive m3 Concrete Calculator Strip */}
          {showCalc && (
            <div className="border-b border-[#E7E2DA] bg-[#E7E2DA]/35 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#3A3A3A]">
                  Sürətli Beton Həcmi Kalkulyatoru
                </span>
                <span className="font-mono text-xs font-bold text-[#6B7A3F] tabular-nums">
                  {parsedVolume} m³ (ehtiyatla: {reserveVolume} m³)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-[#3A3A3A]/65">Uzunluq (m)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={calcLength}
                    onChange={(e) => setCalcLength(e.target.value)}
                    className="w-full rounded-md border border-[#E7E2DA] bg-white px-2 py-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#3A3A3A]/65">En (m)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={calcWidth}
                    onChange={(e) => setCalcWidth(e.target.value)}
                    className="w-full rounded-md border border-[#E7E2DA] bg-white px-2 py-1 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#3A3A3A]/65">Qalınlıq (sm)</label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={calcThicknessCm}
                    onChange={(e) => setCalcThicknessCm(e.target.value)}
                    className="w-full rounded-md border border-[#E7E2DA] bg-white px-2 py-1 font-mono text-xs"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCalc(false);
                  sendMessage(
                    `${calcLength}x${calcWidth} metr sahəyə ${calcThicknessCm} sm qalınlıqda (${parsedVolume} m³) beton tökmək üçün hansı marka tövsiyə olunur və uyğun usta/texnika təklif et.`
                  );
                }}
                className="w-full rounded-lg bg-[#6B7A3F] py-1.5 text-xs font-semibold text-[#FAF7F2] hover:bg-[#5B6834] cursor-pointer"
              >
                Bu ölçü üçün AI-dan marka və usta soruş
              </button>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-[#6B7A3F] text-[#FAF7F2]'
                      : 'border border-[#E7E2DA] bg-white text-[#3A3A3A]'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Google Search / Google Maps Grounding Links */}
                {msg.groundingSources && msg.groundingSources.length > 0 && (
                  <div className="mt-2 w-full max-w-[92%] rounded-xl border border-[#E7E2DA] bg-white p-2.5 space-y-1.5">
                    <div className="text-[11px] font-semibold text-[#3A3A3A]/70">
                      Mənbələr və Xəritə Keçidləri
                    </div>
                    {msg.groundingSources.map((src, idx) => (
                      <div key={`${src.uri}-${idx}`} className="text-xs">
                        <a
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-[#6B7A3F] hover:underline"
                        >
                          {src.type === 'maps' ? (
                            <MapPin size={12} />
                          ) : (
                            <Globe size={12} />
                          )}
                          <span className="truncate max-w-[280px]">{src.title}</span>
                          <ExternalLink size={11} />
                        </a>
                        {src.snippet && (
                          <p className="mt-0.5 text-[11px] text-[#3A3A3A]/70 italic">
                            &ldquo;{src.snippet}&rdquo;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Matched Database Listings */}
                {msg.matchedListings && msg.matchedListings.length > 0 && (
                  <div className="mt-2 w-full max-w-[92%] space-y-2">
                    {msg.matchedListings.map((l) => (
                      <div
                        key={l.id}
                        className="rounded-xl border border-[#6B7A3F]/35 bg-[#E7E2DA]/35 p-3 space-y-2"
                      >
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-[#6B7A3F]">
                            {l.category} · {l.regions[0]}
                          </div>
                          <div className="text-xs font-bold text-[#3A3A3A] line-clamp-1">
                            {l.title}
                          </div>
                          <div className="text-[11px] text-[#3A3A3A]/70">
                            {l.companyName} ·{' '}
                            <span className="font-mono">{l.phone}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenListing(l)}
                            className="rounded-md bg-[#3A3A3A] px-2.5 py-1 text-[11px] font-semibold text-[#FAF7F2] hover:bg-[#6B7A3F] cursor-pointer"
                          >
                            Elana bax
                          </button>
                          <a
                            href={formatPhoneForTel(l.phone)}
                            className="inline-flex items-center gap-1 rounded-md bg-[#6B7A3F] px-2.5 py-1 text-[11px] font-semibold text-[#FAF7F2]"
                          >
                            <Phone size={11} />
                            Zəng
                          </a>
                          <a
                            href={formatPhoneForWhatsApp(l.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-[#6B7A3F] bg-[#FAF7F2] px-2.5 py-1 text-[11px] font-semibold text-[#6B7A3F]"
                          >
                            <MessageCircle size={11} />
                            WhatsApp
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="text-xs text-[#3A3A3A]/60">
                Beton AI cavab hazırlayır...
              </div>
            )}

            {messages.length <= 2 && !loading && (
              <div className="pt-2 space-y-1.5">
                <div className="text-[11px] font-medium text-[#3A3A3A]/60">
                  Nümunə sorğular ({activeModeObj.label}):
                </div>
                {QUICK_PROMPTS[mode].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="block w-full rounded-lg border border-[#E7E2DA] bg-white px-3 py-2 text-left text-xs text-[#3A3A3A] hover:border-[#6B7A3F] hover:text-[#6B7A3F] transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {voiceError && (
            <div className="border-t border-red-200 bg-red-50 px-3 py-1.5 text-[11px] text-red-700">
              {voiceError}
            </div>
          )}

          {/* Input Bar with Audio Transcription Mic */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2 border-t border-[#E7E2DA] bg-white p-3"
          >
            <VoiceInputButton
              compact
              onTranscribed={(txt) =>
                setInput((prev) => (prev ? `${prev} ${txt}` : txt))
              }
              onError={(err) => setVoiceError(err)}
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Yazın və ya mikrofonla danışın..."
              className="flex-1 rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] px-3 py-2 text-sm text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Göndər"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#6B7A3F] text-[#FAF7F2] hover:bg-[#5B6834] disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
