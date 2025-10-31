import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { login as apiLogin, register as apiRegister } from '../../services/authService';
import Spinner from '../common/Spinner';

const LoginView: React.FC = () => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAppContext();
    const { showToast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isLoginView) {
                const data = await apiLogin(email, password);
                if (data.success) {
                    login({ user: data.user, token: data.token });
                    showToast('Đăng nhập thành công!', 'success');
                } else {
                    // Hiển thị thông báo lỗi cụ thể từ server
                    showToast(data.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.', 'error');
                }
            } else {
                // Xử lý đăng ký
                const data = await apiRegister(username, email, password);
                if (data.success) {
                    showToast(data.message, 'success');
                    login({ user: data.user, token: data.token });
                } else {
                    showToast(data.message || 'Đăng ký thất bại.', 'error');
                }
            }
        } catch (error: any) {
            // *** SỬA LỖI: Cung cấp thông báo lỗi chi tiết hơn ***
            console.error("Login failed:", error); // Ghi lại lỗi đầy đủ để debug
            
            let errorMessage = 'Lỗi kết nối đến máy chủ.';
            // Bắt lỗi mạng (CORS, server không phản hồi)
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                errorMessage = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và cấu hình API.';
            } 
            // Bắt các lỗi khác có message
            else if (error.message) {
                errorMessage = `Đã xảy ra lỗi: ${error.message}`;
            }
            showToast(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-primary font-sans">
            <div className="w-full max-w-md p-8 space-y-6 bg-secondary rounded-xl shadow-2xl">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-light">
                        {isLoginView ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới'}
                    </h1>
                    <p className="mt-2 text-dark-text">
                        {isLoginView ? 'Đăng nhập để tiếp tục' : 'Điền thông tin để đăng ký'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {!isLoginView && (
                        <div>
                            <label className="block text-sm font-medium text-dark-text mb-1">Tên đăng nhập</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full p-3 bg-primary rounded-md border border-border-color focus:ring-2 focus:ring-accent"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-dark-text mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full p-3 bg-primary rounded-md border border-border-color focus:ring-2 focus:ring-accent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-dark-text mb-1">Mật khẩu</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full p-3 bg-primary rounded-md border border-border-color focus:ring-2 focus:ring-accent"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center items-center bg-accent hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400"
                    >
                        {isLoading ? <Spinner /> : (isLoginView ? 'Đăng nhập' : 'Đăng ký')}
                    </button>
                </form>

                <p className="text-center text-sm text-dark-text">
                    {isLoginView ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
                    <button onClick={() => setIsLoginView(!isLoginView)} className="font-medium text-accent hover:underline ml-1">
                        {isLoginView ? 'Đăng ký ngay' : 'Đăng nhập'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default LoginView;