import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import api from '../../lib/api';

interface CreateCampaignModalProps {
    clientId: string;
    isOpen: boolean;
    onClose: () => void;
}

const CreateCampaignModal = ({ clientId, isOpen, onClose }: CreateCampaignModalProps) => {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [goals, setGoals] = useState('');

    const mutation = useMutation({
        mutationFn: async (newCampaign: any) => {
            return await api.post('/campaigns', newCampaign);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client', clientId] }); // Refresh client details
            onClose();
            setTitle('');
            setStartDate('');
            setEndDate('');
            setGoals('');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            title,
            start_date: startDate,
            end_date: endDate,
            goals,
            client_id: clientId
        });
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
                <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-card p-6 rounded-lg shadow-lg w-[90vw] max-w-md z-50 border border-border">
                    <div className="flex justify-between items-center mb-4">
                        <Dialog.Title className="text-xl font-semibold">Create New Campaign</Dialog.Title>
                        <Dialog.Close className="text-muted-foreground hover:text-foreground">
                            <X size={20} />
                        </Dialog.Close>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Campaign Title</label>
                            <input
                                type="text"
                                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Start Date</label>
                                <input
                                    type="date"
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">End Date</label>
                                <input
                                    type="date"
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Goals (Optional)</label>
                            <textarea
                                className="w-full p-3 rounded-md border border-input bg-background min-h-[100px]"
                                value={goals}
                                onChange={(e) => setGoals(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={mutation.isPending}
                                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                            >
                                {mutation.isPending ? 'Creating...' : 'Create Campaign'}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default CreateCampaignModal;
