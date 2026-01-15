import React from 'react';
import { Card, CardContent } from '../../components/ui/card';

const ReportsPage = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Attendance & Leave Reports</h1>
            <Card>
                <CardContent className="pt-6">
                    <p className="text-muted-foreground">Report generation controls will be here.</p>
                </CardContent>
            </Card>
        </div>
    );
};

export default ReportsPage;
