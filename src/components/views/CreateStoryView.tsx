// src/components/views/CreateStoryView.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { createStoryFromText, createStoryFromUrl, createTitleDescriptionHashtags } from '../../services/geminiService';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import Spinner from '../common/Spinner';
import { Story, GeneratedMetadata } from '../../types';
import { useTranslation } from 'react-i18next'; // BƯỚC 1: Import

type InputType = 'idea' | 'url';
type ViewTab = 'create' | 'metadata' | 'history';

// (Các hằng số storyGenres, wordCountOptions giữ nguyên...)
const storyGenres = [
    'Kể chuyện', 'Hành động/Chiến đấu', 'Tình cảm/Lãng mạn', 'Hài hước/Vui nhộn', 'Kinh dị/Horror',
    'Bí ẩn/Trinh thám', 'Fantasy/Thần thoại', 'Khoa học viễn tưởng', 'Drama/Chính kịch',
    'Giáo dục/Học tập', 'Phiêu lưu/Thám hiểm', 'Đời thường/Slice of Life', 'Tin tức',
    'Hoạt Hình', 'Thể thao', 'Du lịch', 'Thời trang', 'Ẩm thực', 'Công nghệ', 'Âm nhạc',
    'Phim tài liệu', 'Quảng cáo/Marketing', 'Giáo dục', 'Truyền cảm hứng',
    'Hướng dẫn/Tutorial', 'Tin tức/Nhật ký thời sự', 'Phim ngắn', 'Trailer phim',
    'Phát triển dựa trên nội dung gốc'
];

const wordCountOptions = [
    { value: '1000', label: '1000 từ', time: '~1.5 phút đọc' },
    { value: '2000', label: '2000 từ', time: '~3 phút đọc' },
    { value: '3500', label: '3500 từ', time: '~5 phút đọc' },
    { value: '7000', label: '7000 từ', time: '~10 phút đọc' },
    { value: '10000', label: '10000 từ', time: '~15 phút đọc' },
    { value: '20000', label: '20000 từ', time: '~30 phút đọc' },
];


