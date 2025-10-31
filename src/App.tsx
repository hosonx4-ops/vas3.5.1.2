// src/App.tsx
import React, { useState, useEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/Sidebar';
import DashboardView from './components/views/DashboardView'; // Import Dashboard
import CreateStoryView from './components/views/CreateStoryView';
import CreatePromptsView from './components/views/CreatePromptsView';
import CreateThumbnailView from './components/views/CreateThumbnailView';
import CreateImageFromWhiskView from './components/views/CreateImageFromWhiskView';
import AutoCreateView from './components/views/AutoCreateView';
import AutoBrowserView from './components/views/AutoBrowserView';
import HistoryView from './components/views/HistoryView';
import CreateScriptView from './components/views/CreateScriptView';
import ApiKeyView from './components/views/ApiKeyView';
import ManageCookiesView from './components/views/ManageCookiesView';
import LoginView from './components/views/LoginView';
import ProfileView from './components/views/ProfileView';
import PackagesView from './components/views/PackagesView';
import SupportView from './components/views/SupportView';
import MergeVideosView from './components/views/MergeVideosView';
import CreateVideoFromImageView from './components/views/CreateVideoFromImageView'; 
import CreateVideoFromFramesView from './components/views/CreateVideoFromFramesView';
import CreateExtendedVideoView from './components/views/CreateExtendedVideoView'; // <-- IMPORT MỚI
import { AppView } from './types';
import { getApiKey } from './services/geminiService';
import UpdateManager from './components/common/UpdateManager';


const MainApp: React.FC = () => {
    const { isAuthenticated, currentUser } = useAppContext();
    const [activeView, setActiveView] = useState<AppView>(AppView.DASHBOARD); // Mặc định Dashboard
    const [isKeyRequired, setIsKeyRequired] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        if (currentUser?.user.status === 'pending' && activeView !== AppView.PACKAGES) {
            setActiveView(AppView.PACKAGES);
        }
    }, [currentUser, activeView]); 

    useEffect(() => {
        const checkApiKey = () => {
            if (!isAuthenticated) return;
            const apiKey = getApiKey();
            setIsKeyRequired(!apiKey);
        };
        checkApiKey();
    }, [isAuthenticated, activeView]);
    
    useEffect(() => {
        const unsubscribe = window.electronAPI.onNavigateToView((viewName: string) => {
            if (viewName === 'packages') {
                setActiveView(AppView.PACKAGES);
            }
        });
        
        return () => unsubscribe();
    }, [setActiveView]);


    const handleKeySaved = () => {
        setIsKeyRequired(false);
        setActiveView(AppView.DASHBOARD); 
    };

    const renderView = () => {
        if (isKeyRequired && activeView !== AppView.API_KEY) {
            setActiveView(AppView.API_KEY);
        }
        
        switch (activeView) {
            case AppView.DASHBOARD: return <DashboardView />;
            case AppView.CREATE_STORY: return <CreateStoryView />;
            case AppView.CREATE_PROMPTS: return <CreatePromptsView setActiveView={setActiveView} />;
            case AppView.CREATE_THUMBNAIL: return <CreateThumbnailView />;
            case AppView.AUTO_CREATE: return <AutoCreateView setActiveView={setActiveView} />;
            case AppView.AUTO_BROWSER: return <AutoBrowserView setActiveView={setActiveView} />;
            case AppView.MERGE_VIDEOS: return <MergeVideosView />; 
            case AppView.HISTORY: return <HistoryView />;
            case AppView.GET_YOUTUBE_SCRIPT: return <CreateScriptView />;
            case AppView.API_KEY: return <ApiKeyView onKeySaved={handleKeySaved} />;
            case AppView.MANAGE_COOKIES: return <ManageCookiesView />;
            case AppView.PROFILE: return <ProfileView />;
            case AppView.PACKAGES: return <PackagesView />;
            case AppView.SUPPORT: return <SupportView />;
            case AppView.CREATE_VIDEO_FROM_IMAGE: return <CreateVideoFromImageView setActiveView={setActiveView} />;
            case AppView.CREATE_VIDEO_FROM_FRAMES: return <CreateVideoFromFramesView setActiveView={setActiveView} />; 
            case AppView.CREATE_EXTENDED_VIDEO: return <CreateExtendedVideoView setActiveView={setActiveView} />; // <-- THÊM CASE MỚI
            case AppView.CREATE_WHISK_IMAGE: return <CreateImageFromWhiskView setActiveView={setActiveView} />; 
            default: return <DashboardView />; 
        }
    };

    if (!isAuthenticated) {
        return <LoginView />;
    }

    return (
        <div className="flex h-screen bg-primary font-sans">
            <Sidebar 
                activeView={activeView} 
                setActiveView={setActiveView}
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
            />
            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
                    {renderView()}
                </div>
            </main>
        </div>
    );
}

const App: React.FC = () => (
    <ToastProvider>
        <AppProvider>
            <MainApp />
            <UpdateManager />
        </AppProvider>
    </ToastProvider>
);
export default App;