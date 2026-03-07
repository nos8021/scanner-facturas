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

type View = 'upload' | 'batch-scan' | 'clients' | 'client-details' | 'map';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('upload');
  const [scannedData, setScannedData] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [mapInvoices, setMapInvoices] = useState<any[]>([]);

  const handleAnalyze = (data: any) => {
    setScannedData(data);
  };

  const handleSave = () => {
    setScannedData(null);
    setCurrentView('clients');
  };

  const handleSelectClient = (id: number) => {
    setSelectedClientId(id);
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
              onClick={() => { setScannedData(null); setCurrentView('upload'); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${currentView === 'upload' && !scannedData
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <ScanLine className="w-4 h-4" />
              Scan
            </button>
            <button
              onClick={() => { setScannedData(null); setCurrentView('batch-scan'); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${currentView === 'batch-scan'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <Camera className="w-4 h-4" />
              Rápido
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
            {currentView === 'upload' && (
              <div className="space-y-8">
                <div className="text-center max-w-2xl mx-auto">
                  <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                    Extract data from invoices instantly
                  </h2>
                  <p className="mt-4 text-lg text-gray-600">
                    Upload an image of your invoice. We'll extract the details, check for duplicates, and organize it by client.
                  </p>
                </div>
                <Upload onAnalyze={handleAnalyze} />

                {/* Recent Activity Preview could go here */}
              </div>
            )}

            {currentView === 'batch-scan' && (
              <BatchScanner />
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

