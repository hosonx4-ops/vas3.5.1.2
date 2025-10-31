import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Story, VideoPrompt, GeneratedImage, GeneratedVideo } from '../../types';

type HistoryTab = 'stories' | 'thumbnails' | 'videos' | 'prompts';

// Component nút xóa tái sử dụng (Giữ nguyên)
interface DeleteButtonProps {
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    title?: string;
}

const DeleteButton: React.FC<DeleteButtonProps> = ({ onClick, title = "Xóa" }) => (
    <button
        onClick={(e) => { e.stopPropagation(); onClick(e); }}
        title={title}
        className="p-2 rounded-md hover:bg-red-100 flex-shrink-0"
    >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    </button>
);

// Component nút sao chép tái sử dụng (Giữ nguyên)
interface CopyButtonProps {
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    title?: string;
}
const CopyButton: React.FC<CopyButtonProps> = ({ onClick, title = "Sao chép" }) => (
     <button
        onClick={(e) => { e.stopPropagation(); onClick(e); }}
        title={title}
        className="p-2 rounded-md hover:bg-gray-200 flex-shrink-0"
    >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-dark-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
    </button>
);


const HistoryView: React.FC = () => {
    const {
        stories = [], deleteStory, deleteStories,
        prompts = [], deletePrompt, deletePrompts,
        thumbnails = [], deleteThumbnail, deleteThumbnails,
        videos = [], deleteVideo, deleteVideos
    } = useAppContext();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<HistoryTab>('stories');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // --- STATE VÀ LOGIC LỌC CHỈ DÀNH CHO TAB PROMPTS VIDEO ---
    const [selectedStoryIdForVideoPromptsFilter, setSelectedStoryIdForVideoPromptsFilter] = useState<string>('');

    const storyFilterOptionsForVideoPrompts = useMemo(() => {
        const options = stories.map(story => ({ id: story.id, title: story.title }));
        const manualPromptsMap = new Map<string, string>();
        prompts.forEach(prompt => {
            if (prompt && prompt.storyId && prompt.storyId.startsWith('manual-')) {
                if (!manualPromptsMap.has(prompt.storyId)) {
                    manualPromptsMap.set(prompt.storyId, prompt.storyTitle || `Manual Story ${prompt.storyId}`);
                }
            }
        });
        manualPromptsMap.forEach((title, id) => { options.push({ id, title }); });
        options.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        return options;
    }, [stories, prompts]);

    const filteredVideoPrompts = useMemo(() => {
        if (!selectedStoryIdForVideoPromptsFilter) return [];
        return prompts.filter(p => p && p.storyId === selectedStoryIdForVideoPromptsFilter);
    }, [prompts, selectedStoryIdForVideoPromptsFilter]);
    // --- KẾT THÚC STATE VÀ LOGIC LỌC CHO TAB PROMPTS VIDEO ---

    // Reset lựa chọn khi chuyển tab
    useEffect(() => {
        setSelectedIds(new Set());
        setSelectedStoryIdForVideoPromptsFilter('');
    }, [activeTab]);

     // Reset lựa chọn prompt khi bộ lọc thay đổi
    useEffect(() => {
        if (activeTab === 'prompts') {
            setSelectedIds(new Set());
        }
    }, [selectedStoryIdForVideoPromptsFilter, activeTab]);

    // Lấy danh sách item hiện tại dựa trên tab
     const currentItems = useMemo(() => {
        switch (activeTab) {
            case 'stories': return stories;
            case 'prompts':
                return selectedStoryIdForVideoPromptsFilter ? filteredVideoPrompts : [];
            case 'thumbnails': return thumbnails;
            case 'videos': return videos;
            default: return [];
        }
    }, [activeTab, stories, prompts, thumbnails, videos, filteredVideoPrompts, selectedStoryIdForVideoPromptsFilter]);

    // Kiểm tra tất cả có được chọn không
    const isAllSelected = useMemo(() => {
        if (!currentItems || currentItems.length === 0) return false;
        const validItemIds = currentItems.filter(item => item && item.id).map(item => item.id);
        if (validItemIds.length === 0) return false;
        return selectedIds.size >= validItemIds.length && validItemIds.every(id => selectedIds.has(id));
    }, [selectedIds, currentItems]);

    // Hàm chọn/bỏ chọn
    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    // Hàm chọn/bỏ chọn tất cả
    const handleSelectAllToggle = () => {
         if (!currentItems || currentItems.length === 0) return;
        if (isAllSelected) {
            setSelectedIds(new Set());
        } else {
            const allValidIds = currentItems.filter(item => item && item.id).map(item => item.id);
            setSelectedIds(new Set(allValidIds));
        }
    };

    // Hàm xóa mục đã chọn
    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;
        const confirmMessage = `Bạn có chắc muốn xóa ${selectedIds.size} mục đã chọn?`;
        if (window.confirm(confirmMessage)) {
            const idsToDelete = Array.from(selectedIds);
            try {
                switch (activeTab) {
                    case 'stories': deleteStories(idsToDelete); break;
                    case 'prompts': deletePrompts(idsToDelete); break;
                    case 'thumbnails': deleteThumbnails(idsToDelete); break;
                    case 'videos': deleteVideos(idsToDelete); break;
                }
                showToast(`Đã xóa ${idsToDelete.length} mục.`, 'success');
                setSelectedIds(new Set());
            } catch (error) {
                 showToast(`Lỗi khi xóa: ${error}`, 'error');
            }
        }
    };

     // Hàm sao chép nội dung
    const handleCopyContent = (content: string | null | undefined) => {
        const textToCopy = String(content || '');
        navigator.clipboard.writeText(textToCopy)
            .then(() => showToast('Đã sao chép!', 'success'))
            .catch(() => showToast('Lỗi khi sao chép.', 'error'));
    };

     // Hàm tải video
    const handleDownloadVideo = (video: GeneratedVideo) => {
        if (video && video.videoUrl) {
            window.electronAPI.downloadVideo({
                url: video.videoUrl,
                promptText: video.promptText || 'video',
                savePath: null,
                promptIndex: 0
            });
        } else {
            showToast('Video không hợp lệ hoặc không có URL để tải.', 'error');
        }
    };

    // --- Render Functions cho từng Tab ---

    // Render Story Item (Giữ nguyên)
    const renderStoryItem = (story: Story) => {
         if (!story || !story.id) return null;
         return (
             <div key={story.id} className={`p-3 rounded-lg shadow flex items-center gap-4 transition-colors ${selectedIds.has(story.id) ? 'bg-accent/10' : 'bg-secondary'}`}>
                <input type="checkbox" className="form-checkbox h-5 w-5 text-accent rounded border-gray-300 focus:ring-accent flex-shrink-0" checked={selectedIds.has(story.id)} onChange={() => handleToggleSelect(story.id)} />
                <div className="flex-1 cursor-pointer overflow-hidden" onClick={() => handleToggleSelect(story.id)}>
                    <h3 className="text-md font-semibold text-light truncate">{story.title || 'Không có tiêu đề'}</h3>
                    <p className="text-sm text-dark-text mt-1 line-clamp-2">{story.content || 'Không có nội dung'}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <CopyButton onClick={(e) => handleCopyContent(story.content)} title="Sao chép nội dung" />
                    <DeleteButton onClick={(e) => deleteStory(story.id)} />
                </div>
            </div>
         );
    };

    // Render Thumbnail Item (Cập nhật: Bỏ text, dùng layout grid cell)
    const renderThumbnailItem = (thumb: GeneratedImage) => {
        if (!thumb || !thumb.id) return null;
        const isSelected = selectedIds.has(thumb.id); // Check if selected
        return (
             // ** THAY ĐỔI: Bỏ flex, thêm class cho grid cell, thêm border nếu selected **
             <div
                key={thumb.id}
                className={`rounded-lg shadow bg-secondary overflow-hidden cursor-pointer relative group ${isSelected ? 'border-2 border-accent' : ''}`}
                onClick={() => handleToggleSelect(thumb.id)}
             >
                <input
                    type="checkbox"
                    className="absolute top-2 left-2 z-10 form-checkbox h-5 w-5 text-accent rounded border-gray-300 focus:ring-accent"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(thumb.id)}
                    onClick={(e) => e.stopPropagation()} // Ngăn click vào checkbox trigger click vào div cha
                />
                {/* Ảnh chiếm toàn bộ cell */}
                <img
                    src={thumb.imageUrl}
                    alt="Thumbnail"
                    className="w-full h-auto aspect-video object-cover bg-primary" // aspect-video giữ tỉ lệ
                    loading="lazy"
                />
                 {/* Nút xóa ẩn hiện khi hover */}
                 <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <DeleteButton onClick={(e) => deleteThumbnail(thumb.id)} />
                </div>
            </div>
        );
    };

    // Render Video Item (Cập nhật: Bỏ text, dùng layout grid cell)
    const renderVideoItem = (video: GeneratedVideo) => {
        if (!video || !video.id) return null;
         const videoUrl = video.videoUrl || '';
         const isSelected = selectedIds.has(video.id); // Check if selected

        return (
             // ** THAY ĐỔI: Bỏ flex, thêm class cho grid cell, thêm border nếu selected **
             <div
                key={video.id}
                className={`rounded-lg shadow bg-secondary overflow-hidden cursor-pointer relative group ${isSelected ? 'border-2 border-accent' : ''}`}
                onClick={() => handleToggleSelect(video.id)}
             >
                <input
                    type="checkbox"
                    className="absolute top-2 left-2 z-10 form-checkbox h-5 w-5 text-accent rounded border-gray-300 focus:ring-accent"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(video.id)}
                    onClick={(e) => e.stopPropagation()} // Ngăn click checkbox trigger click div
                />
                {/* Video chiếm toàn bộ cell */}
                <div className="w-full aspect-video bg-black"> {/* Container giữ tỉ lệ */}
                    {videoUrl ? (
                        <video src={videoUrl} controls className="w-full h-full object-contain" preload="metadata" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-dark-text text-sm">Video không có sẵn</div>
                    )}
                </div>
                 {/* Các nút ẩn hiện khi hover */}
                 <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col gap-1">
                     <button onClick={(e) => {e.stopPropagation(); handleDownloadVideo(video)}} title="Tải xuống" className="p-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50" disabled={!videoUrl}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>
                    <DeleteButton onClick={(e) => deleteVideo(video.id)} />
                 </div>
            </div>
        );
    };

    // Render Prompt Item (Giữ nguyên logic lọc)
    const renderPromptItem = (prompt: VideoPrompt) => {
        if (!prompt || !prompt.id) return null;
        const promptText = String(prompt.prompt || '');
        const storyTitle = prompt.storyTitle || 'Không rõ nguồn';
        const isSelected = selectedIds.has(prompt.id); // Check if selected
        return (
             <div key={prompt.id} className={`p-3 rounded-lg shadow flex items-center gap-4 transition-colors ${isSelected ? 'bg-accent/10' : 'bg-secondary'}`}>
                <input type="checkbox" className="form-checkbox h-5 w-5 text-accent rounded border-gray-300 focus:ring-accent flex-shrink-0" checked={isSelected} onChange={() => handleToggleSelect(prompt.id)} />
                <div className="flex-1 cursor-pointer overflow-hidden" onClick={() => handleToggleSelect(prompt.id)}>
                    <p className="text-sm line-clamp-2">{promptText}</p>
                    <p className="text-xs mt-1 opacity-75 truncate">Từ: {storyTitle}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <CopyButton onClick={(e) => handleCopyContent(promptText)} title="Sao chép prompt" />
                    <DeleteButton onClick={(e) => deletePrompt(prompt.id)} />
                </div>
            </div>
        );
    };


    // Render nội dung tab dựa trên activeTab (Cập nhật layout cho Thumbnails và Videos)
    const renderTabContent = () => {
        const itemsToRender = currentItems;

        // ** THAY ĐỔI: Thêm grid layout cho Thumbnails và Videos **
        const gridLayoutClasses = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"; // Tùy chỉnh số cột

        if (activeTab === 'prompts') {
             return (
                 <div className="space-y-3">
                     <div className="bg-secondary p-4 rounded-lg shadow-md mb-4 flex items-center gap-4 flex-wrap">
                         <div className="flex-1 min-w-[200px]">
                             <label htmlFor="video-prompt-story-filter-tab2" className="block text-dark-text font-bold mb-1 text-sm">Lọc theo câu chuyện</label>
                             <select
                                 id="video-prompt-story-filter-tab2"
                                 value={selectedStoryIdForVideoPromptsFilter}
                                 onChange={e => setSelectedStoryIdForVideoPromptsFilter(e.target.value)}
                                 className="w-full p-2 bg-primary rounded-md border border-border-color"
                             >
                                 <option value="">-- Vui lòng chọn một câu chuyện --</option>
                                 {(storyFilterOptionsForVideoPrompts || []).filter(option => option && option.id).map(option => (
                                     <option key={option.id} value={option.id}>
                                         {option.title || `Story ${option.id}`}
                                     </option>
                                 ))}
                             </select>
                         </div>
                    </div>
                    {!selectedStoryIdForVideoPromptsFilter ? (
                         <p className="text-dark-text text-center py-8">Vui lòng chọn một câu chuyện để xem lịch sử prompt video.</p>
                     ) : itemsToRender.length === 0 ?
                         <p className="text-dark-text text-center py-8">Không có prompt video nào được tìm thấy cho câu chuyện này.</p>
                     : (
                         // Giữ layout dọc cho prompt
                         <div className="space-y-3">
                            {itemsToRender.map(item => renderPromptItem(item as VideoPrompt))}
                         </div>
                     )}
                 </div>
             );
        }

        if (itemsToRender.length === 0) {
            return <p className="text-dark-text text-center py-8">Chưa có mục nào trong lịch sử.</p>;
        }

        switch (activeTab) {
            case 'stories': return <div className="space-y-3">{itemsToRender.map(item => renderStoryItem(item as Story))}</div>;
            // ** THAY ĐỔI: Áp dụng grid layout **
            case 'thumbnails': return <div className={gridLayoutClasses}>{itemsToRender.map(item => renderThumbnailItem(item as GeneratedImage))}</div>;
            case 'videos': return <div className={gridLayoutClasses}>{itemsToRender.map(item => renderVideoItem(item as GeneratedVideo))}</div>;
            default: return null;
        }
    };


    // Render thanh công cụ chọn/xóa (Giữ nguyên)
    const renderSelectionToolbar = () => {
         if (activeTab === 'prompts' && !selectedStoryIdForVideoPromptsFilter) {
             return null;
         }
         const itemsLength = currentItems?.length || 0;

        return (
            <div className="bg-secondary p-3 rounded-lg shadow-md mb-4 flex items-center gap-4 flex-wrap sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id={`select-all-${activeTab}`}
                        className="form-checkbox h-5 w-5 text-accent rounded border-gray-300 focus:ring-accent"
                        checked={isAllSelected}
                        onChange={handleSelectAllToggle}
                        disabled={itemsLength === 0}
                    />
                     <label htmlFor={`select-all-${activeTab}`} className="text-sm font-medium text-dark-text cursor-pointer">
                        Chọn tất cả ({itemsLength})
                    </label>
                </div>
                {selectedIds.size > 0 && (
                    <div className="flex items-end gap-2 ml-auto">
                        <button
                            onClick={handleDeleteSelected}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg text-sm"
                        >
                            Xóa ({selectedIds.size})
                        </button>
                    </div>
                )}
            </div>
        );
    };

     // Tính toán số lượng cho từng tab (Giữ nguyên)
    const tabCounts = useMemo(() => ({
        stories: stories.length,
        thumbnails: thumbnails.length,
        videos: videos.length,
        prompts: prompts.length
    }), [stories, thumbnails, videos, prompts]);

     // Danh sách các tab (Giữ nguyên)
     const tabs = [
        { id: 'stories' as HistoryTab, label: 'Câu chuyện', count: tabCounts.stories },
        { id: 'thumbnails' as HistoryTab, label: 'Thumbnail', count: tabCounts.thumbnails },
        { id: 'videos' as HistoryTab, label: 'Videos', count: tabCounts.videos },
        { id: 'prompts' as HistoryTab, label: 'Prompts Video', count: tabCounts.prompts },
    ];


    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-light mb-2">Lịch sử Tạo</h1>
            <p className="text-dark-text mb-6">Xem lại tất cả nội dung bạn đã tạo.</p>

            {/* Thanh điều hướng tab (Giữ nguyên) */}
            <div className="mb-6">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        {tabs.map(tab => (
                             <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                                ${activeTab === tab.id
                                    ? 'border-accent text-accent'
                                    : 'border-transparent text-dark-text hover:text-light hover:border-gray-300'
                                }`}
                            >
                                {tab.label} <span className={`ml-1.5 rounded-full py-0.5 px-2 text-xs font-semibold ${activeTab === tab.id ? 'bg-accent/20 text-accent' : 'bg-primary text-dark-text'}`}>{tab.count}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Thanh công cụ chọn/xóa (logic đã được sửa) */}
            {renderSelectionToolbar()}


            {/* Nội dung tab (logic đã được sửa) */}
            <div className="mt-6" key={activeTab}>
                {renderTabContent()}
            </div>
        </div>
    );
};

export default HistoryView;