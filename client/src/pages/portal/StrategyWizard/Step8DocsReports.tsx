import React from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { 
    FileText, 
    Download, 
    Printer, 
    Share2, 
    CheckCircle, 
    Info, 
    MapPin, 
    Phone,
    Globe,
    ExternalLink
} from 'lucide-react';
import { generateStrategyDataSheet, generateStrategyOutcomePDF } from '../../../modules/strategy/utils/docGenerator';
import Swal from 'sweetalert2';

interface Step8Props {
    clientId: string;
    strategyData: any;
    marketData: any;
}

const Step8DocsReports: React.FC<Step8Props> = ({ clientId, strategyData, marketData }) => {
    
    const handleDownloadDataSheet = async () => {
        try {
            await generateStrategyDataSheet();
            Swal.fire({
                title: 'Data Sheet Generated',
                text: 'Your editable Word document is ready for information collection.',
                icon: 'success',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        } catch (error) {
            console.error("Word Generation Error:", error);
            Swal.fire('Generation Failed', 'Could not create the Word document. Please check console for details.', 'error');
        }
    };

    const handleDownloadReport = () => {
        if (!strategyData?.output) {
            Swal.fire({
                title: 'Outcome Not Ready',
                text: 'Please complete the strategy generation process (Step 6 & 7) before downloading the report.',
                icon: 'warning'
            });
            return;
        }

        try {
            const clientName = strategyData.input?.business_name || "Valued Client";
            generateStrategyOutcomePDF(strategyData, clientName);
            Swal.fire({
                title: 'Strategy Report Generated',
                text: 'Your professional A4 PDF report is ready.',
                icon: 'success',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        } catch (error) {
            console.error("PDF Generation Error:", error);
            Swal.fire('Generation Failed', 'Could not create the PDF report. Please check if strategy data is complete.', 'error');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="text-center space-y-4">
                <h3 className="text-4xl font-black text-[#2c185a] tracking-tight">Strategy Assets & Reports</h3>
                <p className="text-lg text-gray-500 font-medium">Your customized strategy documentation is ready for download.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl px-6">
                <button 
                    onClick={handleDownloadDataSheet}
                    className="flex-1 group flex flex-col items-center justify-center gap-4 p-8 bg-white border-2 border-indigo-50 shadow-xl rounded-[2rem] transition-all duration-500 hover:border-indigo-500 hover:shadow-indigo-100 hover:-translate-y-2"
                >
                    <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500">
                        <FileText size={40} />
                    </div>
                    <div className="text-center">
                        <span className="block text-xl font-black text-gray-900 leading-tight">Datasheet Docs</span>
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-1 block">Microsoft Word (.docx)</span>
                    </div>
                </button>

                <button 
                    onClick={handleDownloadReport}
                    className="flex-1 group flex flex-col items-center justify-center gap-4 p-8 bg-white border-2 border-amber-50 shadow-xl rounded-[2rem] transition-all duration-500 hover:border-amber-500 hover:shadow-amber-100 hover:-translate-y-2"
                >
                    <div className="w-20 h-20 rounded-3xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all duration-500">
                        <Printer size={40} />
                    </div>
                    <div className="text-center">
                        <span className="block text-xl font-black text-gray-900 leading-tight">Strategy Outcome Report</span>
                        <span className="text-xs font-bold text-amber-500 uppercase tracking-widest mt-1 block">Premium PDF Document</span>
                    </div>
                </button>
            </div>

            <div className="flex items-center gap-2 text-gray-400 font-bold text-sm">
                <CheckCircle size={16} className="text-green-500" />
                A4 Printable Layouts
                <span className="mx-2 text-gray-200">|</span>
                <CheckCircle size={16} className="text-green-500" />
                Qix Ads Branded
            </div>
        </div>
    );
};

export default Step8DocsReports;
