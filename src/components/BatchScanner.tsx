import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Camera, Loader2, CheckCircle2, XCircle, AlertTriangle, Image as ImageIcon } from 'lucide-react';

type JobStatus = 'pending' | 'compressing' | 'analyzing' | 'saving' | 'completed' | 'error' | 'duplicate';

interface InvoiceJob {
    id: string;
    file: File;
    thumbnail: string;
    status: JobStatus;
    message?: string;
    clientId?: number;
}

export default function BatchScanner() {
    const [jobs, setJobs] = useState<InvoiceJob[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Compress Image utility
    const compressImage = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_DIMENSION = 1600;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_DIMENSION) {
                            height = Math.round((height * MAX_DIMENSION) / width);
                            width = MAX_DIMENSION;
                        }
                    } else {
                        if (height > MAX_DIMENSION) {
                            width = Math.round((width * MAX_DIMENSION) / height);
                            height = MAX_DIMENSION;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject(new Error('Canvas context not available'));

                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.onerror = reject;
                img.src = e.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const processNextJob = useCallback(async () => {
        if (isProcessing) return;

        // Find first pending job
        const jobIndex = jobs.findIndex(j => j.status === 'pending');
        if (jobIndex === -1) return; // No pending jobs

        const job = jobs[jobIndex];
        setIsProcessing(true);

        const updateJob = (updates: Partial<InvoiceJob>) => {
            setJobs(current =>
                current.map(j => j.id === job.id ? { ...j, ...updates } : j)
            );
        };

        try {
            // 1. Compress
            updateJob({ status: 'compressing', message: 'Comprimiendo imagen...' });
            const compressedBase64 = await compressImage(job.file);

            // 2. Analyze
            updateJob({ status: 'analyzing', message: 'Extrayendo con IA...' });
            const password = localStorage.getItem('app_password');
            const analyzeRes = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${password}`
                },
                body: JSON.stringify({ image: compressedBase64 }),
            });

            if (!analyzeRes.ok) {
                const errData = await analyzeRes.json();
                throw new Error(errData.details || errData.error || 'Fallo al analizar la factura');
            }
            const invoiceData = await analyzeRes.json();

            // 3. Save
            updateJob({ status: 'saving', message: 'Guardando en Base de Datos...' });
            const saveRes = await fetch('/api/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${password}`
                },
                body: JSON.stringify(invoiceData),
            });

            if (saveRes.status === 409) {
                // Conflict = Duplicate
                updateJob({ status: 'duplicate', message: 'Factura Repetida (Ignorada)' });
            } else if (!saveRes.ok) {
                const saveErr = await saveRes.json();
                throw new Error(saveErr.error || 'Fallo al guardar en base de datos');
            } else {
                const { clientId } = await saveRes.json();
                updateJob({ status: 'completed', clientId, message: '¡Guardada Exitósamente!' });
            }

        } catch (error: any) {
            console.error("Job failed:", error);
            updateJob({
                status: 'error',
                message: error.message || 'Error desconocido'
            });
        } finally {
            setIsProcessing(false);
        }
    }, [jobs, isProcessing]);

    // Queue runner
    useEffect(() => {
        processNextJob();
    }, [jobs, isProcessing, processNextJob]);

    const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const newJobs: InvoiceJob[] = Array.from(files).map((file: File) => ({
            id: Math.random().toString(36).substring(7),
            file,
            thumbnail: URL.createObjectURL(file), // create preview
            status: 'pending',
            message: 'En cola...'
        }));

        // Add new jobs to the TOP of the list so they are visually seen first (or bottom)
        // We'll put them at the top so the latest taken pictures are at the top visually.
        setJobs((prev) => [...newJobs, ...prev]);

        // Reset input so the same file or subsequent files can be selected
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // UI Helpers
    const getStatusIcon = (status: JobStatus) => {
        switch (status) {
            case 'pending': return <Loader2 className="w-5 h-5 text-gray-400" />;
            case 'compressing':
            case 'analyzing':
            case 'saving': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
            case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'duplicate': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4 sm:p-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    Escaneo Continuo
                </h2>
                <p className="text-gray-600 max-w-lg mx-auto">
                    Toma fotos sin parar. Las facturas se analizarán y guardarán en segundo plano automáticamente. Las duplicadas se ignorarán.
                </p>
            </div>

            {/* Main Camera Button */}
            <div className="flex justify-center mb-10">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-3 w-48 h-48 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors rounded-[2rem] shadow-xl text-white"
                >
                    <Camera className="w-16 h-16" />
                    <span className="font-semibold text-lg text-center px-4">
                        Empezar a Escanear
                    </span>
                </button>
                {/* Hidden File Input configured for mobile camera */}
                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFiles}
                />
            </div>

            {/* Queue UI */}
            {jobs.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-700">Progreso Reciente</h3>
                        <span className="text-sm font-medium bg-blue-100 text-blue-700 py-1 px-3 rounded-full">
                            {jobs.filter(j => ['pending', 'compressing', 'analyzing', 'saving'].includes(j.status)).length} facturas pendientes
                        </span>
                    </div>

                    <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                        {jobs.map((job) => (
                            <div key={job.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                                    {job.thumbnail ? (
                                        <img src={job.thumbnail} alt="Invoice preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon className="w-6 h-6 text-gray-400" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex items-center gap-2 mb-1">
                                        {getStatusIcon(job.status)}
                                        <span className={`font-medium truncate ${job.status === 'completed' ? 'text-green-700' :
                                            job.status === 'duplicate' ? 'text-yellow-700' :
                                                job.status === 'error' ? 'text-red-700' :
                                                    'text-blue-700'
                                            }`}>
                                            {job.message}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 truncate">
                                        ID Interno: {job.id}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
