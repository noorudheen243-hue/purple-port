import React from 'react';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Input } from '../../../components/ui/input';
import { Globe, Facebook, Instagram, Youtube, Linkedin, Twitter, MessageSquare, Plus, ExternalLink } from 'lucide-react';

interface Step2Props {
    formData: any;
    setFormData: (data: any) => void;
}

const CHANNELS = [
    { id: 'website', label: 'Website URL', icon: Globe },
    { id: 'facebook', label: 'Facebook', icon: Facebook },
    { id: 'instagram', label: 'Instagram', icon: Instagram },
    { id: 'gmb', label: 'Google My Business', icon: MessageSquare },
    { id: 'youtube', label: 'YouTube', icon: Youtube },
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
    { id: 'tiktok', label: 'TikTok', icon: Zap }, // Reusing icon for TikTok
    { id: 'snapchat', label: 'Snapchat', icon: Zap },
    { id: 'twitter', label: 'X (Twitter)', icon: Twitter },
    { id: 'other', label: 'Other (Custom)', icon: Plus },
];

// Map of secondary icons for social brands if available in lucide-react
import { Zap } from 'lucide-react';

const Step2DigitalPresence: React.FC<Step2Props> = ({ formData, setFormData }) => {
    // Parse JSON safely
    const data = React.useMemo(() => {
        try {
            return JSON.parse(formData.digital_presence || '{}');
        } catch {
            return { channels: {}, strengths: '', weaknesses: '' };
        }
    }, [formData.digital_presence]);

    const updateChannel = (channelId: string, value: string) => {
        const newChannels = { ...(data.channels || {}), [channelId]: value };
        const newData = { ...data, channels: newChannels };
        setFormData({ ...formData, digital_presence: JSON.stringify(newData) });
    };

    const updateData = (key: string, value: string) => {
        const newData = { ...data, [key]: value };
        setFormData({ ...formData, digital_presence: JSON.stringify(newData) });
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            {/* Structured Channels */}
            <div className="space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest text-[#2c185a]">Current Channels & Assets</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {CHANNELS.map((channel) => {
                        const Icon = channel.icon;
                        const value = data.channels?.[channel.id] || '';
                        
                        return (
                            <div key={channel.id} className="relative group">
                                <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${value ? 'text-indigo-600' : 'text-gray-400 group-focus-within:text-indigo-600'}`}>
                                    <Icon size={18} />
                                </div>
                                <Input 
                                    placeholder={channel.label}
                                    value={value}
                                    onChange={(e) => updateChannel(channel.id, e.target.value)}
                                    className={`pl-10 h-12 rounded-xl transition-all ${
                                        value ? 'bg-indigo-50/50 border-indigo-200' : 'bg-gray-50 border-gray-100 focus:bg-white'
                                    }`}
                                />
                                {value && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Strengths and Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-50">
                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-green-900">Key Strengths</Label>
                    <Textarea 
                        placeholder="What is working well? (e.g. Good organic reach, High brand trust)" 
                        value={data.strengths || ''} 
                        onChange={(e) => updateData('strengths', e.target.value)}
                        className="min-h-[120px] rounded-2xl bg-green-50/30 border-green-100 focus:ring-2 focus:ring-green-500"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-red-900">Key Weaknesses / Gaps</Label>
                    <Textarea 
                        placeholder="What is missing or failing? (e.g. Low website conversion, No paid ads)" 
                        value={data.weaknesses || ''} 
                        onChange={(e) => updateData('weaknesses', e.target.value)}
                        className="min-h-[120px] rounded-2xl bg-red-50/30 border-red-100 focus:ring-2 focus:ring-red-500"
                    />
                </div>
            </div>
        </div>
    );
};

export default Step2DigitalPresence;
