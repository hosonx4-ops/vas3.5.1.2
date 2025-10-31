import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { fetchPaymentSettings, fetchTransactionHistory } from '../../services/authService';
import PaymentModal from '../common/PaymentModal';
import Spinner from '../common/Spinner';
import { useAppContext } from '../../context/AppContext';
import { Transaction } from '../../types';

interface Package {
    id: string;
    name: string;
    price: number;
    durationLabel: string;
    description: string;
    originalPrice?: number;
    isFeatured?: boolean;
    features?: string[];
    subFeatures?: string[]; 
}

interface PaymentInfo {
    vietqr_bank_id?: string;
    vietqr_bank_name?: string;
    vietqr_account_holder?: string;
    vietqr_account_number?: string;
    zalo_contact?: string;
}

const PackagesView: React.FC = () => {
    const { showToast } = useToast();
    const { currentUser, refreshCurrentUser } = useAppContext();
    const [packages, setPackages] = useState<Package[]>([]);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
    const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);

    const [history, setHistory] = useState<Transaction[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const MONTHLY_PRICE = 399000;
    const ORIGINAL_MONTHLY_PRICE = 650000;
    const PRO_MONTHLY_PRICE = 650000; // Giá Gói Cá Nhân Pro

    useEffect(() => {
        fetchPaymentSettings().then(res => {
            if (res.success) {
                setPaymentInfo(res.data);
            } else {
                showToast('Không thể tải thông tin thanh toán.', 'error');
            }
        });

        if (currentUser) {
            setIsLoadingHistory(true);
            fetchTransactionHistory(currentUser.user.id, currentUser.token)
                .then(res => {
                    if (res.success) {
                        setHistory(res.data);
                    }
                })
                .catch(() => showToast('Không thể tải lịch sử giao dịch.', 'error'))
                .finally(() => setIsLoadingHistory(false));
        }
    }, [currentUser, showToast]);


    useEffect(() => {
        const calculatePackages = () => {
            // Tính năng Gói Pro
            const proFeatures = [
                'Tạo không giới hạn video Veo 3 Text to Video/ Video từ Ảnh /Video Đồng nhất',
                'Tạo không giới hạn Ảnh/Whisk/Nano',
                'Tải video 720p/1080p',
                'Số luồng lên đến 20 Luồng',
                'Tất cả các chức năng tools'
            ];

            // Cập nhật Gói 1 Năm: Lấy giá Pro * 12 tháng - 10%
            const oneYearPrice = Math.round((PRO_MONTHLY_PRICE * 12) * 0.9); // Giảm 10%
            const originalOneYearPrice = PRO_MONTHLY_PRICE * 12;
            
            const updatedPackages: Package[] = [
                { 
                    id: '1_1m_ca_nhan', 
                    name: 'Gói Cá Nhân/1 Máy', 
                    price: MONTHLY_PRICE, 
                    originalPrice: ORIGINAL_MONTHLY_PRICE, 
                    durationLabel: '/ tháng', 
                    description: 'Gói cơ bản cho nhu cầu tạo video text-to-video.',
                    features: [
                        'Tạo không giới hạn video Veo 3 Text to Video',
                        'các chức năng Tạo Prompt/Câu chuyện/Thumbnail',
                        'Tải video 720p',
                        'Số luồng tối đa 8'
                    ]
                },
                {
                    id: '7_ca_nhan_pro', // Gói Cá Nhân Pro mới
                    name: 'Gói Cá Nhân Pro',
                    price: PRO_MONTHLY_PRICE,
                    durationLabel: '/ tháng',
                    description: 'Gói chuyên nghiệp với đầy đủ tính năng và hiệu suất cao.',
                    features: proFeatures
                },
                { 
                    id: '6_small_team_1m', 
                    name: 'Gói Team Pro/5 Máy', 
                    price: 1999000, // Giá mới
                    originalPrice: 3250000, // Giá gốc mới (Giả định)
                    durationLabel: '/ tháng', 
                    description: 'Gói mở rộng 5 máy cùng lúc cho Team.',
                    features: [
                        ...proFeatures, // Thêm tính năng pro
                        'Sử dụng số lượng 5 máy cùng lúc.'
                    ]
                },
                { 
                    id: '2_1y', 
                    name: 'Gói 1 Năm Pro/1 Máy', 
                    price: oneYearPrice, // Giá mới
                    originalPrice: originalOneYearPrice, // Giá gốc mới
                    durationLabel: '/ năm', 
                    description: 'Lựa chọn tiết kiệm nhất cho người dùng lâu dài.', 
                    isFeatured: true,
                    features: proFeatures // Thêm tính năng pro
                },
                { 
                    id: '3_enterprise', 
                    name: 'Gói Dành cho Doanh nghiệp', 
                    price: 9999000, 
                    originalPrice: 20000000,
                    durationLabel: '/ tháng', 
                    description: 'Giải pháp toàn diện cho công ty.',
                    features: [
                        ...proFeatures, // Thêm tính năng pro
                        'Tối đa 30 máy cùng lúc.',
                        'Không giới hạn Video được tạo trong tháng.',
                        'Sử dụng Sever riêng cho tốc độ tạo video tối ưu.',
                        'Giảm 10% khi thanh toán theo năm.'
                    ],
                    subFeatures: [
                        'Liên hệ Hỗ trợ để mua gói Doanh nghiệp theo năm.'
                    ]
                }
            ];
            // Sắp xếp lại: Đưa gói Pro lên thứ 2
            const proPackage = updatedPackages.find(p => p.id === '7_ca_nhan_pro');
            const basicPackage = updatedPackages.find(p => p.id === '1_1m_ca_nhan');
            const teamPackage = updatedPackages.find(p => p.id === '6_small_team_1m');
            const yearPackage = updatedPackages.find(p => p.id === '2_1y');
            const enterprisePackage = updatedPackages.find(p => p.id === '3_enterprise');

            const orderedPackages = [basicPackage, proPackage, teamPackage, yearPackage, enterprisePackage].filter(Boolean) as Package[];
            
            setPackages(orderedPackages);
        };
        calculatePackages();
    }, [PRO_MONTHLY_PRICE]);

    const handlePurchase = (pkg: Package) => {
        setSelectedPackage(pkg);
        setIsModalOpen(true);
    };

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('vi-VN') + ' đ';
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


    return (
        <div className="animate-fade-in">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-light mb-2">Chọn gói phù hợp với bạn</h1>
                <p className="text-dark-text mb-10">Mở khóa toàn bộ tiềm năng sáng tạo với các gói cước của chúng tôi.</p>
            </div>

            {/* --- THÔNG BÁO MỚI --- */}
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-10 rounded-r-lg shadow-md" role="alert">
                <p className="font-bold">Thông báo</p>
                <p>Chương trình 'Ưu đãi mở bán' đã kết thúc, giá sẽ trở về mức niêm yết ban đầu. Các tài khoản đăng ký trước đó vẫn sẽ được gia hạn với giá khuyến mãi ở (1)tháng tiếp theo.</p>
            </div>
            
            {/* Thay đổi lg:grid-cols-3 thành lg:grid-cols-4 */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {packages.filter(p => !p.id.includes('enterprise')).map(pkg => (
                    <div 
                        key={pkg.id} 
                        className={`bg-secondary p-6 rounded-lg shadow-lg flex flex-col transition-transform hover:-translate-y-2 ${pkg.isFeatured ? 'border-2 border-accent' : 'border border-border-color'}`}
                    >
                         {pkg.isFeatured && (
                            <div className="text-center mb-4">
                                <span className="bg-accent text-white text-xs font-bold px-3 py-1 rounded-full uppercase">Tiết kiệm nhất -10%</span>
                            </div>
                        )}
                        <h2 className="text-2xl font-bold text-light">{pkg.name}</h2>
                        <p className="text-dark-text mt-2 flex-grow h-12">{pkg.description}</p>
                        
                        <div className="my-6 text-center">
                            {pkg.originalPrice && (<p className="text-dark-text line-through">{formatCurrency(pkg.originalPrice)}</p>)}
                            <p className="text-4xl font-extrabold my-2 text-light">
                                {formatCurrency(pkg.price)}
                                <span className="text-lg font-semibold text-dark-text">{pkg.durationLabel}</span>
                            </p>
                             <p className="text-sm text-accent font-semibold">Không cần tài khoản Veo 3</p>
                        </div>
                        
                        {pkg.features && pkg.features.length > 0 && (
                            <ul className="space-y-2 mb-6 text-left">
                                {pkg.features.map((feature, index) => (
                                    <li key={index} className="flex items-start text-dark-text">
                                        <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <button 
                            onClick={() => handlePurchase(pkg)}
                            className={`w-full font-bold py-3 px-4 rounded-lg transition-colors mt-auto ${pkg.isFeatured ? 'bg-accent hover:bg-indigo-500 text-white' : 'bg-white hover:bg-gray-100 text-accent border border-gray-300'}`}
                        >
                            Chọn gói
                        </button>
                    </div>
                ))}
            </div>

            {packages.filter(p => p.id.includes('enterprise')).map(pkg => (
                <div key={pkg.id} className="mt-8 bg-secondary p-6 rounded-lg shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-light">{pkg.name}</h2>
                        <p className="text-dark-text mt-2">{pkg.description}</p>
                        <ul className="mt-4 space-y-2">
                            {pkg.features?.map((feature, index) => (
                                <li key={index} className="flex items-center text-dark-text">
                                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    {feature}
                                </li>
                            ))}
                            {pkg.subFeatures?.map((subFeature, index) => (
                                 <li key={`sub-${index}`} className="flex items-center text-sm text-gray-500 ml-7">
                                    <span className="mr-2">✓</span>
                                    {subFeature}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="text-center md:text-right">
                         {pkg.originalPrice && (<p className="text-dark-text line-through">{formatCurrency(pkg.originalPrice)}</p>)}
                         <p className="text-4xl font-extrabold my-2 text-light">
                            {formatCurrency(pkg.price)}
                            <span className="text-lg font-semibold text-dark-text">{pkg.durationLabel}</span>
                        </p>
                        <p className="text-sm text-accent font-semibold mb-2">Giảm 10% khi thanh toán theo năm</p>
                        <button 
                            onClick={() => handlePurchase(pkg)}
                            className="w-full md:w-auto font-bold py-3 px-6 rounded-lg bg-accent hover:bg-indigo-500 text-white transition-colors mt-2"
                        >
                            Chọn gói doanh nghiệp
                        </button>
                    </div>
                </div>
            ))}

            <div className="mt-12 bg-secondary p-6 rounded-lg shadow-lg">
                <h3 className="text-2xl font-bold text-light mb-4">Lịch sử giao dịch của bạn</h3>
                <div className="overflow-x-auto">
                    {isLoadingHistory ? (
                        <div className="flex justify-center p-4"><Spinner /></div>
                    ) : history.length === 0 ? (
                        <p className="text-dark-text text-center p-4">Bạn chưa có giao dịch nào.</p>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-dark-text uppercase bg-primary">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Gói</th>
                                    <th scope="col" className="px-6 py-3">Mô tả/Mã GD</th>
                                    <th scope="col" className="px-6 py-3">Số tiền</th>
                                    <th scope="col" className="px-6 py-3">Ngày Giao Dịch</th>
                                    <th scope="col" className="px-6 py-3">Ngày Hết Hạn</th>
                                    <th scope="col" className="px-6 py-3">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map(tx => (
                                    <tr key={tx.transaction_id} className="border-b border-border-color hover:bg-primary">
                                        <td className="px-6 py-4 font-medium text-light">{tx.package_name}</td>
                                        <td className="px-6 py-4 text-dark-text font-mono">{tx.description}</td>
                                        <td className="px-6 py-4 text-dark-text">{parseInt(tx.amount).toLocaleString('vi-VN')} {tx.currency}</td>
                                        <td className="px-6 py-4 text-dark-text">{new Date(tx.transaction_date).toLocaleDateString('vi-VN')}</td>
                                        <td className="px-6 py-4 text-dark-text">
                                            {tx.end_date ? new Date(tx.end_date).toLocaleDateString('vi-VN') : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">{renderStatusBadge(tx.payment_status)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            
            <PaymentModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                selectedPackage={selectedPackage}
                paymentInfo={paymentInfo}
                onPaymentSuccess={refreshCurrentUser}
            />
        </div>
    );
};

export default PackagesView;