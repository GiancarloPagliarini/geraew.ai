'use client';

import { useAuth } from '@/lib/auth-context';
import { api, BASE_URL } from '@/lib/api';
import { useState, useCallback, useRef } from 'react';
import {
  Upload,
  X,
  Copy,
  Check,
  ImageIcon,
  Film,
  Loader2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

interface UploadedFile {
  id: string;
  filename: string;
  publicUrl: string;
  contentType: string;
  status: 'uploading' | 'done' | 'error';
  progress?: number;
  error?: string;
}

const ACCEPTED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
  'video/mp4',
  'video/webm',
];

const FOLDER_OPTIONS = [
  { value: 'landing', label: 'Landing Page' },
  { value: 'gallery', label: 'Galeria' },
  { value: 'testimonials', label: 'Depoimentos' },
  { value: 'misc', label: 'Outros' },
];

export default function AdminUploadsPage() {
  const { accessToken } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [folder, setFolder] = useState('landing');
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!accessToken) return;

      const id = crypto.randomUUID();
      const entry: UploadedFile = {
        id,
        filename: file.name,
        publicUrl: '',
        contentType: file.type,
        status: 'uploading',
      };

      setFiles((prev) => [entry, ...prev]);

      try {
        const { uploadUrl, publicUrl } = await api.admin.upload(
          accessToken,
          file.name,
          file.type,
          folder,
        );

        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });

        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: 'done', publicUrl } : f,
          ),
        );
        toast.success(`${file.name} enviado com sucesso`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro no upload';
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: 'error', error: msg } : f,
          ),
        );
        toast.error(`Falha ao enviar ${file.name}`);
      }
    },
    [accessToken, folder],
  );

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const arr = Array.from(fileList);
      for (const file of arr) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          toast.error(`Tipo não suportado: ${file.type}`);
          continue;
        }
        uploadFile(file);
      }
    },
    [uploadFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const copyUrl = useCallback((id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('URL copiada');
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const isImage = (type: string) => type.startsWith('image/');

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#f3f0ed]">Upload de Imagens</h1>
        <p className="mt-1 text-sm text-[#f3f0ed]/40">
          Envie imagens e vídeos para o S3. Use as URLs na landing page, galeria ou onde precisar.
        </p>
      </div>

      {/* Folder selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-[#f3f0ed]/50">Pasta:</span>
        <div className="flex gap-2">
          {FOLDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFolder(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                folder === opt.value
                  ? 'bg-[#a2dd00]/15 text-[#a2dd00]'
                  : 'border border-[#f3f0ed]/8 text-[#f3f0ed]/40 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-12 transition-all ${
          isDragging
            ? 'border-[#a2dd00] bg-[#a2dd00]/5'
            : 'border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.02] hover:border-[#f3f0ed]/20 hover:bg-[#f3f0ed]/[0.04]'
        }`}
      >
        <div className={`rounded-xl p-3 ${isDragging ? 'bg-[#a2dd00]/10' : 'bg-[#f3f0ed]/5'}`}>
          <Upload className={`h-6 w-6 ${isDragging ? 'text-[#a2dd00]' : 'text-[#f3f0ed]/30'}`} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-[#f3f0ed]/60">
            Arraste arquivos aqui ou clique para selecionar
          </p>
          <p className="mt-1 text-xs text-[#f3f0ed]/30">
            PNG, JPG, WEBP, GIF, AVIF, MP4, WEBM
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(',')}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Uploaded files grid */}
      {files.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-[#f3f0ed]/60">
            Arquivos enviados ({files.filter((f) => f.status === 'done').length}/{files.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02]"
              >
                {/* Preview */}
                <div className="relative flex h-40 items-center justify-center bg-black/20">
                  {file.status === 'done' && isImage(file.contentType) ? (
                    <img
                      src={file.publicUrl}
                      alt={file.filename}
                      className="h-full w-full object-cover"
                    />
                  ) : file.status === 'done' && !isImage(file.contentType) ? (
                    <video
                      src={file.publicUrl}
                      className="h-full w-full object-cover"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  ) : file.status === 'uploading' ? (
                    <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
                  ) : (
                    <X className="h-6 w-6 text-red-400" />
                  )}

                  {/* Remove button */}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-[#f3f0ed]/60 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  {/* Type badge */}
                  <div className="absolute left-2 top-2 flex h-6 items-center gap-1 rounded-md bg-black/60 px-2">
                    {isImage(file.contentType) ? (
                      <ImageIcon className="h-3 w-3 text-[#f3f0ed]/50" />
                    ) : (
                      <Film className="h-3 w-3 text-[#f3f0ed]/50" />
                    )}
                    <span className="text-[10px] text-[#f3f0ed]/50">
                      {file.contentType.split('/')[1].toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="flex flex-col gap-2 p-3">
                  <span className="truncate text-xs font-medium text-[#f3f0ed]/70">
                    {file.filename}
                  </span>

                  {file.status === 'done' && (
                    <button
                      onClick={() => copyUrl(file.id, file.publicUrl)}
                      className="flex items-center gap-1.5 rounded-lg bg-[#f3f0ed]/5 px-2.5 py-1.5 text-left transition-colors hover:bg-[#f3f0ed]/8"
                    >
                      {copiedId === file.id ? (
                        <Check className="h-3 w-3 shrink-0 text-[#a2dd00]" />
                      ) : (
                        <Copy className="h-3 w-3 shrink-0 text-[#f3f0ed]/30" />
                      )}
                      <span className="truncate text-[10px] text-[#f3f0ed]/40">
                        {file.publicUrl}
                      </span>
                    </button>
                  )}

                  {file.status === 'error' && (
                    <span className="text-[10px] text-red-400">{file.error}</span>
                  )}

                  {file.status === 'uploading' && (
                    <span className="text-[10px] text-[#a2dd00]">Enviando...</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
