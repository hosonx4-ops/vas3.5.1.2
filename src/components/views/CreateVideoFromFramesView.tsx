// src/components/views/CreateVideoFromFramesView.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAppContext, useLocalStorage } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import Spinner from '../common/Spinner';
// Cập nhật import
import { fileToGenerativePart, createCharacterSheetFromImages, Part } from '../../services/geminiService';
import { AutomationPrompt, AutomationState, AppView, AutomationStatus, Story } from '../../types';
import { useTranslation } from 'react-i18next';
// Thêm icons
import { BookOpen, Images, RefreshCw, UploadCloud, X as IconX, Folder, Play, StopCircle, Plus, Trash2, RotateCcw, Columns, LayoutGrid } from 'lucide-react';

// === HÀM HELPER ĐỂ CẮT ẢNH ===
const cropImage = (imageBase64: string, targetAspectRatio: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Không thể tạo canvas context'));

            const inputWidth = img.width;
            const inputHeight = img.height;
            const inputAspectRatio = inputWidth / inputHeight;

            let sx = 0, sy = 0, sWidth = inputWidth, sHeight = inputHeight;

            if (inputAspectRatio > targetAspectRatio) {
                sWidth = inputHeight * targetAspectRatio;
                sx = (inputWidth - sWidth) / 2;
            } else if (inputAspectRatio < targetAspectRatio) {
                sHeight = inputWidth / targetAspectRatio;
                sy = (inputHeight - sHeight) / 2;
            }

            canvas.width = sWidth;
            canvas.height = sHeight;

            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

            // Giảm chất lượng nhẹ để giảm kích thước base64
            const croppedBase64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
            resolve(croppedBase64);
        };
        img.onerror = (err) => reject(new Error(`Không thể tải ảnh để cắt: ${err.toString()}`));
        // Đảm bảo prefix đúng trước khi gán vào src
        const prefix = imageBase64.startsWith('data:') ? '' : 'data:image/jpeg;base64,';
        img.src = `${prefix}${imageBase64}`;
    });
};


// Hàm helper chuyển File sang Base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Lấy phần base64 sau dấu phẩy
            const base64Data = result.substring(result.indexOf(',') + 1);
            if (!base64Data) {
                reject(new Error("Không thể chuyển đổi file sang base64."));
            } else {
                resolve(base64Data);
            }
        };
        reader.onerror = error => reject(error);
    });
};

