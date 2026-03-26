import React from 'react';
import ManageServicesView from '../../portal/ManageServicesView';

const DMSelectClient = () => {
    return (
        <div className="animate-in fade-in duration-300">
            {/* Reusing existing ManageServicesView which already has the client selector and tabs */}
            <ManageServicesView />
        </div>
    );
};

export default DMSelectClient;
