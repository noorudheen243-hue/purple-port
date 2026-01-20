import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import api from '../../lib/api';

interface ShiftPreset {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
}

interface ShiftConfigurationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ShiftConfigurationModal: React.FC<ShiftConfigurationModalProps> = ({ isOpen, onClose }) => {
    const [presets, setPresets] = useState<ShiftPreset[]>([]);
    const [loading, setLoading] = useState(false);
    const [newPreset, setNewPreset] = useState({ name: '', start_time: '09:00', end_time: '18:00' });
    const [error, setError] = useState('');

    const fetchPresets = async () => {
        try {
            setLoading(true);
            const res = await api.get('/attendance/shifts');
            setPresets(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchPresets();
    }, [isOpen]);

    const handleAdd = async () => {
        if (!newPreset.name) return setError("Name is required");
        try {
            setError('');
            await api.post('/attendance/shifts', newPreset);
            setNewPreset({ name: '', start_time: '09:00', end_time: '18:00' });
            fetchPresets();
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to create preset");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This will not remove the shift from staff currently assigned to it, but will remove it from the list.")) return;
        try {
            await api.delete(`/attendance/shifts/${id}`);
            fetchPresets();
        } catch (err) {
            console.error(err);
        }
    };

    const formatTime12 = (time: string) => {
        if (!time) return '';
        const [h, m] = time.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${m} ${ampm}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Clock size={16} /> Shift Presets
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Add New */}
                    <div className="bg-gray-50 p-3 rounded-md border text-sm space-y-3">
                        <p className="font-medium text-gray-700">Add New Preset</p>
                        <input
                            type="text"
                            placeholder="Shift Name (e.g. Morning Shift)"
                            className="w-full p-2 border rounded"
                            value={newPreset.name}
                            onChange={(e) => setNewPreset({ ...newPreset, name: e.target.value })}
                        />
                        <div className="flex gap-2">
                            <div className="w-1/2">
                                <label className="text-xs text-gray-500 block mb-1">Start Time</label>
                                <input
                                    type="time"
                                    className="w-full p-2 border rounded"
                                    value={newPreset.start_time}
                                    onChange={(e) => setNewPreset({ ...newPreset, start_time: e.target.value })}
                                />
                            </div>
                            <div className="w-1/2">
                                <label className="text-xs text-gray-500 block mb-1">End Time</label>
                                <input
                                    type="time"
                                    className="w-full p-2 border rounded"
                                    value={newPreset.end_time}
                                    onChange={(e) => setNewPreset({ ...newPreset, end_time: e.target.value })}
                                />
                            </div>
                        </div>
                        {error && <p className="text-red-500 text-xs">{error}</p>}
                        <Button size="sm" onClick={handleAdd} className="w-full">
                            <Plus size={14} className="mr-1" /> Add Preset
                        </Button>
                    </div>

                    {/* List */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {loading ? <p className="text-center text-gray-400 text-sm">Loading...</p> : (
                            presets.map(preset => (
                                <div key={preset.id} className="flex justify-between items-center p-2 border rounded hover:bg-gray-50">
                                    <div>
                                        <p className="font-medium text-sm text-gray-800">{preset.name}</p>
                                        <p className="text-xs text-gray-500">{formatTime12(preset.start_time)} - {formatTime12(preset.end_time)}</p>
                                    </div>
                                    <button onClick={() => handleDelete(preset.id)} className="text-red-400 hover:text-red-600 p-1">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                        {!loading && presets.length === 0 && (
                            <p className="text-center text-gray-400 text-sm py-4">No presets defined.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
