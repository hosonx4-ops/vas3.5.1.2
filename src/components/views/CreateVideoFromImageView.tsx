// src/components/views/CreateVideoFromImageView.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext, useLocalStorage } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { fileToGenerativePart, createCharacterSheetFromImages, Part } from '../../services/geminiService';
import Spinner from '../common/Spinner';
import { AutomationPrompt, AutomationState, AppView, AutomationStatus, Story } from '../../types';
import { UploadCloud, X as IconX } from 'lucide-react'; // Thêm icon

// === COMPONENT MỚI: PromptCard ===
interface PromptCardProps {
    prompt: AutomationPrompt;
    index: number;
    imageAnalysisMode: 'shared' | 'separate';
    isRunning: boolean;
    isAnalyzing: boolean;
    onUpdateText: (id: string, text: string) => void;
    onUpdateImage: (id: string, file: File) => void;
    onClearImage: (id: string) => void;
    onRunSingle: (id: string) => void;
    onRemove: (id: string) => void;
    onDownload: (url: string | undefined, text: string) => void;
}

const PromptCard: React.FC<PromptCardProps> = ({
    prompt, index, imageAnalysisMode, isRunning, isAnalyzing,
    onUpdateText, onUpdateImage, onClearImage, onRunSingle, onRemove, onDownload
}) => {
    
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onUpdateImage(prompt.id, file);
        }
        e.target.value = ''; // Clear input
    };
    
    return (
        <div key={prompt.id} className="bg-secondary p-3 rounded-lg shadow-md flex flex-col gap-2">
            <div className="flex justify-between items-center">
                <label className="block text-dark-text text-sm font-bold">Prompt #{index + 1}</label>
                <div className="flex items-center gap-2">
                     <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ prompt.status === 'success' ? 'bg-green-100 text-green-800' : ['running', 'queued', 'submitting', 'processing'].includes(prompt.status) ? 'bg-blue-100 text-blue-800' : prompt.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{prompt.message}</span>
                     <button onClick={() => onRunSingle(prompt.id)} disabled={isRunning || isAnalyzing} title="Chạy prompt này" className="p-1 hover:bg-green-100 rounded-full disabled:opacity-50">
                        <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path></svg>
                     </button>
                     <button onClick={() => onRemove(prompt.id)} disabled={isRunning || isAnalyzing} title="Xóa" className="p-1 hover:bg-red-100 rounded-full disabled:opacity-50">
                        <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                     </button>
                </div>
            </div>
            
            {/* Video Preview */}
            <div className="relative w-full aspect-video bg-primary rounded-md border border-border-color flex items-center justify-center overflow-hidden group">
                {prompt.videoUrl ? (
                    <>
                        <video key={prompt.videoUrl} controls className="w-full h-full object-contain"><source src={prompt.videoUrl} type="video/mp4" /></video>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onDownload(prompt.videoUrl, prompt.text)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Tải về</button>
                        </div>
                    </>
                ) : ['running', 'queued', 'submitting', 'processing'].includes(prompt.status) ? (
                    <div className="text-center"><Spinner /><p className="mt-4 text-dark-text text-sm capitalize">{prompt.status}...</p></div>
                ) : (
                    <div className="text-center text-dark-text text-sm"><p>Kết quả sẽ hiện ở đây</p></div>
                )}
            </div>
            
            {/* Textarea và Ô tải ảnh riêng */}
            <div className="flex gap-2">
                <textarea 
                    value={prompt.text} 
                    onChange={e => onUpdateText(prompt.id, e.target.value)} 
                    className="w-full p-2 bg-primary rounded-md border border-border-color text-sm resize-y h-24" 
                    readOnly={isRunning || isAnalyzing} 
                />
                
                {/* (THAY ĐỔI) Ô tải ảnh riêng */}
                {imageAnalysisMode === 'separate' && (
                    <div className="flex-shrink-0 w-24 h-24 bg-primary rounded-lg border-2 border-dashed border-blue-400 flex items-center justify-center relative group">
                        {prompt.imageBase64 ? (
                            <>
                                <img src={prompt.imageBase64} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                                {!isRunning && !isAnalyzing && (
                                    <button
                                        onClick={() => onClearImage(prompt.id)}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        title="Xóa ảnh"
                                    >
                                        <IconX className="h-4 w-4" />
                                    </button>
                                )}
                            </>
                        ) : (
                            <UploadCloud className="h-6 w-6 text-blue-400" />
                        )}
                        {!isRunning && !isAnalyzing && (
                            <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};


// === COMPONENT CHÍNH: CreateVideoFromImageView ===

// Helper component for image upload boxes in the toolbar
const ImageUploadBox: React.FC<{
    label: string;
    preview: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClear: () => void;
    disabled?: boolean;
}> = ({ label, preview, onChange, onClear, disabled }) => (
    <div className="flex flex-col items-center flex-shrink-0">
        <label className="block text-xs font-medium text-dark-text mb-1">{label}</label>
        <div className="w-20 h-20 bg-primary rounded-lg border-2 border-dashed border-blue-400 flex items-center justify-center relative group">
            {preview ? (
                <>
                    <img src={preview} alt={label} className="w-full h-full object-cover rounded-lg" />
                    {!disabled && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onClear(); }}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            title={`Xóa ${label}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </>
            ) : (
                <div className="text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                </div>
            )}
            {!disabled && (
                <input type="file" accept="image/*" onChange={onChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            )}
        </div>
    </div>
);


interface CreateVideoFromImageViewProps {
    setActiveView: (view: AppView) => void;
}

// Định nghĩa kiểu cho một ô ảnh
interface ImageSlot {
  id: string;
  file: File | null;
  preview: string;
}

const CreateVideoFromImageView: React.FC<CreateVideoFromImageViewProps> = ({ setActiveView }) => {
    const { stories, prompts: allPrompts, addVideo, autoSaveConfig, setAutoSaveConfig, currentUser, refreshCurrentUser } = useAppContext();
    const { showToast } = useToast();

    const [localAutomationState, setLocalAutomationState] = useLocalStorage<AutomationState>('veo-suite-image-automation-state', {
        prompts: [],
        isRunning: false,
        overallProgress: 0,
        statusMessage: 'Sẵn sàng.',
        model: 'veo_3_1_t2v',
        aspectRatio: 'LANDSCAPE',
        concurrentStreams: 4,
        imageAnalysisMode: 'shared', 
    });
    
    const [imageSlots, setImageSlots] = useState<ImageSlot[]>([
      { id: crypto.randomUUID(), file: null, preview: '' },
      { id: crypto.randomUUID(), file: null, preview: '' },
      { id: crypto.randomUUID(), file: null, preview: '' },
    ]);
    
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStatus, setAnalysisStatus] = useState(''); 
    
    const { prompts, isRunning, aspectRatio, concurrentStreams, imageAnalysisMode } = localAutomationState;
    const currentAnalysisMode = imageAnalysisMode || 'shared'; 

    const setPrompts = (updater: React.SetStateAction<AutomationPrompt[]>) => {
        setLocalAutomationState((prev: AutomationState) => ({ ...prev, prompts: typeof updater === 'function' ? updater(prev.prompts) : updater }));
    };

    useEffect(() => {
        // ... (Logic onBrowserLog không thay đổi)
        const unsubscribeLog = window.electronAPI.onBrowserLog((log) => {
            let videoAddedToHistory = false;
            setLocalAutomationState((prev: AutomationState) => {
                const promptExistsInView = prev.prompts.some((p: AutomationPrompt) => p.id === log.promptId);
                if (!promptExistsInView && log.promptId) return prev;

                const newPrompts = prev.prompts.map((p: AutomationPrompt) => {
                    if (p.id === log.promptId) {
                        const newStatus = log.status as AutomationStatus || p.status;
                        const updates: Partial<AutomationPrompt> = {
                            status: newStatus, message: log.message, videoUrl: log.videoUrl || p.videoUrl,
                        };
                        if (newStatus === 'success' && log.videoUrl && !p.videoUrl) {
                            addVideo({ id: `${p.id}-${Date.now()}`, promptId: p.id, promptText: p.text, status: 'completed', videoUrl: log.videoUrl });
                            videoAddedToHistory = true;
                        }
                        return { ...p, ...updates };
                    }
                    return p;
                });
                const isStillRunning = newPrompts.some((p: AutomationPrompt) => ['queued', 'running', 'submitting', 'processing'].includes(p.status));
                if (!isStillRunning && (log.message.includes("Đã xử lý tất cả") || log.message.includes("dừng bởi người dùng"))) {
                    return { ...prev, prompts: newPrompts, isRunning: false };
                }
                return { ...prev, prompts: newPrompts, isRunning: isStillRunning };
            });
            if (videoAddedToHistory) {
                showToast('Video mới đã được thêm vào Lịch sử!', 'info');
            }
        });

        return () => unsubscribeLog();
    }, [addVideo, showToast, setLocalAutomationState]);

    const { successCount, errorCount, processedCount, totalCount, statusMessage } = useMemo(() => {
        // ... (Logic không thay đổi)
        const total = prompts.length;
        if (total === 0) return { successCount: 0, errorCount: 0, processedCount: 0, totalCount: 0, statusMessage: "Sẵn sàng." };
        const success = prompts.filter((p: AutomationPrompt) => p.status === 'success').length;
        const error = prompts.filter((p: AutomationPrompt) => p.status === 'error').length;
        const finished = success + error;
        let message = `Đã xử lý ${finished}/${total}...`;
        if (isRunning) message = `Đang xử lý ${finished}/${total}...`;
        else if (finished === total && total > 0) message = "Hoàn thành!";
        else if (finished > 0) message = "Đã dừng.";
        return { successCount: success, errorCount: error, processedCount: finished, totalCount: total, statusMessage: message };
    }, [prompts, isRunning]);

    const overallProgress = totalCount > 0 ? (processedCount / totalCount) * 100 : 0;

    const handleSharedImageChange = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
        // ... (Logic không thay đổi)
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const preview = reader.result as string;
                setImageSlots(currentSlots =>
                    currentSlots.map(slot =>
                        slot.id === id ? { ...slot, file, preview } : slot
                    )
                );
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const clearSharedImage = (id: string) => {
        // ... (Logic không thay đổi)
        setImageSlots(currentSlots =>
            currentSlots.map(slot =>
                slot.id === id ? { ...slot, file: null, preview: '' } : slot
            )
        );
    };

    const addImageSlot = () => {
        // ... (Logic không thay đổi)
        if (imageSlots.length < 6) {
            setImageSlots(current => [
                ...current,
                { id: crypto.randomUUID(), file: null, preview: '' }
            ]);
        }
    };
    
    const updatePromptImage = (id: string, file: File) => {
        // ... (Logic không thay đổi)
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setLocalAutomationState((prev: AutomationState) => ({
                ...prev,
                prompts: prev.prompts.map((p: AutomationPrompt) =>
                    p.id === id ? { ...p, imageBase64: base64 } : p
                )
            }));
        };
        reader.readAsDataURL(file);
    };
    
    const clearPromptImage = (id: string) => {
        // ... (Logic không thay đổi)
         setLocalAutomationState((prev: AutomationState) => ({
            ...prev,
            prompts: prev.prompts.map((p: AutomationPrompt) =>
                p.id === id ? { ...p, imageBase64: undefined } : p
            )
        }));
    };
    
    
    const handleSelectSaveDir = async () => {
        // ... (Logic không thay đổi)
        const path = await window.electronAPI.selectDownloadDirectory();
        if (path) setAutoSaveConfig({ ...autoSaveConfig, path });
    };

    const checkSubscription = async (): Promise<boolean> => {
        // ... (Logic không thay đổi)
        await refreshCurrentUser();
        await new Promise(resolve => setTimeout(resolve, 100));
        const updatedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!updatedUser || !updatedUser.subscription || new Date(updatedUser.subscription.end_date) < new Date()) {
            showToast('Gói của bạn đã hết hạn hoặc không hợp lệ. Vui lòng nâng cấp.', 'error');
            setActiveView(AppView.PACKAGES);
            return false;
        }
        return true;
    };

    const runPromptsWithAnalysis = async (promptsToRun: AutomationPrompt[]) => {
        // ... (Logic không thay đổi)
        if (!await checkSubscription()) return;
        if (promptsToRun.length === 0) { 
            showToast('Không có prompt nào được chọn để chạy.', 'info'); 
            return; 
        }

        setIsAnalyzing(true);
        setLocalAutomationState((prev: AutomationState) => ({ ...prev, isRunning: true }));

        let promptsToSendToMain: AutomationPrompt[] = [];
        let runIds = new Set(promptsToRun.map(p => p.id));

        try {
            if (currentAnalysisMode === 'shared') {
                const imagesToAnalyze = imageSlots.filter(slot => slot.file);
                if (imagesToAnalyze.length === 0) {
                    showToast('Chế độ "Dùng chung" yêu cầu ít nhất một ảnh ở thanh công cụ.', 'error');
                    throw new Error('Không có ảnh chung');
                }
                
                let allSheets: string[] = [];
                for (let i = 0; i < imagesToAnalyze.length; i++) {
                    const slot = imagesToAnalyze[i];
                    setAnalysisStatus(`Đang phân tích ảnh chung ${i + 1}/${imagesToAnalyze.length}...`);
                    const part = await fileToGenerativePart(slot.file!);
                    const response = await createCharacterSheetFromImages([part], "Phân tích ảnh này.");
                    const sheet = JSON.parse(response.text ?? '{}').description;
                    if (sheet) {
                        allSheets.push(sheet);
                    }
                }
                
                const combinedSheet = allSheets.join('. ');
                if (!combinedSheet) throw new Error("Phân tích ảnh chung thất bại.");
                
                showToast('Phân tích ảnh chung thành công!', 'success');

                promptsToSendToMain = prompts.map((p, index) =>
                    runIds.has(p.id)
                        ? { ...p, text: `${combinedSheet}. ${p.text}`, status: 'queued' as AutomationStatus, message: 'Đang chờ...', originalIndex: index }
                        : p
                ).filter(p => runIds.has(p.id));

            } else {
                let validPromptsToRun = promptsToRun.filter(p => p.imageBase64);
                if (validPromptsToRun.length === 0) {
                     showToast('Chế độ "Dùng riêng" yêu cầu các prompt phải có ảnh tải lên.', 'error');
                     throw new Error('Không có ảnh riêng');
                }
                
                let processedPrompts: AutomationPrompt[] = [];

                for (let i = 0; i < validPromptsToRun.length; i++) {
                    const prompt = validPromptsToRun[i];
                    setAnalysisStatus(`Đang phân tích ảnh riêng ${i + 1}/${validPromptsToRun.length}...`);
                    
                    const base64Data = prompt.imageBase64!;
                    const data = base64Data.split(',')[1];
                    const mimeType = base64Data.match(/data:(.*);base64,/)?.[1];
                    
                    if (!data || !mimeType) {
                        showToast(`Ảnh cho prompt #${i+1} bị lỗi. Bỏ qua.`, 'error');
                        continue;
                    }
                    
                    const part: Part = { inlineData: { data, mimeType } };
                    const response = await createCharacterSheetFromImages([part], "Phân tích ảnh này.");
                    const sheet = JSON.parse(response.text ?? '{}').description;
                    
                    if (sheet) {
                        processedPrompts.push({
                            ...prompt,
                            text: `${sheet}. ${prompt.text}`, 
                            status: 'queued', // <-- SỬA LỖI: Đảm bảo kiểu là AutomationStatus
                            message: 'Đang chờ...',
                            originalIndex: prompts.findIndex(p => p.id === prompt.id) 
                        });
                    }
                }
                
                showToast('Phân tích ảnh riêng thành công!', 'success');
                promptsToSendToMain = processedPrompts;
            }
            
            setLocalAutomationState((prev: AutomationState) => ({
                ...prev,
                prompts: prev.prompts.map(p => {
                    const processed = promptsToSendToMain.find(ptsm => ptsm.id === p.id);
                    return processed ? processed : p;
                })
            }));

            if (promptsToSendToMain.length > 0) {
                window.electronAPI.startBrowserAutomation({
                    prompts: promptsToSendToMain,
                    authToken: currentUser!.token,
                    model: aspectRatio === 'PORTRAIT' ? 'veo_3_0_t2v_fast_portrait_ultra' : localAutomationState.model,
                    aspectRatio, autoSaveConfig, currentUser, concurrentStreams
                });
            } else {
                throw new Error("Không có prompt nào hợp lệ để chạy sau khi phân tích.");
            }

        } catch (error: any) {
            showToast(`Lỗi phân tích: ${error.message}`, 'error');
            setLocalAutomationState((prev: AutomationState) => ({ ...prev, isRunning: false, statusMessage: 'Lỗi phân tích ảnh.' }));
        } finally {
            setIsAnalyzing(false);
            setAnalysisStatus('');
        }
    };
    
    // ... (Các hàm handler còn lại)
    const handleRunAll = () => runPromptsWithAnalysis(prompts);
    const handleRunUnfinished = () => runPromptsWithAnalysis(prompts.filter((p: AutomationPrompt) => p.status !== 'success'));
    const handleRetryFailed = () => runPromptsWithAnalysis(prompts.filter((p: AutomationPrompt) => p.status === 'error'));
    const handleRunSinglePrompt = (promptId: string) => {
        const promptToRun = prompts.find((p: AutomationPrompt) => p.id === promptId);
        if (promptToRun) runPromptsWithAnalysis([promptToRun]);
    };
    const handleStop = () => {
        window.electronAPI.stopBrowserAutomation();
        setLocalAutomationState((prev: AutomationState) => ({ ...prev, isRunning: false }));
    };
    const addPromptField = () => setLocalAutomationState((prev: AutomationState) => ({ ...prev, prompts: [...prev.prompts, { id: `prompt-${Date.now()}`, text: '', status: 'idle', message: 'Sẵn sàng' }] }));
    const updatePromptText = (id: string, text: string) => setLocalAutomationState((prev: AutomationState) => ({ ...prev, prompts: prev.prompts.map((p: AutomationPrompt) => p.id === id ? { ...p, text } : p) }));
    const removePrompt = (id: string) => setLocalAutomationState((prev: AutomationState) => ({ ...prev, prompts: prev.prompts.filter((p: AutomationPrompt) => p.id !== id) }));
    const handleClearAllPrompts = () => {
        if (window.confirm('Xóa tất cả prompts?')) {
            setLocalAutomationState((prev: AutomationState) => ({...prev, prompts: []}));
        }
    };
    const handleImportFromFile = async () => {
        if (isRunning) return;
        const result = await window.electronAPI.importPromptsFromFile();
        if (result.success && result.prompts) {
            const newPrompts: AutomationPrompt[] = result.prompts.map((text: string) => ({
                id: `prompt-${Date.now()}-${Math.random()}`, text, status: 'idle', message: 'Sẵn sàng'
            }));
            setPrompts((prev: AutomationPrompt[]) => [...prev, ...newPrompts]);
            showToast(`Đã nhập ${newPrompts.length} prompt.`, 'success');
        } else if (result.error && result.error !== 'No file selected') {
            showToast(`Lỗi: ${result.error}`, 'error');
        }
    };
    const handleDownload = (videoUrl: string | undefined, promptText: string) => {
        if (videoUrl) window.electronAPI.downloadVideo({ url: videoUrl, promptText, savePath: null, promptIndex: 0 });
    };

    return (
        <div className="animate-fade-in h-full flex flex-col">
            <h1 className="text-3xl font-bold text-light mb-2">Tạo video từ ảnh (Beta)</h1>
            <p className="text-dark-text mb-4">Tải lên tối đa 6 ảnh nhân vật, phong cách. AI sẽ phân tích tất cả ảnh để tạo video.</p>

            <div className="bg-secondary p-3 rounded-lg shadow-md mb-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                
                    {/* Công tắc Dùng chung / Dùng riêng */}
                    <div className="flex flex-col">
                        <label className="block text-xs font-medium text-dark-text mb-1">Chế độ ảnh</label>
                        <div className="flex items-center gap-2 bg-primary p-1 rounded-lg">
                            <button 
                                onClick={() => setLocalAutomationState(p => ({...p, imageAnalysisMode: 'shared'}))}
                                disabled={isRunning || isAnalyzing}
                                className={`px-3 py-1 text-xs rounded-md ${currentAnalysisMode === 'shared' ? 'bg-accent text-white font-bold' : 'text-dark-text hover:bg-hover-bg'}`}
                            >
                                Dùng chung
                            </button>
                            <button 
                                onClick={() => setLocalAutomationState(p => ({...p, imageAnalysisMode: 'separate'}))}
                                disabled={isRunning || isAnalyzing}
                                className={`px-3 py-1 text-xs rounded-md ${currentAnalysisMode === 'separate' ? 'bg-accent text-white font-bold' : 'text-dark-text hover:bg-hover-bg'}`}
                            >
                                Dùng riêng
                            </button>
                        </div>
                    </div>
                
                    {/* Hiển thị các ô ảnh CHUNG (nếu ở chế độ 'shared') */}
                    {currentAnalysisMode === 'shared' && (
                        <div className="flex items-end gap-x-3">
                            {imageSlots.map((slot, index) => (
                                <ImageUploadBox
                                    key={slot.id}
                                    label={`Ảnh ${index + 1}`}
                                    preview={slot.preview}
                                    onChange={(e) => handleSharedImageChange(e, slot.id)}
                                    onClear={() => clearSharedImage(slot.id)}
                                    disabled={isRunning || isAnalyzing}
                                />
                            ))}
                            {imageSlots.length < 6 && (
                                <div className="flex flex-col items-center flex-shrink-0 self-end">
                                    <label className="block text-xs font-medium text-dark-text mb-1 opacity-0">Thêm</label> {/* Spacer */}
                                    <button 
                                        onClick={addImageSlot}
                                        className="w-20 h-20 bg-primary rounded-lg border-2 border-dashed border-blue-400 flex items-center justify-center text-blue-400 hover:bg-hover-bg disabled:opacity-50"
                                        disabled={isRunning || isAnalyzing || imageSlots.length >= 6}
                                        title="Thêm ô ảnh (tối đa 6)"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="h-6 border-l border-border-color mx-2"></div>
                    <div className="flex items-end gap-x-3 flex-wrap">
                         <div>
                            <label className="block text-xs font-medium text-dark-text mb-1">Tỷ lệ</label>
                            {/* SỬA LỖI: e.targe.value -> e.target.value */}
                            <select value={aspectRatio} onChange={e => setLocalAutomationState((prev: AutomationState) => ({...prev, aspectRatio: e.target.value as any}))} className="w-full p-2 text-xs bg-primary rounded-md border border-border-color h-[34px]">
                                <option value="LANDSCAPE">16:9 Ngang</option>
                                <option value="PORTRAIT">9:16 Dọc</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-dark-text mb-1">Luồng (4-8)</label>
                            <input type="number" value={concurrentStreams} onChange={e => setLocalAutomationState((prev: AutomationState) => ({...prev, concurrentStreams: Math.max(4, Math.min(8, parseInt(e.target.value) || 4))}))} min="4" max="8" className="w-20 p-2 text-xs bg-primary rounded-md border border-border-color h-[34px]" />
                        </div>
                         <select onChange={(e) => {
                                const storyId = e.target.value; if (!storyId) return;
                                const relatedPrompts = allPrompts.filter(p => p.storyId === storyId);
                                setPrompts(relatedPrompts.map(p => ({ id: `prompt-${Date.now()}-${Math.random()}`, text: p.prompt, status: 'idle', message: 'Sẵn sàng' })));
                            }} className="w-full max-w-[160px] p-2 text-xs bg-primary rounded-md border border-border-color h-[34px]"
                        >
                            <option value="">-- Tải prompt từ Story --</option>
                            {stories.map((s: Story) => <option key={s.id} value={s.id}>{s.title}</option>)}
                        </select>
                        <button onClick={handleImportFromFile} disabled={isRunning || isAnalyzing} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-lg disabled:bg-gray-400 flex items-center gap-1 text-xs h-[34px]">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                           Nhập từ TXT
                        </button>
                    </div>
                     <div className="flex flex-col">
                        <label htmlFor="auto-save-toggle" className="flex items-center cursor-pointer mb-1">
                            <div className="relative">
                                <input type="checkbox" id="auto-save-toggle" className="sr-only peer" checked={autoSaveConfig.enabled} onChange={() => setAutoSaveConfig(prev => ({...prev, enabled: !prev.enabled }))} disabled={isRunning}/>
                                {/* (CẬP NHẬT) Chuẩn hóa style công tắc */}
                                <div className="block bg-gray-400 w-10 h-6 rounded-full peer-checked:bg-green-500 transition peer-disabled:opacity-50"></div>
                                <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-full peer-disabled:opacity-50"></div>
                            </div>
                            <span className="ml-2 text-dark-text text-xs font-medium">Tự động lưu</span>
                        </label>
                        <div className="flex items-center">
                            <p className="bg-primary border border-r-0 border-border-color text-dark-text text-xs rounded-l-md h-[34px] flex items-center px-2 w-32 truncate" title={autoSaveConfig.path || 'Chưa chọn thư mục'}>{autoSaveConfig.path || 'Chưa chọn...'}</p>
                            <button onClick={handleSelectSaveDir} disabled={!autoSaveConfig.enabled || isRunning} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-2 rounded-r-md text-xs h-[34px] disabled:opacity-50">Đổi</button>
                        </div>
                    </div>

                    
                    <div className="flex-grow"></div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                        {isRunning || isAnalyzing ? (
                            <button onClick={handleStop} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-xs h-[34px]">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg>
                                Dừng
                            </button>
                        ) : (
                             <div className="flex items-center gap-2">
                                <button onClick={handleRunAll} disabled={prompts.length === 0 || isAnalyzing} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-lg disabled:bg-gray-400 flex items-center justify-center gap-2 text-xs h-[34px]">
                                   {isAnalyzing ? <Spinner className="w-4 h-4" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>}
                                   Chạy tất cả
                                </button>
                                {prompts.some(p => p.status !== 'success' && p.status !== 'idle') && (
                                <button onClick={handleRunUnfinished} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-xs h-[34px]">
                                   Chạy lại Prompt chưa hoàn thành
                                </button>
                                )}
                             </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Progress Bar & Bulk Actions */}
             <div className="mb-3 bg-secondary p-2 rounded-lg shadow-inner">
                 <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-3">
                         <button onClick={handleClearAllPrompts} disabled={isRunning || isAnalyzing || prompts.length === 0} className="text-red-500 hover:text-red-700 font-bold py-1 px-2 rounded-md disabled:opacity-50 flex items-center gap-1 text-xs">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                           Xóa tất cả
                        </button>
                        
                        {/* Trạng thái Phân tích ảnh */}
                        {isAnalyzing && (
                            <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold animate-pulse">
                                <Spinner className="w-4 h-4" /> 
                                <span>{analysisStatus || 'Đang Phân tích ảnh ...'}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                        <span className="font-semibold text-light">{statusMessage}</span>
                        <span className="font-bold text-blue-600">Tổng: {totalCount}</span>
                        <span className="font-semibold text-green-600">Thành công: {successCount}</span>
                        <span className="font-semibold text-red-600">Thất bại: {errorCount}</span>
                        <span className="font-semibold text-accent">{Math.round(overallProgress)}%</span>
                    </div>
                </div>
                <div className="w-full bg-primary rounded-full h-1.5"><div className="bg-accent h-1.5 rounded-full" style={{ width: `${overallProgress}%` }}></div></div>
            </div>

            {/* Prompts Grid */}
             <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                 <div className="mb-2">
                    <button onClick={addPromptField} disabled={isRunning || isAnalyzing} className="bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-bold py-2 px-4 rounded-lg border border-blue-200 disabled:opacity-50">
                        + Thêm Prompt
                    </button>
                </div>
                {prompts.length === 0 && <p className="text-dark-text text-center py-8">Thêm prompt để bắt đầu.</p>}
                
                {/* Dùng PromptCard */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {prompts.map((prompt: AutomationPrompt, index: number) => (
                        <PromptCard
                            key={prompt.id}
                            prompt={prompt}
                            index={index}
                            imageAnalysisMode={currentAnalysisMode}
                            isRunning={isRunning}
                            isAnalyzing={isAnalyzing}
                            onUpdateText={updatePromptText}
                            onUpdateImage={updatePromptImage}
                            onClearImage={clearPromptImage}
                            onRunSingle={handleRunSinglePrompt}
                            onRemove={removePrompt}
                            onDownload={handleDownload}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CreateVideoFromImageView;