import React from 'react';
import { useAuthStore } from '@/store/authStore';
import ActivityFeedTable from './ActivityFeedTable';

const DMMyTasks = ({ month, year }: { month?: string; year?: string }) => {
    const { user } = useAuthStore();

    return (
        <div className="animate-in fade-in duration-300">
            <ActivityFeedTable
                userId={user?.id}
                teamView="DM"
                month={month}
                year={year}
            />
        </div>
    );
};

export default DMMyTasks;
