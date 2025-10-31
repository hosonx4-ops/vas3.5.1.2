// src/context/AppContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import {
    Story, VideoPrompt, GeneratedImage, GeneratedVideo, YouTubeScript, UserCookie,
    LabsProject, AutomationState, AutoSaveConfig, User, AutomationPrompt,
    AutoCreateConfig, GeminiModelSelection, Character, GeneratedMetadata, Transaction,
    WhiskImage, WhiskAutomationState, WhiskAutoSaveConfig, WhiskTask,
    ExtendedAutomationState // <-- Đã thêm import
} from '../types';
import { fetchProfile } from '../services/authService';
import { useToast } from './ToastContext';
import { useTranslation } from 'react-i18next';

const API_URL = 'https://mmoreal.com/api';

const getDeviceId = () => {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
};
getDeviceId();

export interface ProfileData {
    user: User;
    token: string;
    subscription: {
        package_name: string;
        end_date: string;
        status: string;
    } | null;
}

interface AppContextType {
    autoCreateConfig: AutoCreateConfig;
    setAutoCreateConfig: React.Dispatch<React.SetStateAction<AutoCreateConfig>>;
    stories: Story[];
    addStory: (story: Story) => void;
    updateStory: (id: string, updates: Partial<Story>) => void;
    deleteStory: (id: string) => void;
    deleteStories: (ids: string[]) => void;
    prompts: VideoPrompt[];
    addPrompts: (newPrompts: VideoPrompt[]) => void;
    deletePrompt: (id: string) => void;
    deletePrompts: (ids: string[]) => void;
    thumbnails: GeneratedImage[];
    addThumbnail: (thumbnail: GeneratedImage) => void;
    deleteThumbnail: (id: string) => void;
    deleteThumbnails: (ids: string[]) => void;
    videos: GeneratedVideo[];
    addVideo: (video: GeneratedVideo) => void;
    updateVideo: (id: string, updates: Partial<GeneratedVideo>) => void;
    deleteVideo: (id: string) => void;
    deleteVideos: (ids: string[]) => void;
    youtubeScripts: YouTubeScript[];
    addYouTubeScript: (script: YouTubeScript) => void;
    deleteYouTubeScript: (id: string) => void;
    labsProjects: LabsProject[];
    addLabsProject: (project: LabsProject) => void;
    cookies: UserCookie[];
    addCookie: (cookie: UserCookie) => void;
    updateCookie: (id: string, updates: Partial<UserCookie>) => void;
    deleteCookie: (id: string) => void;
    activeCookie: UserCookie | null;
    setActiveCookie: (cookie: UserCookie | null) => void;
    
    automationState: AutomationState;
    setAutomationState: React.Dispatch<React.SetStateAction<AutomationState>>;

    // V-- STATE MỚI CHO VIDEO MỞ RỘNG --V
    extendedAutomationState: ExtendedAutomationState;
    setExtendedAutomationState: React.Dispatch<React.SetStateAction<ExtendedAutomationState>>;
    // ^-- STATE MỚI CHO VIDEO MỞ RỘNG --^

    updateAutomationPrompt: (promptId: string, updates: Partial<AutomationPrompt>) => void;
    // *** DÒNG BỊ TRÙNG ĐÃ BỊ XÓA (setAutomationState) ***
    addAutomationPrompts: (prompts: AutomationPrompt[]) => void;
    autoSaveConfig: AutoSaveConfig;
    setAutoSaveConfig: React.Dispatch<React.SetStateAction<AutoSaveConfig>>;
    isAuthenticated: boolean;
    currentUser: ProfileData | null;
    login: (userData: { user: User, token: string }) => Promise<void>;
    logout: () => void;
    refreshCurrentUser: () => Promise<void>;
    geminiModel: GeminiModelSelection;
    setGeminiModel: React.Dispatch<React.SetStateAction<GeminiModelSelection>>;
    characters: Character[];
    addCharacter: (character: Character) => void;
    updateCharacter: (id: string, updates: Partial<Character>) => void;
    deleteCharacter: (id: string) => void;
    generatedMetadatas: GeneratedMetadata[];
    addGeneratedMetadata: (metadata: GeneratedMetadata) => void;
    deleteGeneratedMetadata: (id: string) => void;
    language: string;
    setLanguage: React.Dispatch<React.SetStateAction<string>>;

