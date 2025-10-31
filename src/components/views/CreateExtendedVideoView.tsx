// src/components/views/CreateExtendedVideoView.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import Spinner from '../common/Spinner';
// *** THÊM Story, VideoPrompt ***
import { AutomationState, AutomationPrompt, AutomationStatus, AppView, AutoSaveConfig, Story, VideoPrompt } from '../../types'; 
import { useToast } from '../../context/ToastContext';
import { useTranslation } from 'react-i18next';
// *** THÊM ICONS ***
import { BookOpen, FileText, Columns, LayoutGrid, UploadCloud, ToggleLeft, ToggleRight, X as IconX, Folder, Play, StopCircle, Plus, Trash2, RotateCcw, RefreshCw, Download } from 'lucide-react';

// --- Hàm helper (sao chép từ CreateVideoFromFramesView) ---

// Hàm helper chuyển File sang Base64 (chỉ lấy data)
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
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

// Component Hộp Tải Ảnh (phiên bản đơn giản cho 1 ảnh)
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
        <div className={`w-24 h-24 bg-primary rounded-lg border-2 border-dashed ${borderColorClass} flex items-center justify-center relative group`}>
            {preview ? (
                <>
                    <img src={preview} alt={label} className="w-full h-full object-cover rounded-lg" />
                    {!disabled && (
                        <button
                            onClick={onClear}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            title={`Xóa ${label}`}
                        >
                            <IconX className="h-4 w-4" />
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


// --- Component Chính ---

interface CreateExtendedVideoViewProps {
    setActiveView: (view: AppView) => void;
}

const CreateExtendedVideoView: React.FC<CreateExtendedVideoViewProps> = ({ setActiveView }) => {
    const {
        currentUser,
        addVideo,
        autoSaveConfig,
        setAutoSaveConfig,
        extendedAutomationState, 
        setExtendedAutomationState, 
        refreshCurrentUser,
        stories, // <-- THÊM: Lấy stories
        prompts: allPrompts, // <-- THÊM: Lấy allPrompts (lịch sử)
    } = useAppContext();

    const { t } = useTranslation();
    const { showToast } = useToast();

    // --- State mới ---
    const [gridColumns, setGridColumns] = useState(2);
    const [useInitialImage, setUseInitialImage] = useState(false);
    const [initialImageBase64, setInitialImageBase64] = useState<string | undefined>(undefined);
    const [initialImagePreview, setInitialImagePreview] = useState<string>('');
    const [showOnlyErrors, setShowOnlyErrors] = useState(false);
    // --- Kết thúc State mới ---

    const { prompts, isRunning, model, aspectRatio } = extendedAutomationState;

    const [videosPerFolderInput, setVideosPerFolderInput] = useState(autoSaveConfig.videosPerFolder || 10);

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

    // Lắng nghe log (kênh riêng)
    useEffect(() => {
        // *** SỬA LỖI: Thêm kiểu 'any' cho log để fix lỗi ts(7006) ***
        const unsubscribeLog = window.electronAPI.onExtendedVideoLog((log: any) => {
            let videoAddedToHistory = false;
            setExtendedAutomationState((prev: AutomationState) => {
                let newPrompts = prev.prompts.map((p: AutomationPrompt) => {
                    if (p.id === log.promptId) {
                        const newStatus = log.status as AutomationStatus || p.status;
                        const updates: Partial<AutomationPrompt> = {
                            status: newStatus,
                            message: log.message,
                            videoUrl: log.videoUrl || p.videoUrl, 
                        };
                        
                        if (newStatus === 'success' && log.videoUrl && !p.videoUrl) {
                             addVideo({
                                id: `${p.id}-${Date.now()}`, promptId: p.id, promptText: p.text, status: 'completed',
                                videoUrl: log.videoUrl, 
                                aspectRatio: prev.aspectRatio,
                            });
                            videoAddedToHistory = true;
                        }
                        return { ...p, ...updates };
                    }
                    return p;
                });

                if (log.status === 'finished') {
                    newPrompts = newPrompts.map(p => {
                        if (['queued', 'submitting', 'processing', 'running'].includes(p.status)) {
                            return { ...p, status: 'idle', message: 'Đã dừng' };
                        }
                        return p;
                    });
                    
                    if (log.videoUrl) {
                        showToast(`Hoàn thành! Video đã ghép lưu tại: ${log.videoUrl}`, 'success');
                         if (newPrompts.length > 0) {
                            const lastPrompt = newPrompts[newPrompts.length - 1];
                            lastPrompt.status = 'success';
                            lastPrompt.message = 'Hoàn thành!';
                            lastPrompt.videoUrl = log.videoUrl;
                         }
                    }

                    return { ...prev, prompts: newPrompts, isRunning: false, statusMessage: log.message };
                }

                const isStillRunning = newPrompts.some(p => ['queued', 'submitting', 'processing', 'running'].includes(p.status));
                return { ...prev, prompts: newPrompts, isRunning: isStillRunning };
            });
        });

        const unsubscribeDownload = window.electronAPI.onDownloadComplete(({success, path, error}) => {
             if (success && path && path !== 'Skipped') { console.log(`[ExtendedVideo] File tạm đã lưu: ${path}`); }
             else if (!success && error && error !== 'Download canceled') { console.warn(`[ExtendedVideo] Lỗi tải file tạm: ${error}`); }
        });

        return () => { unsubscribeLog(); unsubscribeDownload(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setExtendedAutomationState, addVideo, showToast]);

    // Tính toán trạng thái
    const { successCount, errorCount, pendingCount, totalCount, statusMessage, completedPercentage } = useMemo(() => {
        const total = prompts.length;
        if (total === 0) { return { successCount: 0, errorCount: 0, pendingCount: 0, totalCount: 0, statusMessage: "Sẵn sàng.", completedPercentage: 0 }; }
        const runningPromptIndex = prompts.findIndex(p => ['running', 'queued', 'submitting', 'processing'].includes(p.status));
        const success = prompts.filter(p => p.status === 'success').length;
        const error = prompts.filter(p => p.status === 'error').length;
        const pending = prompts.filter(p => p.status === 'idle').length;
        let message = `Đang chờ ${total} prompt...`;
        if (isRunning && runningPromptIndex !== -1) {
            message = `Đang xử lý prompt ${runningPromptIndex + 1}/${total}...`;
        } else if (isRunning) {
             message = `Đang khởi tạo...`;
        } else if (success + error > 0 && success + error < total) {
            message = "Đã dừng.";
        } else if (success === total && total > 0) {
            message = "Hoàn thành!";
        } else if (error > 0) {
            message = "Đã dừng (có lỗi)";
        }
        const percentage = total > 0 ? ((success + error) / total) * 100 : 0;
        return { successCount: success, errorCount: error, pendingCount: pending, totalCount: total, statusMessage: message, completedPercentage: percentage };
    }, [prompts, isRunning]);

     const storyOptions = useMemo(() => {
        const safeStories = stories || [];
        const safeAllPrompts = allPrompts || [];
        const options = safeStories.map(story => ({ id: story.id, title: story.title || `Story ${story.id}` }));
        const manualPromptsMap = new Map<string, string>();
        safeAllPrompts.forEach(prompt => {
            if (prompt && prompt.storyId && prompt.storyId.startsWith('manual-')) {
                if (!manualPromptsMap.has(prompt.storyId)) {
                    manualPromptsMap.set(prompt.storyId, prompt.storyTitle || `Manual Story ${prompt.storyId}`);
                }
            }
        });
        manualPromptsMap.forEach((title, id) => { options.push({ id, title }); });
        options.sort((a, b) => a.title.localeCompare(b.title));
        return options;
    }, [stories, allPrompts]);

    // Hàm setter
    const setPrompts = (updater: React.SetStateAction<AutomationPrompt[]>) => { setExtendedAutomationState((prev: any) => ({ ...prev, prompts: typeof updater === 'function' ? updater(prev.prompts) : updater })); };
    const setModel = (newModel: string) => { setExtendedAutomationState((prev: any) => ({ ...prev, model: newModel })); };
    const setAspectRatio = (newAspectRatio: 'LANDSCAPE' | 'PORTRAIT') => { setExtendedAutomationState((prev: any) => ({ ...prev, aspectRatio: newAspectRatio })); };
    const updatePromptText = (id: string, text: string) => { setPrompts((prev: AutomationPrompt[]) => prev.map((p: AutomationPrompt) => p.id === id ? { ...p, text } : p)); };
    
    const handleDownload = (videoUrl: string | undefined, promptText: string) => { 
        if (videoUrl) { 
            window.electronAPI.downloadVideo({ url: videoUrl, promptText, savePath: null, promptIndex: 0 }); 
        } else { 
            showToast('Không có URL video.', 'error'); 
        } 
    };
    
    const handleSelectSaveDir = async () => { 
        const path = await window.electronAPI.selectDownloadDirectory(); 
        if (path) { 
            setAutoSaveConfig({ ...autoSaveConfig, path }); 
            showToast(`Thư mục lưu tự động: ${path}`, 'success'); 
        } 
    };
    
    // *** CẬP NHẬT: Logic kiểm tra gói Pro ***
    const BASIC_PACKAGE_NAME = 'Gói Cá Nhân/1 Máy';
    const isProUser = useMemo(() => {
        if (!currentUser || !currentUser.subscription || currentUser.user.status !== 'active') {
            return false;
        }
        if (new Date(currentUser.subscription.end_date) < new Date()) {
            return false;
        }
        // Nếu không phải gói Cá nhân (cơ bản) thì là Pro
        return currentUser.subscription.package_name !== BASIC_PACKAGE_NAME;
    }, [currentUser]);

    const checkSubscription = async (): Promise<boolean> => { 
        await refreshCurrentUser(); 
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Cập nhật lại check sau khi refresh
        const updatedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        const subscription = updatedUser?.subscription;
        const userStatus = updatedUser?.user?.status;

        if (userStatus !== 'active') {
            showToast('Tài khoản của bạn chưa được kích hoạt.', 'error');
            setActiveView(AppView.PROFILE);
            return false;
        }
        if (!subscription) {
            showToast('Bạn cần nâng cấp gói Pro để sử dụng tính năng này.', 'error');
            setActiveView(AppView.PACKAGES);
            return false;
        }
        if (new Date(subscription.end_date) < new Date()) { 
            showToast('Gói đăng ký Pro của bạn đã hết hạn.', 'error'); 
            setActiveView(AppView.PACKAGES); 
            return false; 
        }
        if (subscription.package_name === BASIC_PACKAGE_NAME) {
            showToast('Tính năng này yêu cầu Gói Pro hoặc cao hơn. Vui lòng nâng cấp.', 'error');
            setActiveView(AppView.PACKAGES);
            return false;
        }
        return true;
    };
    
    // *** CẬP NHẬT: Hàm chạy quy trình ***
    const runSequence = async (promptsToRun: AutomationPrompt[]) => { 
        // Kiểm tra Pro trước
        if (!isProUser) {
            showToast('Tính năng này yêu cầu Gói Pro hoặc cao hơn. Vui lòng nâng cấp.', 'error');
            setActiveView(AppView.PACKAGES);
            return;
        }
        // Kiểm tra lại lần nữa phòng trường hợp hết hạn
        if (!await checkSubscription()) return;

        if (promptsToRun.length === 0) { showToast('Bạn cần ít nhất 1 prompt.', 'info'); return; }
        
        if (useInitialImage && !initialImageBase64) {
            showToast('Chế độ "Sử dụng ảnh input" đang bật, vui lòng tải ảnh lên.', 'error');
            return;
        }
        
        setExtendedAutomationState((prev: AutomationState) => ({ 
            ...prev, 
            prompts: prev.prompts.map(p => ({ ...p, status: 'queued', message: 'Đang chờ...' })), 
            isRunning: true 
        }));
        
        const promptsWithOriginalIndex = promptsToRun.map((p, index) => ({ 
            ...p, 
            originalIndex: index
        }));

        // *** SỬA LỖI (image_ac319f.png): Thêm các tham số còn thiếu ***
        window.electronAPI.startExtendedVideoAutomation({ 
            prompts: promptsWithOriginalIndex, 
            authToken: currentUser!.token, 
            model,
            aspectRatio, 
            autoSaveConfig,
            currentUser, 
            useInitialImage: useInitialImage, // <-- Thêm
            initialImageBase64: initialImageBase64, // <-- Thêm
        });
    };
    
    const handleRunAll = () => runSequence(prompts);
    const handleStopAll = () => { 
        window.electronAPI.stopExtendedVideoAutomation(); 
        setExtendedAutomationState((prev: AutomationState) => ({ ...prev, isRunning: false }));
    };
    
    const handleClearAllPrompts = () => { if (window.confirm(`Xóa tất cả ${prompts.length} prompt?`)) { setPrompts([]); showToast('Đã xóa tất cả prompts.', 'info'); } };
    const addPromptField = () => { setPrompts((prev: AutomationPrompt[]) => [...prev, { id: `prompt-${Date.now()}-${Math.random()}`, text: '', status: 'idle', message: 'Sẵn sàng' }]); };
    const removePrompt = (id: string) => { setPrompts((prev: AutomationPrompt[]) => prev.filter((p: AutomationPrompt) => p.id !== id)); };
    
    const handleImportFromFile = async () => { 
        if (isRunning) return;
        const result = await window.electronAPI.importPromptsFromFile(); 
        if (result.success && result.prompts) {
            const newPrompts: AutomationPrompt[] = result.prompts.map(text => ({ id: `prompt-${Date.now()}-${Math.random()}`, text, status: 'idle', message: 'Sẵn sàng' }));
            setPrompts(prev => [...prev, ...newPrompts]); 
            showToast(`Đã nhập ${newPrompts.length} prompt từ file.`, 'success');
        } else if (result.error && result.error !== 'No file selected') { showToast(`Lỗi nhập file: ${result.error}`, 'error'); }
    };
    
    const handleReplacePromptsFromHistory = (e: React.ChangeEvent<HTMLSelectElement>) => { 
        const storyId = e.target.value; 
        if (!storyId) return;
        const relatedPrompts = allPrompts.filter(p => p.storyId === storyId);
        const promptsToSet = relatedPrompts.map(p => ({ id: `prompt-${Date.now()}-${Math.random()}`, text: p.prompt, status: 'idle', message: 'Sẵn sàng' } as AutomationPrompt));
        if (promptsToSet.length > 0) { 
            setPrompts(promptsToSet);
            showToast(`Đã tải ${promptsToSet.length} prompt từ lịch sử.`, 'success');
        } else { 
            showToast(`Không tìm thấy prompt cho mục này.`, 'info'); 
        }
        e.target.value = ""; 
    };
    
    const handleInitialImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        let previewUrl = '';
        try {
            previewUrl = URL.createObjectURL(file);
            setInitialImagePreview(previewUrl);
            const base64Data = await fileToBase64(file);
            setInitialImageBase64(base64Data);
        } catch (error) {
            console.error("Lỗi đọc file ảnh:", error);
            showToast('Không thể đọc file ảnh.', 'error');
            setInitialImagePreview('');
            setInitialImageBase64(undefined);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        } finally {
            if (e.target) e.target.value = '';
        }
    }, [showToast]);

    const clearInitialImage = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setInitialImagePreview('');
        setInitialImageBase64(undefined);
        if (initialImagePreview) URL.revokeObjectURL(initialImagePreview);
    };
    
    const filteredPrompts = useMemo(() => {
        if (showOnlyErrors) {
            return prompts.filter(p => p.status === 'error');
        }
        return prompts;
    }, [prompts, showOnlyErrors]);

    // *** VÔ HIỆU HÓA NÚT CHẠY NẾU KHÔNG PHẢI PRO ***
    const runButtonDisabled = isRunning || prompts.length === 0 || !isProUser;

    return (
        <div className="animate-fade-in h-full flex flex-col">
            <h1 className="text-xl font-bold text-light mb-2">{t('createExtendedVideo.title')}</h1>
            <p className="text-blue-500-text mb-4">{t('createExtendedVideo.description')}</p>

            {/* Thanh cài đặt */}
            <div className="bg-secondary p-3 rounded-lg shadow-md mb-3">
                 <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                    {/* Model (Cho prompt T2V đầu tiên) */}
                    <div>
                        <label className="block text-xs font-medium text-dark-text mb-1">Model (cho prompt đầu)</label>
                        <select value={model} onChange={e => setModel(e.target.value)} className="w-full p-2 text-xs bg-primary rounded-md border border-border-color h-[34px]" disabled={isRunning || useInitialImage}>
                            <option value="veo_3_0_t2v_fast_ultra">Veo 3 / Veo 3.1</option>
                            <option value="veo_3_1_t2v">Veo 3.1</option>
                        </select>
                        {useInitialImage && <p className="text-xs text-yellow-500 mt-1">Sử dụng Model 3.1 Pro.</p>}
                    </div>
                    {/* Tỷ lệ */}
                    <div>
                        <label className="block text-xs font-medium text-dark-text mb-1">Tỷ lệ (cho tất cả)</label>
                        <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as any)} className="w-full p-2 text-xs bg-primary rounded-md border border-border-color h-[34px]" disabled={isRunning}>
                            <option value="LANDSCAPE">16:9 Ngang</option>
                            <option value="PORTRAIT">9:16 Dọc</option>
                        </select>
                    </div>

                    <div className="h-6 border-l border-border-color mx-2 self-center"></div>

                    {/* Tải prompt từ Lịch sử */}
                    <div>
                       <label className="block text-xs font-medium text-dark-text mb-1">Tải prompt từ Lịch sử</label>
                       <select onChange={handleReplacePromptsFromHistory} className="w-full max-w-[150px] p-2 text-xs bg-primary rounded-md border border-border-color h-[34px]" disabled={isRunning}>
                            <option value="">-- Chọn để thay thế --</option>
                            {storyOptions.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                        </select>
                    </div>
                    
                    {/* Thêm Prompt (TXT) */}
                    <div>
                        <label className="block text-xs font-medium text-dark-text mb-1">Thêm Prompt</label>
                        <button onClick={handleImportFromFile} disabled={isRunning} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-lg disabled:bg-gray-400 flex items-center justify-center gap-1 text-xs h-[34px]">
                           <FileText className="h-4 w-4" />
                           Từ file TXT
                        </button>
                    </div>

                    <div className="h-6 border-l border-border-color mx-2 self-center"></div>

                    {/* Công tắc Sử dụng ảnh input */}
                    <div className="flex flex-col">
                        <label htmlFor="use-initial-image-toggle" className="flex items-center cursor-pointer mb-1 h-[20px]">
                            <div className="relative">
                                <input type="checkbox" id="use-initial-image-toggle" className="sr-only peer" 
                                       checked={useInitialImage}
                                       onChange={(e) => setUseInitialImage(e.target.checked)} 
                                       disabled={isRunning}
                                />
                                <div className="block bg-gray-400 w-9 h-5 rounded-full peer-checked:bg-green-500 transition peer-disabled:opacity-50"></div>
                                <div className="dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-full peer-disabled:opacity-50"></div>
                            </div>
                            <span className="ml-2 text-dark-text text-xs font-medium">Sử dụng ảnh input</span>
                        </label>
                        <div className="h-[34px] flex items-center">
                            {/* Placeholder */}
                        </div>
                    </div>
                    
                    {/* Ô tải ảnh input ban đầu (hiện khi bật) */}
                    {useInitialImage && (
                        <FrameUploadBox
                            label="Ảnh đầu vào Gốc"
                            preview={initialImagePreview}
                            onChange={handleInitialImageChange}
                            onClear={clearInitialImage}
                            borderColorClass="border-green-500"
                            disabled={isRunning}
                        />
                    )}
                    
                    {/* Cài đặt Lưu */}
                    <div className="flex flex-col">
                        <label htmlFor="allow-overwrite-toggle-ext" className="flex items-center cursor-pointer mb-1">
                            <div className="relative">
                                <input type="checkbox" id="allow-overwrite-toggle-ext" className="sr-only peer" checked={!autoSaveConfig.allowOverwrite} onChange={() => setAutoSaveConfig(prev => ({...prev, allowOverwrite: !prev.allowOverwrite }))} disabled={isRunning}/>
                                <div className="block bg-gray-400 w-9 h-5 rounded-full peer-checked:bg-green-500 transition peer-disabled:opacity-50"></div>
                                <div className="dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-full peer-disabled:opacity-50"></div>
                            </div>
                            <span className="ml-2 text-dark-text text-xs font-medium">File cũ (Video cuối)</span>
                        </label>
                        <div className="h-[34px] flex items-center">
                             <span className="text-dark-text text-xs font-medium whitespace-nowrap">
                                {!autoSaveConfig.allowOverwrite ? 'BẬT (Xóa file)' : 'TẮT (Không xóa file)'}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <label htmlFor="auto-save-toggle-ext" className="flex items-center cursor-pointer mb-1">
                            <div className="relative">
                                <input type="checkbox" id="auto-save-toggle-ext" className="sr-only peer" checked={autoSaveConfig.enabled} onChange={() => setAutoSaveConfig(prev => ({...prev, enabled: !prev.enabled }))} disabled={isRunning}/>
                                <div className="block bg-gray-400 w-9 h-5 rounded-full peer-checked:bg-green-500 transition peer-disabled:opacity-50"></div>
                                <div className="dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-full peer-disabled:opacity-50"></div>
                            </div>
                            <span className="ml-2 text-dark-text text-xs font-medium">Tự động lưu (Video cuối)</span>
                        </label>
                        <div className="flex items-center">
                            <p className="bg-primary border border-r-0 border-border-color text-dark-text text-xs rounded-l-md h-[34px] flex items-center px-2 w-32 truncate" title={autoSaveConfig.path || 'Chưa chọn thư mục'}>{autoSaveConfig.path || 'Chưa chọn...'}</p>
                            <button onClick={handleSelectSaveDir} disabled={!autoSaveConfig.enabled || isRunning} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-2 rounded-r-md text-xs h-[34px] disabled:opacity-50"><Folder className="h-4 w-4"/></button>
                        </div>
                    </div>

                    <div className="flex-grow"></div>
                    
                    {/* Nút Chạy/Dừng */}
                    <div className="flex items-end gap-2 flex-wrap">
                        {isRunning ? (
                            <button onClick={handleStopAll} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-xs h-[34px]">
                                <StopCircle className="h-4 w-4" /> Dừng
                            </button>
                        ) : (
                             <button 
                                onClick={handleRunAll} 
                                disabled={runButtonDisabled} // <-- SỬ DỤNG BIẾN DISABLED
                                title={!isProUser ? "Tính năng này yêu cầu Gói Pro hoặc cao hơn." : "Chạy tuần tự"}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-lg disabled:bg-gray-400 flex items-center justify-center gap-2 text-xs h-[34px]"
                            >
                                <Play className="h-4 w-4" /> Chạy tuần tự
                             </button>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Thanh trạng thái & Progress bar */}
            <div className="mb-3 bg-secondary p-2 rounded-lg shadow-inner">
                 <div className="flex justify-between items-center mb-1">
                     <div className="flex items-center gap-3">
                         <button onClick={handleClearAllPrompts} disabled={isRunning || prompts.length === 0} className="text-red-500 hover:text-red-700 font-bold py-1 px-2 rounded-md disabled:opacity-50 flex items-center gap-1 text-xs">
                             <Trash2 className="h-3 w-3" /> Xóa tất cả Prompt
                         </button>
                         <div className="flex items-center">
                             <input type="checkbox" id="show-only-errors-ext" checked={showOnlyErrors} onChange={(e) => setShowOnlyErrors(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
                             <label htmlFor="show-only-errors-ext" className="ml-2 text-xs font-medium text-dark-text cursor-pointer">Hiển thị prompt Lỗi</label>
                         </div>
                     </div>
                     <div className="flex items-center gap-4 text-xs">
                         {/* Nút chọn cột */}
                         <div className="flex items-center gap-1">
                            <button onClick={() => setGridColumns(2)} title="2 cột" className={`p-1 rounded-md ${gridColumns === 2 ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg'}`}><Columns className="h-4 w-4" /></button>
                            <button onClick={() => setGridColumns(3)} title="3 cột" className={`p-1 rounded-md ${gridColumns === 3 ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg'}`}><LayoutGrid className="h-4 w-4" /></button>
                         </div>
                         <span className="font-semibold text-light">{statusMessage}</span>
                         <span className="font-bold text-blue-600">Tổng: {totalCount}</span>
                         <span className="font-semibold text-yellow-500">Đang chờ: {pendingCount}</span>
                         <span className="font-semibold text-green-600">Hoàn thành: {successCount}</span>
                         <span className="font-semibold text-red-600">Thất bại: {errorCount}</span>
                         <span className="font-semibold text-accent">{Math.round(completedPercentage)}%</span>
                     </div>
                 </div>
                 <div className="w-full bg-primary rounded-full h-1.5 overflow-hidden">
                     <div className="bg-accent h-1.5 rounded-full transition-all duration-300" style={{ width: `${completedPercentage}%` }}></div>
                 </div>
             </div>

            {/* Danh sách prompt */}
            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                <div className={`grid grid-cols-1 md:grid-cols-${gridColumns} gap-4`}>
                    {filteredPrompts.map((prompt: AutomationPrompt, index: number) => {
                        const isProcessingStatus = ['running', 'queued', 'downloading', 'submitting', 'processing'].includes(prompt.status);
                        const originalIndex = prompts.findIndex(p => p.id === prompt.id);
                        const isFirstPrompt = originalIndex === 0;

                        return (
                            <div key={prompt.id} className="bg-secondary p-3 rounded-lg shadow-md flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <label className="block text-dark-text text-sm font-bold">
                                            Prompt #{originalIndex + 1} 
                                            {isFirstPrompt ? (useInitialImage ? " (Video Gốc)" : " (Video - Gốc)") : " (Video - Nối tiếp)"}
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ prompt.status === 'success' ? 'bg-green-100 text-green-800' : isProcessingStatus ? 'bg-blue-100 text-blue-800' : prompt.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800' }`}>
                                            {prompt.message}
                                        </span>
                                        <button onClick={() => removePrompt(prompt.id)} disabled={isRunning} title="Xóa" className="p-1 hover:bg-red-100 rounded-full disabled:opacity-50"><IconX className="h-4 w-4 text-red-500" /></button>
                                    </div>
                                </div>

                                <div className={`relative w-full aspect-video bg-primary rounded-md border border-border-color flex items-center justify-center overflow-hidden group ${isProcessingStatus ? 'rainbow-border-running' : ''}`}>
                                     {prompt.videoUrl ? (
                                     <>
                                        <video key={prompt.videoUrl} controls className="w-full h-full object-contain">
                                            <source src={prompt.videoUrl} type="video/mp4" />
                                        </video>
                                        <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <button onClick={() => handleDownload(prompt.videoUrl, prompt.text)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-full text-xs flex items-center gap-1 pointer-events-auto">
                                                <Download className="h-4 w-4" /> Tải clip
                                            </button>
                                        </div>
                                     </>)
                                     : isProcessingStatus ? (
                                        <div className="text-center"> <Spinner /> <p className="mt-4 text-dark-text text-sm capitalize">{prompt.status}...</p> </div>
                                     )
                                     : (
                                        <div className="text-center text-dark-text text-sm"> <p>{prompt.status === 'error' ? 'Lỗi!' : 'Chờ chạy...'}</p> </div>
                                     )}
                                </div>
                                
                                <textarea
                                    value={prompt.text}
                                    onChange={e => updatePromptText(prompt.id, e.target.value)}
                                    className="w-full p-2 bg-primary rounded-md border border-border-color text-sm resize-y h-24"
                                    readOnly={isRunning}
                                    placeholder={isFirstPrompt ? (useInitialImage ? "Nhập prompt (gốc) ở đây..." : "Nhập prompt (gốc) ở đây...") : "Nhập prompt  (nối tiếp) ở đây..."}
                                />
                            </div>
                        )
                    })}
                </div>
                
                 <button onClick={addPromptField} disabled={isRunning} className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 text-sm h-[34px] w-auto mx-auto">
                     <Plus className="h-5 w-5" />
                     Thêm Prompt (Phân cảnh)
                 </button>
            </div>
            
        </div>
    );
};

export default CreateExtendedVideoView;