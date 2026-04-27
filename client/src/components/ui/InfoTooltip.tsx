import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InfoTooltipProps {
    content: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ content }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="relative inline-flex items-center ml-1.5 group">
            <div 
                className="cursor-help text-gray-400 hover:text-indigo-600 transition-colors"
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
            >
                <HelpCircle size={14} strokeWidth={2.5} />
            </div>

            <AnimatePresence>
                {isVisible && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-yellow-300 text-black text-[11px] font-sans font-medium leading-normal rounded-lg shadow-xl z-[100] border border-yellow-400 pointer-events-none"
                    >
                        {content}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-yellow-300" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InfoTooltip;
