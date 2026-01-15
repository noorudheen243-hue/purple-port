
import React, { useState, useEffect } from 'react';

const NotepadTool = () => {
    const [note, setNote] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('user_notepad');
        if (saved) setNote(saved);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setNote(val);
        localStorage.setItem('user_notepad', val);
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50">
            <div className="max-w-4xl mx-auto w-full h-full flex flex-col bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-yellow-100 px-6 py-3 border-b border-yellow-200 flex items-center justify-between">
                    <h1 className="text-lg font-bold text-yellow-800 flex items-center gap-2">
                        📝 Quick Notes
                    </h1>
                    <span className="text-xs text-yellow-600 bg-yellow-200 px-2 py-1 rounded-full">Auto-Saved to Browser</span>
                </div>
                <textarea
                    className="flex-1 w-full p-6 text-gray-700 text-lg leading-relaxed outline-none resize-none font-sans"
                    placeholder="Start typing your notes here..."
                    value={note}
                    onChange={handleChange}
                />
            </div>
        </div>
    );
};

export default NotepadTool;
