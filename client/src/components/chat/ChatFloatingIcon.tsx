import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface ChatFloatingIconProps {
    onClick: () => void;
    count?: number;
}

export const ChatFloatingIcon = ({ onClick, count = 0 }: ChatFloatingIconProps) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleClick = () => {
        if (!isDragging) {
            onClick();
        }
    };

    return (
        <motion.div
            drag
            dragMomentum={false}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setTimeout(() => setIsDragging(false), 100)} // Small delay to prevent click trigger
            className="fixed bottom-24 right-4 z-[60] cursor-grab active:cursor-grabbing"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
        >
            <div className="relative">
                <div
                    onClick={handleClick}
                    className="
                        w-14 h-14 
                        bg-[#25d366]
                        rounded-full 
                        shadow-[0_10px_20px_rgba(0,0,0,0.3),inset_0_-4px_4px_rgba(0,0,0,0.2),inset_0_4px_4px_rgba(255,255,255,0.4)]
                        flex items-center justify-center 
                        text-white
                        border-2 border-green-300
                    "
                    title="Open Chat"
                >
                    <div className="drop-shadow-sm">
                        <MessageSquare size={28} fill="currentColor" />
                    </div>

                    {/* 3D Depth effect/Shine */}
                    <div className="absolute top-2 left-3 w-4 h-2 bg-white opacity-40 rounded-full blur-[1px]"></div>
                </div>

                {/* Notification Badge */}
                {count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] h-5 flex items-center justify-center border-2 border-white shadow-sm pointer-events-none z-50 animate-in zoom-in duration-300">
                        {count}
                    </span>
                )}
            </div>
        </motion.div>
    );
};
