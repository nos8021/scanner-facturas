import React from 'react';
import { FileText, Calendar, Trash2, Loader2, MapPin, ChevronRight } from 'lucide-react';

interface InvoicePreviewCardProps {
    invoice: any;
    onSelect: () => void;
    onDelete?: (e: React.MouseEvent, id: number, num: string) => void;
    isDeleting?: boolean;
    searchQuery?: string;
}

const Highlight = ({ text, highlight }: { text: any, highlight?: string }) => {
    if (!highlight?.trim() || text == null) return <>{text}</>;
    const safeText = String(text);
    const escapedHighlight = highlight.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = safeText.split(new RegExp(`(${escapedHighlight})`, 'gi'));
    return (
        <span>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.trim().toLowerCase() ?
                    <span key={i} className="bg-yellow-200 text-gray-900 font-semibold">{part}</span> : part
            )}
        </span>
    );
};

const InvoicePreviewCard: React.FC<InvoicePreviewCardProps> = ({ invoice, onSelect, onDelete, isDeleting, searchQuery = '' }) => {
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
            className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group border-b border-gray-100 last:border-b-0"
            onClick={onSelect}
        >
            <div className="flex justify-between items-start mb-1.5">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-gray-900 group-hover:text-purple-700">
                        #<Highlight text={invoice.invoice_number} highlight={searchQuery} />
                    </span>
                </div>
                <span className="font-bold text-gray-900">${Number(invoice.total || 0).toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm text-gray-500 mb-3">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {invoice.date}
                    </div>
                    {invoice.client_name && (
                        <div className="font-medium text-gray-800">
                            <Highlight text={invoice.client_name} highlight={searchQuery} />
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <div>{invoice.issuer_name}</div>
                </div>
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

            <div className="mt-4 flex justify-between items-center bg-white">
                <span className="text-xs text-purple-600 group-hover:underline flex items-center font-medium bg-purple-50 px-2 py-1 rounded-md border border-purple-100 transition-colors group-hover:bg-purple-100">
                    Ver / Editar formulario completo <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </span>
                {onDelete && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(e, invoice.id, invoice.invoice_number); }}
                        disabled={isDeleting}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                    >
                        {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <>
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Eliminar</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default InvoicePreviewCard;
