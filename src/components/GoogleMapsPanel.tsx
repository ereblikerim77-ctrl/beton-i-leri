import {
  APILoadingStatus,
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Building2,
  LocateFixed,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Search,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { Listing } from '../types.ts';
import {
  formatPhoneForTel,
  formatPhoneForWhatsApp,
  getListingCoordinates,
} from '../utils/helpers.ts';

interface GoogleMapsPanelProps {
  apiKey: string;
  listings: Listing[];
  onOpenListing: (listing: Listing) => void;
}

interface DiscoveredPlace {
  id: string;
  name: string;
  address: string;
  rating?: number;
  googleMapsURI?: string;
  position: { lat: number; lng: number };
}

interface MapPolylineInstance {
  setMap: (map: unknown) => void;
}

interface PlaceSearchResult {
  id?: string;
  displayName?: string;
  formattedAddress?: string;
  rating?: number;
  googleMapsURI?: string;
  location?: { lat: () => number; lng: () => number };
}

function ListingMarkerWithInfo({
  listing,
  onOpenListing,
  onSelectDestination,
}: {
  listing: Listing;
  onOpenListing: (l: Listing) => void;
  onSelectDestination: (pos: { lat: number; lng: number }, label: string) => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);
  const pos = getListingCoordinates(listing);

  const tier = listing.tier || 'standard';
  const isVipPin = tier === 'vip' && listing.vipConfig?.priorityPinOnMap !== false;
  const pinBg = isVipPin ? '#9B8740' : tier === 'pro' ? '#6B7A3F' : '#7C8462';

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={pos}
        onClick={() => setOpen(true)}
        title={listing.title}
        zIndex={isVipPin ? 20 : tier === 'pro' ? 10 : 1}
      >
        <Pin
          background={pinBg}
          borderColor="#3A3A3A"
          glyphColor="#FAF7F2"
          scale={isVipPin ? 1.25 : 1}
        />
      </AdvancedMarker>
      {open && marker && (
        <InfoWindow
          anchor={marker}
          maxWidth={270}
          onCloseClick={() => setOpen(false)}
        >
          <div className="p-1 space-y-2 text-[#3A3A3A]">
            <div className="text-[11px] font-semibold text-[#6B7A3F]">
              {tier === 'vip' ? '★ VIP · ' : tier === 'pro' ? 'PRO · ' : ''}
              {listing.category} · {listing.regions[0]}
            </div>
            <div className="text-sm font-bold leading-snug">{listing.title}</div>
            <div className="text-xs text-[#3A3A3A]/75">
              {listing.companyName} ·{' '}
              <span className="font-mono font-semibold">
                {listing.priceType === 'per_m3' && listing.pricePerM3
                  ? `${listing.pricePerM3} AZN/m³`
                  : 'Razılaşma'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => onOpenListing(listing)}
                className="rounded bg-[#3A3A3A] px-2.5 py-1 text-[11px] font-semibold text-[#FAF7F2] cursor-pointer"
              >
                Ətraflı
              </button>
              <a
                href={formatPhoneForTel(listing.phone)}
                className="inline-flex items-center gap-1 rounded bg-[#6B7A3F] px-2.5 py-1 text-[11px] font-semibold text-[#FAF7F2]"
              >
                <Phone size={11} /> Zəng
              </a>
              <a
                href={formatPhoneForWhatsApp(listing.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded border border-[#6B7A3F] px-2 py-1 text-[11px] font-semibold text-[#6B7A3F]"
              >
                <MessageCircle size={11} /> WA
              </a>
              <button
                type="button"
                onClick={() => onSelectDestination(pos, listing.companyName)}
                className="inline-flex items-center gap-1 rounded border border-[#E7E2DA] px-2 py-1 text-[11px] font-medium text-[#3A3A3A] cursor-pointer"
              >
                <Navigation size={11} /> Marşrut
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

function PlaceMarkerWithInfo({
  place,
  onSelectDestination,
}: {
  place: DiscoveredPlace;
  onSelectDestination: (pos: { lat: number; lng: number }, label: string) => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={place.position}
        onClick={() => setOpen(true)}
        title={place.name}
      >
        <Pin background="#3A3A3A" borderColor="#6B7A3F" glyphColor="#FAF7F2" />
      </AdvancedMarker>
      {open && marker && (
        <InfoWindow
          anchor={marker}
          maxWidth={260}
          onCloseClick={() => setOpen(false)}
        >
          <div className="p-1 space-y-1.5 text-[#3A3A3A]">
            <div className="text-[11px] font-semibold text-[#6B7A3F]">
              Google Maps Məkanı
            </div>
            <div className="text-sm font-bold">{place.name}</div>
            {place.address && (
              <div className="text-xs text-[#3A3A3A]/75">{place.address}</div>
            )}
            {place.rating && (
              <div className="font-mono text-xs text-[#6B7A3F]">
                Reytinq: ★ {place.rating}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => onSelectDestination(place.position, place.name)}
                className="inline-flex items-center gap-1 rounded bg-[#6B7A3F] px-2.5 py-1 text-[11px] font-semibold text-[#FAF7F2] cursor-pointer"
              >
                <Navigation size={11} /> Marşrut çək
              </button>
              {place.googleMapsURI && (
                <a
                  href={place.googleMapsURI}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded border border-[#E7E2DA] px-2.5 py-1 text-[11px] font-medium text-[#3A3A3A]"
                >
                  Maps-də aç
                </a>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

function MapsInnerContent({
  listings,
  onOpenListing,
}: {
  listings: Listing[];
  onOpenListing: (l: Listing) => void;
}) {
  const map = useMap();
  const status = useApiLoadingStatus();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');

  const [placeQuery, setPlaceQuery] = useState('beton zavodu Bakı');
  const [discoveredPlaces, setDiscoveredPlaces] = useState<DiscoveredPlace[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [placesError, setPlacesError] = useState('');

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [routeSummary, setRouteSummary] = useState<string>('');
  const [routeError, setRouteError] = useState<string>('');
  const [polylines, setPolylines] = useState<MapPolylineInstance[]>([]);

  useEffect(() => {
    if (status === APILoadingStatus.AUTH_FAILURE) {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
  }, [status]);

  // Clear old polylines when unmounting
  useEffect(() => {
    return () => {
      polylines.forEach((p) => p.setMap(null));
    };
  }, [polylines]);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setRouteError('Brauzeriniz geolokasiya dəstəkləmir.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(coords);
        if (map) {
          map.panTo(coords);
          map.setZoom(12);
        }
      },
      () => {
        setRouteError('Mövqeyinizə giriş icazəsi verilmədi.');
      }
    );
  }, [map]);

  const handleSearchPlaces = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!placesLib || !placeQuery.trim()) return;
      setSearchingPlaces(true);
      setPlacesError('');
      try {
        const center = map?.getCenter();
        const request = {
          textQuery: placeQuery.trim(),
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'googleMapsURI',
          ],
          locationBias: center
            ? { lat: center.lat(), lng: center.lng() }
            : { lat: 40.4093, lng: 49.8671 },
          maxResultCount: 8,
        };
        const { places } = (await placesLib.Place.searchByText(request)) as {
          places?: PlaceSearchResult[];
        };
        const mapped: DiscoveredPlace[] = (places || [])
          .filter((p) => Boolean(p.location))
          .map((p) => ({
            id: p.id || Math.random().toString(36).slice(2),
            name: p.displayName || 'Obyekt',
            address: p.formattedAddress || '',
            rating: typeof p.rating === 'number' ? p.rating : undefined,
            googleMapsURI: p.googleMapsURI || undefined,
            position: {
              lat: p.location!.lat(),
              lng: p.location!.lng(),
            },
          }));
        setDiscoveredPlaces(mapped);
        if (mapped.length > 0 && map) {
          map.panTo(mapped[0].position);
          map.setZoom(11);
        } else if (mapped.length === 0) {
          setPlacesError('Bu sorğu üzrə Google Maps məkanı tapılmadı.');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('OVER_QUERY_LIMIT') ||
          msg.includes('429')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setPlacesError('Yaxınlıqdakı məkanları yükləmək mümkün olmadı.');
      } finally {
        setSearchingPlaces(false);
      }
    },
    [placesLib, placeQuery, map]
  );

  const handleComputeRoute = useCallback(
    async (destination: { lat: number; lng: number }, label: string) => {
      setRouteError('');
      setRouteSummary('');
      const origin = userLocation || { lat: 40.4093, lng: 49.8671 };

      if (!routesLib || !map) {
        setRouteError('Xəritə marşrut xidməti hələ yüklənməyib.');
        return;
      }

      try {
        // Modern Routes API computeRoutes via SDK wrapper
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const RouteClass = (routesLib as any).Route;
        if (!RouteClass || !RouteClass.computeRoutes) {
          setRouteError('Marşrut hesablaması bu mühitdə əlçatan deyil.');
          return;
        }
        const response = await RouteClass.computeRoutes({
          origin,
          destination,
          travelMode: 'DRIVING',
          fields: ['path', 'distanceMeters', 'durationMillis'],
        });

        const firstRoute = response?.routes?.[0];
        if (!firstRoute) {
          setRouteError('Marşrut tapılmadı.');
          return;
        }

        // Clear previous polylines
        polylines.forEach((p) => p.setMap(null));
        const newPolylines: MapPolylineInstance[] = firstRoute.createPolylines
          ? firstRoute.createPolylines({
              polylineOptions: {
                strokeColor: '#6B7A3F',
                strokeWeight: 5,
                strokeOpacity: 0.9,
              },
            })
          : [];
        newPolylines.forEach((p) => p.setMap(map));
        setPolylines(newPolylines);

        const km =
          typeof firstRoute.distanceMeters === 'number'
            ? (firstRoute.distanceMeters / 1000).toFixed(1)
            : '?';
        const mins =
          typeof firstRoute.durationMillis === 'number'
            ? Math.round(firstRoute.durationMillis / 60000)
            : '?';
        setRouteSummary(`${label}: ~${km} km (${mins} dəq sürüş)`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('OVER_QUERY_LIMIT') ||
          msg.includes('429')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setRouteError('Marşrut hesablanarkən xəta baş verdi.');
      }
    },
    [routesLib, map, userLocation, polylines]
  );

  return (
    <div className="space-y-3">
      {/* Toolbar: Places Search + Geolocation */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[#E7E2DA] bg-white p-3">
        <form
          onSubmit={handleSearchPlaces}
          className="flex flex-1 min-w-[240px] items-center gap-2"
        >
          <div className="relative flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#3A3A3A]/50"
            />
            <input
              type="text"
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              placeholder="Yaxınlıqda axtar: beton zavodu, tikinti bazarı..."
              className="w-full rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] py-1.5 pl-8 pr-3 text-xs text-[#3A3A3A] focus:border-[#6B7A3F] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={searchingPlaces || !placesLib}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#6B7A3F] px-3 py-1.5 text-xs font-semibold text-[#FAF7F2] hover:bg-[#5B6834] disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <Building2 size={13} />
            <span>{searchingPlaces ? 'Axtarılır...' : 'Zavod / Obyekt tap'}</span>
          </button>
        </form>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLocateMe}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E2DA] bg-[#FAF7F2] px-3 py-1.5 text-xs font-medium text-[#3A3A3A] hover:border-[#6B7A3F] cursor-pointer whitespace-nowrap"
          >
            <LocateFixed size={13} className="text-[#6B7A3F]" />
            <span>Mənim mövqeyim</span>
          </button>
        </div>
      </div>

      {/* Status / Route / Error Strip */}
      {(routeSummary || routeError || placesError) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E7E2DA] bg-[#E7E2DA]/40 px-3.5 py-2 text-xs">
          {routeSummary && (
            <span className="font-semibold text-[#6B7A3F]">{routeSummary}</span>
          )}
          {(routeError || placesError) && (
            <span className="text-amber-800">{routeError || placesError}</span>
          )}
        </div>
      )}

      {/* Explicit Height Map Container */}
      <div className="relative h-[460px] w-full overflow-hidden rounded-2xl border border-[#E7E2DA] bg-[#E7E2DA]">
        {status === APILoadingStatus.FAILED ||
        status === APILoadingStatus.AUTH_FAILURE ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-[#3A3A3A]/75">
            <MapPin size={28} className="mb-2 text-[#6B7A3F]" />
            <p className="font-semibold">Google Maps xəritəsi yüklənə bilmədi.</p>
            <p className="mt-1 text-xs text-[#3A3A3A]/60">
              API açarı və ya kvota tənzimləmələrini yoxlayın.
            </p>
          </div>
        ) : (
          <GoogleMap
            mapId="DEMO_MAP_ID"
            defaultCenter={{ lat: 40.4093, lng: 49.8671 }}
            defaultZoom={10}
            gestureHandling="greedy"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            className="h-full w-full"
          >
            {userLocation && (
              <AdvancedMarker position={userLocation} title="Sizin mövqeyiniz">
                <Pin background="#2563EB" borderColor="#1E3A8A" glyphColor="#FFF" />
              </AdvancedMarker>
            )}

            {listings.map((listing) => (
              <ListingMarkerWithInfo
                key={listing.id}
                listing={listing}
                onOpenListing={onOpenListing}
                onSelectDestination={handleComputeRoute}
              />
            ))}

            {discoveredPlaces.map((place) => (
              <PlaceMarkerWithInfo
                key={place.id}
                place={place}
                onSelectDestination={handleComputeRoute}
              />
            ))}
          </GoogleMap>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#3A3A3A]/70">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#6B7A3F]" />
            Platforma elanları ({listings.length})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#3A3A3A]" />
            Google Maps obyektləri ({discoveredPlaces.length})
          </span>
        </div>
        <span>Xəritədə pinə klikləyərək ətraflı məlumat və marşrut alın</span>
      </div>
    </div>
  );
}

export function GoogleMapsPanel({
  apiKey,
  listings,
  onOpenListing,
}: GoogleMapsPanelProps) {
  if (!apiKey) {
    return (
      <div className="rounded-2xl border border-[#E7E2DA] bg-white p-8 text-center space-y-2">
        <MapPin size={28} className="mx-auto text-[#6B7A3F]" />
        <p className="font-display text-base font-bold text-[#3A3A3A]">
          Google Maps Platforması aktivləşdirilir
        </p>
        <p className="text-xs text-[#3A3A3A]/65">
          Xəritə açarı mühitə yükləndikdən sonra interaktiv xəritə, zavod axtarışı və marşrut hesablama burada görünəcək.
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} language="az" region="AZ">
      <MapsInnerContent listings={listings} onOpenListing={onOpenListing} />
    </APIProvider>
  );
}
