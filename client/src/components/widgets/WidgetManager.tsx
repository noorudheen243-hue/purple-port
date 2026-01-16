
import React, { Suspense, lazy } from 'react';
import { useLauncherStore } from '../../store/launcherStore';
import { WidgetWindow } from './WidgetWindow';
import { Minus } from 'lucide-react';

// Lazy load tools
const CalculatorTool = lazy(() => import('../../pages/tools/CalculatorTool'));
const NotepadTool = lazy(() => import('../../pages/tools/NotepadTool'));

export const WidgetManager = () => {
    const { activeWidgets, openWidget } = useLauncherStore();

    // Minimized/Docked Widgets
    const minimizedWidgets = activeWidgets.filter(w => w.isMinimized);

    return (
        <>
            {/* Active Floating Windows */}
            {activeWidgets.map((widget, index) => (
                <WidgetWindow
                    key={widget.id}
                    id={widget.id}
                    title={widget.title}
                    initialPosition={{ x: 100 + (index * 20), y: 100 + (index * 20) }}
                >
                    <Suspense fallback={<div className="p-4 text-xs text-gray-400">Loading Tool...</div>}>
                        {widget.componentType === 'CALCULATOR' && <CalculatorTool />}
                        {widget.componentType === 'NOTEPAD' && <NotepadTool />}
                    </Suspense>
                </WidgetWindow>
            ))}

            {/* Docked Bar (for minimized widgets) */}
            {minimizedWidgets.length > 0 && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur-md border border-gray-200 p-2 rounded-xl shadow-2xl z-[80] animate-in slide-in-from-bottom-5">
                    {minimizedWidgets.map(w => (
                        <button
                            key={w.id}
                            onClick={() => openWidget({ id: w.id, name: w.title } as any)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-600 rounded-lg text-xs font-semibold transition-colors border border-gray-200"
                            title="Restore"
                        >
                            <Minus size={12} className="rotate-90" />
                            {w.title}
                        </button>
                    ))}
                </div>
            )}
        </>
    );
};
