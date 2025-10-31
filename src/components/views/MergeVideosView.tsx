import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import Spinner from '../common/Spinner';

type VideoSourceTab = 'history' | 'local';

interface VideoItem {
    id: string;
    path: string;
    promptText?: string;
}

// Hàm helper để lấy tên file từ đường dẫn
const getFileName = (fullPath: string) => fullPath.split(/[\\/]/).pop() || fullPath;

const MergeVideosView: React.FC = () => {
    const { videos } = useAppContext();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<VideoSourceTab>('local');
    const [selectedVideos, setSelectedVideos] = useState<VideoItem[]>([]);
    
    // Danh sách video có sẵn từ các nguồn
    const [availableLocalVideos, setAvailableLocalVideos] = useState<VideoItem[]>([]);
    
    const [savePath, setSavePath] = useState<string>('');
    const [isMerging, setIsMerging] = useState(false);
    const [mergeProgress, setMergeProgress] = useState('');
    const [stopRequested, setStopRequested] = useState(false);

    // State cho chế độ ghép mới
    const [mergeMode, setMergeMode] = useState<'all' | 'batch'>('all');
    const [batchSize, setBatchSize] = useState<number>(10);


    useEffect(() => {
        const unsubscribeProgress = window.electronAPI.onMergeProgress((progress) => {
            // Chỉ cập nhật tiến trình nếu đang trong quá trình ghép
            if (isMerging) {
                setMergeProgress(`Đang xử lý: ${Math.round(progress.percent || 0)}%`);
            }
        });
        
        return () => unsubscribeProgress();
    }, [isMerging]);

    const availableHistoryVideos = useMemo(() => {
        return videos
            .filter(v => v.localPath)
            .map(v => ({ id: v.id, path: v.localPath!, promptText: v.promptText }));
    }, [videos]);

    const currentAvailableVideos = useMemo(() => {
        return activeTab === 'local' ? availableLocalVideos : availableHistoryVideos;
    }, [activeTab, availableLocalVideos, availableHistoryVideos]);

    const isAllSelected = useMemo(() => {
        if (currentAvailableVideos.length === 0) return false;
        // Kiểm tra xem tất cả video đang hiển thị có trong danh sách đã chọn không
        return currentAvailableVideos.every(video => selectedVideos.some(selected => selected.id === video.id));
    }, [selectedVideos, currentAvailableVideos]);
    
    const sortedSelectedVideos = useMemo(() => {
        return [...selectedVideos].sort((a, b) => {
            const getNum = (str: string) => parseInt(getFileName(str).match(/^\d+/)?.[0] || '0', 10);
            return getNum(a.path) - getNum(b.path);
        });
    }, [selectedVideos]);

    const handleSelectLocalVideos = async () => {
        const paths = await window.electronAPI.selectVideoFiles();
        if (paths && paths.length > 0) {
            const newVideoItems = paths.map((p: string) => ({ id: p, path: p }));
            // Thêm video mới vào danh sách, tránh trùng lặp
            setAvailableLocalVideos(prev => {
                const existingPaths = new Set(prev.map(v => v.path));
                const uniqueNewItems = newVideoItems.filter(v => !existingPaths.has(v.path));
                return [...prev, ...uniqueNewItems];
            });
            showToast(`Đã thêm ${newVideoItems.length} video.`, 'success');
        }
    };

    const handleSelectSavePath = async () => {
        const path = await window.electronAPI.selectDownloadDirectory();
        if (path) {
            setSavePath(path);
            showToast(`Video sẽ được lưu tại: ${path}`, 'info');
        }
    };

    const handleToggleSelect = (video: VideoItem) => {
        setSelectedVideos(prev => {
            const isSelected = prev.some(v => v.id === video.id);
            if (isSelected) {
                return prev.filter(v => v.id !== video.id);
            } else {
                return [...prev, video];
            }
        });
    };

    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            const currentIds = new Set(currentAvailableVideos.map(v => v.id));
            setSelectedVideos(prev => prev.filter(v => !currentIds.has(v.id)));
        } else {
            setSelectedVideos(prev => {
                const existingIds = new Set(prev.map(v => v.id));
                const newVideos = currentAvailableVideos.filter(v => !existingIds.has(v.id));
                return [...prev, ...newVideos];
            });
        }
    };
    
    const handleRemoveFromSelected = (video: VideoItem) => {
        setSelectedVideos(prev => prev.filter(v => v.id !== video.id));
    };

    const handleMerge = async () => {
        if (sortedSelectedVideos.length < 2) {
            showToast('Vui lòng chọn ít nhất 2 video để ghép.', 'error');
            return;
        }

        setIsMerging(true);
        setStopRequested(false);

        if (mergeMode === 'all') {
            setMergeProgress('Đang bắt đầu ghép tất cả...');
            try {
                const result = await window.electronAPI.mergeVideos({
                    videoPaths: sortedSelectedVideos.map(v => v.path),
                    savePath: savePath,
                });
                if (result.success && result.path) {
                    showToast(`Ghép video thành công! Đã lưu tại: ${result.path}`, 'success');
                } else if (result.error) {
                    showToast(result.error, result.error === 'Hủy ghép' ? 'info' : 'error');
                }
            } catch (error: any) {
                showToast(`Lỗi nghiêm trọng khi ghép video: ${error.message}`, 'error');
            }
        } else { // Chế độ ghép theo nhóm
            const size = batchSize;
            if (isNaN(size) || size < 2) {
                showToast('Số lượng video mỗi nhóm phải là một số lớn hơn hoặc bằng 2.', 'error');
                setIsMerging(false);
                return;
            }

            const chunks = [];
            for (let i = 0; i < sortedSelectedVideos.length; i += size) {
                chunks.push(sortedSelectedVideos.slice(i, i + size));
            }

            for (let i = 0; i < chunks.length; i++) {
                if (stopRequested) {
                    showToast('Đã dừng quá trình ghép hàng loạt.', 'info');
                    break;
                }
                const chunk = chunks[i];
                if (chunk.length < 2) {
                    showToast(`Bỏ qua nhóm ${i + 1} vì chỉ có 1 video.`, 'info');
                    continue;
                }

                setMergeProgress(`Đang ghép nhóm ${i + 1}/${chunks.length} (${chunk.length} video)...`);
                try {
                    const result = await window.electronAPI.mergeVideos({
                        videoPaths: chunk.map(v => v.path),
                        savePath: savePath,
                    });

                    if (result.success && result.path) {
                        showToast(`Nhóm ${i + 1} ghép thành công! Đã lưu tại: ${result.path}`, 'success');
                    } else if (result.error) {
                        showToast(result.error, result.error === 'Hủy ghép' ? 'info' : 'error');
                        if (result.error !== 'Hủy ghép') {
                           throw new Error(result.error);
                        } else {
                           break; // Dừng vòng lặp nếu người dùng hủy
                        }
                    }
                } catch (error: any) {
                    showToast(`Lỗi nghiêm trọng khi ghép nhóm ${i + 1}: ${error.message}`, 'error');
                    break; // Dừng khi có lỗi nghiêm trọng
                }
            }
        }

        setIsMerging(false);
        setMergeProgress('');
        setStopRequested(false);
    };

    const handleStopMerge = async () => {
        setStopRequested(true);
        await window.electronAPI.stopMerge();
    };
    
    return (
        <div className="animate-fade-in flex flex-col h-full">
            <div className="flex-shrink-0">
                <h1 className="text-3xl font-bold text-light mb-2">Ghép Video</h1>
                <p className="text-dark-text mb-6">Chọn các video đã tạo để ghép thành một video dài hơn.</p>

                <div className="bg-secondary p-4 rounded-lg shadow-md mb-6">
                     <div className="flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-end gap-4 flex-wrap">
                            <div>
                                <label className="block text-xs font-medium text-dark-text mb-1">Thư mục lưu</label>
                                <div className="flex items-center">
                                     <span className="text-sm text-dark-text truncate px-3 py-2 border border-r-0 border-border-color rounded-l-lg bg-gray-50 w-64" title={savePath}>
                                        {savePath || 'Mặc định (hỏi mỗi lần)'}
                                    </span>
                                     <button onClick={handleSelectSavePath} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded-r-lg text-sm flex-shrink-0 border border-yellow-500">
                                        Chọn
                                    </button>
                                </div>
                            </div>
                            
                            {/* NEW: Merge Mode Selection */}
                            <div className="flex items-center gap-6">
                                <div>
                                    <label className="block text-xs font-medium text-dark-text mb-1">Chế độ ghép</label>
                                    <div className="flex items-center gap-4 p-2 bg-primary rounded-md border border-border-color">
                                        <div className="flex items-center">
                                            <input type="radio" id="merge-all" name="mergeMode" value="all" checked={mergeMode === 'all'} onChange={() => setMergeMode('all')} className="h-4 w-4 text-accent focus:ring-accent"/>
                                            <label htmlFor="merge-all" className="ml-2 text-sm text-dark-text">Ghép tất cả</label>
                                        </div>
                                        <div className="flex items-center">
                                            <input type="radio" id="merge-batch" name="mergeMode" value="batch" checked={mergeMode === 'batch'} onChange={() => setMergeMode('batch')} className="h-4 w-4 text-accent focus:ring-accent"/>
                                            <label htmlFor="merge-batch" className="ml-2 text-sm text-dark-text">Ghép theo nhóm</label>
                                        </div>
                                    </div>
                                </div>
                                {mergeMode === 'batch' && (
                                    <div>
                                        <label htmlFor="batch-size" className="block text-xs font-medium text-dark-text mb-1">Số video / nhóm</label>
                                        <input
                                            type="number"
                                            id="batch-size"
                                            value={batchSize}
                                            onChange={e => setBatchSize(parseInt(e.target.value, 10) || 10)}
                                            min="2"
                                            className="p-2 text-sm bg-primary rounded-md border border-border-color w-24 h-[38px]"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center mt-4">
                            {!isMerging ? (
                                <button
                                    onClick={handleMerge}
                                    disabled={selectedVideos.length < 2}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 disabled:bg-gray-400 text-base"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                    {mergeMode === 'all' ? `Ghép ${selectedVideos.length} video` : `Bắt đầu ghép nhóm`}
                                </button>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <span className="text-accent font-semibold">{mergeProgress}</span>
                                     <button onClick={handleStopMerge} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                                        <Spinner className="w-4 h-4"/> Dừng
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
                <div className="lg:w-2/3 flex flex-col bg-secondary p-4 rounded-lg shadow-inner">
                    <div className="mb-4 border-b border-gray-200 flex-shrink-0 flex justify-between items-center">
                        <nav className="-mb-px flex space-x-6">
                            <button onClick={() => setActiveTab('local')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'local' ? 'border-accent text-accent' : 'border-transparent text-dark-text hover:text-light'}`}>
                                Thêm từ máy tính
                            </button>
                            <button onClick={() => setActiveTab('history')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'history' ? 'border-accent text-accent' : 'border-transparent text-dark-text hover:text-light'}`}>
                                Thêm từ Lịch sử
                            </button>
                        </nav>
                         <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="select-all-checkbox"
                                checked={isAllSelected}
                                onChange={handleToggleSelectAll}
                                disabled={currentAvailableVideos.length === 0}
                                className="form-checkbox h-5 w-5 text-accent rounded border-gray-300 focus:ring-accent"
                            />
                            <label htmlFor="select-all-checkbox" className="ml-2 text-sm text-dark-text cursor-pointer">
                                Chọn tất cả
                            </label>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1 pr-2">
                        {activeTab === 'local' && (
                             <button
                                onClick={handleSelectLocalVideos}
                                className="w-full bg-primary hover:bg-hover-bg text-accent font-bold py-3 px-4 rounded-lg border-2 border-dashed border-border-color mb-4"
                            >
                                + Thêm Video từ máy tính...
                            </button>
                        )}
                        {currentAvailableVideos.length === 0 && activeTab === 'local' && (
                            <p className="text-dark-text text-center py-8">Chưa có video nào được thêm.</p>
                        )}
                         {currentAvailableVideos.length === 0 && activeTab === 'history' && (
                            <p className="text-dark-text text-center py-8">Chưa có video nào trong lịch sử có đường dẫn file.</p>
                        )}
                        {currentAvailableVideos.map(video => (
                            <div key={video.id} className="bg-primary p-2 rounded-md flex items-center gap-3 hover:bg-hover-bg">
                                <input
                                    type="checkbox"
                                    id={`list-checkbox-${video.id}`}
                                    checked={selectedVideos.some(v => v.id === video.id)}
                                    onChange={() => handleToggleSelect(video)}
                                    className="form-checkbox h-5 w-5 text-accent rounded border-gray-300 focus:ring-accent"
                                />
                                <label htmlFor={`list-checkbox-${video.id}`} className="flex-1 text-sm text-dark-text truncate cursor-pointer" title={video.promptText || getFileName(video.path)}>
                                    {video.promptText || getFileName(video.path)}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:w-1/3 flex flex-col bg-secondary p-4 rounded-lg shadow-inner">
                    <h3 className="text-lg font-bold text-light mb-4 border-b border-border-color pb-2">Danh sách sẽ ghép ({selectedVideos.length} video)</h3>
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {selectedVideos.length === 0 ? (
                            <p className="text-dark-text text-center py-8">Chưa chọn video nào.</p>
                        ) : (
                           sortedSelectedVideos.map((video, index) => (
                               <div key={`selected-${video.id}`} className="bg-primary p-2 rounded-md flex items-center justify-between gap-2">
                                   <div className="flex items-center gap-2 overflow-hidden">
                                       <span className="font-bold text-accent flex-shrink-0 w-8 text-right">{index + 1}.</span>
                                       <p className="text-sm text-dark-text truncate" title={getFileName(video.path)}>{getFileName(video.path)}</p>
                                   </div>
                                   <button onClick={() => handleRemoveFromSelected(video)} title="Bỏ chọn" className="p-1 rounded-full hover:bg-red-100 transition-colors flex-shrink-0">
                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                   </button>
                               </div>
                           )) 
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MergeVideosView;
