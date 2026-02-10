import React from 'react';
import Draggable from 'react-draggable';

interface DraggableModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
    width?: number;
    height?: number | string;
}

export const DraggableModal: React.FC<DraggableModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    className = '',
    width = 900,
    height = 'auto'
}) => {
    const [isMinimized, setIsMinimized] = React.useState(false);
    const [size, setSize] = React.useState<{ width: number; height: string | number }>({ width, height });
    const [isResizing, setIsResizing] = React.useState(false);
    const dialogRef = React.useRef<HTMLDivElement>(null);

    const startResize = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
    };

    React.useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (dialogRef.current) {
                const rect = dialogRef.current.getBoundingClientRect();
                const newWidth = e.clientX - rect.left;
                const newHeight = e.clientY - rect.top;
                setSize({
                    width: Math.max(400, newWidth),
                    height: Math.max(300, newHeight)
                });
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <Draggable
                handle=".window-drag-handle"
                defaultPosition={{ x: 0, y: 0 }}
                bounds="parent"
            >
                <div
                    ref={dialogRef}
                    className={`bg-background rounded-xl shadow-xl flex flex-col overflow-hidden relative ${className}`}
                    style={{
                        width: size.width,
                        height: isMinimized ? 'auto' : (size.height === 'auto' ? 'auto' : size.height),
                        maxHeight: isMinimized ? undefined : '90vh'
                    }}
                >
                    {/* System Bar */}
                    <div className="window-drag-handle h-9 bg-muted/80 flex items-center justify-between px-3 cursor-move select-none border-b shrink-0">
                        <div className="flex gap-1.5">
                            <button
                                onClick={onClose}
                                className="h-3 w-3 rounded-full bg-red-500 hover:bg-red-600 focus:outline-none transition-colors opacity-80 hover:opacity-100"
                            />
                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="h-3 w-3 rounded-full bg-yellow-400 hover:bg-yellow-500 focus:outline-none transition-colors opacity-80 hover:opacity-100"
                            />
                            <button
                                onClick={() => setSize({ width: 1000, height: 700 })}
                                className="h-3 w-3 rounded-full bg-green-500 hover:bg-green-600 focus:outline-none transition-colors opacity-80 hover:opacity-100"
                            />
                        </div>
                        <div className="text-xs text-muted-foreground font-medium ml-4 truncate flex-1 text-center pointer-events-none">
                            {title}
                        </div>
                        <div className="w-10"></div>
                    </div>

                    {/* Content */}
                    {!isMinimized && (
                        <>
                            <div className="flex-1 overflow-hidden flex flex-col">
                                {children}
                            </div>

                            {/* Resize Handle */}
                            <div
                                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50 flex items-end justify-end p-0.5 opacity-50 hover:opacity-100"
                                onMouseDown={startResize}
                            >
                                <div className="w-0 h-0 border-b-[6px] border-r-[6px] border-l-[6px] border-t-[6px] border-transparent border-b-foreground/40 border-r-foreground/40 rotate-0"></div>
                            </div>
                        </>
                    )}
                </div>
            </Draggable>
        </div>
    );
};
