import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import backend from '../../lib/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download, Eye, Printer, X, Share2, Mail } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useAuthStore } from '../../store/authStore';
import Swal from 'sweetalert2';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
const SalarySlipModal = ({ slip, onClose }: { slip: any; onClose: () => void }) => {

    const handlePrint = () => {
        window.print();
    };

    const [isSharing, setIsSharing] = useState(false);

    const generatePdfBlob = async (): Promise<Blob | null> => {
        const input = document.getElementById('payslip-content');
        if (!input) return null;

        try {
            document.body.classList.add('pdf-mode');
            const canvas = await html2canvas(input, {
                scale: 2,
                useCORS: true,
                logging: false,
                windowWidth: 794,
            });
            document.body.classList.remove('pdf-mode');

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const imgWidth = imgProps.width;
            const imgHeight = imgProps.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth * ratio, imgHeight * ratio);
            return pdf.output('blob');
        } catch (error) {
            console.error("PDF Generation failed", error);
            document.body.classList.remove('pdf-mode');
            return null;
        }
    };

    const handleDownloadPDF = async () => {
        setIsSharing(true);
        const blob = await generatePdfBlob();
        if (blob) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Payslip_${slip.user?.full_name}_${slip.run.month}_${slip.run.year}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }
        setIsSharing(false);
    };

    const handleShareWhatsApp = async () => {
        setIsSharing(true);
        const text = `Here is my payslip for ${slip.run.month}/${slip.run.year}.\nNet Pay: ₹${slip.net_pay.toLocaleString('en-IN')}`;
        const filename = `Payslip_${slip.run.month}_${slip.run.year}.pdf`;

        try {
            const blob = await generatePdfBlob();
            if (!blob) throw new Error("Failed to generate PDF");

            const file = new File([blob], filename, { type: 'application/pdf' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Payslip',
                    text: text,
                });
            } else {
                // Fallback: Download file + Open WhatsApp
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                // Allow download to start before redirecting
                setTimeout(() => {
                    window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n(Please attach the downloaded payslip)")}`, '_blank');
                }, 1000);
            }
        } catch (error) {
            console.error("Error sharing to WhatsApp:", error);
            // Simple fallback if everything fails
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        } finally {
            setIsSharing(false);
        }
    };

    const handleShareMail = async () => {
        setIsSharing(true);
        const subject = `Payslip - ${slip.run.month}/${slip.run.year} - ${slip.user?.full_name}`;
        const body = `Please find attached the payslip for ${slip.run.month}/${slip.run.year}.\n\nNet Pay: ₹${slip.net_pay.toLocaleString('en-IN')}`;
        const filename = `Payslip_${slip.run.month}_${slip.run.year}.pdf`;

        try {
            const blob = await generatePdfBlob();
            if (!blob) throw new Error("Failed to generate PDF");

            const file = new File([blob], filename, { type: 'application/pdf' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: subject,
                    text: body,
                });
            } else {
                // Fallback: Download file + Open Mailto
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                setTimeout(() => {
                    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + "\n\n(Payslip downloaded - please attach)")}`);
                }, 1000);
            }
        } catch (error) {
            console.error("Error sharing to Mail:", error);
            window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
        } finally {
            setIsSharing(false);
        }
    };

    const handleShareWhatsAppWeb = async () => {
        setIsSharing(true);
        const text = `Here is my payslip for ${slip.run.month}/${slip.run.year}.\nNet Pay: ₹${slip.net_pay.toLocaleString('en-IN')}`;
        const filename = `Payslip_${slip.run.month}_${slip.run.year}.pdf`;

        try {
            // 1. Download File
            const blob = await generatePdfBlob();
            if (blob) {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }

            // 2. Show Instruction & Open
            await Swal.fire({
                title: 'PDF Downloaded',
                text: "Due to browser security, we cannot auto-attach files to WhatsApp Web. Please drag & drop the downloaded payslip into the chat.",
                icon: 'info',
                confirmButtonText: 'Open WhatsApp Web',
                confirmButtonColor: '#25D366',
                showCancelButton: true,
                cancelButtonText: 'Close'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(text + "\n(Please attach the downloaded payslip)")}`, '_blank');
                }
            });

        } catch (error) {
            console.error(error);
        } finally {
            setIsSharing(false);
        }
    };

    const handleShareGmail = async () => {
        setIsSharing(true);
        const subject = `Payslip - ${slip.run.month}/${slip.run.year} - ${slip.user?.full_name}`;
        const body = `Please find attached the payslip for ${slip.run.month}/${slip.run.year}.\n\nNet Pay: ₹${slip.net_pay.toLocaleString('en-IN')}`;
        const filename = `Payslip_${slip.run.month}_${slip.run.year}.pdf`;

        try {
            // 1. Download File
            const blob = await generatePdfBlob();
            if (blob) {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }

            // 2. Open Gmail (Needs user to attach file manually)
            setTimeout(() => {
                window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + "\n\n(Payslip downloaded - please attach)")}`, '_blank');
            }, 1000);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto print-container print:absolute print:top-0 print:left-0 print:w-full print:bg-white print:z-[100] print:block print:h-auto print:overflow-visible">
            {/* Modal Container - Increased Width */}
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl my-8 print:shadow-none print:w-full print:max-w-none print:my-0 flex flex-col max-h-[90vh] print:max-h-none print:h-auto print:overflow-visible">

                {/* Header Actions */}
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg print:hidden shrink-0">
                    <h3 className="font-bold text-lg text-gray-800">Salary Slip Preview</h3>

                    <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={handlePrint} disabled={isSharing}>
                            <Printer className="w-4 h-4 mr-2" /> Print
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={isSharing}>
                            <Download className="w-4 h-4 mr-2" /> PDF
                        </Button>

                        {/* WhatsApp Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" disabled={isSharing} className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100">
                                    <Share2 className="w-4 h-4 mr-2" /> {isSharing ? 'Sharing...' : 'WhatsApp'} <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>Share via</DropdownMenuLabel>
                                <DropdownMenuItem onClick={handleShareWhatsApp}>
                                    WhatsApp App (Mobile)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleShareWhatsAppWeb}>
                                    WhatsApp Web
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Email Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" disabled={isSharing} className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100">
                                    <Mail className="w-4 h-4 mr-2" /> {isSharing ? 'Sharing...' : 'Email'} <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>Share via</DropdownMenuLabel>
                                <DropdownMenuItem onClick={handleShareMail}>
                                    Default Mail App
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleShareGmail}>
                                    Gmail
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-red-50 hover:text-red-600">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto p-8 bg-gray-100 print:overflow-visible print:bg-white print:p-0 flex-1 leading-snug print:leading-tight">
                    {/* Add payslip-compact here to enforce styles on screen and print */}
                    <div id="payslip-content" className="payslip-compact bg-white shadow-sm mx-auto max-w-3xl min-h-[800px] print:shadow-none print:border-0 relative print:max-w-none print:w-full">

                        {/* YELLOW MENU BAR */}
                        <div className="h-4 w-full bg-[#FFD700] print:print-color-adjust-exact"></div>

                        {/* LETTERHEAD */}
                        <div className="p-8 pb-4 print:p-6 print:pb-2">
                            <div className="flex justify-between items-start mb-6 border-b pb-6">
                                {/* Logo Left */}
                                <div className="flex-shrink-0">
                                    <img src="/qix_logo.png" alt="Qix Ads" className="h-20 object-contain print:h-10 print-logo" />
                                </div>

                                {/* Address & Details */}
                                <div className="text-right text-xs text-gray-600 leading-relaxed max-w-md print:max-w-none print:text-[10px] print:leading-none print-header-text">
                                    <h2 className="text-xl font-bold text-gray-900 mb-1 print:text-base">Qix Ads</h2>
                                    <p>2nd floor City Center Complex, Pattambi Rd</p>
                                    <p>Near Supplyco Store, Perintalmanna, Kerala 679322</p>
                                    <p className="mt-2 text-[10px] print:mt-1">
                                        <span className="font-semibold">Phone:</span> +91 99473 81381, +91 81369 12104
                                    </p>
                                    <p className="text-[10px]">
                                        <span className="font-semibold">Email:</span> qixmediasol@gmail.com | <span className="font-semibold">Web:</span> www.qixads.com
                                    </p>
                                </div>
                            </div>

                            {/* Payslip Header Info */}
                            <div className="text-center mb-8 print:mb-4">
                                <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wider underline underline-offset-4 print:text-xl print:no-underline" style={{ fontSize: '18px !important' }}>
                                    Payslip for the month of - {new Date(0, slip.run.month - 1).toLocaleString('default', { month: 'long' })} {slip.run.year}
                                </h1>
                                <p className="text-xs text-gray-400 mt-1 print-header-text">Generated: {new Date().toLocaleString()}</p>
                            </div>

                            {/* EMPLOYEE DETAILS GRID */}
                            <div className="grid grid-cols-2 gap-x-12 gap-y-6 mb-8 text-sm print:gap-x-8 print:gap-y-1 print:mb-3 print-grid">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Employee Name</p>
                                    <p className="font-bold text-gray-900 text-lg border-b border-gray-200 pb-1 print:text-base">{slip.user?.full_name || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Designation</p>
                                    <p className="font-bold text-gray-900 text-lg border-b border-gray-200 pb-1">{slip.user?.staffProfile?.designation || 'N/A'}</p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Department</p>
                                    <p className="font-medium text-gray-800">{slip.user?.staffProfile?.department || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Staff ID</p>
                                    <p className="font-medium text-gray-800">{slip.user?.staffProfile?.staff_number || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-8 grid grid-cols-3 gap-6 text-center print:bg-gray-50 print:border-gray-300 print:p-2 print:mb-4 print:gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase mb-1">Total Working Days</p>
                                    <p className="font-bold text-gray-900 text-lg">{slip.total_working_days || 30}</p>
                                    <p className="text-[10px] text-gray-400">(Excl. Sundays & Holidays)</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase mb-1">LOP Days</p>
                                    <p className="font-bold text-red-600 text-lg">{slip.lop_days || 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase mb-1">Paid Days</p>
                                    <p className="font-bold text-green-700 text-lg">{(slip.total_working_days || 30) - (slip.lop_days || 0)}</p>
                                </div>
                            </div>

                            {/* SALARY TABLE */}
                            <div className="border border-gray-300 rounded overflow-hidden mb-8 print:mb-2 text-sm print:text-xs">
                                <div className="grid grid-cols-2 bg-gray-800 text-white">
                                    <div className="p-3 font-semibold text-center border-r border-gray-600 print-table-header">EARNINGS</div>
                                    <div className="p-3 font-semibold text-center print-table-header">DEDUCTIONS</div>
                                </div>
                                <div className="grid grid-cols-2 text-sm print:text-xs">
                                    {/* Earnings Column */}
                                    <div className="border-r border-gray-300">
                                        <Row label="Basic Salary" value={slip.basic_salary} />
                                        <Row label="HRA" value={slip.hra} />
                                        <Row label="Conveyance Allowance" value={slip.conveyance_allowance} />
                                        <Row label="Accommodation Allowance" value={slip.accommodation_allowance} />
                                        <Row label="Special Allowances" value={slip.allowances} />
                                        <Row label="Incentives / Bonus" value={slip.incentives} />

                                        <div className="p-4 flex justify-between font-bold border-t border-gray-300 bg-gray-50 mt-auto items-end print:p-2">
                                            <span>Total Earnings</span>
                                            <span>₹ {calculateTotalEarnings(slip).toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                    {/* Deductions Column */}
                                    <div className="flex flex-col">
                                        <Row label="LOP Deduction" value={slip.lop_deduction} isDeduction />
                                        <Row label="Salary Advance Recovery" value={slip.advance_salary} isDeduction />
                                        <Row label="Other Deductions" value={slip.other_deductions} isDeduction />

                                        <div className="flex-1"></div>

                                        <div className="p-4 flex justify-between font-bold border-t border-gray-300 bg-gray-50 mt-auto items-end print:p-2">
                                            <span>Total Deductions</span>
                                            <span className="text-red-600">₹ {calculateTotalDeductions(slip).toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* NET PAY */}
                            <div className="bg-gray-900 print:bg-white print:border-2 print:border-black text-white print:text-black p-6 rounded-lg flex justify-between items-center shadow-lg mb-12 print-net-pay">
                                <div>
                                    <p className="text-sm opacity-80 uppercase tracking-widest font-medium">Net Payable Amount</p>
                                    <p className="text-xs opacity-60 print:opacity-100 hidden print:block">(Earnings - Deductions)</p>
                                </div>
                                <div className="text-4xl font-bold tracking-tight print:text-3xl">
                                    ₹ {slip.net_pay.toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div> {/* End Padding 8 */}

                        {/* FOOTER - BOTTOM OF PAGE */}
                        <div className="p-8 pt-0">
                            <div className="border-t-2 border-dashed border-gray-300 pt-8 flex justify-between items-end text-xs text-gray-500">
                                <div>
                                    <p className="font-bold text-gray-900 mb-8 text-sm">For Qix Ads</p>
                                    <div className="w-40 border-b border-gray-400"></div>
                                    <p className="mt-1">Authorized Signatory</p>
                                </div>
                                <div className="text-right">
                                    <p>This is a computer-generated document and does not require a physical signature.</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

const Row = ({ label, value, isDeduction }: any) => {
    return (
        <div className="flex justify-between p-3 border-b last:border-0 hover:bg-gray-50/50 print:p-0.5 print-table-row">
            <span className="text-gray-600">{label}</span>
            <span className={`font-medium ${isDeduction ? 'text-red-600' : 'text-gray-900'}`}>
                {value !== undefined ? `₹ ${value.toLocaleString('en-IN')}` : '-'}
            </span>
        </div>
    );
}

const calculateTotalEarnings = (s: any) => (s.basic_salary || 0) + (s.hra || 0) + (s.conveyance_allowance || 0) + (s.accommodation_allowance || 0) + (s.allowances || 0) + (s.incentives || 0);
const calculateTotalDeductions = (s: any) => (s.lop_deduction || 0) + (s.advance_salary || 0) + (s.other_deductions || 0);



const Payslips = () => {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'DEVELOPER_ADMIN';

    const [selectedSlip, setSelectedSlip] = useState<any | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string>('me');
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or 1-12

    // Fetch Staff for Admin Filter
    const { data: staffList = [] } = useQuery({
        queryKey: ['staff-list'],
        queryFn: async () => {
            const res = await backend.get('/team/staff');
            return res.data;
        },
        enabled: isAdmin
    });

    const { data: payslips, isLoading } = useQuery({
        queryKey: ['payslips', selectedUserId, selectedYear, selectedMonth],
        queryFn: () => {
            const params: any = { year: selectedYear };
            if (selectedUserId !== 'me') params.userId = selectedUserId;
            if (selectedMonth !== 'all') params.month = selectedMonth;

            return backend.get('/payroll/history', { params }).then(res => res.data);
        }
    });

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading payslips...</div>;

    const months = [
        { value: 'all', label: 'All Months' },
        { value: '1', label: 'January' },
        { value: '2', label: 'February' },
        { value: '3', label: 'March' },
        { value: '4', label: 'April' },
        { value: '5', label: 'May' },
        { value: '6', label: 'June' },
        { value: '7', label: 'July' },
        { value: '8', label: 'August' },
        { value: '9', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' },
    ];

    const years = [2024, 2025, 2026];

    return (
        <div className="space-y-6">
            {selectedSlip && <SalarySlipModal slip={selectedSlip} onClose={() => setSelectedSlip(null)} />}
            <div className={`flex flex-col md:flex-row gap-4 justify-between items-start md:items-center ${selectedSlip ? 'print:hidden' : ''}`}>
                <h2 className="text-xl font-bold">My Payslips</h2>

                <div className="flex flex-wrap gap-2">
                    {/* Staff Filter (Admin Only) */}
                    {isAdmin && (
                        <div className="w-[200px]">
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Staff" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="me">My Payslips</SelectItem>
                                    {staffList.map((staff: any) => (
                                        <SelectItem key={staff.user_id} value={staff.user_id}>
                                            {staff.user.full_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Year Filter */}
                    <div className="w-[120px]">
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger>
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(y => (
                                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Month Filter */}
                    <div className="w-[150px]">
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger>
                                <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map(m => (
                                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className={`bg-white shadow overflow-hidden sm:rounded-md ${selectedSlip ? 'print:hidden' : ''}`}>

                {(!payslips || payslips.length === 0) ? (
                    <div className="p-12 text-center text-gray-500">
                        No payslips found for selected criteria.
                    </div>
                ) : (
                    <ul role="list" className="divide-y divide-gray-200">
                        {payslips.map((slip: any) => (
                            <li key={slip.id} className="hover:bg-gray-50 transition">
                                <div className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-indigo-600 truncate">
                                                {new Date(0, slip.run.month - 1).toLocaleString('default', { month: 'long' })} {slip.run.year}
                                            </p>
                                            <p className="text-xs text-gray-500">{slip.user?.full_name}</p>
                                        </div>
                                        <div className="ml-2 flex-shrink-0 flex">
                                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                Paid
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-2 sm:flex sm:justify-between items-center">
                                        <div className="sm:flex">
                                            <p className="flex items-center text-sm text-gray-500">
                                                Net Pay: <span className="font-medium text-gray-900 ml-1">₹{slip.net_pay.toLocaleString('en-IN')}</span>
                                            </p>
                                        </div>
                                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 gap-4">
                                            <button
                                                onClick={() => setSelectedSlip(slip)}
                                                className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition"
                                            >
                                                <Eye className="h-4 w-4" /> View Slip
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default Payslips;