    // Thuộc tính cho Whisk Image
    whiskImages: WhiskImage[];
    addWhiskImage: (image: WhiskImage) => void;
    deleteWhiskImage: (id: string) => void;

    // State cho Whisk Automation
    whiskAutomationState: WhiskAutomationState;
    setWhiskAutomationState: React.Dispatch<React.SetStateAction<WhiskAutomationState>>;
    updateWhiskTask: (taskId: string, updates: Partial<WhiskTask>) => void;
    whiskAutoSaveConfig: WhiskAutoSaveConfig;
    setWhiskAutoSaveConfig: React.Dispatch<React.SetStateAction<WhiskAutoSaveConfig>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Lỗi khi đọc localStorage key “${key}”:`, error);
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            const valueToStoreString = JSON.stringify(storedValue);
            window.localStorage.setItem(key, valueToStoreString);

        } catch (error: any) {
            if (error.name === 'QuotaExceededError') {
                console.error(`Lỗi Quota: localStorage đã đầy khi lưu key “${key}”. Dữ liệu lớn (như ảnh) có thể không được lưu.`);
            } else {
                console.error(`Lỗi khi lưu vào localStorage key “${key}”:`, error);
            }
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
}

export const AppProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [stories, setStories] = useLocalStorage<Story[]>('veo-suite-stories', []);
    const [prompts, setPrompts] = useLocalStorage<VideoPrompt[]>('veo-suite-prompts', []);
    const [thumbnails, setThumbnails] = useLocalStorage<GeneratedImage[]>('veo-suite-thumbnails', []);
    const [videos, setVideos] = useLocalStorage<GeneratedVideo[]>('veo-suite-videos', []);
    const [youtubeScripts, setYoutubeScripts] = useLocalStorage<YouTubeScript[]>('veo-suite-youtube-scripts', []);
    const [cookies, setCookies] = useLocalStorage<UserCookie[]>('veo-suite-cookies', []);
    const [activeCookie, setActiveCookie] = useLocalStorage<UserCookie | null>('veo-suite-active-cookie', null);
    const [labsProjects, setLabsProjects] = useLocalStorage<LabsProject[]>('veo-suite-labs-projects', []);
    const { showToast } = useToast();

    const [geminiModel, setGeminiModel] = useLocalStorage<GeminiModelSelection>('gemini-model-selection', 'gemini-2.0-flash');
    const [characters, setCharacters] = useLocalStorage<Character[]>('veo-suite-characters', []);
    const [generatedMetadatas, setGeneratedMetadatas] = useLocalStorage<GeneratedMetadata[]>('veo-suite-generated-metadatas', []);


    const [automationState, setAutomationState] = useLocalStorage<AutomationState>('veo-suite-automation-state', {
        prompts: [],
        isRunning: false,
        overallProgress: 0,
        statusMessage: 'Sẵn sàng để bắt đầu.',
        model: 'veo_3_1_t2v',
        aspectRatio: 'LANDSCAPE',
        concurrentStreams: 4,
        imageAnalysisMode: 'shared'
    });

    const [extendedAutomationState, setExtendedAutomationState] = useLocalStorage<ExtendedAutomationState>('veo-suite-extended-automation-state', {
        prompts: [],
        isRunning: false,
        overallProgress: 0,
        statusMessage: 'Sẵn sàng để bắt đầu.',
        model: 'veo_3_1_t2v',
        aspectRatio: 'LANDSCAPE',
        concurrentStreams: 1, 
        imageAnalysisMode: 'shared' 
    });

    const [autoSaveConfig, setAutoSaveConfig] = useLocalStorage<AutoSaveConfig>('veo-suite-autosave-config', {
        enabled: false,
        path: null,
        allowOverwrite: false,
        splitFolders: false,
        videosPerFolder: 10,
    });

    const [isAuthenticated, setIsAuthenticated] = useLocalStorage('isAuthenticated', false);
    const [currentUser, setCurrentUser] = useLocalStorage<ProfileData | null>('currentUser', null);

    const [autoCreateConfig, setAutoCreateConfig] = useLocalStorage<AutoCreateConfig>('veo-suite-auto-create-config', {
        storyStyle: 'Kể chuyện',
        storyLength: '1000',
        promptStyle: ['Phim hoạt hình 3D'],
        promptGenre: 'Hài hước/Vui nhộn',
        promptType: 'detailed',
        videoModel: 'veo_3_1_t2v',
        videoAspectRatio: 'LANDSCAPE',
        concurrentStreams: 4,
        autoSave: false,
        savePath: null,
    });

    const [whiskImages, setWhiskImages] = useLocalStorage<WhiskImage[]>('veo-suite-whisk-images', []);

    const [whiskAutomationState, setWhiskAutomationState] = useLocalStorage<WhiskAutomationState>('veo-suite-whisk-automation-state', {
        tasks: [],
        isRunning: false,
        useImageInput: false,
    });
    const [whiskAutoSaveConfig, setWhiskAutoSaveConfig] = useLocalStorage<WhiskAutoSaveConfig>('veo-suite-whisk-autosave-config', {
        enabled: false,
        path: null,
    });

    const [language, setLanguage] = useLocalStorage<string>('app-language', 'vi');
    const { i18n } = useTranslation();

    useEffect(() => {
        i18n.changeLanguage(language);
    }, [language, i18n]);

    // --- Các hàm CRUD ---
    const addStory = (story: Story) => setStories(prev => [story, ...prev]);
    const updateStory = (id: string, updates: Partial<Story>) => setStories(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    const deleteStory = (id: string) => setStories(prev => prev.filter(s => s.id !== id));
    const deleteStories = (ids: string[]) => setStories(prev => prev.filter(s => !ids.includes(s.id)));
    const addPrompts = (newPrompts: VideoPrompt[]) => setPrompts(prev => [...newPrompts, ...prev]);
    const deletePrompt = (id: string) => setPrompts(prev => prev.filter(p => p.id !== id));
    const deletePrompts = (ids: string[]) => { setPrompts(prev => prev.filter(p => !ids.includes(p.id))); };
    const addThumbnail = (thumbnail: GeneratedImage) => setThumbnails(prev => [thumbnail, ...prev]);
    const deleteThumbnail = (id: string) => setThumbnails(prev => prev.filter(t => t.id !== id));
    const deleteThumbnails = (ids: string[]) => setThumbnails(prev => prev.filter(t => !ids.includes(t.id)));
    const addVideo = (video: GeneratedVideo) => setVideos(prev => [video, ...prev]);
    const updateVideo = (id: string, updates: Partial<GeneratedVideo>) => setVideos(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
    const deleteVideo = (id: string) => setVideos(prev => prev.filter(v => v.id !== id));
    const deleteVideos = (ids: string[]) => setVideos(prev => prev.filter(v => !ids.includes(v.id)));
    const addYouTubeScript = (script: YouTubeScript) => setYoutubeScripts(prev => [script, ...prev]);
    const deleteYouTubeScript = (id: string) => setYoutubeScripts(prev => prev.filter(s => s.id !== id));
    const addCookie = (cookie: UserCookie) => setCookies(prev => [cookie, ...prev]);
    const updateCookie = (id: string, updates: Partial<UserCookie>) => setCookies(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    const deleteCookie = (id: string) => setCookies(prev => prev.filter(c => c.id !== id));
    const addLabsProject = (project: LabsProject) => setLabsProjects(prev => [project, ...prev]);
    const addAutomationPrompts = (newPrompts: AutomationPrompt[]) => {
        setAutomationState(prev => ({
            ...prev,
            prompts: [...prev.prompts, ...newPrompts]
        }));
    };
    const updateAutomationPrompt = (promptId: string, updates: Partial<AutomationPrompt>) => {
        setAutomationState(prev => ({
            ...prev,
            prompts: prev.prompts.map(p => p.id === promptId ? { ...p, ...updates } : p)
        }));
    };
    const addCharacter = (character: Character) => setCharacters(prev => [character, ...prev]);
    const updateCharacter = (id: string, updates: Partial<Character>) => setCharacters(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    const deleteCharacter = (id: string) => setCharacters(prev => prev.filter(c => c.id !== id));
    const addGeneratedMetadata = (metadata: GeneratedMetadata) => setGeneratedMetadatas(prev => [metadata, ...prev]);
    const deleteGeneratedMetadata = (id: string) => setGeneratedMetadatas(prev => prev.filter(m => m.id !== id));

    const addWhiskImage = (image: WhiskImage) => setWhiskImages(prev => [image, ...prev]);
    const deleteWhiskImage = (id: string) => setWhiskImages(prev => prev.filter(img => img.id !== id));

    const updateWhiskTask = (taskId: string, updates: Partial<WhiskTask>) => {
        setWhiskAutomationState(prev => ({
            ...prev,
            tasks: prev.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
        }));
    };

    // --- Authentication & Session ---
    const logout = () => {
        setCurrentUser(null);
        setIsAuthenticated(false);
    };
    const refreshCurrentUser = async () => {
        if (!currentUser || !currentUser.token) {
            console.log("Không thể làm mới: không có người dùng hoặc token.");
            return;
        }
        try {
            const profileResponse = await fetchProfile(currentUser.token);
            if (profileResponse.success) {
                setCurrentUser(prev => prev ? ({
                    ...prev,
                    user: profileResponse.data.user,
                    subscription: profileResponse.data.subscription,
                }) : null);
                showToast('Đã cập nhật thông tin tài khoản.', 'info');
            } else {
                throw new Error(profileResponse.message || 'Không thể tải hồ sơ người dùng.');
            }
        } catch (e: any) {
            showToast('Lỗi khi làm mới thông tin gói cước: ' + e.message, 'error');
        }
    };
    const login = async (userData: { user: User, token: string }) => {
        try {
            const profileResponse = await fetchProfile(userData.token);
            if (profileResponse.success) {
                const fullProfile: ProfileData = {
                    user: profileResponse.data.user,
                    token: userData.token,
                    subscription: profileResponse.data.subscription,
                };
                setCurrentUser(fullProfile);
                setIsAuthenticated(true);
            } else {
                throw new Error(profileResponse.message || 'Không thể tải hồ sơ người dùng.');
            }
        } catch (e: any) {
            const basicProfile: ProfileData = {
                user: userData.user,
                token: userData.token,
                subscription: null
            };
            setCurrentUser(basicProfile);
            setIsAuthenticated(true);
            showToast('Không thể tải thông tin gói cước: ' + e.message, 'error');
        }
    };

    useEffect(() => {
        const checkSession = async () => {
            if (isAuthenticated && currentUser) {
                try {
                    const deviceId = localStorage.getItem('deviceId');
                    if (!deviceId) {
                        logout();
                        return;
                    }

                    const response = await fetch(`${API_URL}/check_session.php`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${currentUser.token}`,
                        },
                        body: JSON.stringify({
                            userId: currentUser.user.id,
                            deviceId: deviceId,
                            sessionToken: currentUser.token
                        })
                    });

                    if (!response.ok) {
                        console.error(`Lỗi kiểm tra phiên: Server responded with status ${response.status}`);
                        return;
                    }

                    const data = await response.json();

                    if (data.success && !data.isValid) {
                        logout();
                        showToast('Phiên đăng nhập đã hết hạn hoặc có thiết bị khác đăng nhập.', 'error');
                    }

                } catch (error) {
                    console.error("Lỗi kết nối khi kiểm tra phiên:", error);
                }
            }
        };

        checkSession();
        const intervalId = setInterval(checkSession, 10000); 

        return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, currentUser, showToast]);


    return (
        <AppContext.Provider value={{
            autoCreateConfig, setAutoCreateConfig,
            stories, addStory, updateStory, deleteStory, deleteStories,
            prompts, addPrompts, deletePrompt, deletePrompts,
            thumbnails, addThumbnail, deleteThumbnail, deleteThumbnails,
            videos, addVideo, updateVideo, deleteVideo, deleteVideos,
            youtubeScripts, addYouTubeScript, deleteYouTubeScript,
            labsProjects, addLabsProject,
            cookies, addCookie, updateCookie, deleteCookie,
            activeCookie, setActiveCookie,
            
            automationState, setAutomationState, 
            extendedAutomationState, setExtendedAutomationState, // <-- Đã thêm

            addAutomationPrompts, updateAutomationPrompt,
            autoSaveConfig, setAutoSaveConfig,
            isAuthenticated,
            currentUser,
            login,
            logout,
            refreshCurrentUser,
            geminiModel, setGeminiModel,
            characters, addCharacter, updateCharacter, deleteCharacter,
            generatedMetadatas, addGeneratedMetadata, deleteGeneratedMetadata,
            language, setLanguage,

            whiskImages, addWhiskImage, deleteWhiskImage,

            whiskAutomationState, setWhiskAutomationState,
            updateWhiskTask,
            whiskAutoSaveConfig, setWhiskAutoSaveConfig
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};