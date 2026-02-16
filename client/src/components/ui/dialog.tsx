import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import Draggable from "react-draggable"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
            "fixed inset-0 z-[900] bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className
        )}
        {...props}
    />
));

// ...

const DialogContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, "title"> & {
        hideDraggableBar?: boolean;
        title?: React.ReactNode;
        initialWidth?: number;
        initialHeight?: string | number;
    }
>(({ className, children, hideDraggableBar = false, title = "Window", initialWidth = 600, initialHeight = "auto", ...props }, ref) => {
    const [isMinimized, setIsMinimized] = React.useState(false);
    const [size, setSize] = React.useState<{ width: number; height: string | number }>({ width: initialWidth, height: initialHeight });
    // We intentionally don't track position in state to avoid re-renders, letting Draggable handle the DOM.

    // Resize Logic
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
                // Minimum limits
                setSize({
                    width: Math.max(300, newWidth),
                    height: Math.max(100, newHeight)
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

    return (
        <DialogPortal>
            <DialogOverlay />
            <DialogPrimitive.Content
                ref={ref}
                className={cn(
                    "fixed left-1/2 top-1/2 z-[900] -translate-x-1/2 -translate-y-1/2 bg-transparent border-0 shadow-none p-0",
                    className
                )}
                {...props}
            >
                <Draggable
                    handle=".window-drag-handle"
                    defaultPosition={{ x: 0, y: 0 }}
                    bounds="body"
                >
                    <div
                        ref={dialogRef}
                        className="bg-background border shadow-lg rounded-lg flex flex-col overflow-hidden pointer-events-auto"
                        style={{
                            width: hideDraggableBar ? 'auto' : size.width,
                            height: isMinimized ? 'auto' : (hideDraggableBar ? 'auto' : (size.height === 'auto' ? 'auto' : size.height)),
                            maxHeight: isMinimized ? undefined : '90vh'
                        }}
                    >
                        {/* --- System Bar (Drag Handle) - Only if not hidden --- */}
                        {!hideDraggableBar && (
                            <div className="window-drag-handle h-9 bg-muted/80 flex items-center justify-between px-3 cursor-move select-none border-b shrink-0">
                                <div className="flex gap-1.5">
                                    {/* Window Controls (Mac-style or similar) */}
                                    <DialogPrimitive.Close className="h-3 w-3 rounded-full bg-red-500 hover:bg-red-600 focus:outline-none ring-offset-background transition-colors opacity-80 hover:opacity-100" />
                                    <div className="h-3 w-3 rounded-full bg-yellow-400 hover:bg-yellow-500 cursor-pointer opacity-80 hover:opacity-100"
                                        onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                                    />
                                    {/* Green (Maximize) - Optional, maybe reset size? */}
                                    <div className="h-3 w-3 rounded-full bg-green-500 hover:bg-green-600 cursor-pointer opacity-80 hover:opacity-100"
                                        onClick={(e) => { e.stopPropagation(); setSize({ width: 800, height: 600 }); }}
                                    />
                                </div>
                                <div className="text-xs text-muted-foreground font-medium ml-4 truncate flex-1 text-center pointer-events-none">
                                    {title}
                                </div>
                                <div className="w-10"></div> {/* Spacer for balance */}
                            </div>
                        )}

                        {/* --- Content Body --- */}
                        {!isMinimized && (
                            <>
                                <div className={hideDraggableBar ? "" : "p-6 h-full overflow-auto relative flex-1"}>
                                    {children}
                                </div>

                                {/* --- Resize Handle - Only if draggable bar is shown --- */}
                                {!hideDraggableBar && (
                                    <div
                                        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50 flex items-end justify-end p-0.5 opacity-50 hover:opacity-100"
                                        onMouseDown={startResize}
                                    >
                                        {/* Diagonal lines icon-ish */}
                                        <div className="w-0 h-0 border-b-[6px] border-r-[6px] border-l-[6px] border-t-[6px] border-transparent border-b-foreground/40 border-r-foreground/40 rotate-0"></div>
                                    </div>
                                )}
                            </>
                        )}

                        <span className="sr-only">Dialog Closed</span>
                    </div>
                </Draggable>
            </DialogPrimitive.Content>
        </DialogPortal>
    )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col space-y-1.5 text-center sm:text-left",
            className
        )}
        {...props}
    />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
            className
        )}
        {...props}
    />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Title
        ref={ref}
        className={cn(
            "text-lg font-semibold leading-none tracking-tight",
            className
        )}
        {...props}
    />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Description
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogClose,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
}
