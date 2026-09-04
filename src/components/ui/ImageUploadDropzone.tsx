'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { MAX_IMAGE_FILE_SIZE } from '@/lib/utils/imageConstants';

interface ImageUploadDropzoneProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  type?: 'cover' | 'avatar';
  workId?: string;
  label?: string;
  recommendedRatio?: string;
}

export function ImageUploadDropzone({
  value,
  onChange,
  type = 'cover',
  workId,
  label = 'Muqova rasmi',
  recommendedRatio = '2:3 nisbat (masalan: 600x900px)',
}: ImageUploadDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(file: File) {
    setError(null);

    // Client-side quick size check
    if (file.size > MAX_IMAGE_FILE_SIZE) {
      setError('Fayl hajmi 5 MB dan oshmasligi kerak');
      return;
    }

    // Supported extensions check
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!hasValidExt) {
      setError('Faqat JPEG, PNG, WebP yoki AVIF formatidagi rasmlar qabul qilinadi. SVG taqiqlangan.');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      if (workId) formData.append('workId', workId);

      const res = await fetch('/api/uploads/image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Rasmni yuklashda xatolik yuz berdi');
      }

      onChange(data.publicUrl);
    } catch (err: any) {
      setError(err.message || 'Yuklashda xatolik yuz berdi');
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-stone-700">{label}</label>
        <span className="text-[11px] text-stone-400 font-medium">{recommendedRatio}</span>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {value ? (
        <div className="relative group rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 max-w-[220px]">
          <div className={clsx('relative w-full', type === 'avatar' ? 'aspect-square' : 'aspect-[2/3]')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Yuklangan muqova" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-3 py-1.5 rounded-lg bg-white text-stone-900 text-xs font-bold shadow-md hover:bg-stone-50 transition-all flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Almashtirish</span>
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                disabled={uploading}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold shadow-md hover:bg-rose-700 transition-all flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>O‘chirish</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={clsx(
            'border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3',
            isDragOver
              ? 'border-amber-600 bg-amber-50/50'
              : 'border-stone-300 hover:border-stone-400 bg-stone-50/50 hover:bg-stone-100/50',
            uploading && 'pointer-events-none opacity-60',
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Loader2 className="w-8 h-8 text-amber-700 animate-spin" />
              <span className="text-xs font-bold text-stone-700">Rasm tekshirilmoqda va WebP ga o‘tkazilmoqda...</span>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center justify-center shadow-xs">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-stone-800">
                  <span className="text-amber-800 underline">Rasm tanlang</span> yoki bu yerga sudrab tashlang
                </p>
                <p className="text-[11px] text-stone-400 font-medium">
                  JPEG, PNG, WebP, AVIF • Maksimal 5 MB
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
          }
        }}
      />
    </div>
  );
}
