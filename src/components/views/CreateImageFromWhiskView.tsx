// src/components/views/CreateImageFromWhiskView.tsx
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAppContext, useLocalStorage } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { createWhiskWorkflow, generateWhiskImage, uploadWhiskImage } from '../../services/whiskService';
import { AbortError } from '../../services/geminiService';
import Spinner from '../common/Spinner';
import { WhiskImage, Story, VideoPrompt, WhiskTask, WhiskTaskStatus, AspectRatio, UserCookie, AppView } from '../../types';
import {
  Plus, Trash2, Play, Loader2, AlertTriangle, CheckCircle2, Wand2, X, LayoutGrid, Columns, Download, Folder, StopCircle, FileText, RotateCcw, RefreshCcw, BookOpen, Users, Image as ImageIcon, ToggleLeft, ToggleRight, UploadCloud
} from 'lucide-react';

// === Định nghĩa các lớp CSS Tailwind ===
const btnBase = "py-2 px-4 rounded-lg font-bold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center";
const btnPrimary = "bg-accent hover:bg-indigo-500 text-white";
const btnSecondary = "bg-primary hover:bg-hover-bg text-dark-text border border-border-color";
const btnDanger = "bg-red-600 hover:bg-red-700 text-white";
const btnWarning = "bg-yellow-500 hover:bg-yellow-600 text-white";
const btnBlue = "bg-blue-500 hover:bg-blue-600 text-white";

const inputBase = "w-full p-3 bg-primary rounded-md border border-border-color focus:ring-2 focus:ring-accent focus:outline-none transition text-sm text-light placeholder:text-dark-text";
const selectBase = `${inputBase} appearance-none`;
const labelBase = "block text-dark-text font-bold mb-2";


