/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Upload from './components/Upload';
import InvoiceForm from './components/InvoiceForm';
import ClientList from './components/ClientList';
import ClientDetails from './components/ClientDetails';
import InvoiceMap from './components/InvoiceMap';
import BatchScanner from './components/BatchScanner';
import { LayoutDashboard, ScanLine, History, Map as MapIcon, Camera } from 'lucide-react';

type View = 'scan' | 'clients' | 'client-details' | 'map';
type ScanMode = 'batch' | 'single' | 'manual';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('scan');
  const [scanMode, setScanMode] = useState<ScanMode>('batch');
  const [scannedData, setScannedData] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [mapInvoices, setMapInvoices] = useState<any[]>([]);
  // Key to force re-render of InvoiceForm after a successful manual save
  const [formKey, setFormKey] = useState<number>(0);

  const handleAnalyze = (data: any) => {
    setScannedData(data);
  };

  const handleSave = () => {
    if (scanMode === 'manual') {
      alert('¡Factura manual guardada exitosamente!');
      setFormKey(prev => prev + 1); // Reset the form
      // Remain in manual mode so they can enter another one if they want
    } else {
      setScannedData(null);
      setCurrentView('clients');
    }
  };

  const handleSelectClient = (id: number, date?: string) => {
    setSelectedClientId(id);
    setSelectedDate(date);
    setCurrentView('client-details');
  };

  useEffect(() => {
    if (currentView === 'map') {
      fetch('/api/invoices')
        .then(res => res.json())
        .then(data => setMapInvoices(data))
        .catch(err => console.error('Failed to fetch invoices for map', err));
    }
  }, [currentView]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ScanLine className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">InvoiceScanner</h1>
          </div>

          <nav className="flex gap-1">
            <button
              onClick={() => { setScannedData(null); setCurrentView('scan'); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${currentView === 'scan'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <ScanLine className="w-4 h-4" />
              Escanear
            </button>
            <button
              onClick={() => { setScannedData(null); setCurrentView('clients'); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${currentView === 'clients' || currentView === 'client-details'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => { setScannedData(null); setCurrentView('map'); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${currentView === 'map'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <MapIcon className="w-4 h-4" />
              Map
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {scannedData ? (
          <InvoiceForm
            initialData={scannedData}
            onSave={handleSave}
            onCancel={() => setScannedData(null)}
          />
        ) : (
          <>
            {currentView === 'scan' && (
              <div className="space-y-6 max-w-4xl mx-auto">
                {/* Secondary Navigation (Tabs) */}
                <div className="flex justify-center mb-8">
                  <div className="inline-flex bg-gray-100/80 p-1 rounded-xl shadow-inner border border-gray-200 backdrop-blur-sm overflow-x-auto max-w-full no-scrollbar">
                    <button
                      onClick={() => setScanMode('batch')}
                      className={`min-w-fit px-4 sm:px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${scanMode === 'batch'
                        ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-900/5'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50'
                        }`}
                    >
                      Cámara Rápida
                    </button>
                    <button
                      onClick={() => setScanMode('single')}
                      className={`min-w-fit px-4 sm:px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${scanMode === 'single'
                        ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-900/5'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50'
                        }`}
                    >
                      Subir Imagen
                    </button>
                    <button
                      onClick={() => setScanMode('manual')}
                      className={`min-w-fit px-4 sm:px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${scanMode === 'manual'
                        ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-900/5'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50'
                        }`}
                    >
                      Ingreso Manual
                    </button>
                  </div>
                </div>

                {/* Sub-Views based on scanMode */}
                {scanMode === 'batch' && <BatchScanner />}

                {scanMode === 'single' && (
                  <div className="space-y-8">
                    <div className="text-center max-w-2xl mx-auto mb-8">
                      <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                        Escaneo Único
                      </h2>
                      <p className="mt-3 text-lg text-gray-600">
                        Sube o toma la foto de una sola factura. Extraeremos los datos y los podrás revisar antes de guardar.
                      </p>
                    </div>
                    <Upload onAnalyze={handleAnalyze} />
                  </div>
                )}

                {scanMode === 'manual' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center max-w-2xl mx-auto mb-8">
                      <h2 className="text-2xl font-bold text-gray-900">
                        Ingreso Manual
                      </h2>
                      <p className="mt-2 text-gray-600">
                        Ingresa los datos de la factura manualmente en el siguiente formulario.
                      </p>
                    </div>
                    {/* Use a wrapper with a key to force re-render, since passing key directly to InvoiceForm here threw a TS error without modifying InvoiceFormProps */}
                    <div key={`manual-form-${formKey}`}>
                      <InvoiceForm
                        initialData={{ items: [] }}
                        onSave={handleSave}
                        onCancel={() => setScanMode('batch')}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentView === 'clients' && (
              <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Client Dashboard</h2>
                  <p className="text-gray-600">Manage your clients and view their invoice history.</p>
                </div>
                <ClientList onSelectClient={handleSelectClient} />
              </div>
            )}

            {currentView === 'client-details' && selectedClientId && (
              <div className="max-w-4xl mx-auto">
                <ClientDetails
                  clientId={selectedClientId}
                  selectedDate={selectedDate}
                  onBack={() => setCurrentView('clients')}
                />
              </div>
            )}

            {currentView === 'map' && (
              <div className="max-w-6xl mx-auto">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Delivery Map</h2>
                  <p className="text-gray-600">View all invoice delivery locations.</p>
                </div>
                <InvoiceMap invoices={mapInvoices} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