const CreateStoryView: React.FC = () => {
    const { stories, addStory, updateStory, deleteStory, generatedMetadatas, addGeneratedMetadata, deleteGeneratedMetadata } = useAppContext();
    const { showToast } = useToast();
    const { t } = useTranslation(); // BƯỚC 2: Lấy hàm t

    const [activeTab, setActiveTab] = useState<ViewTab>('create');
    const [inputType, setInputType] = useState<InputType>('idea');
    const [source, setSource] = useState('');

    const [selectedWordCount, setSelectedWordCount] = useState('2000'); 
    const [customWordCount, setCustomWordCount] = useState('');

    const [style, setStyle] = useState(storyGenres[0]);
    const [customStyle, setCustomStyle] = useState(''); 

    const [generatedStory, setGeneratedStory] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [editingStory, setEditingStory] = useState<Story | null>(null);

    const [selectedStoryForMeta, setSelectedStoryForMeta] = useState('');
    const [generatedMeta, setGeneratedMeta] = useState<Omit<GeneratedMetadata, 'id' | 'storyId' | 'storyTitle'> | null>(null);
    const [isMetaLoading, setIsMetaLoading] = useState(false);


    useEffect(() => {
        if (activeTab !== 'create') {
            setEditingStory(null);
        }
    }, [activeTab]);

    useEffect(() => {
        if (editingStory) {
            setSource(editingStory.source);
            setGeneratedStory(editingStory.content);
        } else if (activeTab === 'create') {
            setSource('');
            setGeneratedStory('');
        }
    }, [editingStory, activeTab]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!editingStory) setGeneratedStory('');
        setIsLoading(true);

        const finalWordCount = selectedWordCount === 'custom' ? customWordCount : selectedWordCount;
        const finalStyle = style === 'custom' ? customStyle : style;

        if (!source.trim() || !finalWordCount.trim() || !finalStyle.trim()) {
            setError(t('createStory.errors.fillInfo')); // Dịch lỗi
            setIsLoading(false);
            return;
        }

        try {
            const response = inputType === 'idea'
                ? await createStoryFromText(source, finalWordCount, finalStyle)
                : await createStoryFromUrl(source, finalWordCount, finalStyle);

            const storyText = response.text ?? '';
            setGeneratedStory(storyText);

            if(editingStory) {
                 updateStory(editingStory.id, {
                    content: storyText,
                    source: source,
                    title: `(Edited) Story from ${inputType}: ${source.substring(0, 20)}...`
                 });
                 showToast(t('createStory.notifications.updated'), 'success'); // Dịch thông báo
                 setEditingStory(null);
            } else {
                addStory({
                    id: new Date().toISOString(),
                    title: `Story from ${inputType}: ${source.substring(0, 30)}...`,
                    content: storyText,
                    source: source
                });
                showToast(t('createStory.notifications.created'), 'success'); // Dịch thông báo
            }

        } catch (err: any) {
            console.error(err);
            const errorMessage = err.message || t('createStory.errors.generic'); // Dịch lỗi
            setError(errorMessage);
            showToast(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleMetaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setGeneratedMeta(null);
        if (!selectedStoryForMeta) {
            showToast(t('createStory.errors.selectStory'), 'error'); // Dịch
            return;
        }
        setIsMetaLoading(true);

        try {
            const story = stories.find(s => s.id === selectedStoryForMeta);
            if (!story) throw new Error(t('createStory.errors.storyNotFound')); // Dịch

            const response = await createTitleDescriptionHashtags(story.content);
            const metaData = JSON.parse(response.text ?? '{}');

            if (!metaData.title || !metaData.description || !metaData.hashtags) {
                throw new Error(t('createStory.errors.metaApiFailed')); // Dịch
            }
            
            setGeneratedMeta(metaData);

            const newMetaData: GeneratedMetadata = {
                id: `meta-${Date.now()}`,
                storyId: story.id,
                storyTitle: story.title,
                ...metaData,
            };

            addGeneratedMetadata(newMetaData);
            showToast(t('createStory.notifications.metaCreated'), 'success'); // Dịch
        } catch (err: any) {
            console.error(err);
            showToast(err.message || t('createStory.errors.metaGeneric'), 'error'); // Dịch
        } finally {
            setIsMetaLoading(false);
        }
    };


    const handleEdit = (story: Story) => {
        setEditingStory(story);
        setActiveTab('create');
    }

    const handleCopyToClipboard = (content: string) => {
        navigator.clipboard.writeText(content).then(() => {
            showToast(t('common.copied'), 'success'); // Dịch
        }, (err) => {
            showToast(`${t('common.copyError')}: ${err}`, 'error'); // Dịch
        });
    };
    
    const customTimeEstimate = useMemo(() => {
        const words = parseInt(customWordCount);
        if (isNaN(words) || words <= 0) return '';
        const minutes = (words / (2000 / 3)).toFixed(1);
        if (parseFloat(minutes) < 0.1) return t('createStory.customTime.underMinute'); // Dịch
        return `~${minutes} ${t('createStory.customTime.minutes')}`; // Dịch
    }, [customWordCount, t]);


    const renderCreateForm = () => (
        <>
            <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="bg-secondary p-6 rounded-lg shadow-md">
                     <div className="flex justify-between items-center mb-4">
                        <div className="flex border-b border-border-color">
                            <button type="button" onClick={() => setInputType('idea')} className={`px-4 py-2 font-medium ${inputType === 'idea' ? 'text-accent border-b-2 border-accent' : 'text-dark-text'}`}>{t('createStory.inputType.idea')}</button>
                            <button type="button" onClick={() => setInputType('url')} className={`px-4 py-2 font-medium ${inputType === 'url' ? 'text-accent border-b-2 border-accent' : 'text-dark-text'}`}>{t('createStory.inputType.url')}</button>
                        </div>
                        {editingStory && <button type="button" onClick={() => setEditingStory(null)} className="text-sm bg-gray-200 hover:bg-gray-300 text-dark-text font-semibold py-1 px-3 rounded-lg">{t('common.cancelEdit')}</button>}
                    </div>
                    {inputType === 'idea' ? (
                         <textarea value={source} onChange={e => setSource(e.target.value)} placeholder={t('createStory.placeholders.idea')} className="w-full h-32 p-3 bg-primary rounded-md border border-border-color focus:ring-2 focus:ring-accent focus:outline-none transition" />
                    ) : (
                         <input type="url" value={source} onChange={e => setSource(e.target.value)} placeholder={t('createStory.placeholders.url')} className="w-full p-3 bg-primary rounded-md border border-border-color focus:ring-2 focus:ring-accent focus:outline-none transition" />
                    )}
                </div>

                <div className="bg-secondary p-6 rounded-lg shadow-md">
                    <label className="block text-dark-text font-bold mb-3">{t('createStory.length.title')}</label>
                    <div className="flex flex-wrap gap-2">
                        {wordCountOptions.map(opt => (
                            <button
                                type="button"
                                key={opt.value}
                                onClick={() => setSelectedWordCount(opt.value)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedWordCount === opt.value ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg text-dark-text'}`}
                            >
                                {t(`createStory.length.${opt.value}`, opt.label)} <span className="opacity-70 ml-1">{t(`createStory.length.${opt.value}Time`, opt.time)}</span>
                            </button>
                        ))}
                         <button
                            type="button"
                            onClick={() => setSelectedWordCount('custom')}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedWordCount === 'custom' ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg text-dark-text'}`}
                        >
                            {t('common.custom')}...
                        </button>
                    </div>
                    {selectedWordCount === 'custom' && (
                        <div className="mt-4 flex items-center gap-4">
                            <input
                                type="number"
                                value={customWordCount}
                                onChange={e => setCustomWordCount(e.target.value)}
                                placeholder={t('createStory.placeholders.customWords')}
                                className="w-full md:w-1/2 p-3 bg-primary rounded-md border border-border-color focus:ring-2 focus:ring-accent focus:outline-none transition"
                            />
                            {customTimeEstimate && <span className="text-dark-text font-medium">{customTimeEstimate}</span>}
                        </div>
                    )}
                </div>

                <div className="bg-secondary p-6 rounded-lg shadow-md">
                    <label className="block text-dark-text font-bold mb-3">{t('createStory.style.title')}</label>
                     <div className="flex flex-wrap gap-2">
                        {storyGenres.map(genre => (
                            <button
                                type="button"
                                key={genre}
                                onClick={() => setStyle(genre)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${style === genre ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg text-dark-text'}`}
                            >
                                {t(`createStory.style.${genre}`, genre)}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setStyle('custom')}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${style === 'custom' ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg text-dark-text'}`}
                        >
                            {t('common.custom')}...
                        </button>
                    </div>
                    {style === 'custom' && (
                        <div className="mt-4">
                            <input
                                type="text"
                                value={customStyle}
                                onChange={e => setCustomStyle(e.target.value)}
                                placeholder={t('createStory.placeholders.customStyle')}
                                className="w-full p-3 bg-primary rounded-md border border-border-color focus:ring-2 focus:ring-accent focus:outline-none transition"
                            />
                        </div>
                    )}
                </div>

                <div className="col-span-1 md:col-span-2">
                    <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center bg-accent hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400">
                        {isLoading ? <><Spinner /> <span className="ml-2">{editingStory ? t('common.updating') : t('common.creating')}...</span></> : (editingStory ? t('createStory.buttons.update') : t('createStory.buttons.create'))}
                    </button>
                </div>
            </form>

            {error && <p className="text-red-500 mt-4 text-center">{error}</p>}

            {generatedStory && (
                <div className="mt-8 bg-secondary p-6 rounded-lg shadow-inner">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-light">{t('common.results')}</h2>
                        <button onClick={() => handleCopyToClipboard(generatedStory)} className="bg-primary hover:bg-hover-bg text-dark-text font-bold py-2 px-4 rounded-lg transition-colors">
                            {t('common.copy')}
                        </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto p-4 bg-primary rounded-md whitespace-pre-wrap text-dark-text">
                        {generatedStory}
                    </div>
                </div>
            )}
        </>
    );

    const renderMetadataForm = () => (
        <>
            <form onSubmit={handleMetaSubmit} className="space-y-6">
                <div className="bg-secondary p-6 rounded-lg shadow-md">
                    <label htmlFor="story-select-meta" className="block text-dark-text font-bold mb-2">{t('createStory.metadata.selectStory')}</label>
                    <select
                        id="story-select-meta"
                        value={selectedStoryForMeta}
                        onChange={e => setSelectedStoryForMeta(e.target.value)}
                        className="w-full p-3 bg-primary rounded-md border border-border-color focus:ring-2 focus:ring-accent focus:outline-none transition"
                        disabled={stories.length === 0}
                    >
                        <option value="">{stories.length > 0 ? t('createStory.metadata.selectPlaceholder') : t('createStory.errors.noStories')}</option>
                        {stories.map(story => (
                            <option key={story.id} value={story.id}>{story.title}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <button type="submit" disabled={isMetaLoading || stories.length === 0} className="w-full flex justify-center items-center bg-accent hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400">
                        {isMetaLoading ? <><Spinner /> <span className="ml-2">{t('common.creating')}...</span></> : t('createStory.metadata.button')}
                    </button>
                </div>
            </form>
            {generatedMeta && (
                <div className="mt-8 bg-secondary p-6 rounded-lg shadow-inner space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold text-light">{t('createStory.metadata.title')}</h3>
                        <p className="p-2 bg-primary rounded-md text-dark-text">{generatedMeta.title}</p>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-light">{t('createStory.metadata.description')}</h3>
                        <p className="p-2 bg-primary rounded-md text-dark-text whitespace-pre-wrap">{generatedMeta.description}</p>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-light">{t('createStory.metadata.hashtags')}</h3>
                        <p className="p-2 bg-primary rounded-md text-dark-text">{generatedMeta.hashtags.join(' ')}</p>
                    </div>
                </div>
            )}
        </>
    );

    const renderHistory = () => (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-light">{t('createStory.history.title')}</h2>
            {stories.length === 0 ? <p className="text-dark-text text-center py-8">{t('createStory.history.empty')}</p> : (
                stories.map(story => (
                    <div key={story.id} className="bg-secondary p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                           <h3 className="font-bold text-light">{story.title}</h3>
                           <p className="text-sm text-gray-500 mt-1 line-clamp-2">{story.content}</p>
                        </div>
                         <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => handleCopyToClipboard(story.content)} title={t('common.copy')} className="p-2 rounded-md hover:bg-hover-bg transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-dark-text" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                            <button onClick={() => handleEdit(story)} title={t('common.edit')} className="p-2 rounded-md hover:bg-hover-bg transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-dark-text" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                            <button onClick={() => deleteStory(story.id)} title={t('common.delete')} className="p-2 rounded-md hover:bg-red-100 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                    </div>
                ))
            )}
            <h2 className="text-2xl font-bold text-light mt-8">{t('createStory.history.metaTitle')}</h2>
            {generatedMetadatas.length === 0 ? <p className="text-dark-text text-center py-8">{t('createStory.history.metaEmpty')}</p> : (
                generatedMetadatas.map(meta => (
                    <div key={meta.id} className="bg-secondary p-4 rounded-lg shadow">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-semibold text-accent">{meta.title}</h4>
                                <p className="text-sm text-gray-500 mt-1">Từ: {meta.storyTitle}</p>
                            </div>
                             <button onClick={() => deleteGeneratedMetadata(meta.id)} title={t('common.delete')} className="p-2 rounded-md hover:bg-red-100 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-light mb-2">{t('createStory.mainTitle')}</h1>
            <p className="text-dark-text mb-6">{t('createStory.description')}</p>

             <div className="mb-6">
                <div className="border-b border-border-color">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                         <button
                            onClick={() => setActiveTab('create')}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'create'
                                ? 'border-accent text-accent'
                                : 'border-transparent text-dark-text hover:text-light hover:border-gray-300'
                            }`}
                        >
                            {editingStory ? t('createStory.tabs.edit') : t('createStory.tabs.create')}
                        </button>
                        <button
                            onClick={() => setActiveTab('metadata')}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'metadata'
                                ? 'border-accent text-accent'
                                : 'border-transparent text-dark-text hover:text-light hover:border-gray-300'
                            }`}
                        >
                            {t('createStory.tabs.metadata')}
                        </button>
                         <button
                            onClick={() => setActiveTab('history')}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'history'
                                ? 'border-accent text-accent'
                                : 'border-transparent text-dark-text hover:text-light hover:border-gray-300'
                            }`}
                        >
                            {t('createStory.tabs.history')}
                        </button>
                    </nav>
                </div>
            </div>

            {activeTab === 'create' && renderCreateForm()}
            {activeTab === 'metadata' && renderMetadataForm()}
            {activeTab === 'history' && renderHistory()}
        </div>
    );
};

export default CreateStoryView;