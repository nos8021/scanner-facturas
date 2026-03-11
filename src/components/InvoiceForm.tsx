import { useState, useEffect, FormEvent } from 'react';
import { Save, AlertCircle, Check, Loader2, MapPin } from 'lucide-react';

interface InvoiceFormProps {
  initialData: any;
  onSave: () => void;
  onCancel: () => void;
  readOnly?: boolean;
}

export default function InvoiceForm({ initialData, onSave, onCancel, readOnly = false }: InvoiceFormProps) {
  const [data, setData] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGeocode = async (isAuto = false) => {
    if (!data.recipient_address) return;

    setGeocoding(true);
    try {
      // 1. Try to extract coordinates directly from text (Google Maps URL or "lat, lng" format)
      const googleMapsRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
      const latLngRegex = /^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/;
      const searchRegex = /q=(-?\d+\.\d+),(-?\d+\.\d+)/;

      let match = data.recipient_address.match(googleMapsRegex) ||
        data.recipient_address.match(latLngRegex) ||
        data.recipient_address.match(searchRegex);

      if (match) {
        setData((prev: any) => ({
          ...prev,
          recipient_lat: parseFloat(match[1]),
          recipient_lng: parseFloat(match[2])
        }));
        setGeocoding(false);
        return;
      }

      // 2. If no direct coordinates, use Nominatim Geocoding
      // Construct query
      let query = data.recipient_address;

      // Clean up address for better results
      const referenceMarkers = ['DIAGONAL', 'FRENTE', 'JUNTO', 'TRAS', 'REF:', 'REFERENCIA', 'CASA', 'OFICINA'];
      for (const marker of referenceMarkers) {
        const idx = query.toUpperCase().indexOf(marker);
        if (idx > 3) {
          query = query.substring(0, idx).trim();
          break;
        }
      }

      // Append context
      if (data.route) {
        const parts = data.route.split(/-| a /i);
        const destination = parts[parts.length - 1].trim();
        if (destination && !query.toLowerCase().includes(destination.toLowerCase())) {
          query = `${query}, ${destination}`;
        }
      }
      query += ', Ecuador';

      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
        headers: {
          'User-Agent': 'InvoiceScannerApp/1.0'
        }
      });

      if (!response.ok) throw new Error('Geocoding failed');

      const results = await response.json();
      if (results && results.length > 0) {
        setData((prev: any) => ({
          ...prev,
          recipient_lat: parseFloat(results[0].lat),
          recipient_lng: parseFloat(results[0].lon)
        }));
      } else {
        if (!isAuto) alert('Location not found. Please try refining the address.');
        else console.warn('Auto-geocode: Location not found.');
      }
    } catch (err) {
      console.error(err);
      if (!isAuto) alert('Failed to fetch coordinates.');
    } finally {
      setGeocoding(false);
    }
  };

  useEffect(() => {
    // Auto-geocode if we have an address but no coordinates
    if (data.recipient_address && !data.recipient_lat && !data.recipient_lng) {
      handleGeocode(true);
    }
  }, []); // Run once on mount

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to save invoice');
      }

      onSave();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    if (readOnly) return;
    setData((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          {readOnly ? 'Invoice Details' : 'Review & Save Invoice'}
        </h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          {readOnly ? 'Back' : 'Cancel'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="space-y-8">

          {/* SECTION 1: ISSUER */}
          <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm">
            <h3 className="text-lg font-semibold text-blue-800 mb-4 border-b border-blue-100 pb-2 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">1</span>
              Issuer Information (Emisor)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                <input
                  type="text"
                  value={data.issuer_name || ''}
                  onChange={(e) => handleChange('issuer_name', e.target.value)}
                  disabled={readOnly}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">RUC</label>
                <input
                  type="text"
                  value={data.issuer_ruc || ''}
                  onChange={(e) => handleChange('issuer_ruc', e.target.value)}
                  disabled={readOnly}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="text"
                  value={data.issuer_phone || ''}
                  onChange={(e) => handleChange('issuer_phone', e.target.value)}
                  disabled={readOnly}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  value={data.issuer_address || ''}
                  onChange={(e) => handleChange('issuer_address', e.target.value)}
                  disabled={readOnly}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Taxpayer Type</label>
                <input
                  type="text"
                  value={data.taxpayer_type || ''}
                  onChange={(e) => handleChange('taxpayer_type', e.target.value)}
                  disabled={readOnly}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: CLIENT & DOC */}
          <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm">
            <h3 className="text-lg font-semibold text-green-800 mb-4 border-b border-green-100 pb-2 flex items-center gap-2">
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">2</span>
              Client & Document (Cliente/Remitente)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Document Metadata */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Document</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Invoice Number</label>
                    <input
                      type="text"
                      value={data.invoice_number || ''}
                      onChange={(e) => handleChange('invoice_number', e.target.value)}
                      disabled={readOnly}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 font-mono ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <input
                      type="date"
                      value={data.date || ''}
                      onChange={(e) => handleChange('date', e.target.value)}
                      disabled={readOnly}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                    />
                  </div>
                </div>
              </div>

              {/* Client Info */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Client (Sender)</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={data.client_name || ''}
                      onChange={(e) => handleChange('client_name', e.target.value)}
                      disabled={readOnly}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">RUC/ID</label>
                      <input
                        type="text"
                        value={data.client_ruc || ''}
                        onChange={(e) => handleChange('client_ruc', e.target.value)}
                        disabled={readOnly}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <input
                      type="text"
                      value={data.client_address || ''}
                      onChange={(e) => handleChange('client_address', e.target.value)}
                      disabled={readOnly}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: RECIPIENT & DETAILS */}
          <div className="bg-white p-6 rounded-xl border border-purple-100 shadow-sm">
            <h3 className="text-lg font-semibold text-purple-800 mb-4 border-b border-purple-100 pb-2 flex items-center gap-2">
              <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">3</span>
              Recipient & Shipment (Destinatario)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Recipient Info */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recipient</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={data.recipient_name || ''}
                    onChange={(e) => handleChange('recipient_name', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">RUC/ID</label>
                    <input
                      type="text"
                      value={data.recipient_ruc || ''}
                      onChange={(e) => handleChange('recipient_ruc', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="text"
                      value={data.recipient_phone || ''}
                      onChange={(e) => handleChange('recipient_phone', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <div className="relative mt-1">
                    <input
                      type="text"
                      value={data.recipient_address || ''}
                      onChange={(e) => handleChange('recipient_address', e.target.value)}
                      disabled={readOnly}
                      className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 pr-20 ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleGeocode(false)}
                          disabled={!data.recipient_address || geocoding}
                          className={`p-1 rounded-full hover:bg-gray-100 ${data.recipient_lat ? 'text-green-600' : 'text-gray-400 hover:text-blue-600'
                            }`}
                          title={data.recipient_lat ? "Location pinned (Click to update)" : "Pin location on map"}
                        >
                          {geocoding ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <MapPin className="h-5 w-5" fill={data.recipient_lat ? "currentColor" : "none"} />
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (data.recipient_address) {
                            let addressToSearch = data.recipient_address;
                            // ... (existing logic for Google Maps URL) ...
                            // 1. Heuristic: Strip reference details that confuse Maps (e.g. "Diagonal a...", "Frente a...")
                            // We assume the main street/intersection comes first.
                            const referenceMarkers = ['DIAGONAL', 'FRENTE', 'JUNTO', 'TRAS', 'REF:', 'REFERENCIA', 'CASA', 'OFICINA'];
                            for (const marker of referenceMarkers) {
                              const idx = addressToSearch.toUpperCase().indexOf(marker);
                              // Only strip if the marker is found and isn't at the very start (keep at least 3 chars of street name)
                              if (idx > 3) {
                                addressToSearch = addressToSearch.substring(0, idx).trim();
                                break; // Stop after finding the first reference marker
                              }
                            }

                            // 2. Heuristic: Format intersections (e.g. "Calle A y Calle B" -> "Calle A & Calle B")
                            // Google Maps handles "&" better for intersections
                            addressToSearch = addressToSearch.replace(/\s+Y\s+/gi, ' & ');

                            // 3. Add City and Country
                            let query = addressToSearch;
                            if (data.route) {
                              const parts = data.route.split(/-| a /i);
                              const destination = parts[parts.length - 1].trim();
                              if (destination && !query.toLowerCase().includes(destination.toLowerCase())) {
                                query = `${query}, ${destination}`;
                              }
                            }

                            // 4. Append Country for global uniqueness
                            query += ', Ecuador';

                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
                          }
                        }}
                        disabled={!data.recipient_address}
                        className={`p-1 rounded-full hover:bg-gray-100 ${data.recipient_address ? 'text-blue-500 hover:text-blue-700 cursor-pointer' : 'text-gray-300 cursor-not-allowed'
                          }`}
                        title="View precise location on Google Maps"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-external-link"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                      </button>
                    </div>
                  </div>
                  {data.recipient_lat && (
                    <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Coordinates found: {data.recipient_lat.toFixed(6)}, {data.recipient_lng.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>

              {/* Shipment Details */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Shipment Details</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Route (Destino)</label>
                  <input
                    type="text"
                    value={data.route || ''}
                    onChange={(e) => handleChange('route', e.target.value)}
                    disabled={readOnly}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    Clean Address (For Maps)
                    <MapPin className="w-3 h-3 text-gray-400" />
                  </label>
                  <input
                    type="text"
                    value={data.recipient_address_clean || ''}
                    onChange={(e) => handleChange('recipient_address_clean', e.target.value)}
                    disabled={readOnly}
                    placeholder="Sanitized address strictly for map routing"
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Environment</label>
                    <input
                      type="text"
                      value={data.environment || ''}
                      onChange={(e) => handleChange('environment', e.target.value)}
                      disabled={readOnly}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment (F. Pago)</label>
                    <input
                      type="text"
                      value={data.payment_type || ''}
                      onChange={(e) => handleChange('payment_type', e.target.value)}
                      disabled={readOnly}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                      placeholder="e.g. CONTADO"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Authorization Code</label>
                  <input
                    type="text"
                    value={data.authorization_code || ''}
                    onChange={(e) => handleChange('authorization_code', e.target.value)}
                    disabled={readOnly}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 font-mono text-xs ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                  />
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Items</h4>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {data.items?.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.description}</td>
                        <td className="px-3 py-2 text-sm text-gray-500 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-sm text-gray-500 text-right">${item.unit_price?.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm text-gray-500 text-right">${item.total?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financials & Footer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Additional Info</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Observations</label>
                  <textarea
                    value={data.observations || ''}
                    onChange={(e) => handleChange('observations', e.target.value)}
                    rows={3}
                    disabled={readOnly}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method (Detail)</label>
                  <input
                    type="text"
                    value={data.payment_method_description || ''}
                    onChange={(e) => handleChange('payment_method_description', e.target.value)}
                    disabled={readOnly}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                    placeholder="e.g. SIN UTILIZACION..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cashier</label>
                  <input
                    type="text"
                    value={data.cashier || ''}
                    onChange={(e) => handleChange('cashier', e.target.value)}
                    disabled={readOnly}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Totals</h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subtotal 0%</label>
                    <input
                      type="number"
                      step="0.01"
                      value={data.subtotal_0 || ''}
                      onChange={(e) => handleChange('subtotal_0', parseFloat(e.target.value))}
                      disabled={readOnly}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subtotal 15%</label>
                    <input
                      type="number"
                      step="0.01"
                      value={data.subtotal_15 || ''}
                      onChange={(e) => handleChange('subtotal_15', parseFloat(e.target.value))}
                      disabled={readOnly}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">VAT 15%</label>
                    <input
                      type="number"
                      step="0.01"
                      value={data.vat_15 || ''}
                      onChange={(e) => handleChange('vat_15', parseFloat(e.target.value))}
                      disabled={readOnly}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Appraisal</label>
                    <input
                      type="number"
                      step="0.01"
                      value={data.appraisal || ''}
                      onChange={(e) => handleChange('appraisal', parseFloat(e.target.value))}
                      disabled={readOnly}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 ${readOnly ? 'bg-gray-100 text-gray-600' : ''}`}
                    />
                  </div>
                  <div className="col-span-2 pt-2 border-t border-gray-200">
                    <label className="block text-sm font-bold text-gray-900">Total Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={data.total || ''}
                      onChange={(e) => handleChange('total', parseFloat(e.target.value))}
                      disabled={readOnly}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 font-bold text-lg ${readOnly ? 'bg-gray-100 text-gray-600' : 'bg-white'}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {readOnly ? 'Back' : 'Cancel'}
          </button>
          {!readOnly && (
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Invoice
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
