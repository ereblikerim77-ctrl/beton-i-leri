import { GoogleGenAI } from '@google/genai';
import type { AIChatMode, GroundingSource, Listing } from '../src/types.ts';

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY konfiqurasiya edilməyib.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface ChatHistoryTurn {
  role: 'user' | 'model';
  text: string;
}

export async function transcribeAudioWithGemini(
  audioBase64: string,
  mimeType: string
): Promise<string> {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-transcribe',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType || 'audio/webm',
            data: audioBase64,
          },
        },
        {
          text: 'Transcribe this audio accurately in the language spoken (likely Azerbaijani). Return only the transcribed text without extra commentary.',
        },
      ],
    },
  });
  return (response.text ?? '').trim();
}

export async function runBetonAIChat(
  message: string,
  history: ChatHistoryTurn[],
  activeListings: Listing[],
  mode: AIChatMode = 'general',
  userLocation?: { lat: number; lng: number }
): Promise<{
  reply: string;
  matchedListingIds: string[];
  groundingSources: GroundingSource[];
}> {
  const ai = getAIClient();

  const listingsContext = activeListings.map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    masterOrCompany: `${item.firstName} ${item.lastName} (${item.companyName})`,
    phone: item.phone,
    regions: item.regions,
    tags: item.tags,
    concreteGrades: item.concreteGrades,
    equipmentTypes: item.equipmentTypes,
    minVolumeM3: item.minVolumeM3,
    price:
      item.priceType === 'per_m3' && item.pricePerM3
        ? `${item.pricePerM3} AZN/m³`
        : 'Razılaşma yolu ilə',
    experienceYears: item.experienceYears,
    verified: item.verified,
  }));

  const systemInstruction = `Sən "Beton İşləri" platformasının rəsmi ağıllı tikinti və beton məsləhətçisi — "Beton AI"-san.
Bütün cavablarını səlis, peşəkar, qısa və praktik Azərbaycan dilində ver.

Sənin əsas vəzifələrin:
1. SAYTDAXİLİ MƏLUMATLILIQ (VERİLƏNLƏR BAZASI):
Aşağıda platformada aktiv olan real elanların siyahısı verilmişdir:
${JSON.stringify(listingsContext, null, 2)}

İstifadəçi usta, briqada, pompa, mikser, şlifovka və ya konkret şəhər/xidmət soruşduqda, YALNIZ yuxarıdakı real verilənlər bazasından uyğun elanları seç, ustanın/şirkətin adını, təcrübəsini, qiymətini və birbaşa telefon nömrəsini qeyd et.
Hər tövsiyə etdiyin elanın ID-sini mütləq belə formatda yaz ki, interfeys onu kliklənən elan kartına çevirə bilsin: [[ELAN:l-101]]. Uydurma nömrə və ya elan ID-si yaratma!

2. TİKİNTİ MƏSLƏHƏTÇİSİ VƏ BETON KALKULYATORU:
- İstifadəçi ölçü verdikdə (məs: "10x12 metr sahəyə 20 sm qalınlıqda nə qədər beton gedər?"), dərhal dəqiq hesablama apar:
  Həcm = Uzunluq (m) × En (m) × Qalınlıq (m) + 5%–7% texniki ehtiyat payı, təyinatına uyğun beton markası (M200–M400) və uyğun elanları [[ELAN:...]] formatında təklif et.
- Hava şəraitinə görə beton tökülməsi barədə praktik mühəndis tövsiyələri ver.`;

  const contents = [
    ...history.slice(-8).map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
    {
      role: 'user',
      parts: [{ text: message }],
    },
  ];

  const modelName =
    mode === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';

  // Configure grounding tools cleanly (never mix googleMaps with googleSearch, no responseMimeType/responseSchema)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config: Record<string, any> = {
    systemInstruction,
  };

  if (mode === 'search') {
    config.tools = [{ googleSearch: {} }];
  } else if (mode === 'maps') {
    config.tools = [{ googleMaps: {} }];
    config.toolConfig = {
      retrievalConfig: {
        latLng: {
          latitude: userLocation?.lat ?? 40.4093,
          longitude: userLocation?.lng ?? 49.8671,
        },
      },
    };
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents,
    config,
  });

  const replyText =
    response.text ?? 'Üzr istəyirəm, hazırda cavab hazırlamaq mümkün olmadı.';

  const idMatches = Array.from(
    replyText.matchAll(/\[\[ELAN:([a-zA-Z0-9_-]+)\]\]/g)
  ).map((m) => m[1]);
  const validIds = Array.from(
    new Set(idMatches.filter((id) => activeListings.some((l) => l.id === id)))
  );

  // Extract Grounding Chunks (Google Search web links & Google Maps URIs)
  const groundingSources: GroundingSource[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []) as any[];
  for (const chunk of chunks) {
    if (chunk?.web?.uri) {
      groundingSources.push({
        type: 'web',
        title: chunk.web.title || chunk.web.uri,
        uri: chunk.web.uri,
      });
    }
    if (chunk?.maps?.uri) {
      const reviewSnippet =
        chunk.maps.placeAnswerSources?.reviewSnippets?.[0]?.content || undefined;
      groundingSources.push({
        type: 'maps',
        title: chunk.maps.title || 'Google Maps Məkanı',
        uri: chunk.maps.uri,
        snippet: reviewSnippet,
      });
    }
  }

  return {
    reply: replyText,
    matchedListingIds: validIds,
    groundingSources,
  };
}
