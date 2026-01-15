import React from 'react';
import {
    Calculator, Chrome, Mail, FileText, Table, Terminal,
    Globe, Smartphone, Monitor, Star
} from 'lucide-react';

interface LauncherIconProps {
    name: string;
    icon: string; // identifier
    onClick: () => void;
    className?: string;
}

const IconMap: Record<string, string> = {
    'gemini': 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg',
    'chatgpt': 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
    'chrome': 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg',
    'gmail': 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg',
    'google sheets': '/icons/sheets.png', // Added variant
    'sheets': '/icons/sheets.png',
    'excel': '/icons/sheets.png', // Remap Excel to Sheets icon for visual consistency if db not updated
    'notepad': '/icons/notepad.png',
    'calculator': '/icons/calculator.png',
    'default': ''
};

const FallbackIcons: Record<string, any> = {
    'notepad': FileText,
    'calculator': Calculator,
    'default': Monitor
};

export const LauncherIcon = ({ name, icon, onClick, className = '' }: LauncherIconProps) => {
    // Normalize logic
    let safeIcon = icon.toLowerCase();
    if (safeIcon === 'excel') safeIcon = 'sheets'; // Force mapping

    const imageUrl = IconMap[safeIcon] || IconMap['default'];
    // Check if we have a mapped image, otherwise fallback
    const hasImage = !!IconMap[safeIcon];
    const Fallback = FallbackIcons[safeIcon] || FallbackIcons['default'];

    return (
        <div
            onClick={onClick}
            className={`
                relative w-12 h-12 flex items-center justify-center 
                rounded-xl cursor-pointer 
                transition-transform duration-200 ease-out 
                hover:scale-105 active:scale-95
                bg-white shadow-sm border border-gray-100
                ${className}
            `}
        >
            {hasImage ? (
                <img
                    src={imageUrl}
                    alt={name}
                    className="w-7 h-7 object-contain"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        // Could toggle state to show Fallback, but hidden img + fallback below (if rendered) might valid.
                        // For now just hide broken image.
                    }}
                />
            ) : (
                <Fallback size={24} className="text-gray-600" />
            )}

            {/* Tooltip */}
            <div className="
                absolute right-full mr-3 px-3 py-1.5 
                bg-gray-900/90 text-white text-xs font-bold rounded-lg 
                opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 
                transition-all duration-200 whitespace-nowrap z-50 shadow-xl
                pointer-events-none
            ">
                {name}
                <div className="absolute top-1/2 -right-1 w-2 h-2 bg-gray-900/90 rotate-45 -translate-y-1/2"></div>
            </div>
        </div>
    );
};
