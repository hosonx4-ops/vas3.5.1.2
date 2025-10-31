import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { createTransaction } from '../../services/authService';
import Spinner from './Spinner';

interface Package {
    id: string;
    name: string;
    price: number;
}

interface PaymentInfo {
    vietqr_bank_id?: string;
    vietqr_bank_name?: string;
    vietqr_account_holder?: string;
    vietqr_account_number?: string;
    zalo_contact?: string;
}

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedPackage: Package | null;
    paymentInfo: PaymentInfo | null;
    onPaymentSuccess: () => void; 
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, selectedPackage, paymentInfo, onPaymentSuccess }) => {
    const { currentUser } = useAppContext();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const { transactionCode, vietQrUrl } = useMemo(() => {
        if (!selectedPackage || !currentUser || !paymentInfo) {
            return { transactionCode: '', vietQrUrl: '' };
        }
        // Sử dụng luôn ID đã được định dạng từ PackagesView (ví dụ: "1_1m", "3_enterprise")
        const code = `${currentUser.user.email}_${selectedPackage.id}`.replace(/[^a-zA-Z0-9_]/g, '_');
        const url = `https://img.vietqr.io/image/${paymentInfo.vietqr_bank_id}-${paymentInfo.vietqr_account_number}-compact.png?amount=${selectedPackage.price}&addInfo=${encodeURIComponent(code)}&accountName=${encodeURIComponent(paymentInfo.vietqr_account_holder || '')}`;
        return { transactionCode: code, vietQrUrl: url };
    }, [selectedPackage, currentUser, paymentInfo]);

    if (!isOpen || !selectedPackage || !currentUser || !paymentInfo) return null;

    const handleConfirmPayment = async () => {
        setIsLoading(true);
        try {
            const transactionData = {
                // Tách lấy ID số để gửi đi (ví dụ: "1_1m" -> "1")
                userId: currentUser.user.id,
                packageId: selectedPackage.id.split('_')[0],
                amount: selectedPackage.price,
                currency: 'VND',
                transactionCode: transactionCode,
                months: 1, 
            };
            const response = await createTransaction(transactionData, currentUser.token);
            if (response.success) {
                setIsSubmitted(true);
            } else {
                showToast(response.message || 'Có lỗi xảy ra', 'error');
            }
        } catch (error) {
            showToast('Không thể gửi yêu cầu.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleClose = () => {
        if (isSubmitted) {
            onPaymentSuccess();
        }
        setIsSubmitted(false);
        onClose();
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-secondary p-8 rounded-lg shadow-2xl w-full max-w-4xl relative animate-fade-in">
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 text-3xl leading-none">&times;</button>
                
                {!isSubmitted ? (
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                        <div className="text-left">
                            <h2 className="text-2xl font-bold text-light mb-4">Thông tin thanh toán</h2>
                            <p className="text-dark-text">Quét mã QR bên cạnh hoặc chuyển khoản thủ công với các thông tin dưới đây.</p>
                            
                            <div className="bg-primary p-4 rounded-md mt-4 space-y-2">
                                <div>
                                    <p className="text-sm text-dark-text">Gói dịch vụ</p>
                                    <p className="font-bold text-light">{selectedPackage.name}</p>
                                </div>
                                 <div>
                                    <p className="text-sm text-dark-text">Số tiền</p>
                                    <p className="font-bold text-accent text-2xl">{selectedPackage.price.toLocaleString('vi-VN')} VNĐ</p>
                                </div>
                                <hr className="border-border-color my-2" />
                                <p><strong>Ngân hàng:</strong> {paymentInfo.vietqr_bank_name}</p>
                                <p><strong>Chủ tài khoản:</strong> {paymentInfo.vietqr_account_holder}</p>
                                <p><strong>Số tài khoản:</strong> {paymentInfo.vietqr_account_number}</p>
                            </div>

                            <div className="mt-4">
                                <p className="font-bold text-dark-text">Nội dung chuyển khoản (BẮT BUỘC):</p>
                                <div className="font-mono text-red-500 bg-yellow-100 p-3 rounded mt-1 break-all">{transactionCode}</div>
                            </div>
                        </div>

                        <div className="text-center flex flex-col items-center">
                            {vietQrUrl ? (
                                <img 
                                    src={vietQrUrl}
                                    alt="VietQR Code" 
                                    className="w-64 h-64 border-4 border-accent rounded-lg"
                                />
                            ) : (
                                <div className="w-64 h-64 bg-primary flex items-center justify-center rounded-lg"><Spinner/></div>
                            )}
                             <button 
                                onClick={handleConfirmPayment} 
                                disabled={isLoading}
                                className="w-full max-w-xs mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center"
                            >
                                {isLoading ? <Spinner/> : "Tôi đã thanh toán"}
                            </button>
                        </div>                             <p className="font-semi text-red-500 bg-blue-100 p-3 rounded ">Sau khi đã thanh toán thành công, Vui lòng xác nhận <b>TÔI ĐÃ THANH TOÁN</b>,để được kích hoạt</p>

                    </div>
                ) : (
                    <div className="text-center py-10">
                        <h2 className="text-2xl font-bold text-green-500 mb-4">✅ Yêu cầu đã được gửi!</h2>
                        <p className="text-dark-text">Cảm ơn bạn! Chúng tôi đã nhận được yêu cầu xác nhận thanh toán.</p>
                        <p className="text-dark-text mt-2">Tài khoản của bạn sẽ được kích hoạt ngay sau khi chúng tôi xác nhận giao dịch thành công.</p>
                        <p className="text-blue-500 mt-2 font-bold">Sau khi có Email xác nhận thành công, Vui lòng đăng xuất và đăng nhập lại để sử dụng.</p>
                        <p className="mt-4">Hãy kiểm tra Email của bạn. Nếu có thắc mắc, vui lòng liên hệ Zalo: <strong className="text-accent">{paymentInfo.zalo_contact}</strong></p>
                        <button onClick={handleClose} className="w-full max-w-xs mt-6 bg-accent hover:bg-indigo-500 text-white font-bold py-3 rounded-lg">Đóng</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentModal;