import React, { useEffect, useState } from 'react';
import { User, ChevronRight, Loader2, Search, FileText, Trash2, Download } from 'lucide-react';
import InvoicePreviewCard from './InvoicePreviewCard';

interface ClientListProps {
  onSelectClient: (clientId: number, date?: string) => void;
}

const Highlight = ({ text, highlight }: { text: string, highlight: string }) => {
  if (!highlight.trim() || typeof text !== 'string') return <>{text}</>;
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ?
          <span key={i} className="bg-yellow-200 text-gray-900 font-semibold">{part}</span> : part
      )}
    </span>
  );
};

export default function ClientList({ onSelectClient }: ClientListProps) {
  const [groupedClients, setGroupedClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ clients: any[], invoices: any[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchClients = () => {
    const password = localStorage.getItem('app_password');
    fetch('/api/dashboard/grouped', {
      headers: { 'Authorization': `Bearer ${password}` }
    })
      .then((res) => res.json())
      .then((data) => {
        setGroupedClients(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load clients');
        setLoading(false);
      });
  };

  // Load initial clients list
  useEffect(() => {
    fetchClients();
  }, []);

  const handleDeleteClient = async (e: React.MouseEvent, clientId: number, clientName: string) => {
    e.stopPropagation(); // Prevent row click from navigating

    if (!window.confirm(`¿Estás seguro de que quieres eliminar a ${clientName} y todas sus facturas asociadas? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeletingId(clientId);
    try {
      const password = localStorage.getItem('app_password');
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${password}` }
      });
      if (!res.ok) throw new Error('Error al eliminar');

      // Refresh list
      fetchClients();

      // Also refresh search results if active
      if (searchQuery.trim().length >= 1) {
        const password = localStorage.getItem('app_password');
        const searchRes = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { 'Authorization': `Bearer ${password}` }
        });
        const searchData = await searchRes.json();
        setSearchResults(searchData);
      }
    } catch (err) {
      console.error(err);
      alert('Error al eliminar el cliente');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 1) {
        setSearching(true);
        const password = localStorage.getItem('app_password');
        fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { 'Authorization': `Bearer ${password}` }
        })
          .then(res => res.json())
          .then(data => {
            setSearchResults(data);
            setSearching(false);
          })
          .catch(err => {
            console.error(err);
            setSearching(false);
          });
      } else {
        setSearchResults(null);
      }
    }, 300); // Debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleExportCSV = async (dateFilter?: string) => {
    setExporting(true);
    try {
      // Trigger download by dynamically creating an anchor tag
      const link = document.createElement('a');
      const password = localStorage.getItem('app_password');
      // For CSV export, since it's a direct link click, we can't easily add headers unless we use fetch and blob.
      // Let's change it to a fetch and then download to keep security.
      const csvUrl = dateFilter ? `/api/export/invoices?date=${dateFilter}` : '/api/export/invoices';
      const response = await fetch(csvUrl, {
        headers: { 'Authorization': `Bearer ${password}` }
      });

      if (!response.ok) throw new Error('Failed to export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      link.download = dateFilter ? `rutas_entrega_${dateFilter}.csv` : 'rutas_entrega.csv';
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export CSV', error);
      alert('Error al exportar los datos.');
    } finally {
      setTimeout(() => setExporting(false), 1000); // Visual feedback delay
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        {/* Search Bar */}
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by Client Name, RUC, or Invoice Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-all"
          />
          {searching && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            </div>
          )}
        </div>

        {/* Export Button - global, left just in case or we can remove it entirely 
            but users might want an 'Export All' button */}
        <button
          onClick={() => handleExportCSV()}
          disabled={exporting}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors disabled:opacity-70"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>Export All (CSV)</span>
        </button>
      </div>

      {/* Results or Default List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            {searchResults ? 'Search Results' : 'Clients Overview'}
          </h2>
        </div>

        <div className="divide-y divide-gray-100">
          {searchResults ? (
            <>
              {(!searchResults.clients?.length && !searchResults.invoices?.length) ? (
                <div className="p-8 text-center text-gray-500">No matches found for "{searchQuery}"</div>
              ) : (
                <>
                  {/* Client Matches */}
                  {searchResults.clients?.map((client) => (
                    <button
                      key={`client-${client.id}`}
                      onClick={() => onSelectClient(client.id)}
                      className="w-full text-left p-4 hover:bg-blue-50 transition-colors flex items-center justify-between group border-l-4 border-transparent hover:border-blue-500"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            <Highlight text={client.name || ''} highlight={searchQuery} />
                          </p>
                          <p className="text-sm text-gray-500">
                            RUC: <Highlight text={client.ruc || ''} highlight={searchQuery} />
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>Client Match</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleDeleteClient(e, client.id, client.name || 'Unknown Client')}
                            disabled={deletingId === client.id}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors z-10"
                            title="Eliminar cliente"
                          >
                            {deletingId === client.id ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Trash2 className="w-5 h-5" />
                            )}
                          </button>
                          <ChevronRight className="w-5 h-5 group-hover:text-blue-500" />
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* Invoice Matches */}
                  {searchResults.invoices?.map((invoice) => (
                    <InvoicePreviewCard
                      key={`search-inv-${invoice.id}`}
                      invoice={invoice}
                      onSelect={() => onSelectClient(invoice.client_id)}
                      searchQuery={searchQuery}
                    />
                  ))}
                </>
              )}
            </>
          ) : (
            /* Default Grouped Client List */
            <div className="divide-y-8 divide-gray-50">
              {!groupedClients || groupedClients.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No hay clientes aún. Escanea una factura para empezar a ver el dashboard.</div>
              ) : (
                groupedClients.map((group) => (
                  <div key={group.date} className="bg-white">
                    {/* Date Header for Group */}
                    <div className="px-4 py-3 bg-blue-50/50 border-y border-gray-100 flex justify-between items-center">
                      <h3 className="font-semibold text-blue-900">
                        {new Date(group.date + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </h3>
                      <button
                        onClick={() => handleExportCSV(group.date)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 text-sm font-medium rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        CSV Día
                      </button>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {group.clients.map((client: any) => (
                        <button
                          key={`${group.date}-${client.id}`}
                          onClick={() => onSelectClient(client.id, group.date)}
                          className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{client.name || 'Unknown Client'}</p>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>{client.ruc}</span>
                                <span>•</span>
                                <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs">
                                  {client.invoice_count} factura(s) hoy
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleDeleteClient(e, client.id, client.name || 'Unknown Client')}
                              disabled={deletingId === client.id}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors z-10"
                              title="Eliminar cliente"
                            >
                              {deletingId === client.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Trash2 className="w-5 h-5" />
                              )}
                            </button>
                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
