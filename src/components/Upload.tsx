import { useState, useCallback, DragEvent } from 'react';
import { Upload as UploadIcon, Loader2 } from 'lucide-react';

interface UploadProps {
  onAnalyze: (data: any) => void;
}

export default function Upload({ onAnalyze }: UploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const originalBase64 = e.target?.result as string;

        try {
          // --- COMPRESS IMAGE BEFORE SENDING ---
          const compressedBase64 = await new Promise<string>((resolve, reject) => {
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
              if (!ctx) {
                return reject(new Error('Canvas context not available'));
              }

              ctx.drawImage(img, 0, 0, width, height);

              // Compress to JPEG with 0.7 quality (very strong balance of quality/size)
              const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
              resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = originalBase64;
          });
          // -------------------------------------

          const password = localStorage.getItem('app_password');
          const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${password}`
            },
            body: JSON.stringify({ image: compressedBase64 }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || errorData.error || 'Failed to analyze image');
          }

          const data = await response.json();
          onAnalyze(data);
        } catch (err: any) {
          let message = err.message || 'Failed to analyze invoice. Please try again.';
          if (message.includes('API key')) {
            message += ' Please check your GEMINI_API_KEY in the AI Studio secrets.';
          }
          setError(message);
          console.error(err);
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Error reading file.');
      setIsAnalyzing(false);
    }
  };

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
          }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <input
          id="file-upload"
          type="file"
          className="hidden"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {isAnalyzing ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-lg font-medium text-gray-700">Analyzing Invoice...</p>
            <p className="text-sm text-gray-500">Extracting data with Gemini AI</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-blue-100 rounded-full">
              <UploadIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">Upload Invoice</p>
              <p className="text-gray-500 mt-1">Drag and drop or click to select</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
