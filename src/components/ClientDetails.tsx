import { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Calendar, Loader2 } from 'lucide-react';
import InvoiceForm from './InvoiceForm';

interface ClientDetailsProps {
  clientId: number;
  onBack: () => void;
}

export default function ClientDetails({ clientId, onBack }: ClientDetailsProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  useEffect(() => {
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
  }, [clientId]);

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
      <button
        onClick={onBack}
        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </button>

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

                  {/* Items Preview */}
                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                    {safeItems.slice(0, 3).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.quantity}x {item.description}</span>
                        <span>${Number(item.total || 0).toFixed(2)}</span>
                      </div>
                    ))}
                    {safeItems.length > 3 && (
                      <div className="text-center text-gray-400 italic pt-1">
                        + {safeItems.length - 3} more items
                      </div>
                    )}
                    {safeItems.length === 0 && (
                      <div className="text-gray-400 italic">No items available</div>
                    )}
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
