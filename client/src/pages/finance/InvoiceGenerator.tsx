import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Trash2, Plus, Calculator, Save } from 'lucide-react';
import { format } from 'date-fns';

interface InvoiceItem {
    sl_no: number;
    particulars: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
    ledger_id: string;
}

const PARTICULARS_OPTIONS = [
    "Service Charges – Meta",
    "Service Charges – Google Ads",
    "Service Charges – SEO",
    "Website Development",
    "Website Modification",
    "Creatives",
    "Printables",
    "Branding Assets",
    "Logo Design / Branding Package",
    "Video Production",
    "Studio Charge",
    "Equipment Rent",
    "Anchor Charge",
    "Motion Graphic Production",
    "AI Video Production",
    "Poster Design",
    "Other"
];

const InvoiceGenerator = () => {
    const queryClient = useQueryClient();
    const [clientType, setClientType] = useState<'ONBOARDED' | 'WALKIN'>('ONBOARDED');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [clientName, setClientName] = useState('');

    // Dates
    const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [dueDate, setDueDate] = useState('');

    useEffect(() => {
        if (invoiceDate) {
            const date = new Date(invoiceDate);
            date.setDate(date.getDate() + 7);
            setDueDate(format(date, 'yyyy-MM-dd'));
        }
    }, [invoiceDate]);

    // Items
    const [items, setItems] = useState<InvoiceItem[]>([
        { sl_no: 1, particulars: '', description: '', quantity: 1, rate: 0, amount: 0, ledger_id: '' }
    ]);

    // Financials
    const [subTotal, setSubTotal] = useState(0);
    const [additionsTotal, setAdditionsTotal] = useState(0);
    const [additionsDesc, setAdditionsDesc] = useState('Previous Balance');
    const [deductionsTotal, setDeductionsTotal] = useState(0);
    const [deductionsDesc, setDeductionsDesc] = useState('Advance Received');
    const [netPayable, setNetPayable] = useState(0);

    // Fetch Clients
    const { data: clients = [] } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => {
            const { data } = await api.get('/clients'); // Assuming endpoint exists
            return data;
        },
        enabled: clientType === 'ONBOARDED'
    });

    const [availableAdvance, setAvailableAdvance] = useState(0);

    // Auto-fill client name when ID selected
    useEffect(() => {
        if (clientType === 'ONBOARDED' && selectedClientId) {
            const client = clients.find((c: any) => c.id === selectedClientId);
            if (client) {
                setClientName(client.company_name || client.name);
                const adv = client.advance_balance || 0;
                setAvailableAdvance(adv);
                // Auto-apply advance if available (up to subTotal usually, but subTotal might be 0 here initially)
                // We'll just set it, and let validation handle capping if needed, or rely on user to check.
                // Better: Set it to math.min(adv, subTotal) but subTotal changes. 
                // Let's just set it to 0 initially and let user click 'Apply Max', OR set it to 'adv' and let netPayable calc handle it?
                // Request says "amount should reflect in the field".
                // I will set it to 'adv' but cap it at current subTotal in the calculation/render or just let it be.
                // Actually, if I set it to 5000 and subtotal is 0, Net Payable is -5000.
                // Let's set it to valid amount later? No, user expects to see it.
                // I'll set it to `adv` and if subtotal is < adv, Net Payable will be negative, which prompts user to add items.
                if (adv > 0) {
                    setDeductionsTotal(adv);
                } else {
                    setDeductionsTotal(0);
                }
            }
        } else {
            setAvailableAdvance(0);
            setDeductionsTotal(0);
        }
    }, [selectedClientId, clientType, clients]);

    // Calculate Row Amount & Totals
    useEffect(() => {
        let st = 0;
        const newItems = items.map(item => {
            const amt = item.quantity * item.rate;
            st += amt;
            return { ...item, amount: amt };
        });

        // Only update items if values changed to avoid loop calculation jitter (simplified here)
        // Actually, we should calculate `st` from current `items` state during render or effect, 
        // but to update the `amount` field in the row, we need to map. 
        // Better: Calculate on change.
    }, []); // Handled in handleChange

    const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Auto-calc amount
        if (field === 'quantity' || field === 'rate') {
            newItems[index].amount = Number(newItems[index].quantity) * Number(newItems[index].rate);
        }

        setItems(newItems);
        calculateTotals(newItems);
    };

    const calculateTotals = (currentItems: InvoiceItem[]) => {
        const st = currentItems.reduce((acc, item) => acc + item.amount, 0);
        setSubTotal(st);
        setNetPayable((st + Number(additionsTotal)) - Number(deductionsTotal));
    };

    // Re-calc specific effects
    useEffect(() => {
        setNetPayable((subTotal + Number(additionsTotal)) - Number(deductionsTotal));
    }, [subTotal, additionsTotal, deductionsTotal]);

    const addItem = () => {
        setItems([...items, {
            sl_no: items.length + 1,
            particulars: '',
            description: '',
            quantity: 1,
            rate: 0,
            amount: 0,
            ledger_id: ''
        }]);
    };

    const removeItem = (index: number) => {
        if (items.length === 1) return;
        const newItems = items.filter((_, i) => i !== index).map((item, i) => ({ ...item, sl_no: i + 1 }));
        setItems(newItems);
        calculateTotals(newItems);
    };

    const createInvoiceMutation = useMutation({
        mutationFn: async (data: any) => {
            return await api.post('/billing/invoices', data);
        },
        onSuccess: () => {
            alert("Invoice Generated Successfully!");
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            // Reset form or redirect
            setItems([{ sl_no: 1, particulars: '', description: '', quantity: 1, rate: 0, amount: 0, ledger_id: '' }]);
            setSubTotal(0);
            setNetPayable(0);
            // Maybe switch tab context if parent controlled?
        },
        onError: (err) => {
            alert("Failed to generate invoice.");
            console.error(err);
        }
    });

    const handleSave = () => {
        if (!clientName) {
            alert("Client Name is required");
            return;
        }

        const payload = {
            client_type: clientType,
            client_id: clientType === 'ONBOARDED' ? selectedClientId : null,
            client_name: clientName,
            invoice_date: invoiceDate,
            due_date: dueDate,
            items,
            sub_total: subTotal,
            additions_total: additionsTotal,
            additions_desc: additionsDesc,
            deductions_total: deductionsTotal,
            deductions_desc: deductionsDesc,
            net_payable: netPayable
        };

        createInvoiceMutation.mutate(payload);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Invoice Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Client Type</Label>
                            <Select value={clientType} onValueChange={(v: any) => setClientType(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ONBOARDED">Onboarded Client</SelectItem>
                                    <SelectItem value="WALKIN">Walk-in Client</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {clientType === 'ONBOARDED' ? (
                            <div className="space-y-2">
                                <Label>Select Client</Label>
                                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                                    <SelectTrigger><SelectValue placeholder="Search Client..." /></SelectTrigger>
                                    <SelectContent>
                                        {clients.map((c: any) => (
                                            <SelectItem key={c.id} value={c.id}>{c.company_name || c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label>Client Name</Label>
                                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Type client name..." />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Invoice Date</Label>
                            <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Due Date</Label>
                            <Input type="date" value={dueDate} readOnly className="bg-muted" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Items</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-start border-b pb-4">
                                <div className="col-span-1 text-center pt-3 text-sm font-medium text-gray-500">{item.sl_no}</div>
                                <div className="col-span-4 space-y-2">
                                    <Select value={item.particulars} onValueChange={(v) => handleItemChange(index, 'particulars', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select Service" /></SelectTrigger>
                                        <SelectContent>
                                            {PARTICULARS_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Input placeholder="Description (Optional)" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} className="text-xs h-8" />
                                </div>
                                <div className="col-span-2">
                                    <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)} />
                                </div>
                                <div className="col-span-2">
                                    <Input type="number" placeholder="Rate" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)} />
                                </div>
                                <div className="col-span-2 text-right pt-2 font-bold font-mono">
                                    {item.amount.toFixed(2)}
                                </div>
                                <div className="col-span-1 text-center">
                                    <Button variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={items.length === 1} className="text-destructive hover:text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addItem} className="w-full border-dashed">
                            <Plus className="h-4 w-4 mr-2" /> Add Item
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span>Sub Total</span>
                            <span className="font-bold">{subTotal.toFixed(2)}</span>
                        </div>

                        <div className="space-y-4 border-t pt-4">
                            <div className="flex items-center justify-between text-sm">
                                <Label className="text-gray-600 font-normal">Additions (Previous Balance)</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={additionsTotal || ''}
                                    onChange={(e) => setAdditionsTotal(parseFloat(e.target.value) || 0)}
                                    className="w-32 text-right h-8"
                                />
                            </div>
                            {/* Hidden Desc state update handled by effect or default */}

                            <div className="flex items-center justify-between text-sm">
                                <Label className="text-gray-600 font-normal">
                                    Deductions (Advance Received)
                                    {clientType === 'ONBOARDED' && selectedClientId && (
                                        <div className="text-xs text-green-600 font-medium mt-1">
                                            Available: {'\u20B9'}{availableAdvance?.toFixed(2) || '0.00'}
                                            {availableAdvance > 0 && (
                                                <button
                                                    onClick={() => setDeductionsTotal(Math.min(availableAdvance, subTotal + additionsTotal))}
                                                    className="ml-2 underline text-blue-600 cursor-pointer hover:text-blue-800"
                                                >
                                                    Apply Max
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={deductionsTotal || ''}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        if (availableAdvance > 0 && val > availableAdvance) {
                                            alert(`Cannot deduct more than available advance (${availableAdvance})`);
                                            setDeductionsTotal(availableAdvance);
                                        } else {
                                            setDeductionsTotal(val);
                                        }
                                    }}
                                    className="w-32 text-right h-8"
                                />
                            </div>
                        </div>

                        <div className="flex justify-between text-xl font-bold border-t pt-4 text-purple-900">
                            <span>Net Payable</span>
                            <span>{netPayable.toFixed(2)}</span>
                        </div>

                        <Button className="w-full" size="lg" onClick={handleSave} disabled={createInvoiceMutation.isPending}>
                            <Save className="h-4 w-4 mr-2" />
                            {createInvoiceMutation.isPending ? 'Generating...' : 'Save & Generate Invoice'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default InvoiceGenerator;
