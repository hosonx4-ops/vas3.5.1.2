import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { fetchSupportInfo } from '../../services/authService';
import Spinner from '../common/Spinner';

interface SupportInfo {
    zalo?: string;
    telegram?: string;
    facebook?: string;
    email?: string;
}

// === Icon Components ===
const ZaloIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

const TelegramIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);

const FacebookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
    </svg>
);

const EmailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

// === Support Item Component ===
interface SupportLinkProps {
    href?: string;
    label: string;
    icon: React.ReactNode;
}

const SupportLink: React.FC<SupportLinkProps> = ({ href, label, icon }) => {
    const { showToast } = useToast();
    if (!href) return null;

    const handleCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        try {
            const textToCopy = href.startsWith('mailto:') ? href.substring(7) : href;
            window.electronAPI.copyText(textToCopy);
            showToast(`Đã sao chép liên kết ${label}!`, 'success');
        } catch (error) {
            console.error("Failed to copy:", error);
            showToast('Không thể sao chép.', 'error');
        }
    };

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (window.electronAPI && typeof window.electronAPI.openExternalLink === 'function') {
            window.electronAPI.openExternalLink(href).catch(err => {
                console.error("Failed to open external link:", err);
                showToast("Không thể mở liên kết.", "error");
            });
        } else {
            console.error("electronAPI.openExternalLink is not available.");
            showToast("Chức năng mở liên kết không khả dụng.", "error");
        }
    };

    return (
        <div 
            className="flex items-center gap-4 p-4 bg-primary rounded-lg transition-transform hover:scale-[1.02] cursor-pointer"
            onClick={handleClick}
            title={`Mở ${label}`}
        >
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-light">{label}</p>
                <span className="text-accent hover:underline text-sm break-all truncate">
                    {href.replace('mailto:', '')}
                </span>
            </div>
            <button 
                onClick={handleCopy}
                title={`Sao chép liên kết ${label}`}
                className="p-2 rounded-full hover:bg-gray-200 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-dark-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            </button>
        </div>
    );
};


// === Main View Component ===
const SupportView: React.FC = () => {
    const { showToast } = useToast();
    const [supportInfo, setSupportInfo] = useState<SupportInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchSupportInfo()
            .then(res => {
                if (res.success) {
                    setSupportInfo(res.data);
                } else {
                    showToast(res.message || 'Không thể tải thông tin hỗ trợ.', 'error');
                }
            })
            .catch(() => {
                showToast('Lỗi kết nối khi tải thông tin hỗ trợ.', 'error');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [showToast]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    if (!supportInfo) {
        return <div className="text-center text-dark-text pt-10">Không có thông tin hỗ trợ nào được cấu hình.</div>;
    }

    return (
        <div className="animate-fade-in max-w-4xl mx-auto pt-10">
            <h1 className="text-3xl font-bold text-light mb-2 text-center">Thông tin Hỗ trợ</h1>
            <p className="text-dark-text mb-8 text-center">
                Nếu bạn có bất kỳ câu hỏi hoặc cần trợ giúp, vui lòng liên hệ với chúng tôi qua các kênh dưới đây.
            </p>

            <div className="bg-secondary p-6 rounded-lg shadow-lg space-y-4">
                <SupportLink label="Zalo" href={supportInfo.zalo} icon={<ZaloIcon />} />
                <SupportLink label="Telegram" href={supportInfo.telegram} icon={<TelegramIcon />} />
                <SupportLink label="Facebook" href={supportInfo.facebook} icon={<FacebookIcon />} />
                <SupportLink label="Email" href={supportInfo.email ? `mailto:${supportInfo.email}` : undefined} icon={<EmailIcon />} />
            </div>
        </div>
    );
};

export default SupportView;