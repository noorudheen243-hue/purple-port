import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import api from '../../lib/api';

interface ShiftPreset {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    default_grace_time: number;
}

interface ShiftConfigurationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ShiftConfigurationModal: React.FC<ShiftConfigurationModalProps> = ({ isOpen, onClose }) => {
    const [presets, setPresets] = useState<ShiftPreset[]>([]);
    const [loading, setLoading] = useState(false);
    const [newPreset, setNewPreset] = useState({ name: '', start_time: '09:00', end_time: '18:00', default_grace_time: 15 });
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

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
        if (isOpen) {
            fetchPresets();
            resetForm();
        }
    }, [isOpen]);

    const resetForm = () => {
        setNewPreset({ name: '', start_time: '09:00', end_time: '18:00', default_grace_time: 15 });
        setEditingId(null);
        setError('');
    };

    const handleSave = async () => {
        if (!newPreset.name) return setError("Name is required");

        try {
            setError('');
            if (editingId) {
                // Update
                await api.put(`/attendance/shifts/${editingId}`, newPreset);
            } else {
                // Create
                await api.post('/attendance/shifts', newPreset);
            }
            resetForm();
            fetchPresets();
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to save preset");
        }
    };

    const handleEdit = (preset: ShiftPreset) => {
        setNewPreset({
            name: preset.name,
            start_time: preset.start_time,
            end_time: preset.end_time,
            default_grace_time: preset.default_grace_time || 15
        });
        setEditingId(preset.id);
        setError('');
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This will not remove the shift from staff currently assigned to it, but will remove it from the list.")) return;
        try {
            await api.delete(`/attendance/shifts/${id}`);
            if (editingId === id) resetForm();
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
                    {/* Add/Edit Form */}
                    <div className={`p-3 rounded-md border text-sm space-y-3 ${editingId ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-center">
                            <p className={`font-medium ${editingId ? 'text-blue-700' : 'text-gray-700'}`}>
                                {editingId ? 'Edit Preset' : 'Add New Preset'}
                            </p>
                            {editingId && (
                                <button onClick={resetForm} className="text-xs text-blue-600 hover:underline">
                                    Cancel
                                </button>
                            )}
                        </div>

                        <input
                            type="text"
                            placeholder="Shift Name (e.g. Morning Shift)"
                            className="w-full p-2 border rounded"
                            value={newPreset.name}
                            onChange={(e) => setNewPreset({ ...newPreset, name: e.target.value })}
                        />
                        <div className="flex gap-2">
                            <div className="w-1/3">
                                <label className="text-xs text-gray-500 block mb-1">Start Time</label>
                                <input
                                    type="time"
                                    className="w-full p-2 border rounded"
                                    value={newPreset.start_time}
                                    onChange={(e) => setNewPreset({ ...newPreset, start_time: e.target.value })}
                                />
                            </div>
                            <div className="w-1/3">
                                <label className="text-xs text-gray-500 block mb-1">End Time</label>
                                <input
                                    type="time"
                                    className="w-full p-2 border rounded"
                                    value={newPreset.end_time}
                                    onChange={(e) => setNewPreset({ ...newPreset, end_time: e.target.value })}
                                />
                            </div>
                            <div className="w-1/3">
                                <label className="text-xs text-gray-500 block mb-1">Grace (Min)</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border rounded"
                                    value={newPreset.default_grace_time}
                                    onChange={(e) => setNewPreset({ ...newPreset, default_grace_time: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        {error && <p className="text-red-500 text-xs">{error}</p>}
                        <Button size="sm" onClick={handleSave} className={`w-full ${editingId ? 'bg-blue-600 hover:bg-blue-700' : ''}`}>
                            {editingId ? 'Update Preset' : (
                                <><Plus size={14} className="mr-1" /> Add Preset</>
                            )}
                        </Button>
                    </div>

                    {/* List */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {loading ? <p className="text-center text-gray-400 text-sm">Loading...</p> : (
                            presets.map(preset => (
                                <div key={preset.id} className={`flex justify-between items-center p-2 border rounded hover:bg-gray-50 ${editingId === preset.id ? 'border-blue-300 bg-blue-50' : ''}`}>
                                    <div className="cursor-pointer flex-1" onClick={() => handleEdit(preset)}>
                                        <p className="font-medium text-sm text-gray-800">{preset.name}</p>
                                        <p className="text-xs text-gray-500">{formatTime12(preset.start_time)} - {formatTime12(preset.end_time)}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => handleDelete(preset.id)} className="text-red-400 hover:text-red-600 p-1">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
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
