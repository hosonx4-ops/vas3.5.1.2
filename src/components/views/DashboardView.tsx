// src/components/views/DashboardView.tsx
import React, { useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { AppView } from '../../types'; 
import { useTranslation } from 'react-i18next'; // Import

interface DashboardCardProps {
    title: string;
    value: string | number;
    icon?: React.ReactNode; 
    colorClass?: string; 
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon, colorClass = 'bg-gray-100 text-gray-600' }) => (
    <div className="bg-secondary p-6 rounded-lg shadow-md flex items-center space-x-4">
        {icon && (
            <div className={`p-3 rounded-full ${colorClass} flex-shrink-0`}>
                {icon} 
            </div>
        )}
        <div>
            <p className="text-sm font-medium text-dark-text">{title}</p>
            <p className="text-2xl font-bold text-light">{value}</p>
        </div>
    </div>
);

const DashboardView: React.FC = () => {
    const { videos, currentUser } = useAppContext();
    const { t } = useTranslation(); // Lấy hàm t

    const stats = useMemo(() => {
        const now = new Date();
        const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let totalVideos = 0;
        let successfulVideos = 0;
        let successfulToday = 0;
        let successfulThisMonth = 0;
        let successfulVeo3Videos = 0;

        videos.forEach(video => {
            totalVideos++;
            if (video.status === 'completed' || video.status === 'success') {
                successfulVideos++;
                const videoDateStr = video.id.split('-').pop(); 
                if (videoDateStr) {
                    try {
                        const videoDate = new Date(parseInt(videoDateStr));
                        const videoDateYMD = videoDate.toISOString().split('T')[0];
                        const videoMonth = videoDate.getMonth();
                        const videoYear = videoDate.getFullYear();

                        if (videoDateYMD === today) {
                            successfulToday++;
                        }
                        if (videoMonth === currentMonth && videoYear === currentYear) {
                            successfulThisMonth++;
                        }
                    } catch (e) {
                        console.warn("Could not parse date from video ID for stats:", video.id);
                    }
                }

                if (video.projectId) {
                   successfulVeo3Videos++;
                }
            }
        });

        const creditsUsed = successfulVeo3Videos * 100;
        const moneySaved = creditsUsed / 100;

        return {
            totalVideos,
            successfulVideos,
            successfulToday,
            successfulThisMonth,
            creditsUsed,
            moneySaved
        };
    }, [videos]);

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return 'Không xác định';
        try {
            return new Date(dateString).toLocaleDateString('vi-VN');
        } catch (e) {
            return 'Ngày không hợp lệ';
        }
    };

    // Định nghĩa các icon (phần tử JSX)
    const UserIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
    );

     const VideoIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
        </svg>
    );

     const CreditIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
           <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
        </svg>
    );


    return (
        <div className="animate-fade-in space-y-6">
            <h1 className="text-3xl font-bold text-light">{t('dashboard.title')}</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard title={t('dashboard.totalVideos')} value={stats.totalVideos} icon={VideoIcon} colorClass="bg-blue-100 text-blue-600" />
                <DashboardCard title={t('dashboard.successfulTotal')} value={stats.successfulVideos} icon={VideoIcon} colorClass="bg-green-100 text-green-600" />
                <DashboardCard title={t('dashboard.successfulMonth')} value={stats.successfulThisMonth} icon={VideoIcon} colorClass="bg-yellow-100 text-yellow-600" />
                <DashboardCard title={t('dashboard.successfulToday')} value={stats.successfulToday} icon={VideoIcon} colorClass="bg-purple-100 text-purple-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="md:col-span-2 bg-secondary p-6 rounded-lg shadow-md flex items-start space-x-4">
                     <div className="p-3 rounded-full bg-accent text-white flex-shrink-0">
                         {UserIcon}
                     </div>
                     <div>
                        <h2 className="text-xl font-semibold text-light mb-2">{t('dashboard.userInfo.title')}</h2>
                        <p className="text-dark-text"><span className="font-medium text-light">{t('dashboard.userInfo.name')}:</span> {currentUser?.user.username || 'N/A'}</p>
                        <p className="text-dark-text"><span className="font-medium text-light">{t('dashboard.userInfo.email')}:</span> {currentUser?.user.email || 'N/A'}</p>
                        <p className="text-dark-text"><span className="font-medium text-light">{t('dashboard.userInfo.package')}:</span> {currentUser?.subscription?.package_name || 'Chưa kích hoạt'}</p>
                        {currentUser?.subscription && (
                            <p className="text-dark-text"><span className="font-medium text-light">{t('dashboard.userInfo.expiry')}:</span> {formatDate(currentUser.subscription.end_date)}</p>
                        )}
                     </div>
                </div>

                <div className="bg-secondary p-6 rounded-lg shadow-md flex items-center space-x-4">
                    <div className="p-3 rounded-full bg-red-100 text-red-600 flex-shrink-0">
                        {CreditIcon}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-dark-text">{t('dashboard.credits.saved')}</p>
                        <p className="text-xl font-bold text-light">{stats.creditsUsed.toLocaleString()} {t('dashboard.credits.creditsVeo3')}</p>
                        <p className="text-sm font-medium text-dark-text mt-1">{t('dashboard.credits.equivalent')}:</p>
                        <p className="text-2xl font-bold text-red-600">${stats.moneySaved.toLocaleString()}</p>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default DashboardView;