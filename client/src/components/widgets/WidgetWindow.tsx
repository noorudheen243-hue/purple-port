
import React, { useRef } from 'react';
import Draggable from 'react-draggable';
import { X, Minus } from 'lucide-react';
import { useLauncherStore } from '../../store/launcherStore';

interface WidgetWindowProps {
    id: string;
    title: string;
    children: React.ReactNode;
    initialPosition?: { x: number, y: number };
}

export const WidgetWindow: React.FC<WidgetWindowProps> = ({ id, title, children, initialPosition }) => {
    const { closeWidget, minimizeWidget, activeWidgets } = useLauncherStore();
    const nodeRef = useRef(null);

    // Find state
    const widgetState = activeWidgets.find(w => w.id === id);
    if (!widgetState || widgetState.isMinimized) return null;

    return (
        <Draggable
            handle=".widget-header"
            nodeRef={nodeRef}
            defaultPosition={initialPosition || { x: 100, y: 100 }}
            bounds="parent"
        >
            <div
                ref={nodeRef}
                className="absolute z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden w-96 flex flex-col animate-in fade-in zoom-in-95 duration-200"
                style={{ height: '500px' }} // Default height
            >
                {/* Header / Drag Handle */}
                <div className="widget-header bg-gray-100 border-b border-gray-200 px-4 py-2 flex items-center justify-between cursor-move select-none">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">{title}</span>
                    <div className="flex items-center gap-1.5 focus:outline-none" onMouseDown={e => e.stopPropagation()}>
                        <button
                            onClick={() => minimizeWidget(id)}
                            className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition-colors"
                        >
                            <Minus size={14} />
                        </button>
                        <button
                            onClick={() => closeWidget(id)}
                            className="p-1 hover:bg-red-100 rounded text-gray-500 hover:text-red-500 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden relative">
                    {children}
                </div>
            </div>
        </Draggable>
    );
};
