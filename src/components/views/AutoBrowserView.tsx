import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import Spinner from '../common/Spinner';
import { Story, AutomationState, AutomationPrompt, AutomationStatus, AppView, UserCookie, AutoSaveConfig } from '../../types';
import { useToast } from '../../context/ToastContext';
import { checkVeoVideoStatus, upsampleVeoVideo } from '../../services/labsApiService';

interface AutoBrowserViewProps {
    setActiveView: (view: AppView) => void;
}

const POLL_INTERVAL = 10000; // 10 giây

const AutoBrowserView: React.FC<AutoBrowserViewProps> = ({ setActiveView }) => {
    const {
        currentUser,
        stories,
        prompts: allPrompts, // Lịch sử prompt đã tạo từ các view khác
        addVideo, // Hàm thêm video vào HistoryView
        autoSaveConfig,       // Lấy từ context
        setAutoSaveConfig,    // Lấy từ context
        automationState, // State riêng cho view này
        setAutomationState,
        refreshCurrentUser,
        activeCookie, // Cookie đang dùng (nếu có)
        updateAutomationPrompt, // Hàm cập nhật trạng thái 1 prompt trong view này
    } = useAppContext();

    const { showToast } = useToast();
    const [selectedPromptIds, setSelectedPromptIds] = useState<Set<string>>(new Set());
    // Mặc định 2 cột
    const [gridColumns, setGridColumns] = useState(2);
    // State để lọc lỗi
    const [showOnlyErrors, setShowOnlyErrors] = useState(false);

    const { prompts, isRunning, model, aspectRatio, concurrentStreams } = automationState;

    // State cục bộ cho input số lượng chia phần
    const [videosPerFolderInput, setVideosPerFolderInput] = useState(autoSaveConfig.videosPerFolder || 10);

    // Cập nhật state trong context khi input thay đổi
    const handleVideosPerFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        if (value > 0) {
            setVideosPerFolderInput(value);
            setAutoSaveConfig(prev => ({ ...prev, videosPerFolder: value }));
        } else if (e.target.value === '') {
            setVideosPerFolderInput(NaN); // Cho phép ô trống tạm thời
        }
    };

    // Đồng bộ khi config từ context thay đổi
    useEffect(() => {
        setVideosPerFolderInput(autoSaveConfig.videosPerFolder || 10);
    }, [autoSaveConfig.videosPerFolder]);


    useEffect(() => {
        // Lắng nghe log từ main process
        const unsubscribeLog = window.electronAPI.onBrowserLog((log) => {
            let videoAddedToHistory = false; // Flag để tránh toast trùng lặp nếu update nhanh
            setAutomationState((prev: AutomationState) => {
                let newPrompts = prev.prompts.map((p: AutomationPrompt) => {
                    // Cập nhật prompt tương ứng với log nhận được
                    if (p.id === log.promptId) {
                        const newStatus = log.status as AutomationStatus || p.status;
                        const updates: Partial<AutomationPrompt> = {
                            status: newStatus,
                            message: log.message,
                            videoUrl: log.videoUrl || p.videoUrl,
                            operationName: log.operationName || p.operationName,
                            mediaId: log.mediaId || p.mediaId,
                            projectId: log.projectId || p.projectId,
                            cookie: log.cookie || p.cookie,
                        };
                        // Nếu thành công và có URL video MỚI (tránh trường hợp log update khác)
                        if (newStatus === 'success' && log.videoUrl && !p.videoUrl) {
                             addVideo({
                                id: `${p.id}-${Date.now()}`, promptId: p.id, promptText: p.text, status: 'completed',
                                videoUrl: log.videoUrl, mediaId: log.mediaId, projectId: log.projectId,
                                aspectRatio: prev.aspectRatio, cookie: log.cookie,
                            });
                            videoAddedToHistory = true;
                        }
                        return { ...p, ...updates };
                    }
                    return p;
                });

                // Xử lý tín hiệu 'finished'
                if (log.status === 'finished') {
                    newPrompts = newPrompts.map(p => {
                        if (['queued', 'submitting', 'processing', 'running'].includes(p.status)) {
                            return { ...p, status: 'idle', message: 'Đã dừng' };
                        }
                        return p;
                    });
                    // Quan trọng: Đặt isRunning thành false khi nhận được tín hiệu 'finished'
                    return { ...prev, prompts: newPrompts, isRunning: false, statusMessage: log.message };
                }

                // Kiểm tra lại trạng thái isRunning sau khi cập nhật
                // Vẫn giữ isRunning = true nếu có bất kỳ prompt nào đang chạy
                const isStillRunning = newPrompts.some(p => ['queued', 'submitting', 'processing', 'running'].includes(p.status));
                return { ...prev, prompts: newPrompts, isRunning: isStillRunning };
            });
        });

        // Lắng nghe download
        const unsubscribeDownload = window.electronAPI.onDownloadComplete(({success, path, error}) => {
             if (success && path && path !== 'Skipped') { showToast(`Video đã lưu tại: ${path}`, 'success'); }
             else if (!success && error && error !== 'Download canceled') { showToast(`Lỗi tải video: ${error}`, 'error'); }
        });

        // Lắng nghe cookie
        const unsubscribeCookieUpdate = window.electronAPI.onCookieUpdate((updatedCookie) => {
            console.log('Received cookie update:', updatedCookie);
            showToast('Token & Cookie đã cập nhật!', 'info');
        });
        return () => { unsubscribeLog(); unsubscribeDownload(); unsubscribeCookieUpdate(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setAutomationState, addVideo, showToast, automationState.aspectRatio]);

    // Lấy danh sách story/lịch sử
    const storyOptions = useMemo(() => {
        const options = stories.map(story => ({ id: story.id, title: story.title }));
        const manualPromptsMap = new Map<string, string>();
        allPrompts.forEach(prompt => {
            if (prompt.storyId.startsWith('manual-')) {
                if (!manualPromptsMap.has(prompt.storyId)) { manualPromptsMap.set(prompt.storyId, prompt.storyTitle); }
            }
        });
        manualPromptsMap.forEach((title, id) => { if (!options.some(opt => opt.id === id)) { options.push({ id, title }); } });
        options.sort((a, b) => a.title.localeCompare(b.title));
        return options;
    }, [stories, allPrompts]);

    // Polling upsample
    useEffect(() => {
        const promptsToPoll = prompts.filter(p => p.upsampleStatus === 'processing' && p.upsampleOperationName);
        if (promptsToPoll.length === 0) return;
        const intervalId = setInterval(() => {
            promptsToPoll.forEach(prompt => {
                const [operationName, sceneId] = (prompt.upsampleOperationName || '').split('|');
                const cookieToUse = prompt.cookie || activeCookie;
                if (!operationName || !sceneId || !cookieToUse) return;
                checkVeoVideoStatus(cookieToUse, operationName, sceneId)
                    .then(operation => {
                        if (operation.status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
                            const upsampledVideoUrl = operation?.operation?.metadata?.video?.fifeUrl || operation?.operation?.metadata?.video?.servingBaseUri;
                            updateAutomationPrompt(prompt.id, { upsampleStatus: 'completed', upsampledVideoUrl });
                            showToast(`Video #${prompt.id.substring(0, 5)}... đã nâng cấp xong!`, 'success');
                        } else if (operation.status === 'MEDIA_GENERATION_STATUS_FAILED' || operation.error) {
                            const error = operation?.error?.message || 'Nâng cấp thất bại.';
                            updateAutomationPrompt(prompt.id, { upsampleStatus: 'failed' });
                            showToast(`Nâng cấp thất bại: ${error}`, 'error');
                        }
                    })
                    .catch(err => {
                        console.error('Upsample polling error:', err);
                        updateAutomationPrompt(prompt.id, { upsampleStatus: 'failed' });
                    });
            });
        }, POLL_INTERVAL);
        return () => clearInterval(intervalId);
    }, [prompts, activeCookie, updateAutomationPrompt, showToast]);

    // Tính toán trạng thái tổng quan
    const { successCount, errorCount, pendingCount, totalCount, statusMessage, completedPercentage } = useMemo(() => {
        const total = prompts.length;
        if (total === 0) { return { successCount: 0, errorCount: 0, pendingCount: 0, totalCount: 0, statusMessage: "Sẵn sàng.", completedPercentage: 0 }; }
        const success = prompts.filter(p => p.status === 'success').length;
        const error = prompts.filter(p => p.status === 'error').length;
        const pending = prompts.filter(p => p.status === 'idle' || p.status === 'queued').length;
        const finished = success + error;
        let message = `Đang chờ ${pending}/${total}...`;
        if (isRunning) { message = `Đang xử lý ${finished}/${total}...`; }
        else if (finished > 0 && finished < total && total > 0) { message = "Đã dừng."; } // Chỉ hiện "Đã dừng" khi có prompt đã xử lý
        else if (finished === total && total > 0) { message = "Hoàn thành!"; }
        const percentage = total > 0 ? (success / total) * 100 : 0;
        return { successCount: success, errorCount: error, pendingCount: pending, totalCount: total, statusMessage: message, completedPercentage: percentage };
    }, [prompts, isRunning]);

    // Hàm setter cho context state
    const setPrompts = (updater: React.SetStateAction<AutomationPrompt[]>) => { setAutomationState((prev: any) => ({ ...prev, prompts: typeof updater === 'function' ? updater(prev.prompts) : updater })); };
    const setModel = (newModel: string) => { setAutomationState((prev: any) => ({ ...prev, model: newModel })); };
    const setAspectRatio = (newAspectRatio: 'LANDSCAPE' | 'PORTRAIT') => { setAutomationState((prev: any) => ({ ...prev, aspectRatio: newAspectRatio })); };
    const setConcurrentStreams = (streams: number) => { setAutomationState((prev: any) => ({ ...prev, concurrentStreams: streams })); };
    const updatePromptText = (id: string, text: string) => { setPrompts((prev: AutomationPrompt[]) => prev.map((p: AutomationPrompt) => p.id === id ? { ...p, text } : p)); };
    
    // Handler Download
    const handleDownload = (videoUrl: string | undefined, promptText: string) => { 
        if (videoUrl) { 
            window.electronAPI.downloadVideo({ url: videoUrl, promptText, savePath: null, promptIndex: 0 }); 
        } else { 
            showToast('Không có URL video.', 'error'); 
        } 
    };
    
    // Handler Upsample (ẩn)
    const handleUpsample = async (prompt: AutomationPrompt) => { 
        const cookieToUse = prompt.cookie || activeCookie;
        if (!cookieToUse) { showToast('Không tìm thấy cookie.', 'error'); return; }
        if (!prompt.mediaId || !prompt.projectId) { showToast('Thiếu thông tin (mediaId/projectId).', 'error'); return; }
        updateAutomationPrompt(prompt.id, { upsampleStatus: 'pending' });
        try {
            const { operationName, sceneId } = await upsampleVeoVideo(cookieToUse, prompt.projectId, prompt.mediaId, aspectRatio);
            updateAutomationPrompt(prompt.id, {
                upsampleStatus: 'processing',
                upsampleOperationName: `${operationName}|${sceneId}`
            });
            showToast('Đã gửi yêu cầu nâng cấp 1080p.', 'info');
        } catch (error: any) {
            updateAutomationPrompt(prompt.id, { upsampleStatus: 'failed' });
            showToast(`Lỗi nâng cấp: ${error.message}`, 'error');
        }
    };
    
    // Handler chọn thư mục lưu
    const handleSelectSaveDir = async () => { 
        const path = await window.electronAPI.selectDownloadDirectory(); 
        if (path) { 
            setAutoSaveConfig({ ...autoSaveConfig, path }); 
            showToast(`Thư mục lưu tự động: ${path}`, 'success'); 
        } 
    };
    
    // Kiểm tra subscription
    const checkSubscription = async (): Promise<boolean> => { 
        await refreshCurrentUser(); 
        await new Promise(resolve => setTimeout(resolve, 100));
        const updatedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!updatedUser || !updatedUser.subscription) { 
            showToast('Bạn cần nâng cấp gói.', 'error'); 
            setActiveView(AppView.PACKAGES); 
            return false; 
        }
        const endDate = new Date(updatedUser.subscription.end_date);
        if (endDate < new Date()) { 
            showToast('Gói đăng ký đã hết hạn.', 'error'); 
            setActiveView(AppView.PACKAGES); 
            return false; 
        }
        return true;
    };
    
    // Chạy prompts
    const runPrompts = async (promptsToRun: AutomationPrompt[]) => { 
        if (!await checkSubscription()) return;
        if (promptsToRun.length === 0) { showToast('Không có prompt nào phù hợp.', 'info'); return; }
        setAutomationState((prev: AutomationState) => ({ 
            ...prev, 
            prompts: prev.prompts.map(p => promptsToRun.find(pr => pr.id === p.id) ? { ...p, status: 'queued', message: 'Đang chờ...' } : p), 
            isRunning: true 
        }));
        const promptsWithOriginalIndex = promptsToRun.map(p => ({ 
            ...p, 
            originalIndex: automationState.prompts.findIndex(op => op.id === p.id) 
        }));
        window.electronAPI.startBrowserAutomation({ 
            prompts: promptsWithOriginalIndex, 
            authToken: currentUser!.token, 
            model, aspectRatio, 
            autoSaveConfig, // Gửi config đầy đủ
            currentUser, 
            concurrentStreams 
        });
    };
    
    // Handlers nút bấm chính
    const handleRunAll = () => runPrompts(prompts);
    const handleRunUnfinished = () => runPrompts(prompts.filter(p => p.status !== 'success'));
    const handleRetryFailed = () => runPrompts(prompts.filter(p => p.status === 'error'));
    const handleRunSinglePrompt = (promptId: string) => { const promptToRun = prompts.find(p => p.id === promptId); if (promptToRun) runPrompts([promptToRun]); };
    const handleRunSelected = () => { const selectedPrompts = prompts.filter(p => selectedPromptIds.has(p.id)); runPrompts(selectedPrompts); };
    
    // Handlers chọn/bỏ chọn
    const handleToggleSelect = (id: string) => { setSelectedPromptIds(prev => { const newSet = new Set(prev); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); return newSet; }); };
    const handleToggleSelectAll = () => { if (selectedPromptIds.size === prompts.length) setSelectedPromptIds(new Set()); else setSelectedPromptIds(new Set(prompts.map(p => p.id))); };
    
    // Handler dừng
    const handleStopAll = () => { 
        window.electronAPI.stopBrowserAutomation(); 
        setAutomationState((prev: AutomationState) => ({ ...prev, isRunning: false })); // Cập nhật state ngay
    };
    
    // Handler xóa prompts
    const handleClearAllPrompts = () => { if (window.confirm(`Xóa tất cả ${prompts.length} prompt?`)) { setPrompts([]); setSelectedPromptIds(new Set()); showToast('Đã xóa tất cả prompts.', 'info'); } };
    const addPromptField = () => { setPrompts((prev: AutomationPrompt[]) => [...prev, { id: `prompt-${Date.now()}-${Math.random()}`, text: '', status: 'idle', message: 'Sẵn sàng' }]); };
    const removePrompt = (id: string) => { setPrompts((prev: AutomationPrompt[]) => prev.filter((p: AutomationPrompt) => p.id !== id)); setSelectedPromptIds(prev => { const newSet = new Set(prev); newSet.delete(id); return newSet; }); };
    
    // Handler import file TXT (hỗ trợ JSON)
    const handleImportFromFile = async () => { 
        if (isRunning) return;
        const result = await window.electronAPI.importPromptsFromFile(); 
        if (result.success && result.prompts) {
            const newPrompts: AutomationPrompt[] = result.prompts.map(text => ({ id: `prompt-${Date.now()}-${Math.random()}`, text, status: 'idle', message: 'Sẵn sàng' }));
            setPrompts(prev => [...prev, ...newPrompts]); 
            showToast(`Đã nhập ${newPrompts.length} prompt từ file.`, 'success');
        } else if (result.error && result.error !== 'No file selected') { showToast(`Lỗi nhập file: ${result.error}`, 'error'); }
    };
    
    // Handler tải prompt từ lịch sử (thay thế)
    const handleReplacePromptsFromHistory = (e: React.ChangeEvent<HTMLSelectElement>) => { 
        const storyId = e.target.value; if (!storyId) return;
        const relatedPrompts = allPrompts.filter(p => p.storyId === storyId);
        const promptsToSet = relatedPrompts.map(p => ({ id: `prompt-${Date.now()}-${Math.random()}`, text: p.prompt, status: 'idle', message: 'Sẵn sàng' } as AutomationPrompt));
        if (promptsToSet.length > 0) { setPrompts(promptsToSet); setSelectedPromptIds(new Set()); } 
        else { showToast(`Không tìm thấy prompt.`, 'info'); }
        e.target.value = ""; 
    };

    // Danh sách prompt được lọc dựa trên checkbox
    const filteredPrompts = useMemo(() => {
        if (showOnlyErrors) {
            return prompts.filter(p => p.status === 'error');
        }
        return prompts;
    }, [prompts, showOnlyErrors]);

    return (
        <div className="animate-fade-in h-full flex flex-col">
            <h1 className="text-xl font-bold text-light mb-2">Tạo video bằng Veo3/Veo 3.1 / Text to Videos</h1>
            <p className="text-dark-text mb-4">Tự động hóa quy trình tạo video hàng loạt.</p>

            {/* Thanh cài đặt */}
            <div className="bg-secondary p-3 rounded-lg shadow-md mb-3">
                 <div className="flex flex-wrap items-end gap-x-4 gap-y-2"> {/* items-end */}
                    {/* Model */}
                    <div>
                        <label className="block text-xs font-medium text-dark-text mb-1">Model</label>
                        <select value={model} onChange={e => setModel(e.target.value)} className="w-full p-2 text-xs bg-primary rounded-md border border-border-color h-[34px]" disabled={isRunning}>
                            <option value="veo_3_0_t2v_fast_ultra">Veo 3 / Veo 3.1</option>
                            <option value="veo_3_1_t2v">Veo 3.1</option>
                        </select>
                    </div>
                    {/* Tỷ lệ */}
                    <div>
                        <label className="block text-xs font-medium text-dark-text mb-1">Tỷ lệ</label>
                        <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as any)} className="w-full p-2 text-xs bg-primary rounded-md border border-border-color h-[34px]" disabled={isRunning}>
                            <option value="LANDSCAPE">16:9 Ngang</option>
                            <option value="PORTRAIT">9:16 Dọc</option>
                        </select>
                    </div>
                    {/* Luồng */}
                    <div>
                        <label className="block text-xs font-medium text-dark-text mb-1">Luồng (4-8)</label>
                        <input type="number" value={concurrentStreams} onChange={e => setConcurrentStreams(Math.max(4, Math.min(12, parseInt(e.target.value) || 4)))} min="4" max="12" className="w-20 p-2 text-xs bg-primary rounded-md border border-border-color h-[34px]" disabled={isRunning} />
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
                        <div className="flex items-center gap-2">
                            <button onClick={handleImportFromFile} disabled={isRunning} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-lg disabled:bg-gray-400 flex items-center justify-center gap-1 text-xs h-[34px]">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                TXT / json
                            </button>
                            {/* Nút JSON đã bị xóa */}
                        </div>
                    </div>
                    
                    {/* CẬP NHẬT: Di chuyển cài đặt lưu vào đây */}
                     <div className="h-6 border-l border-border-color mx-2 self-center"></div>

                    {/* Cho phép đè */}
                    <div className="flex flex-col">
                        <label htmlFor="allow-overwrite-toggle" className="flex items-center cursor-pointer mb-1">
                            {/* Công tắc */}
                            <div className="relative">
                                <input type="checkbox" id="allow-overwrite-toggle" className="sr-only peer" 
                                       checked={!autoSaveConfig.allowOverwrite} // Đảo ngược logic (BẬT = Đè file)
                                       onChange={() => setAutoSaveConfig(prev => ({...prev, allowOverwrite: !prev.allowOverwrite }))} 
                                       disabled={isRunning}
                                />
                                <div className="block bg-gray-400 w-9 h-5 rounded-full peer-checked:bg-green-500 transition peer-disabled:opacity-50"></div>
                                <div className="dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-full peer-disabled:opacity-50"></div>
                            </div>
                            <span className="ml-2 text-dark-text text-xs font-medium">File cũ</span>
                        </label>
                        {/* Hiển thị trạng thái */}
                        <div className="h-[34px] flex items-center">
                             <span className="text-dark-text text-xs font-medium whitespace-nowrap">
                                {!autoSaveConfig.allowOverwrite ? 'BẬT (Xóa file)' : 'TẮT (Không xóa file)'}
                            </span>
                        </div>
                    </div>

                    {/* Tự động lưu */}
                    <div className="flex flex-col">
                        <label htmlFor="auto-save-toggle" className="flex items-center cursor-pointer mb-1">
                            <div className="relative">
                                <input type="checkbox" id="auto-save-toggle" className="sr-only peer" checked={autoSaveConfig.enabled} onChange={() => setAutoSaveConfig(prev => ({...prev, enabled: !prev.enabled }))} disabled={isRunning}/>
                                <div className="block bg-gray-400 w-9 h-5 rounded-full peer-checked:bg-green-500 transition peer-disabled:opacity-50"></div>
                                <div className="dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-full peer-disabled:opacity-50"></div>
                            </div>
                            <span className="ml-2 text-dark-text text-xs font-medium">Tự động lưu</span>
                        </label>
                        <div className="flex items-center">
                            <p className="bg-primary border border-r-0 border-border-color text-dark-text text-xs rounded-l-md h-[34px] flex items-center px-2 w-32 truncate" title={autoSaveConfig.path || 'Chưa chọn thư mục'}>{autoSaveConfig.path || 'Chưa chọn...'}</p>
                            <button onClick={handleSelectSaveDir} disabled={!autoSaveConfig.enabled || isRunning} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-2 rounded-r-md text-xs h-[34px] disabled:opacity-50">Đổi</button>
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
                            <span className="ml-2 text-dark-text text-xs font-medium">video/phần</span>
                        </label>
                         <div className="flex items-center">
                            <input
                                type="number"
                                value={isNaN(videosPerFolderInput) ? '' : videosPerFolderInput}
                                onChange={handleVideosPerFolderChange}
                                onBlur={() => { if (isNaN(videosPerFolderInput)) setVideosPerFolderInput(10); }}
                                min="1"
                                disabled={!autoSaveConfig.enabled || !autoSaveConfig.splitFolders || isRunning}
                                className="w-20 p-2 text-xs bg-primary rounded-md border border-border-color h-[34px] disabled:opacity-50"
                            />
                        </div>
                    </div>
                    {/* Kết thúc Cài đặt Lưu */}


                    <div className="flex-grow"></div> {/* Đẩy nút chạy sang phải */}
                    
                    {/* Nút Chạy/Dừng */}
                    <div className="flex items-end gap-2 flex-wrap">
                        {isRunning ? (
                            <button onClick={handleStopAll} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-xs h-[34px]">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg>
                                Dừng Tất cả
                            </button>
                        ) : (
                             <div className="flex items-center gap-2">
                                <button onClick={handleRunAll} disabled={prompts.length === 0} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-lg disabled:bg-gray-400 flex items-center justify-center gap-2 text-xs h-[34px]">
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                   Chạy tất cả
                                </button>
                                {prompts.some(p => p.status !== 'success' && p.status !== 'idle') && (
                                <button onClick={handleRunUnfinished} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1 text-xs h-[34px]">
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M2.05 11A9 9 0 0012 20a9 9 0 009-9 9 9 0 00-9-9" /></svg>
                                   Chạy lại chưa xong
                                </button>
                                )}
                                {errorCount > 0 && (
                                <button onClick={handleRetryFailed} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1 text-xs h-[34px]">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M2.05 11A9 9 0 0012 20a9 9 0 009-9 9 9 0 00-9-9" /></svg>
                                    Chạy lại {errorCount} lỗi
                                </button>
                                )}
                             </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Thanh trạng thái & Progress bar */}
            <div className="mb-3 bg-secondary p-2 rounded-lg shadow-inner">
                 <div className="flex justify-between items-center mb-1">
                     {/* Các nút điều khiển hàng loạt & Lọc lỗi */}
                     <div className="flex items-center gap-3">
                         <div className="flex items-center">
                             <input type="checkbox" id="select-all-prompts" checked={prompts.length > 0 && selectedPromptIds.size === prompts.length} onChange={handleToggleSelectAll} disabled={isRunning || prompts.length === 0} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
                             <label htmlFor="select-all-prompts" className="ml-2 text-xs font-medium text-dark-text cursor-pointer">Chọn tất cả</label>
                         </div>
                         {selectedPromptIds.size > 0 && (
                             <button onClick={handleRunSelected} disabled={isRunning} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1 px-2 rounded-md disabled:bg-gray-400 flex items-center gap-1 text-xs">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                 Chạy ({selectedPromptIds.size})
                             </button>
                         )}
                         <button onClick={handleClearAllPrompts} disabled={isRunning || prompts.length === 0} className="text-red-500 hover:text-red-700 font-bold py-1 px-2 rounded-md disabled:opacity-50 flex items-center gap-1 text-xs">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             Xóa tất cả Prompt
                         </button>
                         {/* Checkbox lọc lỗi */}
                         <div className="flex items-center">
                             <input type="checkbox" id="show-only-errors" checked={showOnlyErrors} onChange={(e) => setShowOnlyErrors(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
                             <label htmlFor="show-only-errors" className="ml-2 text-xs font-medium text-dark-text cursor-pointer">Hiển thị prompt Lỗi</label>
                         </div>
                     </div>
                     {/* Thông tin trạng thái & Nút chọn cột */}
                     <div className="flex items-center gap-4 text-xs">
                         <div className="flex items-center gap-1">
                            <button onClick={() => setGridColumns(2)} title="2 cột" className={`p-1 rounded-md ${gridColumns === 2 ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16"/></svg></button>
                            <button onClick={() => setGridColumns(3)} title="3 cột" className={`p-1 rounded-md ${gridColumns === 3 ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg></button>
                         </div>
                         <span className="font-semibold text-light">{statusMessage}</span>
                         <span className="font-bold text-blue-600">Tổng: {totalCount}</span>
                         <span className="font-semibold text-yellow-500">Đang chờ: {pendingCount}</span>
                         <span className="font-semibold text-green-600">Hoàn thành: {successCount}</span>
                         <span className="font-semibold text-red-600">Thất bại: {errorCount}</span>
                         <span className="font-semibold text-accent">{Math.round(completedPercentage)}%</span>
                     </div>
                 </div>
                 {/* Progress bar */}
                 <div className="w-full bg-primary rounded-full h-1.5 overflow-hidden">
                     <div className="bg-accent h-1.5 rounded-full transition-all duration-300" style={{ width: `${completedPercentage}%` }}></div>
                 </div>
             </div>

            {/* Danh sách prompt */}
            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                {/* Sử dụng filteredPrompts */}
                <div className={`grid grid-cols-1 md:grid-cols-${gridColumns} gap-4`}>
                    {filteredPrompts.map((prompt: AutomationPrompt) => {
                        const isProcessingStatus = ['running', 'queued', 'downloading', 'submitting', 'processing'].includes(prompt.status);
                        // Tìm index gốc
                        const originalIndex = prompts.findIndex(p => p.id === prompt.id);

                        return (
                            <div key={prompt.id} className="bg-secondary p-3 rounded-lg shadow-md flex flex-col gap-2">
                                {/* Header (hiển thị index gốc) */}
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={selectedPromptIds.has(prompt.id)} onChange={() => handleToggleSelect(prompt.id)} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" disabled={isRunning}/>
                                        <label className="block text-dark-text text-sm font-bold">Prompt #{originalIndex + 1}</label>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ /* ... */ prompt.status === 'success' ? 'bg-green-100 text-green-800' : isProcessingStatus ? 'bg-blue-100 text-blue-800' : prompt.status === 'error' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800' }`}>{prompt.message}</span>
                                        <button onClick={() => handleRunSinglePrompt(prompt.id)} disabled={isRunning} title="Chạy prompt này" className="p-1 hover:bg-green-100 rounded-full disabled:opacity-50"><svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path></svg></button>
                                        <button onClick={() => removePrompt(prompt.id)} disabled={isRunning} title="Xóa" className="p-1 hover:bg-red-100 rounded-full disabled:opacity-50"><svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                    </div>
                                </div>

                                {/* Ô kết quả */}
                                <div className={`relative w-full aspect-video bg-primary rounded-md border border-border-color flex items-center justify-center overflow-hidden group ${isProcessingStatus ? 'rainbow-border-running' : ''}`}>
                                     {/* ... (Logic hiển thị video/spinner giữ nguyên) ... */}
                                     {prompt.videoUrl ? (<><video key={prompt.upsampledVideoUrl || prompt.videoUrl} controls className="w-full h-full object-contain"><source src={prompt.upsampledVideoUrl || prompt.videoUrl} type="video/mp4" /></video>
                                     <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"><button onClick={() => handleDownload(prompt.upsampledVideoUrl || prompt.videoUrl, prompt.text)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-full text-xs flex items-center gap-1 pointer-events-auto"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                     Tải video {prompt.upsampledVideoUrl ? '1080p' : ''}</button>
                                     {/* (Nút Upsample ẩn) */}{(prompt.upsampleStatus === 'pending' || prompt.upsampleStatus === 'processing') && (<span className="text-white text-xs bg-purple-600 px-2 py-1 rounded-md flex items-center gap-1 pointer-events-auto"><Spinner className="w-3 h-3"/> Nâng cấp...</span>)}{prompt.upsampleStatus === 'failed' && (<button onClick={() => handleUpsample(prompt)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 pointer-events-auto" title="Thử lại nâng cấp"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M2.05 11A9 9 0 0012 20a9 9 0 009-9 9 9 0 00-9-9" /></svg>Lỗi 1080p</button>)}</div></>)
                                     : isProcessingStatus ? (<div className="text-center"><Spinner /><p className="mt-4 text-dark-text text-sm capitalize">{prompt.status}...</p></div>)
                                     : (<div className="text-center text-dark-text text-sm"><p>{prompt.status === 'error' ? 'Lỗi!' : 'Chờ chạy...'}</p></div>)}
                                </div>
                                
                                {/* Textarea prompt */}
                                <textarea
                                    value={prompt.text}
                                    onChange={e => updatePromptText(prompt.id, e.target.value)}
                                    className="w-full p-2 bg-primary rounded-md border border-border-color text-sm resize-y h-24"
                                    readOnly={isRunning}
                                    placeholder="Nhập prompt để tạo video ở đây..."
                                />
                            </div>
                        )
                    })}
                </div> {/* Kết thúc grid */}
                
                {/* Nút thêm prompt mới */}
                 <button onClick={addPromptField} disabled={isRunning} className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 text-sm h-[34px] w-auto mx-auto">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                     Thêm Prompt mới
                 </button>
            </div> {/* Kết thúc container cuộn */}
            
        </div> /* Kết thúc component */
    );
};

export default AutoBrowserView;