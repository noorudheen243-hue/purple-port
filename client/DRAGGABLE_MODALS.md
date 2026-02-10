# Draggable Modal Implementation

## Overview
All modals in the application now support draggable, resizable, and minimizable functionality.

## Components

### 1. Dialog Component (`@/components/ui/dialog`)
The base Dialog component from Radix UI has been enhanced with draggable features:
- **Draggable**: Drag the system bar to move the window
- **Resizable**: Drag the bottom-right corner to resize
- **Minimizable**: Yellow button collapses content
- **Maximizable**: Green button expands to 800x600px
- **Closeable**: Red button closes the modal

**Usage**: Any component using `Dialog`, `DialogContent`, etc. automatically gets these features.

### 2. DraggableModal Component (`@/components/ui/DraggableModal`)
A reusable wrapper component for custom modals that don't use the Dialog component.

**Usage Example**:
```tsx
import { DraggableModal } from '@/components/ui/DraggableModal';

function MyModal({ isOpen, onClose }) {
    return (
        <DraggableModal
            isOpen={isOpen}
            onClose={onClose}
            title="My Modal Title"
            width={900}
            height="auto"
        >
            {/* Your modal content here */}
            <div className="p-6">
                <h2>Content</h2>
                <p>Your form, data, etc.</p>
            </div>
        </DraggableModal>
    );
}
```

**Props**:
- `isOpen`: boolean - Controls modal visibility
- `onClose`: () => void - Called when close button is clicked
- `title`: string - Displayed in the system bar
- `children`: ReactNode - Modal content
- `className?`: string - Additional CSS classes
- `width?`: number - Initial width (default: 900)
- `height?`: number | string - Initial height (default: 'auto')

## Features

All draggable modals include:
- **Mac-style window controls**: Red (close), Yellow (minimize), Green (maximize)
- **Drag to move**: Click and drag the system bar
- **Resize**: Drag the bottom-right corner handle
- **Bounds checking**: Modals stay within viewport
- **Smooth animations**: Fade-in effects and transitions

## Converting Existing Modals

To convert a custom modal to use DraggableModal:

1. Import the component:
```tsx
import { DraggableModal } from '@/components/ui/DraggableModal';
```

2. Replace your modal overlay/container with DraggableModal:
```tsx
// Before:
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="bg-background rounded-xl shadow-xl w-full max-w-4xl">
        <div className="flex justify-between items-center p-4 border-b">
            <h2>{title}</h2>
            <button onClick={onClose}>×</button>
        </div>
        {/* content */}
    </div>
</div>

// After:
<DraggableModal isOpen={isOpen} onClose={onClose} title={title}>
    {/* content */}
</DraggableModal>
```

## Implementation Details

- Uses `react-draggable` library for drag functionality
- State management for minimize/resize with React hooks
- Mouse event handlers for resize functionality
- Minimum size constraints (400x300px for DraggableModal, 300x100px for Dialog)
- Responsive to window size changes
