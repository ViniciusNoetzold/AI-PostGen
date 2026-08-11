"use client";

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, ArrowRight, ChevronRight, Download, Sparkles } from 'lucide-react';
import { PRODUCTS, ATMOSPHERES, MediaSelection } from '@/lib/studio/data';
import { ImageUploader } from '@/components/studio/ImageUploader';
import { VideoOutput } from '@/components/studio/VideoOutput';
import { ScrollRow } from '@/components/studio/ScrollRow';
import { toInlineImages, InlineImage } from '@/lib/studio/images';
import { getErrorMessage } from '@/lib/errors';

type LogType = 'info' | 'success' | 'warn' | 'error';
type AppState = 'IDLE' | 'GENERATING_ATMOSPHERE' | 'GENERATING_PROMPT' | 'GENERATING_VIDEO' | 'VIDEO_READY';

interface VideoVersion {
  label: string;          // 'V1', 'V2', ...
  interactionId: string;  // Omni interaction id — chained from for edits
  videoUrl: string;
  prompt: string;         // the cinematic directive (V1) or the edit instructions
}

export default function StudioPage() {
  const [product, setProduct] = useState<MediaSelection | null>(null);
  const [atmosphere, setAtmosphere] = useState<MediaSelection | null>(null);
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [submittedImages, setSubmittedImages] = useState<string[]>([]);

  // "Generate your own atmosphere": a setting the user types instead of picking
  // or uploading an atmosphere image. On submit it's expanded by Flash Lite and
  // rendered by gemini-3.1-flash-lite-image, then fed into the video pipeline as the reference.
  const [generatePrompt, setGeneratePrompt] = useState('');

  const [versions, setVersions] = useState<VideoVersion[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const versionCount = useRef(0);

  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState('');
  const [promptOpen, setPromptOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [logs, setLogs] = useState<{ id: string; timestamp: string; message: string; type: LogType; image?: string }[]>([]);

  const addLog = (message: string, type: LogType = 'info', image?: string) => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString().split('T')[1].substring(0, 12),
      message,
      type,
      image
    }]);
  };

  const describe = (sel: MediaSelection) => sel.description || `${sel.images.length} ${sel.images.length === 1 ? 'imagem enviada' : 'imagens enviadas'}`;

  // Typing a setting is an alternative to picking/uploading an atmosphere image.
  const usingGenerate = !atmosphere && generatePrompt.trim().length > 0;
  const hasAtmosphere = !!atmosphere || usingGenerate;

  // Choosing a suggestion or uploading supersedes a typed prompt — clear it so the
  // two paths never both feed submit. Updater-form calls only touch an existing
  // selection (by which point generate is already cleared), so ignore those.
  const selectAtmosphere: React.Dispatch<React.SetStateAction<MediaSelection | null>> = (value) => {
    setAtmosphere(value);
    if (typeof value !== 'function' && value) {
      setGeneratePrompt('');
    }
  };

  const isGenerating = appState === 'GENERATING_ATMOSPHERE' || appState === 'GENERATING_PROMPT' || appState === 'GENERATING_VIDEO';
  const canSubmit = !!product && hasAtmosphere && !isGenerating;

  // Explains why the submit button is unavailable (shown as a tooltip).
  const submitHint = isGenerating
    ? 'Seu vídeo está sendo gerado — aguarde'
    : !product && !hasAtmosphere
    ? 'Adicione um produto e uma atmosfera para começar'
    : !product
    ? 'Adicione um produto para começar'
    : !hasAtmosphere
    ? 'Adicione uma atmosfera para começar'
    : undefined;

  const selected = versions.find(v => v.label === selectedLabel) ?? null;
  const otherVersions = versions.filter(v => v.label !== selectedLabel);

  const addVersion = (interactionId: string, fileId: string, promptText: string) => {
    const label = `V${++versionCount.current}`;
    setVersions(prev => [...prev, { label, interactionId, videoUrl: `/api/studio/video/${fileId}`, prompt: promptText }]);
    setSelectedLabel(label);
  };

  // Polls Omni until the render is ACTIVE, then records the version.
  const pollVideoStatus = (fileId: string, interactionId: string, promptText: string, isInitial: boolean) => {
    addLog('Consultando o status da renderização…', 'warn');
    let lastState = '';

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/studio/file-status/${fileId}`);
        const data = await res.json();

        if (data.state === 'ACTIVE') {
          clearInterval(interval);
          addLog('Renderização concluída. Vídeo pronto.', 'success');
          addVersion(interactionId, fileId, promptText);
          setAppState('VIDEO_READY');
          if (isInitial) {
            // Reset the upload sidebar for the next run.
            setProduct(null);
            setAtmosphere(null);
            setGeneratePrompt('');
          }
        } else if (data.state === 'FAILED') {
          clearInterval(interval);
          addLog('O provedor informou falha na renderização.', 'error');
          setAppState(isInitial ? 'IDLE' : 'VIDEO_READY');
        } else if (data.state !== lastState) {
          lastState = data.state;
          addLog(`Status da renderização: ${data.state}`);
        }
      } catch (e: unknown) {
        addLog(`Erro ao consultar o status: ${getErrorMessage(e)}`, 'error');
      }
    }, 5000);
  };

  // Initial generation from the sidebar: optionally render an atmosphere image
  // first, then write the prompt and render V1.
  const handleSubmit = async () => {
    if (!product || !hasAtmosphere) {
      addLog('Adicione um produto e uma atmosfera.', 'error');
      return;
    }
    const settingInput = generatePrompt.trim();

    versionCount.current = 0;
    setVersions([]);
    setSelectedLabel(null);
    setEditOpen(false);
    setPromptOpen(false);

    try {
      const productImages = await toInlineImages(product.images);
      const productLabel = product.source === 'suggestion' ? product.id : 'product';

      // The atmosphere can come from a selection/upload or be generated on the fly.
      let atmosphereImages: InlineImage[];
      let atmosphereDesc: string;
      let atmosphereSources: string[];   // surfaced later in the "sources" strip

      if (usingGenerate) {
        // Stage 0: Flash Lite writes an image prompt; gemini-3.1-flash-lite-image renders it.
        setAppState('GENERATING_ATMOSPHERE');
        addLog(`Gerando atmosfera a partir de: "${settingInput}"`, 'info');
        addLog('Preparando o prompt da imagem…', 'warn');
        addLog('Renderizando a atmosfera…', 'warn');

        const atmoRes = await fetch('/api/studio/generate-atmosphere', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: settingInput })
        });
        const atmoData = await atmoRes.json();
        if (!atmoRes.ok) throw new Error(atmoData.error || 'Não foi possível gerar a atmosfera');

        const atmoDataUrl = `data:${atmoData.image.mimeType};base64,${atmoData.image.data}`;
        addLog('Imagem da atmosfera pronta.', 'success', atmoDataUrl);
        atmosphereImages = [{ data: atmoData.image.data, mimeType: atmoData.image.mimeType }];
        atmosphereDesc = (atmoData.prompt as string) || settingInput;
        atmosphereSources = [atmoDataUrl];
      } else {
        setAppState('GENERATING_PROMPT');
        addLog('Analisando imagens…');
        addLog(`Product: ${describe(product)}`, 'info');
        addLog(`Atmosphere: ${describe(atmosphere!)}`, 'info');
        addLog('Preparando imagens…', 'warn');
        atmosphereImages = await toInlineImages(atmosphere!.images);
        atmosphereDesc = atmosphere!.description.replace(/\{product_id\}/g, productLabel);
        atmosphereSources = atmosphere!.images;
      }

      // Hidden until now: the user first sees a generated atmosphere here.
      setSubmittedImages([...product.images, ...atmosphereSources]);

      setAppState('GENERATING_PROMPT');
      addLog('Solicitando o prompt cinematográfico ao Gemini…', 'warn');
      const promptRes = await fetch('/api/studio/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productDesc: product.description, atmosphereDesc, productImages, atmosphereImages })
      });
      const promptData = await promptRes.json();
      if (!promptRes.ok) throw new Error(promptData.error || 'Não foi possível gerar o prompt');

      const generatedPrompt = promptData.prompt as string;
      addLog('Prompt concluído.', 'success');

      setAppState('GENERATING_VIDEO');
      addLog('Iniciando a geração de vídeo…');
      addLog('Enviando dados ao provedor…', 'warn');

      const videoRes = await fetch('/api/studio/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: generatedPrompt, productImages, atmosphereImages })
      });
      const videoData = await videoRes.json();
      if (!videoRes.ok) throw new Error(videoData.error || 'Não foi possível iniciar a geração do vídeo');

      addLog(`Interaction created successfully. ID: ${videoData.interactionId}`, 'success');
      pollVideoStatus(videoData.fileId, videoData.interactionId, generatedPrompt, true);
    } catch (e: unknown) {
      setAppState('IDLE');
      addLog(`Error: ${getErrorMessage(e)}`, 'error');
    }
  };

  // Edit the selected version via Omni's stateful chaining → produces a new version.
  const handleEdit = async () => {
    if (!selected || !editText.trim() || isGenerating) return;
    const instructions = editText.trim();
    const fromLabel = selected.label;
    const fromInteractionId = selected.interactionId;

    setEditOpen(false);
    setEditText('');
    setAppState('GENERATING_VIDEO');
    addLog(`Editing ${fromLabel}: ${instructions}`, 'warn');
    addLog('Transmitting edit to Omni...', 'warn');

    try {
      const res = await fetch('/api/studio/edit-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previousInteractionId: fromInteractionId, instructions })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Edit failed');

      addLog(`Edit interaction created: ${data.interactionId}`, 'success');
      pollVideoStatus(data.fileId, data.interactionId, instructions, false);
    } catch (e: unknown) {
      setAppState('VIDEO_READY');
      addLog(`Edit failed: ${getErrorMessage(e)}`, 'error');
    }
  };

  const selectVersion = (label: string) => {
    setSelectedLabel(label);
    setEditOpen(false);
  };

  // Fetch the video as a blob from within the authenticated app context, then save
  // it from a local object URL. The native player download triggers a navigational
  // request that AI Studio's auth proxy intercepts (returning its cookie-check page
  // instead of the video), so we download it ourselves.
  const downloadVideo = async (version: VideoVersion) => {
    setDownloading(true);
    try {
      const res = await fetch(version.videoUrl, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omni-${version.label.toLowerCase()}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      addLog(`Falha no download: ${getErrorMessage(e)}`, 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-200">

      {/* Navbar */}
      <header className="sticky top-0 z-30 flex items-center border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-400">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 dark:text-white">Product Studio</h1>
            <p className="hidden text-xs text-slate-500 sm:block">Vídeos de produto com IA</p>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 gap-6 p-4 sm:p-6 xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[400px_minmax(0,1fr)]">

        {/* LEFT - BUILDER */}
        <section className="flex flex-col gap-6">
          <div className="relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
            <div className="relative flex h-full flex-col gap-6 bg-transparent p-5 transition-colors sm:p-6">
              <header className="mb-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">Omni workspace</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-800 dark:text-white">
                  Monte seu vídeo
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                  Transforme imagens estáticas de produtos em vídeos cinematográficos
                </p>
              </header>

              <ImageUploader
                title="Imagens do Produto"
                type="product"
                suggestions={PRODUCTS}
                selection={product}
                onSelect={setProduct}
                disabled={isGenerating}
              />

              <ImageUploader
                title="Atmosferas"
                type="atmosphere"
                suggestions={ATMOSPHERES}
                selection={atmosphere}
                onSelect={selectAtmosphere}
                disabled={isGenerating}
              />

              {/* Persistent submit */}
              <div title={submitHint} className={`mt-auto pt-4 ${submitHint ? 'cursor-not-allowed' : ''}`}>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-3 w-5 h-5 animate-spin" />
                      Gerando…
                    </>
                  ) : (
                    <>
                      Gerar Vídeo
                      <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT - OUTPUT */}
        <div className="flex flex-col gap-6 overflow-hidden">
          <section className="bg-white dark:bg-slate-800 rounded-[20px] shadow-lg border border-gray-100 dark:border-slate-700 flex flex-col overflow-hidden h-full">
            <div className="p-6 h-full flex flex-col overflow-y-auto">
                {/* PREVIOUS VERSIONS — click to bring one back into the main view */}
                {otherVersions.length > 0 && (
                  <div className="flex gap-3 md:gap-4 mb-8">
                    <div className="flex-none w-12" />
                    <ScrollRow className="flex-1 min-w-0" rowClassName="gap-4" revision={otherVersions.length}>
                      {otherVersions.map(v => (
                        <button key={v.label} onClick={() => selectVersion(v.label)} className="group flex-none text-left">
                          <div className="font-mono text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 mb-1.5 transition-colors">{v.label}</div>
                          <video
                            src={v.videoUrl}
                            muted
                            playsInline
                            preload="metadata"
                            className="w-40 aspect-video object-cover bg-black opacity-70 group-hover:opacity-100 transition-opacity rounded-lg"
                          />
                        </button>
                      ))}
                    </ScrollRow>
                  </div>
                )}

                {/* MAIN: version label + EDIT in the gutter, video/loading aligned with the rest */}
                <div className="flex gap-3 md:gap-4">
                  <div className="flex-none w-12 pt-1">
                    {appState === 'VIDEO_READY' && selected && (
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => setEditOpen(o => !o)}
                          className="font-mono text-sm uppercase tracking-widest text-gray-800 dark:text-white text-left hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                        >
                          {selected.label}
                        </button>
                        <button
                          onClick={() => setEditOpen(o => !o)}
                          className={`font-mono text-xs uppercase tracking-widest text-left transition-colors ${editOpen ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'}`}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => downloadVideo(selected)}
                          disabled={downloading}
                          aria-label={`Download ${selected.label}`}
                          title="Baixar vídeo"
                          className="w-fit text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors disabled:opacity-50"
                        >
                          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <VideoOutput appState={appState} videoUrl={selected?.videoUrl ?? null} logs={logs} />
                  </div>
                </div>

                {/* EDIT FORM */}
                <AnimatePresence initial={false}>
                  {editOpen && appState === 'VIDEO_READY' && selected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex gap-3 md:gap-4 mt-4">
                        <div className="flex-none w-12" />
                        <div className="flex-1 min-w-0">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            placeholder={`Descreva suas mudanças para ${selected.label} — ex: "iluminação mais quente", "câmera lenta", "mudar o fundo"…`}
                            className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 p-4 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[100px] rounded-xl"
                          />
                          <button
                            onClick={handleEdit}
                            disabled={!editText.trim()}
                            className="group mt-3 flex justify-center items-center py-3 px-6 rounded-xl shadow-md text-sm font-bold text-white bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          >
                            Enviar Edição
                            <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* INPUT REFERENCE IMAGES (shared across versions) */}
                {appState === 'VIDEO_READY' && submittedImages.length > 0 && (
                  <div className="flex gap-3 md:gap-4 mt-6">
                    <div className="flex-none w-12" />
                    <ScrollRow className="flex-1 min-w-0" rowClassName="gap-2" revision={submittedImages.length}>
                      {submittedImages.map((src, i) => (
                        <Image
                          key={i}
                          src={src}
                          alt={`Input ${i + 1}`}
                          width={96}
                          height={64}
                          unoptimized
                          className="flex-none w-24 h-16 object-cover bg-gray-100 dark:bg-slate-700 rounded border border-gray-200 dark:border-slate-600"
                        />
                      ))}
                    </ScrollRow>
                  </div>
                )}

                {/* PROMPT for the selected version */}
                {appState === 'VIDEO_READY' && selected?.prompt && (
                  <div className="flex gap-3 md:gap-4 mt-5">
                    <div className="flex-none w-12" />
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => setPromptOpen(o => !o)}
                        className="flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-widest text-gray-800 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                      >
                        <ChevronRight className={`w-4 h-4 transition-transform ${promptOpen ? 'rotate-90' : ''}`} />
                        Prompt
                      </button>
                      <AnimatePresence initial={false}>
                        {promptOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="mt-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-4 font-mono text-sm leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap rounded-xl">
                              {selected.prompt}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
            </div>
          </section>
        </div>
      </main>

      {/* FOOTER — usage disclaimer */}
      <footer className="shrink-0 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 md:px-10 py-4 mt-auto">
        <div className="max-w-5xl mx-auto space-y-1.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400 text-center">
          <p>
            Ao usar este recurso, você confirma que possui os direitos necessários para qualquer conteúdo que enviar. Não gere conteúdo que infrinja os direitos de propriedade intelectual ou privacidade de terceiros. Seu uso deste serviço de IA generativa está sujeito à nossa{' '}
            <a
              href="https://policies.google.com/terms/generative-ai/use-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              Política de Uso Proibido
            </a>.
          </p>
        </div>
      </footer>

    </div>
  );
}
