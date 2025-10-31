import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';

const UpdateManager: React.FC = () => {
    const { showToast } = useToast();
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

    useEffect(() => {
        const unsubscribe = window.electronAPI.onUpdateMessage((message, data) => {
            console.log('Update Message:', message, data);
            
            if (message === 'update-available') {
                showToast(`Có phiên bản mới ${data.version}! Đang bắt đầu tải...`, 'info');
            }
            if (message === 'download-progress') {
                setDownloadProgress(data.percent);
            }
            if (message === 'update-downloaded') {
                setDownloadProgress(null);
                setUpdateAvailable(true);
                showToast('Đã tải xong bản cập nhật mới!', 'success');
            }
             if (message === 'error') {
                showToast(`Lỗi cập nhật: ${data}`, 'error');
            }
        });
        
        return () => unsubscribe();
    }, [showToast]);

    const handleInstall = () => {
        window.electronAPI.restartAndInstall();
    };

    if (updateAvailable) {
        return (
            <div className="fixed bottom-4 right-4 bg-accent text-white p-4 rounded-lg shadow-lg flex items-center gap-4 z-50">
                <p className="font-semibold">Bản cập nhật mới đã sẵn sàng! Hãy cập nhật để sử dụng ổn định hơn</p>
                <button 
                    onClick={handleInstall}
                    className="bg-green-500 hover:bg-green-600 font-bold py-2 px-4 rounded-lg"
                >
                    Khởi động lại & Cài đặt
                </button>
            </div>
        );
    }

    if (downloadProgress !== null) {
         return (
            <div className="fixed bottom-4 right-4 bg-secondary text-dark-text p-4 rounded-lg shadow-lg z-50">
                <p className="font-semibold mb-2">Đang tải bản cập nhật... ({Math.round(downloadProgress)}%)</p>
                <div className="w-full bg-primary rounded-full h-2.5">
                    <div className="bg-accent h-2.5 rounded-full" style={{ width: `${downloadProgress}%` }}></div>
                </div>
            </div>
        );
    }

    return null;
};

export default UpdateManager;