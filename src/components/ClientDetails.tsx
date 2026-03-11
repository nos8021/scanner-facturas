import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Calendar, Loader2, Trash2, MapPin } from 'lucide-react';
import InvoiceForm from './InvoiceForm';
import InvoicePreviewCard from './InvoicePreviewCard'; interface ClientDetailsProps {
  clientId: number;
  selectedDate?: string;
  onBack: () => void;
}

export default function ClientDetails({ clientId, selectedDate, onBack }: ClientDetailsProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<number | null>(null);
  const [deletingClient, setDeletingClient] = useState(false);

  // State to track if we're viewing just the selected date or all history
  const [viewAllHistory, setViewAllHistory] = useState(!selectedDate);

  const fetchClientDetails = () => {
    const password = localStorage.getItem('app_password');
    fetch(`/api/clients/${clientId}`, {
      headers: { 'Authorization': `Bearer ${password}` }
    })
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
      const password = localStorage.getItem('app_password');
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${password}` }
      });
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
      const password = localStorage.getItem('app_password');
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${password}` }
      });
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

  // Filter invoices to only the selected date if applicable
  const displayedInvoices = (!viewAllHistory && selectedDate)
    ? invoices.filter((inv: any) => inv.created_at && inv.created_at.startsWith(selectedDate))
    : invoices;

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
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {(!viewAllHistory && selectedDate) ? 'Invoices (Selected Day)' : 'Invoice History'}
            </h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {displayedInvoices?.length || 0} Invoices
            </span>
          </div>

          {selectedDate && (
            <button
              onClick={() => setViewAllHistory(!viewAllHistory)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-blue-200 transition-colors"
            >
              {viewAllHistory ? 'Ver Solo Seleccionadas' : 'Ver Todo el Historial'}
            </button>
          )}
        </div>

        <div className="divide-y divide-gray-100">
          {!displayedInvoices || displayedInvoices.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {(!viewAllHistory && selectedDate)
                ? "No invoices found for this client on the selected day."
                : "No invoices found for this client."}
            </div>
          ) : (
            displayedInvoices.map((invoice: any) => {
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
                <InvoicePreviewCard
                  key={invoice.id}
                  invoice={invoice}
                  onSelect={() => {
                    const parsedInvoice = {
                      ...invoice,
                      items: safeItems
                    };
                    setSelectedInvoice(parsedInvoice);
                  }}
                  onDelete={handleDeleteInvoice}
                  isDeleting={deletingInvoiceId === invoice.id}
                />
              )
            })
          )}
        </div>
      </div>
    </div>
  );
}
