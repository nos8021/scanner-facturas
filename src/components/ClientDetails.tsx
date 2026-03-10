import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Calendar, Loader2, Trash2, MapPin } from 'lucide-react';
import InvoiceForm from './InvoiceForm';

interface ClientDetailsProps {
  clientId: number;
  onBack: () => void;
}

export default function ClientDetails({ clientId, onBack }: ClientDetailsProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<number | null>(null);
  const [deletingClient, setDeletingClient] = useState(false);

  const fetchClientDetails = () => {
    fetch(`/api/clients/${clientId}`)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchClientDetails();
  }, [clientId]);

  const handleDeleteClient = async () => {
    if (!data?.client) return;
    if (!window.confirm(`¿Estás seguro de que quieres eliminar a ${data.client.name} y todas sus facturas? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeletingClient(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar cliente');
      onBack(); // Go back to dashboard after deletion
    } catch (err) {
      console.error(err);
      alert('Error al eliminar el cliente');
      setDeletingClient(false);
    }
  };

  const handleDeleteInvoice = async (e: React.MouseEvent, invoiceId: number, invoiceNum: string) => {
    e.stopPropagation();
    if (!window.confirm(`¿Estás seguro de que quieres eliminar la factura #${invoiceNum}? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeletingInvoiceId(invoiceId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar factura');

      // Refresh the list
      fetchClientDetails();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar la factura');
    } finally {
      setDeletingInvoiceId(null);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>;
  if (!data || !data.client) return <div className="text-red-500 p-4">Client not found</div>;

  if (selectedInvoice) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedInvoice(null)}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Client History
        </button>
        <InvoiceForm
          initialData={selectedInvoice}
          onSave={() => { }} // Read-only, so no save needed
          onCancel={() => setSelectedInvoice(null)}
          readOnly={true}
        />
      </div>
    );
  }

  const { client, invoices } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </button>

        <button
          onClick={handleDeleteClient}
          disabled={deletingClient}
          className="flex items-center text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-red-200"
          title="Eliminar cliente"
        >
          {deletingClient ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4 mr-2" />
          )}
          Eliminar Cliente
        </button>
      </div>

      {/* Client Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">{client.name || 'Unknown Client'}</h1>
        <div className="mt-2 text-gray-600 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block">RUC/ID</span>
            {client.ruc}
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block">Address</span>
            {client.address || 'N/A'}
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block">Email</span>
            {client.email || 'N/A'}
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Invoice History</h2>
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {invoices?.length || 0} Invoices
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {!invoices || invoices.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No invoices found for this client.</div>
          ) : (
            invoices.map((invoice: any) => {
              // Safely parse items to ensure it's always an array
              let safeItems: any[] = [];
              if (Array.isArray(invoice.items)) {
                safeItems = invoice.items;
              } else if (typeof invoice.items === 'string') {
                try {
                  safeItems = JSON.parse(invoice.items);
                  if (!Array.isArray(safeItems)) safeItems = [];
                } catch (e) {
                  safeItems = [];
                }
              }

              return (
                <div
                  key={invoice.id}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => {
                    const parsedInvoice = {
                      ...invoice,
                      items: safeItems
                    };
                    setSelectedInvoice(parsedInvoice);
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">#{invoice.invoice_number}</span>
                    </div>
                    <span className="font-bold text-gray-900">${Number(invoice.total || 0).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {invoice.date}
                    </div>
                    <div>{invoice.issuer_name}</div>
                  </div>

                  {/* Address & Map Link */}
                  {invoice.recipient_address && (
                    <div className="mb-3 flex items-start gap-2 text-sm">
                      <div className="flex-1 bg-blue-50/50 text-blue-900 p-2 rounded-md border border-blue-100 flex justify-between items-center group/map">
                        <span className="truncate pr-2 font-medium" title={invoice.recipient_address}>
                          <MapPin className="w-3.5 h-3.5 inline mr-1 text-blue-400" />
                          {invoice.recipient_address}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            let addressToSearch = invoice.recipient_address;
                            const referenceMarkers = ['DIAGONAL', 'FRENTE', 'JUNTO', 'TRAS', 'REF:', 'REFERENCIA', 'CASA', 'OFICINA'];
                            for (const marker of referenceMarkers) {
                              const idx = addressToSearch.toUpperCase().indexOf(marker);
                              if (idx > 3) {
                                addressToSearch = addressToSearch.substring(0, idx).trim();
                                break;
                              }
                            }
                            addressToSearch = addressToSearch.replace(/\s+Y\s+/gi, ' & ');
                            let query = addressToSearch;
                            if (invoice.route) {
                              const parts = invoice.route.split(/-| a /i);
                              const destination = parts[parts.length - 1].trim();
                              if (destination && !query.toLowerCase().includes(destination.toLowerCase())) {
                                query = `${query}, ${destination}`;
                              }
                            }
                            query += ', Ecuador';
                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
                          }}
                          className="p-1.5 bg-white text-blue-600 hover:bg-blue-600 hover:text-white rounded-md shadow-sm transition-colors border border-blue-200"
                          title="Ver en Google Maps"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Items Preview */}
                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1 border border-gray-100 flex flex-col">
                      <div className="font-semibold text-gray-500 mb-1 border-b border-gray-200 pb-1 uppercase tracking-wider text-[10px]">Items</div>
                      <div className="flex-1 space-y-1.5 pt-1">
                        {safeItems.slice(0, 3).map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between">
                            <span className="truncate pr-2 font-medium">{item.quantity}x {item.description}</span>
                            <span>${Number(item.total || 0).toFixed(2)}</span>
                          </div>
                        ))}
                        {safeItems.length > 3 && (
                          <div className="text-center text-gray-400 italic pt-1 border-t border-gray-200 mt-1">
                            + {safeItems.length - 3} más
                          </div>
                        )}
                        {safeItems.length === 0 && (
                          <div className="text-gray-400 italic">No hay items</div>
                        )}
                      </div>
                    </div>

                    {/* Additional Info & Totals Preview */}
                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 flex flex-col justify-between border border-gray-100">
                      <div className="space-y-1.5 mb-2">
                        <div className="font-semibold text-gray-500 mb-1 border-b border-gray-200 pb-1 uppercase tracking-wider text-[10px]">Info Adicional</div>
                        {invoice.observations && <div className="truncate"><span className="text-gray-400 font-medium">Obs:</span> {invoice.observations}</div>}
                        {invoice.payment_method_description && <div className="truncate"><span className="text-gray-400 font-medium">Pago:</span> {invoice.payment_method_description}</div>}
                        {invoice.cashier && <div className="truncate"><span className="text-gray-400 font-medium">Cajero:</span> {invoice.cashier}</div>}
                        {!invoice.observations && !invoice.payment_method_description && !invoice.cashier && (
                          <div className="text-gray-400 italic">Sin información adicional</div>
                        )}
                      </div>

                      <div className="space-y-1 pt-2 border-t border-gray-200">
                        <div className="flex justify-between text-gray-500">
                          <span>Subtotal 0% / 15%</span>
                          <span>${Number(invoice.subtotal_0 || 0).toFixed(2)} / ${Number(invoice.subtotal_15 || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">IVA 15% / Avalúo</span>
                          <span>${Number(invoice.vat_15 || 0).toFixed(2)} / ${Number(invoice.appraisal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-gray-900 pt-1 mt-1 border-t border-gray-200">
                          <span>TOTAL</span>
                          <span className="text-sm">${Number(invoice.total || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delete Action */}
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={(e) => handleDeleteInvoice(e, invoice.id, invoice.invoice_number)}
                      disabled={deletingInvoiceId === invoice.id}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                    >
                      {deletingInvoiceId === invoice.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  );
}
