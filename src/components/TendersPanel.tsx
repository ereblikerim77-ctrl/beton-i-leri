import {
  Calendar,
  ClipboardList,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { QuoteRequest } from '../types.ts';
import {
  CATEGORIES,
  CONCRETE_GRADES,
  REGIONS,
  formatPhoneForTel,
  formatPhoneForWhatsApp,
  formatRelativeDateAz,
} from '../utils/helpers.ts';

interface TendersPanelProps {
  quotes: QuoteRequest[];
  prefill?: { volumeM3?: number; grade?: string } | null;
  onQuoteCreated: (quote: QuoteRequest) => void;
}

export function TendersPanel({
  quotes,
  prefill,
  onQuoteCreated,
}: TendersPanelProps) {
  const [showForm, setShowForm] = useState(Boolean(prefill));
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('+994');
  const [region, setRegion] = useState('Bakı');
  const [category, setCategory] = useState('Bünövrə betonu');
  const [concreteGrade, setConcreteGrade] = useState(prefill?.grade || 'M300');
  const [volumeM3, setVolumeM3] = useState(prefill?.volumeM3 || 35);
  const [needsPump, setNeedsPump] = useState(true);
  const [targetDate, setTargetDate] = useState('Bu həftə');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          phone,
          region,
          category,
          concreteGrade,
          volumeM3,
          needsPump,
          targetDate,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sorğu göndərilə bilmədi.');
      } else {
        onQuoteCreated(data.quote);
        setShowForm(false);
        setCustomerName('');
        setNotes('');
      }
    } catch {
      setError('Server xətası.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E7E2DA] bg-white p-5">
        <div className="space-y-1 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B7A3F]">
            <ClipboardList size={15} />
            <span>Sifarişçi Tender Lövhəsi</span>
          </div>
          <h2 className="font-display text-lg font-bold text-[#3A3A3A]">
            Beton və ya usta işiniz var? Tələbinizi paylaşın, ustalar qiymət təklifi göndərsin
          </h2>
          <p className="text-xs text-[#3A3A3A]/70">
            Aktiv sifarişçilərin beton həcmi, marka və rayon tələbləri burada dərc olunur. Briqada və texnika sahibləri birbaşa əlaqə saxlaya bilər.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#6B7A3F] px-4 py-2.5 text-xs font-semibold text-[#FAF7F2] hover:bg-[#5B6834] transition-colors cursor-pointer shrink-0"
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          <span>{showForm ? 'Formanı bağla' : 'Sifariş Sorğusu Yerləşdir'}</span>
        </button>
      </div>

      {/* Create Tender Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#6B7A3F]/40 bg-white p-5 space-y-4"
        >
          <h3 className="font-display text-sm font-bold text-[#3A3A3A]">
            Yeni Beton / İş Sifarişi Sorğusu
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                Adınız *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Məs: Samir"
                className="w-full rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                Əlaqə nömrəsi *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+994501234567"
                className="w-full rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                Şəhər / Region
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] px-3 py-2 text-sm"
              >
                {REGIONS.filter((r) => r !== 'Bütün şəhərlər').map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                İşin növü
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] px-3 py-2 text-sm"
              >
                {CATEGORIES.filter((c) => c !== 'Hamısı').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                Marka və Həcm (m³)
              </label>
              <div className="flex gap-2">
                <select
                  value={concreteGrade}
                  onChange={(e) => setConcreteGrade(e.target.value)}
                  className="w-28 rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] px-2.5 py-2 font-mono text-sm"
                >
                  {CONCRETE_GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  required
                  value={volumeM3}
                  onChange={(e) => setVolumeM3(Number(e.target.value))}
                  className="flex-1 rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] px-3 py-2 font-mono text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#3A3A3A]/75">
                Planlaşdırılan tarix
              </label>
              <input
                type="text"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                placeholder="Məs: Cümə günü"
                className="w-full rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#3A3A3A] cursor-pointer">
              <input
                type="checkbox"
                checked={needsPump}
                onChange={(e) => setNeedsPump(e.target.checked)}
                className="accent-[#6B7A3F]"
              />
              Beton pompası da tələb olunur
            </label>
          </div>

          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Obyektin ünvanı, giriş şəraiti və əlavə tələblər..."
            className="w-full rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] px-3 py-2 text-sm"
          />

          {error && <p className="text-xs text-red-700">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-[#E7E2DA] px-4 py-2 text-xs font-medium cursor-pointer"
            >
              Ləğv et
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[#6B7A3F] px-5 py-2 text-xs font-semibold text-[#FAF7F2] hover:bg-[#5B6834] cursor-pointer"
            >
              {submitting ? 'Paylaşılır...' : 'Tender Sorğusunu Dərc Et'}
            </button>
          </div>
        </form>
      )}

      {/* Active Tenders List */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {quotes.map((q) => (
          <div
            key={q.id}
            className="flex flex-col justify-between rounded-xl border border-[#E7E2DA] bg-white p-5 space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#6B7A3F]">
                  {q.category} · {q.concreteGrade}
                </span>
                <span className="text-[#3A3A3A]/55">
                  {formatRelativeDateAz(q.createdAt)}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-base font-bold text-[#3A3A3A]">
                  {q.volumeM3} m³ Beton Sifarişi — {q.region}
                </h3>
                {q.needsPump && (
                  <span className="font-mono text-[11px] font-semibold text-[#6B7A3F] shrink-0">
                    + Pompa lazımdır
                  </span>
                )}
              </div>

              {q.notes && (
                <p className="text-xs leading-relaxed text-[#3A3A3A]/80">
                  {q.notes}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs text-[#3A3A3A]/65 pt-1">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} className="text-[#6B7A3F]" />
                  {q.region}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar size={13} className="text-[#6B7A3F]" />
                  {q.targetDate}
                </span>
                <span>Sifarişçi: {q.customerName}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-[#E7E2DA] pt-3">
              <span className="font-mono text-xs text-[#3A3A3A]/75">{q.phone}</span>
              <div className="flex items-center gap-2">
                <a
                  href={formatPhoneForTel(q.phone)}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#6B7A3F] px-3 py-1.5 text-xs font-semibold text-[#FAF7F2] hover:bg-[#5B6834]"
                >
                  <Phone size={12} />
                  Zəng et
                </a>
                <a
                  href={formatPhoneForWhatsApp(
                    q.phone,
                    `Salam ${q.customerName}, "Beton İşləri" tender sorğunuz (${q.volumeM3} m³ ${q.concreteGrade}, ${q.region}) üzrə qiymət təklifi göndərirəm.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#6B7A3F] bg-[#FAF7F2] px-3 py-1.5 text-xs font-semibold text-[#6B7A3F]"
                >
                  <MessageCircle size={12} />
                  Təklif yaz
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