// Component Hộp Tải Ảnh
const FrameUploadBox: React.FC<{
    label: string;
    preview: string;
    onClear: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    borderColorClass: string;
    disabled?: boolean;
}> = ({ label, preview, onClear, onChange, borderColorClass, disabled }) => (
    <div className="flex flex-col items-center min-w-0">
        <label className="block text-xs font-medium text-dark-text mb-1 truncate">{label}</label>
        <div className={`w-full aspect-square max-w-24 bg-primary rounded-lg border-2 border-dashed ${borderColorClass} flex items-center justify-center relative group`}>
            {preview ? (
                <>
                    <img src={preview} alt={label} className="w-full h-full object-cover rounded-lg" />
                    {!disabled && (
                        <button
                            onClick={onClear}
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
                <div className="text-gray-400">
                    <UploadCloud className="h-6 w-6 mx-auto" />
                </div>
            )}
            {!disabled && (
                <input type="file" accept="image/jpeg,image/png" onChange={onChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            )}
        </div>
    </div>
);


interface CreateVideoFromFramesViewProps {
    setActiveView: (view: AppView) => void;
}

interface PreviewState {
    [promptId: string]: {
        startImagePreview?: string;
        endImagePreview?: string;
    }
}

const CreateVideoFromFramesView: React.FC<CreateVideoFromFramesViewProps> = ({ setActiveView }) => {
    const {
        addVideo,
        autoSaveConfig,
        setAutoSaveConfig,
        currentUser,
        refreshCurrentUser,
        stories,
        prompts: allPrompts, // allPrompts từ context gốc
        setAutomationState // Dùng cho import
    } = useAppContext();

    const { showToast } = useToast();
    const { t } = useTranslation();

    const [localAutomationState, setLocalAutomationState] = useLocalStorage<AutomationState>('veo-suite-frame-automation-state', {
        prompts: [],
        isRunning: false,
        overallProgress: 0,
        statusMessage: 'Sẵn sàng.',
        model: 'veo_3_1_i2v_s_fl', // Giả sử model mặc định
        aspectRatio: 'LANDSCAPE',
        concurrentStreams: 4,
    });

    const [previews, setPreviews] = useState<PreviewState>({});
    const [showEndImage, setShowEndImage] = useState(false);
    const [selectedPromptIds, setSelectedPromptIds] = useState<Set<string>>(new Set());
    const [gridColumns, setGridColumns] = useState(2);
    const [videosPerFolderInput, setVideosPerFolderInput] = useState(autoSaveConfig.videosPerFolder || 10);
    const multiImageInputRef = useRef<HTMLInputElement>(null);

    // Đảm bảo prompts luôn là array
    const prompts = useMemo(() => localAutomationState.prompts || [], [localAutomationState.prompts]);
    const { isRunning, aspectRatio, concurrentStreams } = localAutomationState;

    // --- Hàm setter ---
    const setPrompts = useCallback((updater: React.SetStateAction<AutomationPrompt[]>) => {
        setLocalAutomationState(prev => {
            const currentPrompts = prev.prompts || [];
            const newPrompts = typeof updater === 'function' ? updater(currentPrompts) : updater;
            return { ...prev, prompts: Array.isArray(newPrompts) ? newPrompts : [] };
        });
    }, [setLocalAutomationState]);

    const setAspectRatio = useCallback((newAspectRatio: 'LANDSCAPE' | 'PORTRAIT') => {
        setLocalAutomationState(current => ({ ...current, aspectRatio: newAspectRatio }));
    }, [setLocalAutomationState]);

    const setConcurrentStreams = useCallback((streams: number) => {
        setLocalAutomationState(current => ({ ...current, concurrentStreams: streams }));
    }, [setLocalAutomationState]);
    // --- Kết thúc Hàm setter ---


    const handleVideosPerFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        if (value > 0) {
            setVideosPerFolderInput(value);
            setAutoSaveConfig(prev => ({ ...prev, videosPerFolder: value }));
        } else if (e.target.value === '') {
            setVideosPerFolderInput(NaN); 
        }
    };

    useEffect(() => {
        setVideosPerFolderInput(autoSaveConfig.videosPerFolder || 10);
    }, [autoSaveConfig.videosPerFolder]);

    // Lắng nghe log
    useEffect(() => {
        const unsubscribeLog = window.electronAPI.onBrowserLog((log) => {
            setLocalAutomationState((prev: AutomationState) => {
                const currentPrompts = prev.prompts || []; 

                if (log.status === 'finished') {
                    const finishedPrompts = currentPrompts.map(p => {
                        if (p && ['queued', 'submitting', 'processing', 'running'].includes(p.status)) {
                            return { ...p, status: 'idle' as AutomationStatus, message: t('createVideoFromFrames.promptStopped') };
                        }
                        return p;
                    });
                    const baseState = prev || { prompts: [], isRunning: false, overallProgress: 0, statusMessage: '', model: 'veo_3_1_i2v_s_fl', aspectRatio: 'LANDSCAPE', concurrentStreams: 4 };
                    return { ...baseState, prompts: finishedPrompts, isRunning: false, statusMessage: log.message };
                }

                const promptExistsInView = currentPrompts.some((p: AutomationPrompt) => p && p.id === log.promptId); 
                if (!promptExistsInView && log.promptId) return prev || {}; 

                const newPrompts = currentPrompts.map((p: AutomationPrompt) => {
                    if (!p) return p; 
                    if (p.id === log.promptId) {
                        const newStatus = (log.status && log.status !== 'finished') ? (log.status as AutomationStatus) : p.status;

                        const updates: Partial<AutomationPrompt> = {
                            status: newStatus,
                            message: log.message,
                            videoUrl: log.videoUrl || p.videoUrl,
                            operationName: log.operationName || p.operationName,
                            mediaId: log.mediaId || p.mediaId,
                            projectId: log.projectId || p.projectId,
                            cookie: log.cookie || p.cookie,
                        };

                        if (newStatus === 'success' && log.videoUrl && !p.videoUrl) {
                            addVideo({
                                id: `${p.id}-${Date.now()}`,
                                promptId: p.id,
                                promptText: p.text,
                                status: 'success', 
                                videoUrl: log.videoUrl,
                                projectId: log.projectId,
                                mediaId: log.mediaId,
                                cookie: log.cookie,
                                aspectRatio: prev?.aspectRatio || 'LANDSCAPE' 
                            });
                        }
                        return { ...p, ...updates };
                    }
                    return p;
                });

                const isStillRunning = newPrompts.some((p: AutomationPrompt) => p && ['queued', 'running', 'submitting', 'processing'].includes(p.status)); 
                const baseState = prev || { prompts: [], isRunning: false, overallProgress: 0, statusMessage: '', model: 'veo_3_1_i2v_s_fl', aspectRatio: 'LANDSCAPE', concurrentStreams: 4 };
                return { ...baseState, prompts: newPrompts, isRunning: isStillRunning };
            });
        });

        const unsubscribeDownload = window.electronAPI.onDownloadComplete(({success, path, error}) => {
             if (success && path && path !== 'Skipped') { showToast(`Video đã lưu tại: ${path}`, 'success'); }
             else if (!success && error && error !== 'Download canceled') { showToast(`Lỗi tải video: ${error}`, 'error'); }
        });

        return () => {
            unsubscribeLog();
            unsubscribeDownload();
        };
    }, [addVideo, showToast, setLocalAutomationState, t]);


    // Tính toán thống kê
    const { successCount, errorCount, pendingCount, totalCount, statusMessage, completedPercentage } = useMemo(() => {
        const total = prompts.length; 
        if (total === 0) { return { successCount: 0, errorCount: 0, pendingCount: 0, totalCount: 0, statusMessage: t('createVideoFromFrames.promptReady'), completedPercentage: 0 }; }
        const success = prompts.filter(p => p && p.status === 'success').length; 
        const error = prompts.filter(p => p && p.status === 'error').length; 
        const pending = prompts.filter(p => p && (p.status === 'idle' || p.status === 'queued')).length; 
        const finished = success + error;
        let message = `${t('createVideoFromFrames.pending')}: ${pending}/${total}...`;
        if (isRunning) { message = `Đang xử lý ${finished}/${total}...`; }
        else if (finished > 0 && finished < total && total > 0) { message = t('createVideoFromFrames.promptStopped'); }
        else if (finished === total && total > 0) { message = t('createVideoFromFrames.success') + "!"; }
        const percentage = total > 0 ? (success / total) * 100 : 0;
        return { successCount: success, errorCount: error, pendingCount: pending, totalCount: total, statusMessage: message, completedPercentage: percentage };
    }, [prompts, isRunning, t]); 

    // Hàm xử lý ảnh mới
    const handleImageChange = useCallback(async (
        e: React.ChangeEvent<HTMLInputElement>,
        setPreview: React.Dispatch<React.SetStateAction<string>>, 
        setBase64: React.Dispatch<React.SetStateAction<string>>, 
        promptId?: string, 
        type?: 'start' | 'end' 
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        let previewUrl = '';
        try {
            previewUrl = URL.createObjectURL(file);

            if (promptId && type) {
                const previewKey = type === 'start' ? 'startImagePreview' : 'endImagePreview';
                setPreviews(prev => ({ ...prev, [promptId]: { ...prev[promptId], [previewKey]: previewUrl } }));
            } else {
                 setPreview(previewUrl); 
            }

            const originalBase64 = await fileToBase64(file);

            if (promptId && type) {
                const keyToUpdate = type === 'start' ? 'startImageBase64' : 'endImageBase64';
                setLocalAutomationState((prev: AutomationState) => ({
                    ...prev,
                    prompts: (prev.prompts || []).map((p: AutomationPrompt) =>
                        p.id === promptId ? { ...p, [keyToUpdate]: originalBase64 } : p
                    )
                }));
            } else {
                 setBase64(originalBase64); 
            }
         } catch (error) {
            console.error("Lỗi đọc file ảnh:", error);
            showToast('Không thể đọc file ảnh.', 'error');
            if (promptId && type) {
                const previewKey = type === 'start' ? 'startImagePreview' : 'endImagePreview';
                setPreviews(prev => ({ ...prev, [promptId]: { ...prev[promptId], [previewKey]: undefined } }));
            } else {
                setPreview('');
            }
             if (previewUrl) {
                 URL.revokeObjectURL(previewUrl);
             }
         } finally {
            if (e.target) {
                e.target.value = '';
            }
         }
    }, [showToast, setLocalAutomationState]); 


    const handleLocalImageChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        promptId: string,
        type: 'start' | 'end'
    ) => {
        handleImageChange(e, () => {}, () => {}, promptId, type);
    };

    const clearLocalImage = (e: React.MouseEvent<HTMLButtonElement>, promptId: string, type: 'start' | 'end') => {
        e.stopPropagation(); 
        const keyToUpdate = type === 'start' ? 'startImageBase64' : 'endImageBase64';
        const previewKey = type === 'start' ? 'startImagePreview' : 'endImagePreview';

        setLocalAutomationState((prev: AutomationState) => ({
            ...prev,
            prompts: (prev.prompts || []).map((p: AutomationPrompt) =>
                p.id === promptId ? { ...p, [keyToUpdate]: undefined } : p
            )
        }));

        setPreviews(prev => {
            const newPromptPreviews = { ...prev[promptId] };
            delete newPromptPreviews[previewKey];
            if (Object.keys(newPromptPreviews).length === 0) {
                 const newState = { ...prev };
                 delete newState[promptId];
                 return newState;
            }
            return { ...prev, [promptId]: newPromptPreviews };
        });
    };


    const handleSelectSaveDir = async () => {
        const path = await window.electronAPI.selectDownloadDirectory();
        if (path) {
            setAutoSaveConfig(prev => ({ ...prev, path }));
            showToast(`Thư mục lưu: ${path}`, 'success');
        }
    };

     const checkSubscription = async (): Promise<boolean> => {
        try {
            await refreshCurrentUser(); 
            await new Promise(resolve => setTimeout(resolve, 150)); 
            const updatedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

            if (!updatedUser || !updatedUser.subscription || !updatedUser.subscription.end_date || new Date(updatedUser.subscription.end_date) < new Date()) {
                const message = !updatedUser || !updatedUser.subscription ? 'Bạn cần nâng cấp gói.' : 'Gói đăng ký đã hết hạn.';
                showToast(message, 'error');
                setActiveView(AppView.PACKAGES);
                return false;
            }
            return true;
         } catch (error) {
            console.error("Lỗi khi kiểm tra subscription:", error);
             const errorMessage = error instanceof Error ? error.message : String(error);
            showToast(`Không thể kiểm tra trạng thái gói (${errorMessage}). Vui lòng thử lại.`, 'error');
            return false;
         }
    };


    // --- Xử lý Chạy Prompts ---
    const runPrompts = async (promptsToRunInput: AutomationPrompt[]) => {
        if (!await checkSubscription()) return;

        const currentGlobalPrompts = localAutomationState.prompts || [];
        const promptIdsToRun = new Set(promptsToRunInput.map(p => p.id));
        const promptsToRun = currentGlobalPrompts.filter(p => p && promptIdsToRun.has(p.id));

        if (promptsToRun.length === 0) {
            showToast('Không có prompt nào hợp lệ được chọn để chạy.', 'info');
            return;
        }

        setLocalAutomationState(prev => ({ ...prev, isRunning: true }));

        const targetAspectRatio = aspectRatio === 'LANDSCAPE' ? (16 / 9) : (9 / 16);
        let finalPromptsForPayload: AutomationPrompt[] = [];
        let promptsToUpdateInState: AutomationPrompt[] = []; 
        let errorEncountered = false; 

        // --- BƯỚC 1: Kiểm tra và Crop ảnh ---
        try {
            for (const p of promptsToRun) {
                if (!p.startImageBase64) {
                    errorEncountered = true;
                    setPrompts(prev => (prev || []).map(item => item.id === p.id ? {...item, status: 'error', message: 'Thiếu ảnh bắt đầu'} : item));
                }
                if (!p.text || typeof p.text !== 'string' || p.text.trim() === '') {
                    errorEncountered = true;
                    setPrompts(prev => (prev || []).map(item => item.id === p.id ? {...item, status: 'error', message: 'Prompt trống'} : item));
                }
            }
            if (errorEncountered) {
                throw new Error('Một số prompt đã chọn thiếu ảnh bắt đầu hoặc prompt trống. Vui lòng kiểm tra lại.');
            }

            for (const p of promptsToRun) {
                try {
                    setPrompts(prev => (prev || []).map(item => item.id === p.id ? {...item, status: 'processing', message: 'Đang xử lý ảnh...'} : item));

                    const startPromise = p.startImageBase64 ? cropImage(p.startImageBase64, targetAspectRatio) : Promise.resolve(undefined);
                    const endPromise = (showEndImage && p.endImageBase64) ? cropImage(p.endImageBase64, targetAspectRatio) : Promise.resolve(undefined);

                    const [croppedStart, croppedEnd] = await Promise.all([startPromise, endPromise]);

                    const finalPrompt: Partial<AutomationPrompt> = {
                        ...p,
                        status: 'queued', 
                        message: t('createVideoFromFrames.promptWaiting'),
                        startImageBase64: croppedStart, 
                        endImageBase64: croppedEnd,   
                    };

                    finalPromptsForPayload.push(finalPrompt as AutomationPrompt);

                    promptsToUpdateInState.push({
                        ...p,
                        status: 'queued',
                        message: t('createVideoFromFrames.promptWaiting')
                    });

                } catch (cropError: any) {
                    console.error(`Lỗi crop ảnh cho prompt ${p.id}:`, cropError);
                    setPrompts(prev => (prev || []).map(item => item.id === p.id ? {...item, status: 'error', message: 'Lỗi xử lý ảnh'} : item));
                    throw new Error(`Lỗi khi xử lý ảnh cho Prompt ID ${p.id}: ${cropError.message}`);
                }
            }

        } catch (error: any) {
            console.error("Lỗi trong quá trình chuẩn bị chạy prompts:", error);
            showToast(error.message, 'error');
            setLocalAutomationState(prev => ({ ...prev, isRunning: false })); 
            return; 
        }

        // --- BƯỚC 2: Cập nhật UI và Gửi yêu cầu ---

        const runIdsToUpdate = new Set(promptsToUpdateInState.map(p => p.id));
        setPrompts((prevPrompts: AutomationPrompt[]) => (prevPrompts || []).map(p => {
             if (p && runIdsToUpdate.has(p.id)) {
                 const updateData = promptsToUpdateInState.find(u => u.id === p.id);
                 return { ...p, status: updateData?.status || 'queued', message: updateData?.message || '' };
             }
             return p;
        }));


        if (!currentUser || !currentUser.token) {
             showToast('Lỗi xác thực người dùng. Vui lòng đăng nhập lại.', 'error');
             setLocalAutomationState(prev => ({ ...prev, isRunning: false }));
             return;
        }

        // *** SỬA LỖI GỬI INDEX: Gán originalIndex trước khi gửi ***
        const promptsWithOriginalIndex = finalPromptsForPayload.map(p => ({
            ...p,
            // Lấy index từ state `prompts` GỐC (trong localAutomationState)
            originalIndex: localAutomationState.prompts.findIndex(op => op.id === p.id)
        }));

        window.electronAPI.videoCreateFromFrames({
            prompts: promptsWithOriginalIndex, // <-- SỬ DỤNG LIST ĐÃ CÓ INDEX
            authToken: currentUser.token,
            aspectRatio,
            autoSaveConfig, // Gửi config hiện tại
            currentUser,
            concurrentStreams
        });
    };
     // --- Kết thúc Xử lý Chạy Prompts ---

    // Handlers
    const handleRunAll = () => runPrompts(prompts); 
    const handleRunUnfinished = () => runPrompts(prompts.filter(p => p && p.status !== 'success'));
    const handleRetryFailed = () => runPrompts(prompts.filter(p => p && p.status === 'error'));
    const handleRunSinglePrompt = (promptId: string) => {
        const promptToRun = prompts.find(p => p && p.id === promptId); 
        if (promptToRun) runPrompts([promptToRun]);
         else { showToast('Không tìm thấy prompt để chạy.', 'error'); }
    };
    const handleRunSelected = () => {
        const selectedPrompts = prompts.filter(p => p && selectedPromptIds.has(p.id)); 
        if (selectedPrompts.length > 0) runPrompts(selectedPrompts);
        else showToast('Không có prompt nào được chọn.', 'info');
    };

    const handleStop = () => {
        window.electronAPI.stopBrowserAutomation();
        setLocalAutomationState(prev => ({ ...prev, isRunning: false }));
    };

    const addPromptField = () => setPrompts(prev => [...(prev || []), { id: `prompt-${Date.now()}-${Math.random()}`, text: '', status: 'idle', message: t('createVideoFromFrames.promptReady') }]);
    const updatePromptText = (id: string, text: string) => setPrompts(prev => (prev || []).map(p => p.id === id ? { ...p, text } : p));
    const removePrompt = (id: string) => {
        setPrompts(prev => (prev || []).filter(p => p.id !== id));
        setPreviews(prev => { const newPreviews = { ...prev }; delete newPreviews[id]; return newPreviews; });
        setSelectedPromptIds(prev => { const newSet = new Set(prev); newSet.delete(id); return newSet; });
    };
    const handleClearAllPrompts = () => {
        if (window.confirm('Xóa tất cả prompts?')) {
            setPrompts([]);
            setPreviews({});
            setSelectedPromptIds(new Set());
        }
    };

    const handleImportFromFile = async () => {
        if (isRunning) return;
        const result = await window.electronAPI.importPromptsFromFile();
        if (result.success && result.prompts && Array.isArray(result.prompts)) { 
            const newPrompts: AutomationPrompt[] = result.prompts
                .filter(text => typeof text === 'string') 
                .map((text: string) => ({
                    id: `prompt-${Date.now()}-${Math.random()}`, text, status: 'idle', message: t('createVideoFromFrames.promptReady')
                }));
            if (newPrompts.length > 0) {
                 setPrompts(prev => [...(prev || []), ...newPrompts]); 
                 showToast(`Đã nhập ${newPrompts.length} prompt.`, 'success');
            } else {
                 showToast('File không chứa prompt hợp lệ.', 'info');
            }
        } else if (result.error && result.error !== 'No file selected') {
            showToast(`Lỗi: ${result.error}`, 'error');
        }
    };


    // Options story
    const storyOptions = useMemo(() => {
        const safeStories = stories || [];
        const safeAllPrompts = allPrompts || [];

        const standardStories = safeStories
            .filter(story => story && story.id) 
            .map(story => ({
                 id: story.id,
                 title: story.title || `Story ${story.id}`
           }));

       const manualStoryMap = new Map<string, string>();
       safeAllPrompts.forEach(prompt => {
         if (prompt && prompt.storyId && prompt.storyId.startsWith('manual-')) {
           if (!manualStoryMap.has(prompt.storyId)) {
             manualStoryMap.set(prompt.storyId, prompt.storyTitle || `Manual Story ${prompt.storyId}`);
           }
         }
       });
       const manualStories = Array.from(manualStoryMap.entries()).map(([id, title]) => ({ id, title }));

       return [...standardStories, ...manualStories].sort((a, b) => a.title.localeCompare(b.title));
    }, [stories, allPrompts]);


    // Import story
    const handleImportFromStory = (storyId: string) => {
        if (!storyId) return;
        const safeAllPrompts = allPrompts || [];
        const relatedPrompts = safeAllPrompts.filter(p => p && p.storyId === storyId);
        if (relatedPrompts.length === 0) {
            showToast('Không tìm thấy prompt nào cho câu chuyện này.', 'info');
            return;
        }

        const newPrompts: AutomationPrompt[] = relatedPrompts.map(p => ({
            id: `prompt-${Date.now()}-${Math.random()}`,
            text: p.prompt || '',
            status: 'idle',
            message: t('createVideoFromFrames.promptReady'),
        }));

        setPrompts(newPrompts); 
        setPreviews({}); 
        setSelectedPromptIds(new Set()); 
        showToast(`Đã tải và thay thế bằng ${newPrompts.length} prompt từ câu chuyện.`, 'success');
    };


    // Import nhiều ảnh
    const handleImportMultipleImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newImageFiles = Array.from(files);
        showToast(`Đang xử lý ${newImageFiles.length} ảnh...`, 'info');

        type ImageJob = { promptId: string, file: File, previewUrl: string, type: 'start' | 'end' };
        const jobs: ImageJob[] = [];
        const promptsToCreate: AutomationPrompt[] = [];
        const previewsToUpdate: PreviewState = {};
        const assignedPromptIds: string[] = []; 
        let promptIndex = 0; 
        const currentLocalPrompts = localAutomationState.prompts || []; 

        const createdUrls: string[] = []; 
        try {
            for (let i = 0; i < newImageFiles.length; i++) {
                const currentFile = newImageFiles[i];
                const nextFile = (showEndImage && i + 1 < newImageFiles.length) ? newImageFiles[i + 1] : undefined;

                const currentPreviewUrl = URL.createObjectURL(currentFile);
                createdUrls.push(currentPreviewUrl); 

                const nextPreviewUrl = nextFile ? URL.createObjectURL(nextFile) : undefined;
                if (nextPreviewUrl) createdUrls.push(nextPreviewUrl); 

                while (promptIndex < currentLocalPrompts.length && currentLocalPrompts[promptIndex]?.startImageBase64) {
                    promptIndex++;
                }

                let targetPromptId: string;
                if (promptIndex < currentLocalPrompts.length && currentLocalPrompts[promptIndex]) {
                    targetPromptId = currentLocalPrompts[promptIndex].id;
                    promptIndex++; 
                } else {
                    targetPromptId = `prompt-${Date.now()}-${Math.random()}-${currentFile.name}`;
                    const promptText = currentFile.name.split('.').slice(0, -1).join('.') || `Image ${i+1}`; 
                    promptsToCreate.push({ id: targetPromptId, text: promptText, status: 'idle', message: t('createVideoFromFrames.promptReady') });
                }
                assignedPromptIds.push(targetPromptId); 

                jobs.push({ promptId: targetPromptId, file: currentFile, previewUrl: currentPreviewUrl, type: 'start' });
                previewsToUpdate[targetPromptId] = { ...previewsToUpdate[targetPromptId], startImagePreview: currentPreviewUrl };

                if (showEndImage && nextFile && nextPreviewUrl) {
                    jobs.push({ promptId: targetPromptId, file: nextFile, previewUrl: nextPreviewUrl, type: 'end' });
                    previewsToUpdate[targetPromptId] = { ...previewsToUpdate[targetPromptId], endImagePreview: nextPreviewUrl };
                }
            }
        } catch (urlError) {
             console.error("Lỗi tạo object URL:", urlError);
             showToast('Lỗi khi chuẩn bị xem trước ảnh.', 'error');
             createdUrls.forEach(url => URL.revokeObjectURL(url)); 
             if (e.target) e.target.value = ''; 
             return; 
        }

        setPreviews(prev => ({ ...prev, ...previewsToUpdate }));
        if (promptsToCreate.length > 0) {
            setPrompts(prev => [...(prev || []), ...promptsToCreate]); 
        }

        const uniqueFiles = new Map<File, Promise<string>>();
        jobs.forEach(job => {
            if (!uniqueFiles.has(job.file)) {
                uniqueFiles.set(job.file, fileToBase64(job.file));
            }
        });

        let base64Success = true; 
        try {
            await Promise.all(uniqueFiles.values());

            const fileBase64Map = new Map<File, string>();
            for (const [file, promise] of uniqueFiles.entries()) {
                 try {
                     const base64 = await promise; 
                     fileBase64Map.set(file, base64);
                 } catch (readError) {
                     console.error(`Lỗi đọc file ${file.name}:`, readError);
                     base64Success = false; 
                     showToast(`Không thể xử lý file ${file.name}.`, 'error');
                 }
            }

            setPrompts((prevPrompts: AutomationPrompt[]) => {
                const safePrevPrompts = prevPrompts || []; 
                const updates = new Map<string, { startImageBase64?: string, endImageBase64?: string }>();
                for (const job of jobs) {
                    const base64 = fileBase64Map.get(job.file);
                    if (base64 !== undefined) {
                        const current = updates.get(job.promptId) || {};
                        if (job.type === 'start') current.startImageBase64 = base64;
                        else if (job.type === 'end') current.endImageBase64 = base64;
                        updates.set(job.promptId, current);
                    }
                }
                return safePrevPrompts.map(p =>
                    updates.has(p.id) ? { ...p, ...updates.get(p.id) } : p
                );
            });

            if (base64Success) {
                 showToast(`Đã tải lên và gán ${newImageFiles.length} ảnh.`, 'success');
            } else {
                 showToast(`Đã tải lên ảnh, nhưng một số ảnh bị lỗi xử lý.`, 'info');
            }

        } catch (error: any) {
             console.error("Lỗi khi xử lý base64 hàng loạt:", error);
             showToast(`Lỗi khi xử lý ảnh: ${error.message}`, 'error');
             base64Success = false; 
             setPreviews(prev => {
                 const newPreviews = {...prev};
                 assignedPromptIds.forEach(id => {
                     if (previewsToUpdate[id]) {
                         if(previewsToUpdate[id].startImagePreview) newPreviews[id] = {...newPreviews[id], startImagePreview: undefined };
                         if(previewsToUpdate[id].endImagePreview) newPreviews[id] = {...newPreviews[id], endImagePreview: undefined };
                         if(!newPreviews[id]?.startImagePreview && !newPreviews[id]?.endImagePreview) delete newPreviews[id];
                     }
                 });
                 return newPreviews;
             });
             const newPromptIds = new Set(promptsToCreate.map(p => p.id));
             setPrompts(prev => (prev || []).filter(p => !newPromptIds.has(p.id))); 
        } finally {
            if(e.target) e.target.value = ''; 
            createdUrls.forEach(url => URL.revokeObjectURL(url)); 
        }
    };

    // *** SỬA LỖI `promptIndex` KHI TẢI THỦ CÔNG ***
    const handleDownload = (videoUrl: string | undefined, promptText: string | undefined, promptId: string) => {
        if (videoUrl) {
            // TÌM INDEX GỐC
            const originalIndex = localAutomationState.prompts.findIndex(p => p.id === promptId);
            
            window.electronAPI.downloadVideo({
                url: videoUrl,
                promptText: String(promptText || 'video'),
                savePath: null, // Mở dialog lưu
                promptIndex: originalIndex >= 0 ? originalIndex : 0 // Dùng index tìm được
            });
        } else {
            showToast('Video không có URL.', 'info');
        }
    };


    const handleToggleSelect = (id: string) => { setSelectedPromptIds(prev => { const newSet = new Set(prev); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); return newSet; }); };
    
    const handleToggleSelectAll = () => {
        const currentLocalPrompts = localAutomationState.prompts || [];
        const validIds = currentLocalPrompts.filter(p => p && p.id).map(p => p.id);
        if (validIds.length === 0) return; 

        if (selectedPromptIds.size >= validIds.length && validIds.every(id => selectedPromptIds.has(id))) {
             setSelectedPromptIds(new Set());
        } else {
             setSelectedPromptIds(new Set(validIds));
        }
    };


    return (
        <div className="animate-fade-in h-full flex flex-col">
            <h1 className="text-3xl font-bold text-light mb-2">{t('createVideoFromFrames.title')}</h1>
            <p className="text-dark-text mb-4">{t('createVideoFromFrames.description')}</p>

            <input
                type="file"
                multiple
                accept="image/jpeg,image/png"
                ref={multiImageInputRef}
                onChange={handleImportMultipleImages}
                className="hidden"
            />

            {/* Thanh cài đặt */}
            <div className="bg-secondary p-3 rounded-lg shadow-md mb-3 flex-shrink-0">
                 <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                    {/* Cài đặt chính */}
                    <div>
                        <label className="block text-xs font-medium text-dark-text mb-1">{t('createVideoFromFrames.aspectRatio')}</label>
                        <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as any)} className="w-full p-2 text-xs bg-primary rounded-md border border-border-color h-[34px]" disabled={isRunning}>
                            <option value="LANDSCAPE">{t('createVideoFromFrames.aspectLandscape')}</option>
                            <option value="PORTRAIT">{t('createVideoFromFrames.aspectPortrait')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-dark-text mb-1">{t('createVideoFromFrames.streams')}</label>
                        <input type="number" value={concurrentStreams} onChange={e => setConcurrentStreams(Math.max(4, Math.min(12, parseInt(e.target.value) || 4)))} min="4" max="12" className="w-20 p-2 text-xs bg-primary rounded-md border border-border-color h-[34px]" disabled={isRunning} />
                    </div>

                    <div className="h-6 border-l border-border-color mx-2 self-center"></div>

                    {/* Tải Prompt */}
                     <div className="flex items-end gap-2 self-end">
                         <div>
                            <label className="block text-xs font-medium text-dark-text mb-1">Thêm prompt từ Story</label>
                            <select
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                    handleImportFromStory(e.target.value);
                                    e.target.value = ""; 
                                }}
                                className="p-2 text-xs bg-primary rounded-full border border-border-color h-[34px] w-40"
                                disabled={isRunning}
                                defaultValue="" 
                            >
                                <option value="" disabled>Chọn Story...</option>
                                {(storyOptions || []).map(story => (
                                <option key={story.id} value={story.id}>
                                    {story.title.substring(0, 35)}{story.title.length > 35 ? '...' : ''}
                                </option>
                                ))}
                            </select>
                         </div>
                         <div>
                            <label className="block text-xs font-medium text-dark-text mb-1">Thêm prompt</label>
                            <button onClick={handleImportFromFile} disabled={isRunning} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-full disabled:bg-gray-400 flex items-center justify-center gap-1 text-xs h-[34px] w-40">
                               <BookOpen className="h-4 w-4" /> 
                               Từ file TXT
                            </button>
                         </div>
                    </div>

                    {/* Tải ảnh & Công tắc */}
                    <div className="flex flex-col items-start gap-1 self-end">
                         <label htmlFor="show-end-image-toggle" className="flex items-center cursor-pointer h-[20px] mb-1">
                            <div className="relative">
                                <input type="checkbox" id="show-end-image-toggle" className="sr-only peer"
                                       checked={showEndImage}
                                       onChange={(e) => setShowEndImage(e.target.checked)}
                                       disabled={isRunning}
                                />
                                <div className="block bg-gray-400 w-9 h-5 rounded-full peer-checked:bg-green-500 transition peer-disabled:opacity-50"></div>
                                <div className="dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-full peer-disabled:opacity-50"></div>
                            </div>
                            <span className="ml-2 text-dark-text text-xs font-medium whitespace-nowrap">Sử dụng ảnh cuối</span>
                        </label>
                        <button onClick={() => multiImageInputRef.current?.click()} disabled={isRunning} className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-3 rounded-full disabled:bg-gray-400 flex items-center justify-center gap-1 text-xs h-[34px]">
                           <Images className="h-4 w-4" />
                           Tải Nhiều Ảnh
                        </button>
                    </div>

                    {/* *** CẬP NHẬT: Thêm công tắc Xóa file cũ *** */}
                    <div className="flex flex-col">
                        <label htmlFor="allow-overwrite-toggle-frames" className="flex items-center cursor-pointer mb-1">
                            <div className="relative">
                                <input type="checkbox" id="allow-overwrite-toggle-frames" className="sr-only peer"
                                       checked={!autoSaveConfig.allowOverwrite} // Logic đảo ngược: BẬT = XÓA FILE CŨ
                                       onChange={() => setAutoSaveConfig(prev => ({...prev, allowOverwrite: !prev.allowOverwrite }))}
                                       disabled={isRunning}
                                />
                                <div className="block bg-gray-400 w-9 h-5 rounded-full peer-checked:bg-green-500 transition peer-disabled:opacity-50"></div>
                                <div className="dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-full peer-disabled:opacity-50"></div>
                            </div>
                            <span className="ml-2 text-dark-text text-xs font-medium">Xóa file cũ</span>
                        </label>
                        <div className="h-[34px] flex items-center">
                             <span className="text-dark-text text-xs font-medium whitespace-nowrap">
                                {!autoSaveConfig.allowOverwrite ? 'BẬT (Xóa file)' : 'TẮT (Giữ file)'}
                            </span>
                        </div>
                    </div>

                    {/* Cài đặt lưu */}
                     <div className="flex flex-col">
                        <label htmlFor="auto-save-toggle" className="flex items-center cursor-pointer mb-1">
                            <div className="relative">
                                <input type="checkbox" id="auto-save-toggle" className="sr-only peer" checked={autoSaveConfig.enabled} onChange={() => setAutoSaveConfig(prev => ({...prev, enabled: !prev.enabled }))} disabled={isRunning}/>
                                <div className="block bg-gray-400 w-9 h-5 rounded-full peer-checked:bg-green-500 transition peer-disabled:opacity-50"></div>
                                <div className="dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-full peer-disabled:opacity-50"></div>
                            </div>
                            <span className="ml-2 text-dark-text text-xs font-medium">{t('createVideoFromFrames.autoSave')}</span>
                        </label>
                        <div className="flex items-center">
                            <p className="bg-primary border border-r-0 border-border-color text-dark-text text-xs rounded-l-md h-[34px] flex items-center px-2 w-32 truncate" title={autoSaveConfig.path || t('createVideoFromFrames.savePathDefault')}>{autoSaveConfig.path || t('createVideoFromFrames.savePathDefault')}</p>
                            <button onClick={handleSelectSaveDir} disabled={!autoSaveConfig.enabled || isRunning} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-2 rounded-r-md text-xs h-[34px] disabled:opacity-50 flex items-center gap-1">
                                <Folder className="h-4 w-4"/>
                            </button>
                        </div>
                    </div>
                    {/* Chia phần */}
                    <div className="flex flex-col">
                         <label htmlFor="split-folders-toggle" className="flex items-center cursor-pointer mb-1">
                            <div className="relative">
                                <input type="checkbox" id="split-folders-toggle" className="sr-only peer"
                                       checked={autoSaveConfig.splitFolders}
                                       onChange={() => setAutoSaveConfig(prev => ({...prev, splitFolders: !prev.splitFolders }))}
                                       disabled={!autoSaveConfig.enabled || isRunning}
                                />
                                <div className="block bg-gray-400 w-9 h-5 rounded-full peer-checked:bg-green-500 transition peer-disabled:opacity-50"></div>
                                <div className="dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-full peer-disabled:opacity-50"></div>
                            </div>
                            <span className="ml-2 text-dark-text text-xs font-medium whitespace-nowrap">video/phần</span>
                        </label>
                         <div className="flex items-center">
                            <input
                                type="number"
                                value={isNaN(videosPerFolderInput) ? '' : videosPerFolderInput}
                                onChange={handleVideosPerFolderChange}
                                onBlur={() => { if (isNaN(videosPerFolderInput)) setVideosPerFolderInput(autoSaveConfig.videosPerFolder || 10); }}
                                min="1"
                                disabled={!autoSaveConfig.enabled || !autoSaveConfig.splitFolders || isRunning}
                                className="w-20 p-2 text-xs bg-primary rounded-md border border-border-color h-[34px] disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <div className="h-6 border-l border-border-color mx-2 self-center"></div>

                    {/* Nút Chạy/Dừng */}
                    <div className="flex-grow"></div>
                    <div className="flex items-end gap-2 flex-wrap">
                        {isRunning ? (
                            <button onClick={handleStop} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-full flex items-center justify-center gap-2 text-xs h-[34px]">
                                <StopCircle className="h-4 w-4" />
                                {t('createVideoFromFrames.stop')}
                            </button>
                        ) : (
                             <div className="flex items-center gap-2">
                                {prompts.some(p => p && p.status !== 'success' && p.status !== 'idle') && (
                                <button onClick={handleRunUnfinished} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-full flex items-center justify-center gap-1 text-xs h-[34px]">
                                   <RotateCcw className="h-4 w-4" />
                                   {t('createVideoFromFrames.runUnfinished')}
                                </button>
                                )}
                                {errorCount > 0 && (
                                <button onClick={handleRetryFailed} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-3 rounded-full flex items-center justify-center gap-1 text-xs h-[34px]">
                                    <RefreshCw className="h-4 w-4"/>
                                    {t('createVideoFromFrames.retryFailed', { count: errorCount })}
                                </button>
                                )}
                                <button onClick={handleRunAll} disabled={prompts.length === 0} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-full disabled:bg-gray-400 flex items-center justify-center gap-2 text-xs h-[34px]">
                                   <Play className="h-4 w-4" />
                                   {t('createVideoFromFrames.runAll')} ({prompts.length})
                                </button>
                             </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Thanh trạng thái & Progress bar */}
            <div className="mb-3 bg-secondary p-2 rounded-lg shadow-inner flex-shrink-0">
                 <div className="flex justify-between items-center mb-1">
                     <div className="flex items-center gap-3 flex-wrap">
                         <div className="flex items-center">
                             <input type="checkbox" id="select-all-prompts" checked={prompts.length > 0 && selectedPromptIds.size === prompts.filter(p=>p && p.id).length} onChange={handleToggleSelectAll} disabled={isRunning || prompts.length === 0} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
                             <label htmlFor="select-all-prompts" className="ml-2 text-xs font-medium text-dark-text cursor-pointer">Chọn tất cả ({selectedPromptIds.size})</label>
                         </div>
                         {selectedPromptIds.size > 0 && !isRunning && (
                             <button onClick={handleRunSelected} className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold py-1 px-3 rounded-full border border-yellow-600 flex items-center gap-1">
                                <RotateCcw className="h-3 w-3" />
                                Chạy ({selectedPromptIds.size})
                             </button>
                        )}
                         <button onClick={handleClearAllPrompts} disabled={isRunning || prompts.length === 0} className="text-red-500 hover:text-red-700 font-bold py-1 px-2 rounded-full disabled:opacity-50 flex items-center gap-1 text-xs">
                             <Trash2 className="h-3 w-3" />
                             {t('createVideoFromFrames.deleteAll')}
                         </button>
                        <button onClick={addPromptField} disabled={isRunning} className="bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-bold py-1 px-3 rounded-full border border-blue-200 disabled:opacity-50 flex items-center gap-1">
                            <Plus className="h-3 w-3" /> {t('createVideoFromFrames.addPrompt')}
                        </button>
                     </div>
                     <div className="flex items-center gap-4 text-xs">
                         <div className="flex items-center gap-1">
                            <button onClick={() => setGridColumns(2)} title="2 cột" className={`p-1 rounded-md ${gridColumns === 2 ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg'}`}><Columns className="h-4 w-4" /></button>
                            <button onClick={() => setGridColumns(3)} title="3 cột" className={`p-1 rounded-md ${gridColumns === 3 ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg'}`}><LayoutGrid className="h-4 w-4" /></button>
                         </div>
                         <span className="font-semibold text-light">{statusMessage}</span>
                         <span className="font-bold text-blue-600">{t('createVideoFromFrames.total')}: {totalCount}</span>
                         <span className="font-semibold text-yellow-500">{t('createVideoFromFrames.pending')}: {pendingCount}</span>
                         <span className="font-semibold text-green-600">{t('createVideoFromFrames.success')}: {successCount}</span>
                         <span className="font-semibold text-red-600">{t('createVideoFromFrames.failed')}: {errorCount}</span>
                         <span className="font-semibold text-accent">{Math.round(completedPercentage)}%</span>
                     </div>
                 </div>
                 <div className="w-full bg-primary rounded-full h-1.5 overflow-hidden">
                     <div className="bg-accent h-1.5 rounded-full transition-all duration-300" style={{ width: `${completedPercentage}%` }}></div>
                 </div>
             </div>

            {/* Danh sách prompt */}
            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                {prompts.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-dark-text opacity-70">
                        <p>Thêm prompt hoặc tải ảnh để bắt đầu.</p>
                    </div>
                )}

                <div className={`grid grid-cols-1 ${gridColumns === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-4`}>
                    {prompts.map((prompt: AutomationPrompt, index: number) => {
                         if (!prompt || !prompt.id) return null;

                        const isProcessingStatus = ['running', 'queued', 'downloading', 'submitting', 'processing'].includes(prompt.status);
                        const startPreview = previews[prompt.id]?.startImagePreview || (prompt.startImageBase64 ? `data:image/jpeg;base64,${prompt.startImageBase64}` : '');
                        const endPreview = previews[prompt.id]?.endImagePreview || (prompt.endImageBase64 ? `data:image/jpeg;base64,${prompt.endImageBase64}` : '');
                        const promptText = prompt.text || '';

                        return (
                            <div key={prompt.id} className={`bg-secondary p-3 rounded-lg shadow-md flex flex-col gap-2 border ${selectedPromptIds.has(prompt.id) ? 'border-accent' : 'border-transparent'}`}>
                                {/* Header */}
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={selectedPromptIds.has(prompt.id)} onChange={() => handleToggleSelect(prompt.id)} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" disabled={isRunning}/>
                                        <label className="block text-dark-text text-sm font-bold">Prompt #{index + 1}</label>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ prompt.status === 'success' ? 'bg-green-100 text-green-800' : isProcessingStatus ? 'bg-blue-100 text-blue-800' : prompt.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800' }`}>{prompt.message}</span>
                                        <button onClick={() => handleRunSinglePrompt(prompt.id)} disabled={isRunning} title={t('createVideoFromFrames.runThisPrompt')} className="p-1 hover:bg-green-100 rounded-full disabled:opacity-50"><Play className="h-4 w-4 text-green-600" /></button>
                                        <button onClick={() => removePrompt(prompt.id)} disabled={isRunning} title={t('common.delete')} className="p-1 hover:bg-red-100 rounded-full disabled:opacity-50"><IconX className="h-4 w-4 text-red-500" /></button>
                                    </div>
                                </div>

                                {/* Video Result */}
                                <div className={`relative w-full aspect-video bg-primary rounded-md border border-border-color flex items-center justify-center overflow-hidden group ${isProcessingStatus ? 'rainbow-border-running' : ''}`}>
                                    {prompt.videoUrl ? (
                                        <>
                                            <video
                                                key={prompt.videoUrl} 
                                                controls
                                                className={`w-full h-full object-contain bg-black`}
                                            >
                                                <source src={prompt.videoUrl} type="video/mp4" />
                                            </video>
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {/* *** SỬA LỖI: Thêm prompt.id vào handleDownload *** */}
                                                <button onClick={() => handleDownload(prompt.videoUrl, promptText, prompt.id)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">{t('createVideoFromFrames.download')}</button>
                                            </div>
                                        </>
                                    ) : isProcessingStatus ? (
                                        <div className="text-center"><Spinner /><p className="mt-4 text-dark-text text-sm capitalize">{prompt.status}...</p></div>
                                    ) : (
                                        <div className="text-center text-dark-text text-sm"><p>{prompt.status === 'error' ? t('createVideoFromFrames.promptError') : t('createVideoFromFrames.promptReady')}</p></div>
                                    )}
                                </div>

                                {/* Bottom section: Prompt + Images */}
                                <div className="grid grid-cols-3 gap-2">
                                    <textarea
                                        value={promptText}
                                        onChange={e => updatePromptText(prompt.id, e.target.value)}
                                        className="col-span-2 w-full p-2 bg-primary rounded-md border border-border-color text-sm resize-y h-full min-h-[10rem]" 
                                        readOnly={isRunning}
                                        placeholder={t('createVideoFromFrames.promptPlaceholder')}
                                    />
                                    <div className={`col-span-1 flex ${showEndImage ? 'flex-row gap-2 justify-around' : 'justify-center'} items-center`}>
                                        <FrameUploadBox
                                            label={t('createVideoFromFrames.startImage')}
                                            preview={startPreview}
                                            onChange={(e) => handleLocalImageChange(e, prompt.id, 'start')}
                                            onClear={(e) => clearLocalImage(e, prompt.id, 'start')}
                                            borderColorClass="border-green-500"
                                            disabled={isRunning}
                                        />
                                        {showEndImage && (
                                            <FrameUploadBox
                                                label={t('createVideoFromFrames.endImage')}
                                                preview={endPreview}
                                                onChange={(e) => handleLocalImageChange(e, prompt.id, 'end')}
                                                onClear={(e) => clearLocalImage(e, prompt.id, 'end')}
                                                borderColorClass="border-red-500"
                                                disabled={isRunning}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

export default CreateVideoFromFramesView;