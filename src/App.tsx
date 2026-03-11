/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Upload from './components/Upload';
import InvoiceForm from './components/InvoiceForm';
import ClientList from './components/ClientList';
import ClientDetails from './components/ClientDetails';
import InvoiceMap from './components/InvoiceMap';
import BatchScanner from './components/BatchScanner';
import { LayoutDashboard, ScanLine, History, Map as MapIcon, Camera, Lock, LogOut, KeyRound, Loader2 } from 'lucide-react';

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

  // Security State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('app_password'));
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      localStorage.setItem('app_password', password);
      setIsAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('app_password');
    setIsAuthenticated(false);
    setPassword('');
  };

  useEffect(() => {
    if (currentView === 'map' && isAuthenticated) {
      const storedPass = localStorage.getItem('app_password');
      fetch('/api/invoices', {
        headers: { 'Authorization': `Bearer ${storedPass}` }
      })
        .then(res => res.json())
        .then(data => setMapInvoices(data))
        .catch(err => console.error('Failed to fetch invoices for map', err));
    }
  }, [currentView, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-blue-500/30">
        <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative">
              <div className="flex justify-center mb-6">
                <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-600/20">
                  <Lock className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Acceso Seguro</h1>
                <p className="text-slate-400">Ingresa la contraseña para acceder al sistema de facturación.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-blue-500 transition-colors">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña del sistema"
                    className="w-full bg-white/5 border border-white/10 text-white rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-600"
                    autoFocus
                  />
                </div>

                {loginError && (
                  <p className="text-red-400 text-sm text-center animate-bounce">Por favor ingresa una contraseña.</p>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group/btn"
                >
                  Continuar
                  <div className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-slate-500 text-sm">© 2026 InvoiceScanner AI • v1.2.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

            <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5" />
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

