import React from 'react';
import ActivityFeedTable from './ActivityFeedTable';

const DMTaskBoard = ({ month, year }: { month?: string; year?: string }) => {
    return (
        <div className="animate-in fade-in duration-300">
            <ActivityFeedTable
                teamView="DM"
                month={month}
                year={year}
            />
        </div>
    );
};

export default DMTaskBoard;
