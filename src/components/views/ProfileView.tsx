import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { fetchProfile, fetchTransactionHistory, updateProfile } from '../../services/authService';
import Spinner from '../common/Spinner';
import { Transaction, User } from '../../types';

interface ProfileData {
    user: User;
    subscription: {
        package_name: string;
        end_date: string;
        status: string;
    } | null;
}

const ProfileView: React.FC = () => {
    const { currentUser, login } = useAppContext();
    const { showToast } = useToast();

    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [history, setHistory] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [isEditingPassword, setIsEditingPassword] = useState(false);
    
    const [username, setUsername] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        if (currentUser) {
            Promise.all([
                // Sửa đổi ở đây: chỉ cần truyền token
                fetchProfile(currentUser.token),
                fetchTransactionHistory(currentUser.user.id, currentUser.token)
            ]).then(([profileRes, historyRes]) => {
                if (profileRes.success) {
                    setProfileData(profileRes.data);
                    setUsername(profileRes.data.user.username);
                } else {
                    // Thêm log để biết lỗi cụ thể từ server
                    console.error("Profile fetch error:", profileRes.message);
                    showToast(profileRes.message || 'Không thể tải dữ liệu hồ sơ.', 'error');
                }

                if (historyRes.success) {
                    setHistory(historyRes.data);
                }
            }).catch((err) => {
                console.error("Fetch profile/history error:", err);
                showToast('Không thể tải dữ liệu hồ sơ.', 'error');
            }).finally(() => {
                setIsLoading(false);
            });
        }
    }, [currentUser, showToast]);

    const handleUpdateInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !username.trim()) return;

        const res = await updateProfile({ userId: currentUser.user.id, username }, currentUser.token);
        if (res.success) {
            login({ user: res.user, token: currentUser.token });
            showToast('Cập nhật tên thành công!', 'success');
            setIsEditingInfo(false);
        } else {
            showToast(res.message || 'Cập nhật thất bại.', 'error');
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !currentPassword || !newPassword) {
            showToast('Vui lòng điền đầy đủ mật khẩu.', 'error');
            return;
        }

        const res = await updateProfile({ userId: currentUser.user.id, currentPassword, newPassword }, currentUser.token);
        if (res.success) {
            showToast('Đổi mật khẩu thành công!', 'success');
            setIsEditingPassword(false);
            setCurrentPassword('');
            setNewPassword('');
        } else {
            showToast(res.message || 'Đổi mật khẩu thất bại.', 'error');
        }
    };

    const renderStatusBadge = (status: string) => {
        const statusClasses: { [key: string]: string } = {
            completed: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            failed: 'bg-red-100 text-red-800',
            cancelled: 'bg-gray-100 text-gray-800',
        };
        const statusText = status.charAt(0).toUpperCase() + status.slice(1);
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusClasses[status] || 'bg-gray-100'}`}>{statusText}</span>;
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    if (!profileData) {
        return <div className="text-center text-dark-text">Không thể tải thông tin người dùng. Vui lòng thử đăng nhập lại.</div>;
    }

    return (
        <div className="animate-fade-in max-w-6xl mx-auto">
            <div className="bg-secondary p-8 rounded-lg shadow-lg flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center mb-4 ring-4 ring-accent/20">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-accent">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                </div>

                {!isEditingInfo ? (
                    <>
                        <h1 className="text-3xl font-bold text-light">{profileData.user.username}</h1>
                        <p className="text-dark-text mt-1">{profileData.user.email}</p>
                        <div className="mt-2 text-center">
                            <p><span className="font-semibold">Gói cước:</span> {profileData.subscription?.package_name || 'Miễn phí'}</p>
                            {profileData.subscription && (
                                <p><span className="font-semibold">Ngày hết hạn:</span> {new Date(profileData.subscription.end_date).toLocaleDateString('vi-VN')}</p>
                            )}
                        </div>
                        <button onClick={() => setIsEditingInfo(true)} className="mt-4 text-sm text-accent hover:underline">Chỉnh sửa thông tin</button>
                    </>
                ) : (
                    <form onSubmit={handleUpdateInfo} className="w-full max-w-sm mt-4 text-left">
                        <div>
                            <label className="font-bold">Tên hiển thị</label>
                            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-2 mt-1 bg-primary rounded-md border border-border-color" />
                        </div>
                        <div className="flex gap-4 mt-4">
                            <button type="submit" className="flex-1 bg-accent text-white py-2 rounded-lg">Lưu</button>
                            <button type="button" onClick={() => setIsEditingInfo(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">Hủy</button>
                        </div>
                    </form>
                )}
            </div>
            
            <div className="bg-secondary p-8 rounded-lg shadow-lg mt-8">
                 <h2 className="text-xl font-bold text-light mb-4">Đổi mật khẩu</h2>
                 {!isEditingPassword ? (
                     <button onClick={() => setIsEditingPassword(true)} className="bg-primary hover:bg-gray-200 text-dark-text font-bold py-2 px-4 rounded-lg">
                        Đổi mật khẩu
                     </button>
                 ) : (
                    <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-sm">
                        <div>
                            <label className="font-bold">Mật khẩu hiện tại</label>
                            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full p-2 mt-1 bg-primary rounded-md border border-border-color" required/>
                        </div>
                        <div>
                            <label className="font-bold">Mật khẩu mới</label>
                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-2 mt-1 bg-primary rounded-md border border-border-color" required/>
                        </div>
                         <div className="flex gap-4">
                            <button type="submit" className="flex-1 bg-accent text-white py-2 rounded-lg">Xác nhận</button>
                            <button type="button" onClick={() => setIsEditingPassword(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">Hủy</button>
                        </div>
                    </form>
                 )}
            </div>

            <div className="mt-8 bg-secondary p-6 rounded-lg shadow-lg">
                <h3 className="text-2xl font-bold text-light mb-4">Lịch sử giao dịch</h3>
                 <div className="overflow-x-auto">
                    {history.length === 0 ? (
                        <p className="text-dark-text text-center p-4">Bạn chưa có giao dịch nào.</p>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-dark-text uppercase bg-primary">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Gói</th>
                                    <th scope="col" className="px-6 py-3">Mô tả/Mã GD</th>
                                    <th scope="col" className="px-6 py-3">Số tiền</th>
                                    <th scope="col" className="px-6 py-3">Ngày</th>
                                    <th scope="col" className="px-6 py-3">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map(tx => (
                                    <tr key={tx.transaction_id} className="border-b border-border-color hover:bg-primary">
                                        <td className="px-6 py-4 font-medium text-light">{tx.package_name}</td>
                                        <td className="px-6 py-4 text-dark-text font-mono">{tx.description}</td>
                                        <td className="px-6 py-4 text-dark-text">{parseInt(tx.amount).toLocaleString('vi-VN')} {tx.currency}</td>
                                        <td className="px-6 py-4 text-dark-text">{new Date(tx.transaction_date).toLocaleString('vi-VN')}</td>
                                        <td className="px-6 py-4">{renderStatusBadge(tx.payment_status)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileView;