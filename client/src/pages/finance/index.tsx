import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import InvoiceGenerator from './InvoiceGenerator';
import InvoiceManager from './InvoiceManager';

const InvoiceModule = () => {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Client Invoices</h1>
                <p className="text-muted-foreground">Generate and manage client invoices.</p>
            </div>

            <Tabs defaultValue="generate" className="space-y-4">
                <TabsList className="bg-transparent gap-2 p-0">
                    <TabsTrigger
                        value="generate"
                        className="data-[state=active]:bg-purple-900 data-[state=active]:text-yellow-400 data-[state=inactive]:bg-yellow-400 data-[state=inactive]:text-purple-900 px-6 py-2 rounded-md font-bold transition-all shadow-sm border-2 border-transparent data-[state=active]:border-yellow-400"
                    >
                        Generate New Invoice
                    </TabsTrigger>
                    <TabsTrigger
                        value="process"
                        className="data-[state=active]:bg-purple-900 data-[state=active]:text-yellow-400 data-[state=inactive]:bg-yellow-400 data-[state=inactive]:text-purple-900 px-6 py-2 rounded-md font-bold transition-all shadow-sm border-2 border-transparent data-[state=active]:border-yellow-400"
                    >
                        Invoice Process
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="generate" className="space-y-4">
                    <InvoiceGenerator />
                </TabsContent>
                <TabsContent value="process" className="space-y-4">
                    <InvoiceManager />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default InvoiceModule;
