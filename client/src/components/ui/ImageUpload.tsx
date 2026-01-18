import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import api from '../../lib/api';
import { getAssetUrl } from '../../lib/utils';

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    label?: string;
    className?: string;
}

const ImageUpload = ({ value, onChange, label = "Upload Image", className = "" }: ImageUploadProps) => {
    const [isUploading, setIsUploading] = useState(false);
    const [preview, setPreview] = useState(value);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync preview with value prop (important for edit mode or external resets)
    React.useEffect(() => {
        setPreview(value);
    }, [value]);

    // Sync preview with value prop (important for edit mode or external resets)
    React.useEffect(() => {
        setPreview(value);
    }, [value]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Local Preview immediately
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Backend returns relative path e.g. "/uploads/image.jpg"
            onChange(res.data.url);
            // We keep the local blob preview until the component re-renders with the new value
            // or we can just let existing blob stay until next prop update

        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed");
            setPreview(value); // Revert to original value
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemove = () => {
        onChange('');
        setPreview('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Use the helper for display
    const displayUrl = getAssetUrl(preview);

    return (
        <div className={`space-y-2 ${className}`}>
            <label className="block text-sm font-medium text-gray-700">{label}</label>

            {displayUrl ? (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200 group">
                    <img
                        src={displayUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Error'; }}
                    />
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X size={14} />
                    </button>
                    {isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="animate-spin text-white" />
                        </div>
                    )}
                </div>
            ) : (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                >
                    {isUploading ? (
                        <Loader2 className="animate-spin text-gray-400" />
                    ) : (
                        <>
                            <Upload className="text-gray-400 mb-2" size={24} />
                            <span className="text-xs text-gray-500 text-center px-2">Click to Upload</span>
                        </>
                    )}
                </div>
            )}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />
        </div>
    );
};

export default ImageUpload;
