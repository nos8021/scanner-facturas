import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin } from 'lucide-react';

interface InvoiceMapProps {
  invoices: any[];
}

export default function InvoiceMap({ invoices }: InvoiceMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter invoices that have valid coordinates
  const validInvoices = invoices.filter(inv =>
    inv.recipient_lat !== null &&
    inv.recipient_lat !== undefined &&
    inv.recipient_lng !== null &&
    inv.recipient_lng !== undefined &&
    !isNaN(Number(inv.recipient_lat)) &&
    !isNaN(Number(inv.recipient_lng))
  );

  useEffect(() => {
    if (map.current) return; // initialize map only once

    try {
      if (mapContainer.current) {
        map.current = new maplibregl.Map({
          container: mapContainer.current,
          style: {
            version: 8,
            sources: {
              'osm': {
                type: 'raster',
                tiles: [
                  'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                  'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                  'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
                ],
                tileSize: 256,
                attribution: '&copy; OpenStreetMap Contributors',
                maxzoom: 19
              }
            },
            layers: [
              {
                id: 'osm',
                type: 'raster',
                source: 'osm',
              }
            ]
          },
          center: [-78.1834, -1.8312], // Ecuador [lng, lat]
          zoom: 7
        });

        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      }
    } catch (err: any) {
      console.error('Failed to initialize map:', err);
      setErrorMsg('Error initializing map: ' + err?.message);
    }
  }, []);

  // Update markers when invoices change
  useEffect(() => {
    if (!map.current) return;

    try {
      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      validInvoices.forEach(invoice => {
        // Create custom marker element with label
        const el = document.createElement('div');
        el.className = 'flex flex-col items-center cursor-pointer group';

        // Get first name for the label to keep it short
        const shortName = invoice.recipient_name ? String(invoice.recipient_name).split(' ')[0] : 'Cliente';
        const totalNum = Number(invoice.total || 0).toFixed(2);

        el.innerHTML = `
          <div class="relative flex flex-col items-center transition-transform duration-200 group-hover:-translate-y-1">
            <div class="text-red-600 drop-shadow-md filter">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
                <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-md text-[11px] font-bold shadow-md border border-gray-200 -mt-2 whitespace-nowrap z-10">
              ${shortName}
            </div>
          </div>
        `;

        // Create popup content
        const popupContent = document.createElement('div');
        popupContent.className = 'p-1 min-w-[200px] font-sans';
        popupContent.innerHTML = `
          <h3 class="font-bold text-gray-900 text-base mb-1">${invoice.recipient_name || ''}</h3>
          <p class="text-sm text-gray-600 mb-2">${invoice.recipient_address || ''}</p>
          
          <div class="space-y-1 text-xs text-gray-500 border-t pt-2">
            <div class="flex justify-between">
              <span class="font-semibold">Invoice:</span>
              <span>${invoice.invoice_number || ''}</span>
            </div>
            <div class="flex justify-between">
              <span class="font-semibold">Date:</span>
              <span>${invoice.date || ''}</span>
            </div>
            ${invoice.recipient_phone ? `
              <div class="flex justify-between">
                <span class="font-semibold">Phone:</span>
                <span>${invoice.recipient_phone}</span>
              </div>
            ` : ''}
            ${invoice.route ? `
              <div class="flex justify-between">
                <span class="font-semibold">Route:</span>
                <span>${invoice.route}</span>
              </div>
            ` : ''}
            <div class="flex justify-between font-bold text-gray-900 mt-1 pt-1 border-t border-dashed">
              <span>Total:</span>
              <span>$${totalNum}</span>
            </div>
            ${invoice.observations ? `
              <div class="mt-2 text-gray-400 italic border-t pt-1">
                "${invoice.observations}"
              </div>
            ` : ''}
          </div>
        `;

        const popup = new maplibregl.Popup({ offset: 35 })
          .setDOMContent(popupContent);

        const lon = Number(invoice.recipient_lng);
        const lat = Number(invoice.recipient_lat);

        if (!isNaN(lon) && !isNaN(lat)) {
          const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([lon, lat])
            .setPopup(popup)
            .addTo(map.current!);

          markersRef.current.push(marker);
        }
      });
    } catch (err: any) {
      console.error('Error drawing map markers:', err);
      setErrorMsg('Error rendering map markers: ' + err?.message);
    }
  }, [validInvoices]);

  if (errorMsg) {
    return (
      <div className="h-[600px] w-full rounded-xl border-2 border-dashed border-red-200 bg-red-50 flex flex-col items-center justify-center p-8 text-center shadow-inner">
        <MapPin className="h-16 w-16 text-red-500 mb-4 opacity-80" />
        <h3 className="text-xl font-bold text-red-800 mb-2">Error de Inicialización del Mapa</h3>
        <p className="text-red-600 mb-4 max-w-md">No pudimos cargar el mapa interactivo. Es probable que su navegador no soporte WebGL o que requiera habilitar la aceleración de hardware.</p>
        <div className="mt-4 flex items-center gap-2">
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-md text-sm font-medium transition-colors">
            Recargar Página
          </button>
        </div>
        <div className="mt-6 text-left w-full max-w-lg">
          <details className="text-xs text-red-500 bg-white/60 p-3 rounded-lg border border-red-100 cursor-pointer">
            <summary className="font-semibold mb-1">Ver detalles técnicos</summary>
            <div className="mt-2 overflow-auto max-h-32 font-mono break-all pb-1">{errorMsg}</div>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm z-0 relative">
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
}
