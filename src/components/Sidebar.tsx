// src/components/Sidebar.tsx
import React, { useMemo } from 'react';
import { AppView } from '../types';
import UserInfo from './UserInfo';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';
// Import các icon cần thiết từ lucide-react
import {
    LayoutDashboard, // Dashboard
    BookText, // Create Story
    Youtube, // YouTube Script
    ListChecks, // Create Prompts
    ImageIcon, // Create Thumbnail
    Sparkles, // Whisk/Nano
    Bot, // AutoBrowser (Text to Video)
    ImagePlay, // Video From Image
    Film, // Video From Frames (Đồng nhất)
    Clapperboard, // Video Mở Rộng (Mới)
    Wand2, // Auto Create (Ý tưởng Tự động)
    Combine, // Merge Videos
    History, // History
    CreditCard, // Packages/Upgrade
    KeyRound, // API Key
    MessageCircleQuestion,
    LogOut // Logout
} from 'lucide-react';

interface SidebarProps {
    activeView: AppView;
    setActiveView: (view: AppView) => void;
    isCollapsed: boolean;
    setIsCollapsed: (isCollapsed: boolean) => void;
}

// *** SỬA: Tên gói cơ bản phải khớp với PackagesView.tsx ***
const BASIC_PACKAGE_NAME = 'Cá Nhân';

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isCollapsed, setIsCollapsed }) => {
    const { logout, currentUser } = useAppContext();
    const { t } = useTranslation();

    // Định nghĩa class chung cho icon
    const iconClasses = "h-5 w-5 transition-colors flex-shrink-0";

    // Danh sách tất cả menu items (sử dụng file của bạn)
    const allMenuItems = useMemo(() => [
        { view: AppView.DASHBOARD, label: t('sidebar.dashboard'), icon: <LayoutDashboard /> },
        { view: AppView.CREATE_STORY, label: t('sidebar.createStory'), icon: <BookText /> },
        { view: AppView.GET_YOUTUBE_SCRIPT, label: t('sidebar.youtubeScript'), icon: <Youtube /> },
        { view: AppView.CREATE_PROMPTS, label: t('sidebar.createPrompts'), icon: <ListChecks /> },
        {
            view: AppView.CREATE_WHISK_IMAGE,
            label: t('sidebar.createWhiskImage'),
            icon: <Sparkles />,
            preLabel: 'PRO - Không giới hạn',
            isPro: true
        },
        { view: AppView.CREATE_THUMBNAIL, label: t('sidebar.createThumbnail'), icon: <ImageIcon /> },
        {
            view: AppView.AUTO_BROWSER, // Text to Video
            label: t('sidebar.createVideoVeo3'),
            icon: <Bot />,
            preLabel: 'Không giới hạn',
            isPro: false // *** ĐÃ SỬA: Không phải Pro ***
        },
        {
            view: AppView.CREATE_VIDEO_FROM_IMAGE,
            label: t('sidebar.createVideoFromImage'),
            icon: <ImagePlay />,
            isPro: false
        },
        {
            view: AppView.CREATE_VIDEO_FROM_FRAMES, // Video đồng nhất
            label: t('sidebar.createVideoFromFrames'),
            icon: <Film />,
            preLabel: 'PRO - Không giới hạn',
            isPro: true
        },
         // --- MỤC MENU MỚI ---
        {
            view: AppView.CREATE_EXTENDED_VIDEO,
            label: t('sidebar.createExtendedVideo'), // Tên menu mới
            icon: <Clapperboard />, // Icon mới
            preLabel: 'PRO - BETA', // Nhãn mới
            isPro: true // Đánh dấu là tính năng Pro
        },
        // --- KẾT THÚC MỤC MENU MỚI ---
        { view: AppView.AUTO_CREATE, label: t('sidebar.autoCreate'), icon: <Wand2 /> },
        { view: AppView.MERGE_VIDEOS, label: t('sidebar.mergeVideos'), icon: <Combine /> },
        { view: AppView.HISTORY, label: t('sidebar.history'), icon: <History /> },
        { view: AppView.PACKAGES, label: t('sidebar.upgrade'), icon: <CreditCard /> },
    ], [t]);

    // *** CẬP NHẬT LOGIC LỌC MENU ***
    const visibleMenuItems = useMemo(() => {
        // 1. Lọc người dùng 'pending' (chưa kích hoạt)
        // Chỉ hiện gói Nâng cấp
        if (currentUser?.user.status === 'pending') {
            return allMenuItems.filter(item => item.view === AppView.PACKAGES);
        }

        // 2. Người dùng 'active'
        // Trả về tất cả item, logic vô hiệu hóa sẽ được xử lý ở phần render
        return allMenuItems;
    }, [currentUser, allMenuItems]);

    // Các lớp CSS (giữ nguyên)
    const commonItemClasses = "flex items-center py-2.5 my-0.5 rounded-lg cursor-pointer transition-all duration-200 group";
    const activeItemClasses = "bg-accent text-white shadow-lg";
    const inactiveItemClasses = "text-dark-text hover:bg-primary hover:text-light";
    // *** CẬP NHẬT: Thêm style cho mục bị vô hiệu hóa ***
    const disabledItemClasses = "text-dark-text/40 cursor-not-allowed bg-secondary";

    // *** CẬP NHẬT: Kiểm tra gói cơ bản ***
    const isBasicUser = currentUser?.subscription?.package_name === BASIC_PACKAGE_NAME && 
                        currentUser?.user.status === 'active' && 
                        new Date(currentUser?.subscription.end_date) > new Date();

    return (
        <aside className={`bg-secondary border-r border-border-color flex flex-col p-3 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-60'}`}>
            {/* Header (giữ nguyên) */}
            <div className="flex items-center mb-6 relative">
                 <div className="p-2 bg-accent rounded-lg flex-shrink-0">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c.251-.124.516-.239.784-.343a3.75 3.75 0 014.932 0c.268.104.533.219.784.343v5.714a2.25 2.25 0 00.659 1.591l4.091 4.091M9.75 3.104a3.75 3.75 0 00-4.932 0c-.268.104-.533.219-.784.343v5.714a2.25 2.25 0 01-.659 1.591L.5 14.5M14.25 14.5h-4.5" />
                    </svg>
                </div>
                {!isCollapsed && <h1 className="text-lg font-bold ml-2 text-light whitespace-nowrap overflow-hidden text-ellipsis">NPT Veo Auto</h1>}

                <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-6 top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-full p-1 hover:bg-gray-100 transition-transform duration-300 z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 text-gray-600 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                </button>
            </div>

            {/* Danh sách menu */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden">
                 {visibleMenuItems.map(item => {
                     // *** CẬP NHẬT LOGIC: Vô hiệu hóa nếu là Pro item và user là Basic ***
                     const isProItem = (item as any).isPro;
                     const isDisabled = (item as any).disabled || (isBasicUser && isProItem);
                     const isActive = activeView === item.view;
                     
                     const itemStyle = `${commonItemClasses} ${
                            isDisabled ? disabledItemClasses : (isActive ? activeItemClasses : inactiveItemClasses)
                        } ${isCollapsed ? 'justify-center' : 'px-3'}`;
                     
                     const titleText = isCollapsed
                        ? `${(item as any).preLabel ? (item as any).preLabel + ' ' : ''}${item.label}${isDisabled ? ' (Yêu cầu nâng cấp)' : ''}`
                        : (isDisabled ? `${item.label} (Yêu cầu nâng cấp)` : undefined);

                    const iconWithClasses = React.cloneElement(item.icon as React.ReactElement<any>, {
                        className: `${iconClasses} ${isCollapsed ? '' : 'mr-2.5'} ${isActive ? 'text-white' : (isDisabled ? 'text-dark-text/40' : 'text-dark-text group-hover:text-light')}`
                    });

                    return (
                        <div
                            key={item.view}
                            className={itemStyle}
                            // *** CẬP NHẬT LOGIC: Không cho click nếu bị vô hiệu hóa ***
                            onClick={() => !isDisabled && setActiveView(item.view)}
                            title={titleText}
                        >
                             {iconWithClasses}
                            
                            {!isCollapsed && (
                                <div className="flex flex-col overflow-hidden">
                                    {(item as any).preLabel && (
                                        <span className={`text-xs font-bold mb-0.5 whitespace-nowrap ${isActive ? 'text-white/80' : (isDisabled ? 'text-dark-text/40' : 'bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent')}`}>
                                            {(item as any).preLabel}
                                        </span>
                                    )}
                                    <span className={`font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis ${isActive ? 'text-white' : ''} ${isDisabled ? 'text-dark-text/40' : ''}`}>
                                        {item.label}
                                        {isDisabled && <span className="text-xs ml-1 opacity-70">(Pro)</span>}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                 })}
            </nav>

            {/* Các nút cuối sidebar (API Key, Support, Logout) */}
            <div className="border-t border-border-color pt-1 mt-2">
                 <div
                    className={`${commonItemClasses} ${activeView === AppView.API_KEY ? activeItemClasses : inactiveItemClasses} ${isCollapsed ? 'justify-center' : 'px-3'}`}
                    onClick={() => setActiveView(AppView.API_KEY)}
                    title={isCollapsed ? t('sidebar.apiKeySettings') : undefined}
                >
                    <KeyRound className={`${iconClasses} ${isCollapsed ? '' : 'mr-2.5'} ${activeView === AppView.API_KEY ? 'text-white' : 'text-dark-text group-hover:text-light'}`} />
                    {!isCollapsed && <span className="font-medium text-sm whitespace-nowrap">{t('sidebar.apiKeySettings')}</span>}
                </div>
                
                {/* *** CẬP NHẬT LOGIC: Ẩn Support/Logout nếu là 'pending' *** */}
                {currentUser?.user.status !== 'pending' && (
                    <>
                        <div
                            className={`${commonItemClasses} ${activeView === AppView.SUPPORT ? activeItemClasses : inactiveItemClasses} ${isCollapsed ? 'justify-center' : 'px-3'}`}
                            onClick={() => setActiveView(AppView.SUPPORT)}
                            title={isCollapsed ? t('sidebar.support') : undefined}
                        >
                            <MessageCircleQuestion className={`${iconClasses} ${isCollapsed ? '' : 'mr-2.5'} ${activeView === AppView.SUPPORT ? 'text-white' : 'text-dark-text group-hover:text-light'}`} />
                            {!isCollapsed && <span className="font-medium text-sm whitespace-nowrap">{t('sidebar.support')}</span>}
                        </div>
                         <div
                            className={`${commonItemClasses} ${inactiveItemClasses} ${isCollapsed ? 'justify-center' : 'px-3'}`}
                            onClick={logout}
                            title={isCollapsed ? t('sidebar.logout') : undefined}
                        >
                            <LogOut className={`${iconClasses} ${isCollapsed ? '' : 'mr-2.5 text-red-600'}`} />
                            {!isCollapsed && <span className="font-bold text-sm text-red-600 whitespace-nowrap">{t('sidebar.logout')}</span>}
                        </div>
                    </>
                )}
            </div>

            {/* Thông tin User */}
            <UserInfo isCollapsed={isCollapsed} setActiveView={setActiveView} />
        </aside>
    );
};

export default Sidebar;