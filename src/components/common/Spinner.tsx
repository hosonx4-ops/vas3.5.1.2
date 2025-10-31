import React from 'react';

// Giao diện này không thay đổi vì className sẽ được truyền từ AutoBrowserView
interface SpinnerProps {
    className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ className }) => {
    return (
        <div className={`relative w-12 h-12 ${className}`}>
            <div className="absolute inset-0 border-4 border-transparent rounded-full ai-spinner-gradient"></div>
        </div>
    );
};

export default Spinner;