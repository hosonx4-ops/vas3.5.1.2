// src/components/UserInfo.tsx
import React, { useState, useEffect } from 'react';
import { AppView } from '../types';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next'; // 1. Import useTranslation

interface UserInfoProps {
    isCollapsed: boolean;
    setActiveView: (view: AppView) => void;
}

const UserInfo: React.FC<UserInfoProps> = ({ isCollapsed, setActiveView }) => {
    // 2. Lấy thêm language, setLanguage từ context
    const { currentUser, language, setLanguage } = useAppContext();
    const { t } = useTranslation(); // 3. Lấy hàm t (translation)
    const [appVersion, setAppVersion] = useState('');

    useEffect(() => {
        window.electronAPI.getAppVersion()
            .then(version => setAppVersion(version))
            .catch(err => console.error("Failed to get app version:", err));
    }, []);

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return 'Không xác định';
        try {
            return new Date(dateString).toLocaleDateString('vi-VN');
        } catch (e) {
            return 'Ngày không hợp lệ';
        }
    }

    const handleRefresh = () => {
        window.electronAPI.forceReloadWindow();
    };

    // 4. Hàm chuyển đổi ngôn ngữ
    const handleLanguageToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation(); // Ngăn click lan ra ngoài
      setLanguage(prev => (prev === 'vi' ? 'en' : 'vi'));
    };

    if (isCollapsed) {
        return (
            <div 
                className="p-2 border-t border-border-color mt-2 flex justify-center"
                title={currentUser?.user.username || 'Tài khoản'}
                onClick={() => setActiveView(AppView.PROFILE)}
            >
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                </div>
            </div>
        );
    }
    
    return (
        <div className="p-2 border-t border-border-color mt-2">
            <div 
                className="flex items-center cursor-pointer group p-2 rounded-lg hover:bg-primary"
                onClick={() => setActiveView(AppView.PROFILE)}
            >
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center mr-2.5">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                </div>
                <div>
                    <p className="font-semibold text-sm text-light whitespace-nowrap group-hover:text-accent transition-colors">
                        {currentUser?.user.username || 'Demo User'}
                    </p>
                    <p className="text-xs text-dark-text whitespace-nowrap">
                        {t('dashboard.userInfo.package')}: {currentUser?.subscription?.package_name || 'Chưa kích hoạt'}
                    </p>
                    {currentUser?.subscription && (
                        <p className="text-xs text-dark-text whitespace-nowrap">
                            {t('dashboard.userInfo.expiry')}: {formatDate(currentUser.subscription.end_date)}
                        </p>
                    )}
                </div>
            </div>
            
            {/* 5. Cập nhật dải nút bấm */}
            <div className="flex items-center gap-2 mt-3">
                <button
                    className="bg-primary hover:bg-hover-bg text-dark-text font-bold py-2 px-3 rounded-lg transition-colors text-sm"
                    onClick={handleLanguageToggle}
                    title={t('userInfo.toggleLanguage')}
                >
                    {language === 'vi' ? 'EN' : 'VI'}
                </button>
                <button 
                    className="flex-1 bg-accent hover:bg-indigo-500 text-white font-bold py-2 px-3 rounded-lg transition-colors whitespace-nowrap flex items-center justify-center text-sm"
                    onClick={() => setActiveView(AppView.PACKAGES)}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                    </svg>
                    {t('sidebar.upgrade')}
                </button>
                <button
                    className="bg-primary hover:bg-hover-bg text-dark-text font-bold py-2 px-3 rounded-lg transition-colors text-sm"
                    onClick={handleRefresh}
                    title={t('userInfo.refresh')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                </button>
            </div>

            {appVersion && (
                <p className="text-center text-[11px] text-dark-text mt-2 opacity-70">
                    Phiên bản {appVersion}
                </p>
            )}
        </div>
    );
};

export default UserInfo;