// === Component Thẻ Tác Vụ ===
const WhiskTaskCard: React.FC<{
  task: WhiskTask;
  index: number;
  onUpdateTask: (id: string, updates: Partial<WhiskTask>) => void;
  onToggleSelect: (id: string) => void;
  onRunTask: (id: string) => void;
  onRemoveTask: (id: string) => void;
  isRunning: boolean;
  isProUser: boolean; 
}> = ({ task, index, onUpdateTask, onToggleSelect, onRunTask, onRemoveTask, isRunning, isProUser }) => {
  
  const { showToast } = useToast();

  const getStatusBadge = () => {
    switch (task.status) {
      case 'success':
        return <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">{task.message || 'Thành công!'}</span>;
      case 'processing':
        return <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{task.message || 'Đang xử lý...'}</span>;
      case 'failed':
        return <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">{task.message || 'Thất bại'}</span>;
      case 'queued':
        return <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">{task.message || 'Đang chờ...'}</span>;
      default:
         const defaultMessage = (task.error === 'Đã hủy' || task.error === 'Đã dừng') ? task.error : 'Sẵn sàng';
        return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${task.error ? 'text-gray-500 bg-gray-200' : 'text-gray-600 bg-gray-100'}`}>{task.message || defaultMessage}</span>;
    }
  };

  const handleDownload = () => {
    if (task.imageUrl) {
      const title = task.prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_') || `whisk_${task.seed}`;
      window.electronAPI.downloadImage({ 
        imageDataUrl: task.imageUrl, 
        storyTitle: title 
      });
    } else {
      showToast('Không tìm thấy ảnh để tải.', 'error');
    }
  };

  return (
    <div className="border border-border-color rounded-lg shadow-sm bg-secondary overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-border-color bg-primary">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`check-${task.id}`}
            checked={task.isSelected}
            onChange={() => onToggleSelect(task.id)}
            className="h-4 w-4 rounded border-border-color text-accent focus:ring-accent"
          />
          <label htmlFor={`check-${task.id}`} className="font-semibold text-light text-sm">
            Hình ảnh #{index + 1}
          </label>
        </div>
        {getStatusBadge()}
      </div>

      <div className="aspect-video w-full bg-primary flex items-center justify-center relative group">
        
        {task.status === 'processing' && (
          <div className="flex flex-col items-center gap-2 text-dark-text">
            <Loader2 className="h-10 w-10 animate-spin text-accent" />
            <span className="font-bold">{task.message || 'Đang tạo ảnh...'}</span>
          </div>
        )}
        
        {task.status === 'success' && task.imageUrl && (
          <>
            <img src={task.imageUrl} alt="Kết quả tạo ảnh" className="w-full h-full object-contain" />
            <button
              onClick={handleDownload}
              title="Tải ảnh này"
              className={`
                absolute top-3 right-3 p-2 
                rounded-full 
                bg-black/50 text-white 
                hover:bg-black/70 
                opacity-0 group-hover:opacity-100 
                transition-all duration-200
                disabled:opacity-50
              `}
            >
              <Download className="h-4 w-4" />
            </button>
          </>
        )}
        
         {task.status === 'success' && !task.imageUrl && (
          <div className="flex flex-col items-center gap-2 text-green-600 p-4">
            <CheckCircle2 className="h-10 w-10" />
            <span className="text-sm font-bold">Tạo ảnh thành công</span>
            <p className="text-xs text-center">(Không thể hiển thị ảnh sau khi tải lại)</p>
          </div>
        )}

        {task.status === 'failed' && (
          <div className="flex flex-col items-center gap-2 text-red-500 p-4">
            <AlertTriangle className="h-10 w-10" />
            <span className="text-sm font-bold">{task.message || 'Tạo ảnh thất bại'}</span>
            <p className="text-xs text-center">{task.error}</p>
          </div>
        )}
        
        {(task.status === 'idle' || task.status === 'queued') && (
          <div className="flex flex-col items-center gap-2 text-dark-text opacity-50">
            <Wand2 className="h-10 w-10" />
            <span className="font-bold">{task.message || 'Chờ tạo ảnh'}</span>
          </div>
        )}
      </div>

      <div className="p-3 space-y-3">
        <div>
          <label htmlFor={`prompt-${task.id}`} className="block text-xs font-medium text-dark-text mb-1">Prompt</label>
          <textarea
            id={`prompt-${task.id}`}
            value={task.prompt}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onUpdateTask(task.id, { prompt: e.target.value })}
            placeholder="Một người phụ nữ siêu thực mặc áo choàng làm bằng nước..."
            rows={4}
            className={inputBase}
            disabled={isRunning || task.status === 'processing'}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 p-3 border-t border-border-color">
        <button
          type="button"
          onClick={() => onRemoveTask(task.id)}
          disabled={isRunning || task.status === 'processing'}
          className={`${btnBase} ${btnSecondary} text-xs py-1 px-2`} 
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onRunTask(task.id)}
          disabled={isRunning || task.status === 'processing' || !task.prompt || !isProUser}
          title={!isProUser ? "Tính năng Pro: Yêu cầu nâng cấp gói" : (task.status === 'success' || task.status === 'failed' ? 'Chạy Lại' : 'Chạy')}
          className={`${btnBase} ${btnPrimary} text-xs py-1 px-2`} 
        >
          {task.status === 'processing' ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" /> 
          ) : (
            <Play className="mr-1 h-4 w-4" /> 
          )}
          {task.status === 'success' || task.status === 'failed' ? 'Chạy Lại' : 'Chạy'}
        </button>
      </div>
    </div>
  );
};


// === Component View Chính ===
interface ImageSlot {
  id: string;
  file: File | null;
  base64: string; // Chỉ data
  mimeType: string; // *** CẬP NHẬT 1: Thêm MimeType ***
  preview: string; // Data URL
  mediaGenerationId?: string;
}

interface CreateImageFromWhiskViewProps {
    setActiveView: (view: AppView) => void;
}

export const CreateImageFromWhiskView: React.FC<CreateImageFromWhiskViewProps> = ({ setActiveView }) => {
  const { 
    addWhiskImage, 
    currentUser, 
    stories, 
    prompts: allPrompts, 
    whiskAutomationState, 
    setWhiskAutomationState, 
    updateWhiskTask, 
    whiskAutoSaveConfig, 
    setWhiskAutoSaveConfig 
  } = useAppContext();
  
  const { showToast } = useToast();
  const { tasks, isRunning } = whiskAutomationState;

  const [useImageInput, setUseImageInput] = useState(false);
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>([]);
  const MAX_IMAGE_SLOTS = 3; 

  // --- Logic kiểm tra gói Pro ---
  const BASIC_PACKAGE_NAME = 'Gói Cá Nhân/1 Máy'; 
  const isProUser = useMemo(() => {
      if (!currentUser || !currentUser.subscription || currentUser.user.status !== 'active') {
          return false;
      }
      if (new Date(currentUser.subscription.end_date) < new Date()) {
          return false;
      }
      return currentUser.subscription.package_name !== BASIC_PACKAGE_NAME;
  }, [currentUser]);

  const handleUpgradeClick = () => {
      showToast('Tính năng này yêu cầu Gói Pro hoặc cao hơn. Vui lòng nâng cấp.', 'info');
      setActiveView(AppView.PACKAGES);
  };
  // --- Kết thúc logic Pro ---


  const setTasks = useCallback((updater: React.SetStateAction<WhiskTask[]>) => {
      setWhiskAutomationState(prev => ({
          ...prev,
          tasks: typeof updater === 'function' ? updater(prev.tasks) : updater
      }));
  }, [setWhiskAutomationState]);
  
  const setIsRunning = useCallback((running: boolean) => {
      setWhiskAutomationState(prev => ({ ...prev, isRunning: running }));
  }, [setWhiskAutomationState]);

  const [gridCols, setGridCols] = useState(3);
  const stopProcessingRef = useRef(false);
  const [concurrencyLimit, setConcurrencyLimit] = useState(isProUser ? 3 : 1); 
  const [globalAspectRatio, setGlobalAspectRatio] = useState<AspectRatio>('LANDSCAPE');
  const [globalSeed, setGlobalSeed] = useState(() => Math.floor(Math.random() * 1000000));
  
  useEffect(() => {
      if (!isProUser) {
          setConcurrencyLimit(1);
      } else {
          setConcurrencyLimit(prev => (prev > 0 ? prev : 3));
      }
  }, [isProUser]);

  const handleRandomizeGlobalSeed = () => { setGlobalSeed(Math.floor(Math.random() * 1000000)); };

  useEffect(() => {
       const unsubscribe = window.electronAPI.onDownloadComplete(({ success, path, error }) => {
          if (success && path) { showToast(`Đã lưu ảnh thủ công vào: ${path}`, 'success'); }
          else if (!success && error && error !== 'Download canceled') { showToast(`Lỗi lưu ảnh: ${error}`, 'error'); }
      });
      return () => unsubscribe();
  }, [showToast]);

  const storyOptions = useMemo(() => {
     const standardStories = stories.map(story => ({
      id: story.id,
      title: story.title
    }));
    const manualStoryMap = new Map<string, string>();
    allPrompts.forEach(prompt => {
      if (prompt.storyId.startsWith('manual-')) {
        if (!manualStoryMap.has(prompt.storyId)) {
          manualStoryMap.set(prompt.storyId, prompt.storyTitle);
        }
      }
    });
    const manualStories = Array.from(manualStoryMap.entries()).map(([id, title]) => ({ id, title }));
    return [...standardStories, ...manualStories].sort((a, b) => a.title.localeCompare(b.title));
  }, [stories, allPrompts]);

  const handleImportFromStory = (storyId: string) => {
    if (!storyId) return;
    const relatedPrompts = allPrompts.filter(p => p.storyId === storyId);
    if (relatedPrompts.length === 0) {
      showToast('Không tìm thấy prompt nào cho câu chuyện này.', 'info');
      return;
    }
    const newTasks: WhiskTask[] = relatedPrompts.map(p => ({
      id: crypto.randomUUID(),
      prompt: p.prompt,
      aspectRatio: globalAspectRatio,
      seed: globalSeed,
      status: 'idle',
      imageUrl: null,
      error: null,
      workflowId: null,
      isSelected: false,
      message: 'Sẵn sàng' 
    }));
    setTasks(newTasks); 
    showToast(`Đã tải ${newTasks.length} prompt từ câu chuyện.`, 'success');
  };
  
  const handleImportFromFile = async () => {
        if (isRunning) return;
        const result = await window.electronAPI.importPromptsFromFile();
        if (result.success && result.prompts) {
            const newTasks: WhiskTask[] = result.prompts.map((text: string) => ({
                id: crypto.randomUUID(),
                prompt: text,
                aspectRatio: globalAspectRatio,
                seed: globalSeed,
                status: 'idle',
                imageUrl: null,
                error: null,
                workflowId: null,
                isSelected: false,
                message: 'Sẵn sàng',
            }));
            setTasks((prev: WhiskTask[]) => [...prev, ...newTasks]);
            showToast(`Đã nhập ${newTasks.length} prompt từ file TXT.`, 'success');
        } else if (result.error && result.error !== 'No file selected') {
            showToast(`Lỗi nhập file: ${result.error}`, 'error');
        }
    };

  const addTask = () => {
     setTasks(prev => [ 
      ...prev,
      {
        id: crypto.randomUUID(),
        prompt: '',
        aspectRatio: globalAspectRatio,
        seed: globalSeed,
        status: 'idle',
        imageUrl: null,
        error: null,
        workflowId: null,
        isSelected: false,
        message: 'Sẵn sàng'
      },
    ]);
  };
  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id)); 
  };
  
  const handleToggleSelect = (id: string) => {
    const currentTask = tasks.find(t => t.id === id);
    if (currentTask) {
        updateWhiskTask(id, { isSelected: !currentTask.isSelected }); 
    }
  };
  
  const handleSelectAll = (checked: boolean) => {
    setTasks(prev => prev.map(task => ({ ...task, isSelected: checked }))); 
  };
  
  const handleRemoveSelected = () => {
    const selectedCount = tasks.filter(t => t.isSelected).length;
    if (selectedCount === 0) return;
    setTasks(prev => prev.filter(task => !task.isSelected)); 
    showToast(`Đã xóa ${selectedCount} tác vụ.`, 'info');
  };

  const handleSelectSaveDir = async () => {
       const path = await window.electronAPI.selectDownloadDirectory();
      if (path) {
          setWhiskAutoSaveConfig(prev => ({ ...prev, path: path }));
          showToast(`Đặt thư mục lưu tự động: ${path}`, 'success');
      }
  };

  // --- Hàm xử lý ảnh mới ---
    const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, id: string) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const preview = reader.result as string;
                
                // *** CẬP NHẬT 2: Bóc tách MimeType và Base64 ***
                const match = preview.match(/^data:(image\/.+);base64,(.+)$/);
                
                if (match && match[1] && match[2]) {
                    const mimeType = match[1]; // Ví dụ: "image/png"
                    const base64Data = match[2]; // Chỉ data

                    setImageSlots(currentSlots =>
                        currentSlots.map(slot =>
                            slot.id === id ? { ...slot, file, base64: base64Data, mimeType: mimeType, preview } : slot
                        )
                    );
                } else {
                    console.error("Lỗi đọc file, không thể bóc tách mimeType/base64.");
                    showToast("Lỗi đọc file, vui lòng thử ảnh khác.", "error");
                }
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    }, [showToast]); // Thêm showToast vào dependency

    const clearImage = useCallback((id: string) => {
        setImageSlots(currentSlots =>
            currentSlots.map(slot =>
                // *** CẬP NHẬT 3: Xóa mimeType ***
                slot.id === id ? { ...slot, file: null, base64: '', mimeType: '', preview: '', mediaGenerationId: undefined } : slot
            )
        );
    }, []);

    const addImageSlot = () => {
        if (imageSlots.length < MAX_IMAGE_SLOTS) {
            setImageSlots(current => [
                ...current,
                // *** CẬP NHẬT 3: Thêm mimeType rỗng ***
                { id: crypto.randomUUID(), file: null, base64: '', mimeType: '', preview: '' }
            ]);
        }
    };
   // --- Kết thúc hàm xử lý ảnh ---

  // *** Tách logic chạy core (không retry) ***
  const runTaskWithCookie = async (taskId: string, workflowId: string, googleCookie: UserCookie) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return; // Task đã bị xóa

      if (!task.prompt.trim()) {
          updateWhiskTask(taskId, { status: 'failed', error: 'Prompt không được để trống.', message: 'Prompt trống' });
          throw new Error('Prompt trống');
      }
      
      if (task.status !== 'processing') {
           updateWhiskTask(taskId, { status: 'processing', imageUrl: null, error: null, message: useImageInput ? 'Đang tải ảnh...' : 'Đang tạo ảnh...' });
      }

      try {
          let mediaIds: string[] | undefined = undefined;

          if (useImageInput) {
              if (!isProUser) {
                  throw new Error('Tính năng "Dùng ảnh input" yêu cầu Gói Pro.');
              }
              const imagesToUpload = imageSlots.filter(slot => slot.file && slot.base64 && slot.mimeType); // Thêm check mimeType
              if (imagesToUpload.length === 0) {
                  throw new Error('Chế độ "Dùng ảnh input" được bật nhưng chưa chọn ảnh nào (hoặc ảnh bị lỗi).');
              }
              mediaIds = [];
              for (let i = 0; i < imagesToUpload.length; i++) {
                  if (stopProcessingRef.current) throw new AbortError('Đã dừng');
                  const slot = imagesToUpload[i];
                  updateWhiskTask(taskId, { message: `Đang tải ảnh ${i + 1}/${imagesToUpload.length}...` });
                  
                  // *** CẬP NHẬT 4: Truyền mimeType vào service ***
                  const mediaId = await uploadWhiskImage(googleCookie, workflowId, slot.base64, slot.mimeType); 
                  
                  mediaIds.push(mediaId);
                  setImageSlots(prev => prev.map(s => s.id === slot.id ? { ...s, mediaGenerationId: mediaId } : s));
              }
              updateWhiskTask(taskId, { message: 'Đang tạo ảnh từ input...' });
          }

          if (stopProcessingRef.current) throw new AbortError('Đã dừng');

          updateWhiskTask(taskId, { workflowId, message: 'Đang tạo ảnh...' });

          const base64Image = await generateWhiskImage(
              googleCookie, workflowId, task.prompt,
              globalSeed, globalAspectRatio, mediaIds
          ); 

          if (stopProcessingRef.current) throw new AbortError('Đã dừng');

          const imageUrl = `data:image/png;base64,${base64Image}`;
          let successMessage = 'Tạo ảnh thành công!';

          addWhiskImage({
              id: `whisk-${task.id}`, prompt: task.prompt, imageUrl: imageUrl,
              seed: globalSeed, workflowId: workflowId, aspectRatio: globalAspectRatio,
          });

          if (whiskAutoSaveConfig.enabled && whiskAutoSaveConfig.path) {
            try {
                const taskIndex = tasks.findIndex(t => t.id === taskId);
                const safePrompt = task.prompt.substring(0, 30).replace(/[^a-z0-9_]/gi, '_');
                const filename = `${safePrompt}.png`;
                const base64Data = imageUrl.split(',')[1];
                const result = await window.electronAPI.saveImageToDisk(base64Data, whiskAutoSaveConfig.path, filename, taskIndex);
                
                if (result.success) { 
                    successMessage = 'Tạo ảnh thành công, Đã lưu vào thư mục';
                }
                else { throw new Error(result.error || 'Lỗi không xác định'); }
            } catch (saveError: any) { 
                showToast(`Lỗi tự động lưu: ${saveError.message}`, 'error'); 
                successMessage = 'Tạo thành công (Lỗi lưu)';
            }
          }
          
          updateWhiskTask(taskId, { status: 'success', imageUrl: imageUrl, message: successMessage });
          
      } catch (err: any) {
          if (err instanceof AbortError) {
              updateWhiskTask(taskId, { status: 'idle', error: 'Đã dừng', message: 'Đã dừng' });
              throw err; 
          }
          let errorMessage = `Lỗi: ${err.message}`;

           // Cập nhật xử lý lỗi E008 chi tiết hơn
           if (err.message.includes('( E008)') || err.message.includes('INVALID_ARGUMENT')) {
               if (err.message.includes('PUBLIC_ERROR_MINOR_INPUT_IMAGE')) {
                   // Đây chính là lỗi của bạn
                   errorMessage = 'Lỗi (E008): Định dạng ảnh input không hợp lệ. (PUBLIC_ERROR_MINOR_INPUT_IMAGE)';
               } else if (err.message.includes('UNSAFE_GENERATION')) {
                   errorMessage = 'Lỗi (E008): Prompt vi phạm chính sách an toàn. Vui lòng sửa lại prompt.';
               } else {
                   errorMessage = `Lỗi AI Sandbox (E008): ${err.message.split(' - API Response: ')[1] || err.message}`;
               }
           }
           else if (err.message.includes('( E001)')) {
              errorMessage = 'Lỗi tạo, vui lòng chạy lại (E001).';
          }
          else if (err.message.includes('( E007)')) {
              errorMessage = 'Lỗi xác thực Labs (E007).';
          }
          else if (err.message.includes('( E005)')) {
               errorMessage = 'Lỗi tải ảnh (E005). Thử lại...'; 
          }
          else if (err.message.includes('mediaGenerationId')) {
              errorMessage = `Lỗi tải ảnh lên: ${err.message}`;
          }
          
          updateWhiskTask(taskId, { status: 'failed', error: errorMessage, message: errorMessage });
          throw err; 
      }
  };

  const handleRunSingleTask = async (taskId: string) => {
    if (!isProUser) {
        handleUpgradeClick();
        return;
    }
    if (!currentUser || !currentUser.token) {
        showToast('Lỗi: Cần đăng nhập để dùng tính năng này.', 'error');
        return; 
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (!task.prompt.trim()) {
        showToast('Vui lòng nhập prompt.', 'error');
        updateWhiskTask(taskId, { status: 'failed', error: 'Prompt không được để trống.', message: 'Prompt trống' });
        return;
    }

    if (stopProcessingRef.current) {
        updateWhiskTask(taskId, { status: 'idle', error: 'Đã dừng', message: 'Đã dừng' });
        return;
    }

    let lastError: Error | null = null;
    const MAX_RETRIES = 3; 

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        if (stopProcessingRef.current) {
            updateWhiskTask(taskId, { status: 'idle', error: 'Đã dừng', message: 'Đã dừng' });
            return; 
        }
        
        const currentTaskState = tasks.find(t => t.id === taskId);
        if (!currentTaskState) return; 

        if (attempt > 1) {
            updateWhiskTask(taskId, { status: 'processing', message: `Thử lại lần ${attempt}/${MAX_RETRIES}...` });
        } else {
            updateWhiskTask(taskId, { status: 'processing', imageUrl: null, error: null, message: 'Đang Kiểm tra...' });
        }

        try {
            const { workflowId, googleCookie } = await createWhiskWorkflow(currentUser.token);
            await runTaskWithCookie(taskId, workflowId, googleCookie);
            return; 
        } catch (err: any) {
            lastError = err;
            if (err instanceof AbortError) {
                return; 
            }
            console.warn(`Lỗi lần ${attempt} cho task ${taskId}:`, err.message);
        }
    }
    
    const errorMessage = `Thất bại sau ${MAX_RETRIES} lần thử: ${lastError?.message || 'Lỗi không xác định'}`;
    updateWhiskTask(taskId, { status: 'failed', error: errorMessage, message: 'Thất bại (3 lần)' });
  };


  const runTasksInParallel = async (tasksToRun: WhiskTask[]) => {
    if (!isProUser) {
        handleUpgradeClick();
        return;
    }

    if (tasksToRun.length === 0) {
      showToast('Không có tác vụ nào để chạy.', 'info');
      return;
    }
    
    setIsRunning(true);
    stopProcessingRef.current = false;
    setImageSlots(prev => prev.map(s => ({ ...s, mediaGenerationId: undefined })));

    const taskIdsToRun = new Set(tasksToRun.map(t => t.id));
    setTasks(prev => prev.map(t => 
      taskIdsToRun.has(t.id) ? { ...t, status: 'queued', error: null, imageUrl: null, message: 'Đang chờ...' } : t
    ));

    const currentConcurrency = isProUser ? concurrencyLimit : 1; 
    const taskQueue = tasks.filter(t => taskIdsToRun.has(t.id)); 

    const runWorker = async (workerId: number) => {
      while (taskQueue.length > 0) {
        if (stopProcessingRef.current) break; 
        
        const task = taskQueue.shift();
        if (!task) break;
        
        try {
          await handleRunSingleTask(task.id); 
        } catch (e) {
          console.error(`Worker ${workerId} gặp lỗi không mong muốn khi chạy task ${task.id}:`, e);
        }
      }
    };

    const workers = [];
    for (let i = 0; i < currentConcurrency; i++) { 
      workers.push(runWorker(i));
    }

    await Promise.all(workers);

    setIsRunning(false);

    setTasks(prev => prev.map(t => {
      if (t.status === 'processing' || t.status === 'queued') {
        return { ...t, status: 'idle', error: stopProcessingRef.current ? 'Đã dừng' : t.error, message: stopProcessingRef.current ? 'Đã dừng' : (t.error || 'Sẵn sàng') };
      }
      return t;
    }));
    
    stopProcessingRef.current = false;
  };
  
  const handleStopAll = () => {
     stopProcessingRef.current = true;
    setIsRunning(false); 
    
    setTasks(prev => prev.map(t => 
      (t.status === 'queued')
      ? { ...t, status: 'idle', error: 'Đã hủy', message: 'Đã hủy' } 
      : t
    ));
  };
  
  const selectedTasks = useMemo(() => tasks.filter(t => t.isSelected), [tasks]);
  const selectedCount = selectedTasks.length;
  const unfinishedTasks = useMemo(() => tasks.filter(t => t.status === 'idle' || t.status === 'failed'), [tasks]);
  const unfinishedCount = unfinishedTasks.length;
  const showRunUnfinishedButton = !isRunning && unfinishedCount > 0; 

  const handleRunHeaderButton = () => {
      if (!isProUser) { handleUpgradeClick(); return; } 
      if (selectedCount > 0) { runTasksInParallel(selectedTasks); }
      else { runTasksInParallel(tasks); }
  };
  const handleRunStatusBarButton = () => {
      if (!isProUser) { handleUpgradeClick(); return; }
      if (selectedCount > 0) { runTasksInParallel(selectedTasks); }
  };
  const handleRunUnfinished = () => { 
      if (!isProUser) { handleUpgradeClick(); return; } 
      runTasksInParallel(unfinishedTasks); 
  };
  
  const { 
      totalCount, processingCount, completedCount, failedCount, queuedCount, cancelledCount 
  } = useMemo(() => {
       let processing = 0;
      let completed = 0;
      let failed = 0;
      let queued = 0;
      let cancelled = 0;
      tasks.forEach(task => {
          switch (task.status) {
              case 'processing': processing++; break;
              case 'success': completed++; break;
              case 'failed': failed++; break;
              case 'queued': queued++; break;
              case 'idle':
                  if (task.error === 'Đã hủy' || task.error === 'Đã dừng') {
                      cancelled++;
                  }
                  break;
          }
      });
      return { 
          totalCount: tasks.length, 
          processingCount: processing, 
          completedCount: completed, 
          failedCount: failed, 
          queuedCount: queued, 
          cancelledCount: cancelled 
      };
  }, [tasks]);

  const isAllSelected = tasks.length > 0 && selectedCount === tasks.length;
  const isRunHeaderDisabled = isRunning || tasks.length === 0 || !isProUser;

  return (
    <div className="flex flex-col h-full w-full bg-primary p-4 space-y-4">
      <h1 className="text-xl font-semibold text-light mb-0">Tạo Ảnh Whisk (Nano Banana) Pro</h1> 

      {/* --- THANH CÔNG CỤ (TOOLBAR) MỚI --- */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2 p-3 bg-secondary rounded-lg shadow-sm border border-border-color">
        <div className="flex items-end gap-2">
            <div>
                <label className="block text-xs font-medium text-dark-text mb-1">Tải Prompt</label>
                 <select
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleImportFromStory(e.target.value)}
                    className={`${selectBase} !py-1 !px-2 text-xs h-[34px] w-40`} 
                    disabled={isRunning}
                    defaultValue=""
                  >
                    <option value="" disabled>Từ Câu Chuyện</option>
                    {storyOptions.map(story => (
                      <option key={story.id} value={story.id}>
                        {story.title.substring(0, 35)}...
                      </option>
                    ))}
                  </select>
            </div>
             <div>
                 <label className="block text-xs font-medium text-dark-text mb-1 opacity-0">.</label>
                 <button 
                    onClick={handleImportFromFile} 
                    disabled={isRunning} 
                    className={`${btnBase} ${btnBlue} text-xs !py-1.5 !px-3 h-[34px] !rounded-full`}
                  >
                    <FileText className="mr-1 h-4 w-4" /> 
                    Thêm Prompt từ Txt
                  </button>
             </div>
        </div>
        
        <div className="border-l border-border-color h-10 ml-2"></div>

        {/* Công tắc Input Ảnh */}
        <div className="flex flex-col gap-1 self-end">
            <label 
                htmlFor="use-image-toggle" 
                className={`flex items-center h-[20px] mb-1 ${!isProUser ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                title={!isProUser ? "Tính năng Pro: Yêu cầu nâng cấp gói" : "Sử dụng ảnh làm đầu vào"}
            >
                <div className="relative">
                    <input 
                        type="checkbox" 
                        id="use-image-toggle" 
                        className="sr-only peer" 
                        checked={useImageInput} 
                        onChange={(e) => setUseImageInput(e.target.checked)} 
                        disabled={isRunning || !isProUser}
                    />
                    <div className="block bg-gray-400 w-10 h-6 rounded-full peer-checked:bg-green-500 transition peer-disabled:opacity-50"></div>
                    <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-full peer-disabled:opacity-50"></div>
                </div>
                <span className="ml-2 text-dark-text text-xs font-medium whitespace-nowrap">Dùng ảnh input</span>
                {!isProUser && (
                    <button type="button" onClick={handleUpgradeClick} className="ml-1 text-accent font-bold text-[10px]">(Nâng cấp)</button>
                )}
            </label>
            {useImageInput && isProUser && ( 
              <div className="flex items-center gap-1">
                {imageSlots.map((slot, index) => (
                    <div key={slot.id} className="relative group">
                        <div className="w-16 h-16 bg-primary rounded-lg border-2 border-dashed border-blue-400 flex items-center justify-center">
                            {slot.preview ? (
                                <img src={slot.preview} alt={`Input ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                                <UploadCloud className="h-6 w-6 text-blue-400" />
                            )}
                            <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, slot.id)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isRunning || !isProUser}/>
                        </div>
                        {slot.preview && !isRunning && (
                            <button onClick={() => clearImage(slot.id)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10" title={`Xóa ảnh ${index + 1}`}>
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                ))}
                {imageSlots.length < MAX_IMAGE_SLOTS && (
                    <button onClick={addImageSlot} className="w-16 h-16 bg-primary rounded-lg border-2 border-dashed border-blue-400 flex items-center justify-center text-blue-400 hover:bg-hover-bg disabled:opacity-50" disabled={isRunning || !isProUser || imageSlots.length >= MAX_IMAGE_SLOTS} title="Thêm ảnh (tối đa 3)">
                        <Plus className="h-6 w-6" />
                    </button>
                )}
              </div>
            )}
        </div>

        {/* Tỷ lệ chung */}
        <div>
           <label htmlFor="global-aspect-ratio" className="block text-xs font-medium text-dark-text mb-1">Tỷ lệ (Chung)</label>
           <select
              id="global-aspect-ratio"
              value={globalAspectRatio}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGlobalAspectRatio(e.target.value as AspectRatio)}
              disabled={isRunning}
              className={`${selectBase} !py-1 !px-2 text-xs h-[34px] w-32`}
            >
              <option value="LANDSCAPE">16:9 Ngang</option>
              <option value="PORTRAIT">9:16 Dọc</option>
            </select>
        </div>

        {/* Seed chung */}
        <div>
            <label htmlFor="global-seed" className="block text-xs font-medium text-dark-text mb-1">Seed (Chung)</label>
            <div className="flex gap-1">
              <input
                id="global-seed"
                type="number"
                value={globalSeed}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalSeed(parseInt(e.target.value, 10) || 0)}
                className={`${inputBase} w-20 !p-2 text-xs h-[34px]`} 
                disabled={isRunning}
              />
              <button
                type="button"
                onClick={handleRandomizeGlobalSeed}
                disabled={isRunning}
                title="Ngẫu nhiên"
                className={`${btnBase} ${btnSecondary} p-2 h-[34px] w-auto !rounded-full`}
              >
                <Wand2 className="h-4 w-4" />
              </button>
            </div>
        </div>

        {/* Số luồng */}
        <div>
           <label htmlFor="concurrency-input" className="block text-xs font-medium text-dark-text mb-1">
               Số luồng
               {!isProUser && (
                    <button type="button" onClick={handleUpgradeClick} className="ml-1 text-accent font-bold text-[10px]">(Nâng cấp)</button>
               )}
            </label>
           <input
               id="concurrency-input"
               type="number"
               value={concurrencyLimit} 
               onChange={(e) => {
                   let val = parseInt(e.target.value, 10);
                   if (isNaN(val)) val = 1;
                   const maxConcurrency = isProUser ? 8 : 1;
                   setConcurrencyLimit(Math.max(1, Math.min(maxConcurrency, val)));
               }}
               min="1"
               max={isProUser ? "8" : "1"} 
               className={`${inputBase} w-16 !p-2 text-xs h-[34px]`} 
               disabled={isRunning || !isProUser}
               title={!isProUser ? "Gói Cá Nhân chỉ hỗ trợ 1 luồng. Nâng cấp Pro để chạy 3-8 luồng." : "Số luồng chạy song song (1-8)"}
           />
        </div>
        
        {/* Tự động lưu */}
        <div className="flex flex-col gap-1">
           <label htmlFor="whisk-auto-save-toggle" className="flex items-center cursor-pointer">
              <div className="relative"> <input type="checkbox" id="whisk-auto-save-toggle" className="sr-only peer" checked={whiskAutoSaveConfig.enabled} onChange={() => setWhiskAutoSaveConfig(prev => ({...prev, enabled: !prev.enabled }))} disabled={isRunning}/> <div className="block bg-gray-400 w-10 h-6 rounded-full peer-checked:bg-green-500 transition"></div> <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-full"></div> </div>
              <span className="ml-2 text-dark-text text-xs font-medium whitespace-nowrap">Tự động lưu</span>
          </label>
           <div className="flex items-center">
              <p className="bg-primary border border-r-0 border-border-color text-dark-text text-xs rounded-l-md h-[30px] flex items-center px-2 w-32 truncate" title={whiskAutoSaveConfig.path || 'Chưa chọn thư mục'}>{whiskAutoSaveConfig.path || 'Chưa chọn...'}</p>
              <button onClick={handleSelectSaveDir} disabled={!whiskAutoSaveConfig.enabled || isRunning} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-2 rounded-r-md text-xs h-[30px] disabled:opacity-50 flex items-center gap-1"> <Folder className="h-4 w-4" /> </button>
          </div>
        </div>

        <div className="flex-1"></div>

        {/* Các nút Chạy/Dừng */}
        <div className="flex items-end gap-2">
            {isRunning ? (
                <button className={`${btnBase} ${btnSecondary} text-xs !py-1.5 px-3 text-red-600 h-[34px] !rounded-full`} onClick={handleStopAll}> <StopCircle className="mr-1 h-4 w-4" /> Dừng Tất Cả </button>
              ) : (
                <>
                    {showRunUnfinishedButton && (
                         <button 
                            className={`${btnBase} ${btnWarning} text-xs !py-1.5 px-3 h-[34px] !rounded-full`} 
                            onClick={handleRunUnfinished} 
                            disabled={isRunning || !isProUser}
                            title={!isProUser ? "Tính năng Pro: Yêu cầu nâng cấp gói" : "Chạy lại các prompt chưa thành công hoặc chưa chạy"}
                        >
                             <RefreshCcw className="mr-1 h-4 w-4" /> Chạy lại ({unfinishedCount})
                        </button>
                    )}
                    <button 
                        className={`${btnBase} ${btnDanger} text-xs !py-1.5 px-3 h-[34px] !rounded-full`} 
                        onClick={handleRunHeaderButton} 
                        disabled={isRunHeaderDisabled} 
                        title={!isProUser ? "Tính năng Pro: Yêu cầu nâng cấp gói" : (selectedCount > 0 ? `Chạy lại ${selectedCount} mục đã chọn` : `Chạy tất cả ${tasks.length} mục`)}
                    >
                      {selectedCount > 0 ? (
                        <> <RotateCcw className="mr-1 h-4 w-4" /> Chạy Lại ({selectedCount}) </>
                      ) : (
                        <> <Play className="mr-1 h-4 w-4" /> Chạy Tất Cả ({tasks.length}) </>
                      )}
                    </button>
                </>
              )}
        </div>
      </div>

      {/* --- THANH TRẠNG THÁI/HÀNH ĐỘNG (STATUS BAR) MỚI --- */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-2 bg-secondary rounded-lg shadow-sm border border-border-color text-xs font-bold">
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1"> <input type="checkbox" id="select-all" checked={isAllSelected} onChange={(e) => handleSelectAll(e.target.checked)} className="h-4 w-4 rounded border-border-color text-accent focus:ring-accent"/> <label htmlFor="select-all" className="text-dark-text cursor-pointer">Tất cả</label> </div>
            <button 
                onClick={handleRunStatusBarButton} 
                disabled={isRunning || selectedCount === 0 || !isProUser} 
                title={!isProUser ? "Tính năng Pro: Yêu cầu nâng cấp gói" : "Chạy các mục đã chọn"}
                className={`${btnBase} ${btnPrimary} !py-1 !px-2`}
            > 
                <Play className="mr-1 h-4 w-4" /> Chạy ({selectedCount}) 
            </button>
            <button onClick={handleRemoveSelected} disabled={isRunning || selectedCount === 0} className={`${btnBase} ${btnSecondary} !py-1 !px-2`}> <Trash2 className="mr-1 h-4 w-4 text-red-600" /> Xóa ({selectedCount}) </button>
             <button onClick={addTask} disabled={isRunning} className={`${btnBase} ${btnSecondary} !py-1 !px-2`}> <Plus className="mr-1 h-4 w-4" /> Thêm Prompt thủ công </button>
        </div>
         <div className="flex-1"></div>
         <div className="flex items-center gap-3 text-dark-text"> <span>Tổng: <span className="font-bold text-light">{totalCount}</span></span> <span className="text-blue-500">Chạy: <span className="font-bold">{processingCount}</span></span> <span className="text-green-500">Xong: <span className="font-bold">{completedCount}</span></span> <span className="text-red-500">Lỗi: <span className="font-bold">{failedCount}</span></span> <span className="text-yellow-500">Chờ: <span className="font-bold">{queuedCount}</span></span> <span className="text-gray-500">Hủy: <span className="font-bold">{cancelledCount}</span></span> </div>
         <div className="flex items-center gap-1"> <button title="2 Cột" onClick={() => setGridCols(2)} className={`p-1.5 rounded-md ${gridCols === 2 ? 'bg-accent text-white' : 'bg-primary text-dark-text hover:bg-hover-bg'}`}> <Columns className="h-4 w-4" /> </button> <button title="3 Cột" onClick={() => setGridCols(3)} className={`p-1.5 rounded-md ${gridCols === 3 ? 'bg-accent text-white' : 'bg-primary text-dark-text hover:bg-hover-bg'}`}> <LayoutGrid className="h-4 w-4" /> </button> </div>
      </div>

      {/* --- LƯỚI TÁC VỤ --- */}
      <div className="flex-1 overflow-auto pr-2 -mr-2"> 
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-full text-dark-text">
            <p>Thêm tác vụ hoặc tải prompt để bắt đầu.</p>
          </div>
        )}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${gridCols} gap-4`}>
          {tasks.map((task, index) => (
            <WhiskTaskCard
              key={task.id}
              task={task}
              index={index}
              onUpdateTask={updateWhiskTask} 
              onToggleSelect={handleToggleSelect}
              onRunTask={handleRunSingleTask} 
              onRemoveTask={removeTask}
              isRunning={isRunning} 
              isProUser={isProUser}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CreateImageFromWhiskView;