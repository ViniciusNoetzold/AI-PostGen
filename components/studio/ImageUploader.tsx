"use client";

import React, { useRef, useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { SuggestionChip, MediaSelection } from '@/lib/studio/data';
import { fileToDownscaledDataUrl } from '@/lib/studio/images';

interface ImageUploaderProps {
  title: string;
  type: 'product' | 'atmosphere';
  suggestions: SuggestionChip[];
  selection: MediaSelection | null;
  onSelect: React.Dispatch<React.SetStateAction<MediaSelection | null>>;
  disabled?: boolean;
}

export function ImageUploader({
  title,
  type,
  suggestions,
  selection,
  onSelect,
  disabled = false,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChipClick = (suggestion: SuggestionChip) => {
    setPromptText(suggestion.prompt);
    setError(null);
  };

  const handleGenerate = async () => {
    const prompt = promptText.trim();
    if (!prompt) {
      setError('Please write or select a prompt first.');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/studio/generate-atmosphere', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: prompt }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      if (data.image) {
        const atmoDataUrl = `data:${data.image.mimeType};base64,${data.image.data}`;
        onSelect({
          id: `generated-${Date.now()}`,
          source: 'upload',
          images: [atmoDataUrl],
          description: data.prompt || prompt,
        });
      } else {
        throw new Error('Image not returned from backend');
      }
    } catch (err: any) {
      console.error('Error in image generation:', err);
      setError(err.message || 'Failed to generate image. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleFiles = async (fileList: FileList | null) => {
    const picked = Array.from(fileList ?? []).filter((f) =>
      f.type.startsWith('image/')
    );
    if (picked.length === 0) return;

    try {
      const dataUrl = await fileToDownscaledDataUrl(picked[0]);
      onSelect({
        id: `upload-${Date.now()}`,
        source: 'upload',
        images: [dataUrl],
        description: `Uploaded reference photo`,
      });
      setError(null);
    } catch (err: any) {
      setError('Failed to process uploaded file.');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleClear = () => {
    onSelect(null);
    setError(null);
  };

  const hasSelection = !!selection && selection.images.length > 0;

  return (
    <div className="mb-8 p-5 bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors duration-300">
      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-100 mb-4 flex items-center justify-between">
        <span>{title}</span>
        {generating && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-mono normal-case">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 dark:text-blue-400" />
            Generating...
          </span>
        )}
      </h2>

      {hasSelection ? (
        <div className="space-y-3">
          <div className="relative group w-full aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-600">
            <img
              src={selection.images[0]}
              alt={selection.description}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {!disabled && (
              <button
                onClick={handleClear}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors border border-transparent"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-6">
              <p className="text-xs font-mono text-zinc-300 line-clamp-2">
                {selection.description}
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              onClick={handleClear}
              className="w-full py-2 font-mono text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              Reset and Generate New
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1">
            <textarea
              value={promptText}
              onChange={(e) => {
                setPromptText(e.target.value);
                setError(null);
              }}
              disabled={disabled || generating}
              placeholder={`Describe the desired ${type} (e.g. "a colorful ceramic mug on a table"...)`}
              rows={3}
              className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 p-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent rounded-lg resize-none placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400">Suggestions</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleChipClick(item)}
                  disabled={disabled || generating}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded-full border transition-all ${
                    promptText === item.prompt
                      ? 'bg-blue-600 text-white border-blue-600 font-medium'
                      : 'bg-gray-50 dark:bg-slate-800/80 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {type === 'atmosphere' && (
            <button
              onClick={handleGenerate}
              disabled={disabled || generating || !promptText.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate {type} image
                </>
              )}
            </button>
          )}

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
            <span className="flex-shrink mx-3 text-[10px] font-mono uppercase text-gray-400 dark:text-gray-500">or upload own image</span>
            <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
          </div>

          <div
            onClick={() => !generating && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              if (!generating) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (!generating) handleFiles(e.dataTransfer.files);
            }}
            role="button"
            tabIndex={0}
            className={`border border-dashed p-4 text-center rounded-lg transition-colors cursor-pointer ${
              dragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-slate-600 hover:border-blue-400 bg-gray-50 dark:bg-slate-800/50'
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1">
              <Plus className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Drop your reference photo or click to browse
              </span>
            </div>
          </div>

          {error && (
            <p className="text-xs font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-2.5 rounded-lg">
              {error}
            </p>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
