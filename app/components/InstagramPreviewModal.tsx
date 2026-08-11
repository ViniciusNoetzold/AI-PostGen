'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, Heart, MessageCircle, Send, Bookmark, ChevronLeft, ChevronRight, MoreHorizontal, ArrowLeft, ArrowRight } from 'lucide-react';
import type { HistoryPost } from '@/lib/posts';

interface InstagramPreviewModalProps {
  post: HistoryPost;
  profile: { name: string; avatarUrl: string };
  onClose: () => void;
  onSaveOrder: (newImageUrls: string[]) => Promise<void>;
}

export default function InstagramPreviewModal({ post, profile, onClose, onSaveOrder }: InstagramPreviewModalProps) {
  const [images, setImages] = useState<string[]>(() =>
    post.imageUrls.length > 0 ? [...post.imageUrls] : post.imageUrl ? [post.imageUrl] : [],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const moveImageLeft = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    const temp = newImages[index - 1];
    newImages[index - 1] = newImages[index];
    newImages[index] = temp;
    setImages(newImages);
    if (currentIndex === index) setCurrentIndex(index - 1);
    else if (currentIndex === index - 1) setCurrentIndex(index);
  };

  const moveImageRight = (index: number) => {
    if (index === images.length - 1) return;
    const newImages = [...images];
    const temp = newImages[index + 1];
    newImages[index + 1] = newImages[index];
    newImages[index] = temp;
    setImages(newImages);
    if (currentIndex === index) setCurrentIndex(index + 1);
    else if (currentIndex === index + 1) setCurrentIndex(index);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveOrder(images);
      onClose();
    } catch (error) {
      console.error("Erro ao salvar ordem", error);
    } finally {
      setSaving(false);
    }
  };

  const isCarousel = images.length > 1;
  const username = profile?.name?.toLowerCase().replace(/\s+/g, '_') || 'usuario_teste';
  const avatar = profile?.avatarUrl || 'https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="Pré-visualização do post" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-[#121212] sm:max-h-[90vh] md:flex-row">
        
        {/* Left side: Instagram Preview */}
        <div className="w-full md:w-[450px] flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-black overflow-y-auto hidden-scrollbar flex flex-col">
          {/* Mock Instagram Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="relative h-8 w-8 overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-gray-800">
                <Image src={avatar} alt={username} fill sizes="32px" unoptimized className="object-cover" />
              </div>
              <span className="font-semibold text-sm text-black dark:text-white">{username}</span>
            </div>
            <MoreHorizontal className="w-5 h-5 text-gray-800 dark:text-gray-200" />
          </div>

          {/* Main Image View */}
          <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
            {images.length > 0 ? (
              <Image src={images[currentIndex]} alt="Preview" fill sizes="(max-width: 768px) 100vw, 450px" unoptimized className="object-contain" />
            ) : (
              <span className="text-gray-400">Sem imagem</span>
            )}
            
            {isCarousel && (
              <>
                <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full font-medium">
                  {currentIndex + 1}/{images.length}
                </div>
                {currentIndex > 0 && (
                  <button onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-black shadow-md transition-colors z-10">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                {currentIndex < images.length - 1 && (
                  <button onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-black shadow-md transition-colors z-10">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Instagram Action Bar */}
          <div className="p-3">
            <div className="flex justify-between items-center mb-3">
              <div className="flex gap-4">
                <Heart className="w-6 h-6 text-black dark:text-white" />
                <MessageCircle className="w-6 h-6 text-black dark:text-white" />
                <Send className="w-6 h-6 text-black dark:text-white" />
              </div>
              <Bookmark className="w-6 h-6 text-black dark:text-white" />
            </div>
            
            {/* Carousel Dots */}
            {isCarousel && (
              <div className="flex justify-center gap-1 mb-3">
                {images.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentIndex ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                ))}
              </div>
            )}
            
            <div className="text-sm text-black dark:text-white mb-6">
              <span className="font-semibold mr-2">{username}</span>
              <span className="whitespace-pre-wrap">{post.content}</span>
            </div>
          </div>
        </div>

        {/* Right side: Editor & Actions */}
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-[#1e1e1e] overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#252525]">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Preview e Ordenação</h2>
            <button onClick={onClose} aria-label="Fechar pré-visualização" className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {isCarousel ? (
              <div className="flex flex-col gap-4">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Ordem do Carrossel</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ajuste a ordem das imagens clicando nas setas. A ordem vista aqui será a mesma publicada.
                </p>
                
                <div className="flex flex-wrap gap-4 mt-2">
                  {images.map((img, index) => (
                    <div key={index} className="flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentIndex(index)}
                        aria-label={`Visualizar imagem ${index + 1}`}
                        className={`relative w-24 h-24 rounded-lg overflow-hidden border-2 cursor-pointer ${currentIndex === index ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700'}`}
                      >
                        <Image src={img} alt={`Miniatura ${index + 1}`} fill sizes="96px" unoptimized className="object-cover" />
                        <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-bold pointer-events-none">
                          {index + 1}
                        </div>
                      </button>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => moveImageLeft(index)} 
                          disabled={index === 0}
                          className="p-1.5 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 disabled:hover:bg-gray-200 text-gray-800 dark:text-gray-200 transition-colors"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => moveImageRight(index)} 
                          disabled={index === images.length - 1}
                          className="p-1.5 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 disabled:hover:bg-gray-200 text-gray-800 dark:text-gray-200 transition-colors"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 p-8">
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
                  <Bookmark className="w-8 h-8" />
                </div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-lg mb-2">Post de Imagem Única</h3>
                <p className="text-sm">
                  Este post possui apenas uma imagem, então a reordenação não está disponível. Você pode visualizar ao lado como ficará no feed.
                </p>
              </div>
            )}
          </div>
          
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#252525] flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            {isCarousel && (
              <button 
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-60 flex items-center gap-2"
              >
                {saving ? (
                  <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span> Salvando...</>
                ) : (
                  'Salvar Nova Ordem'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .hidden-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hidden-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
