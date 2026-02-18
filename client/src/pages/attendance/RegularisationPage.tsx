import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import api from '../../lib/api';

const RegularisationPage = () => {
    const { register, handleSubmit, setValue, watch } = useForm();
    const [isLoading, setIsLoading] = useState(false);
    const [shiftDetails, setShiftDetails] = useState<any>(null);

    const selectedDate = watch("date");

    React.useEffect(() => {
        const fetchShift = async () => {
            if (selectedDate) {
                try {
                    const { data } = await api.get(`/attendance/shifts/active?date=${selectedDate}`);
                    setShiftDetails(data);
                } catch (error) {
                    console.error("Failed to fetch shift", error);
                    setShiftDetails(null);
                }
            } else {
                setShiftDetails(null);
            }
        };
        fetchShift();
    }, [selectedDate]);

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            await api.post('/attendance/regularisation/request', {
                date: data.date,
                type: data.type,
                reason: data.reason
            });
            alert("Regularisation request submitted successfully!");
            setValue("reason", "");
            setValue("date", "");
            setValue("type", "");
            setShiftDetails(null);
        } catch (error) {
            console.error(error);
            alert("Failed to submit request.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Attendance Regularisation</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Request Correction</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Date of Discrepancy</Label>
                            <Input type="date" {...register("date", { required: true })} />
                        </div>

                        {shiftDetails && (
                            <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                                <p className="text-sm text-blue-900 font-semibold mb-1">Expected Shift</p>
                                <div className="flex items-center gap-4 text-xs text-blue-700">
                                    <span>{shiftDetails.name}</span>
                                    <span className="font-mono bg-blue-100 px-1 rounded">{shiftDetails.start_time} - {shiftDetails.end_time}</span>
                                    {shiftDetails.default_grace_time > 0 && (
                                        <span>Grace: {shiftDetails.default_grace_time} mins</span>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Issue Type</Label>
                            <Select onValueChange={(val) => setValue("type", val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Issue Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MISSED_PUNCH_IN">Missed Punch In</SelectItem>
                                    <SelectItem value="MISSED_PUNCH_OUT">Missed Punch Out</SelectItem>
                                    <SelectItem value="LATE_ARRIVAL">Late Arrival Exception</SelectItem>
                                    <SelectItem value="EARLY_DEPARTURE">Early Departure Exception</SelectItem>
                                    <SelectItem value="WORK_FROM_HOME">Work From Home (Forgot to Apply)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Reason</Label>
                            <Input {...register("reason", { required: true })} placeholder="e.g. Forgot ID card, Network issue..." />
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Submitting..." : "Submit Request"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default RegularisationPage;
