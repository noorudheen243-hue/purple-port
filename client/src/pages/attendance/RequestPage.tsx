import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import api from '../../lib/api';

const RequestPage = () => {
    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm();
    const [isLoading, setIsLoading] = useState(false);
    const isHalfDay = watch("is_half_day");
    const startDate = watch("start_date");

    // Sync end date with start date if half day
    React.useEffect(() => {
        if (isHalfDay && startDate) {
            setValue("end_date", startDate);
        }
    }, [isHalfDay, startDate, setValue]);

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            await api.post('/leave/apply', {
                type: data.type,
                start_date: data.start_date,
                end_date: data.is_half_day ? data.start_date : data.end_date,
                reason: data.reason,
                is_half_day: data.is_half_day
            });
            alert("Leave request submitted successfully!");
            // Reset form
            setValue("reason", "");
            setValue("type", "");
            setValue("start_date", "");
            setValue("end_date", "");
        } catch (error: any) {
            console.error(error);
            const errorMessage = error.response?.data?.message || error.message || "Failed to submit request. Please try again.";
            alert(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Leave Request</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Apply for Leave</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="flex items-center space-x-2 py-2">
                            <input
                                type="checkbox"
                                id="is_half_day"
                                {...register("is_half_day")}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="is_half_day" className="text-sm font-medium cursor-pointer">
                                This is a Half-Day Leave Request
                            </Label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input type="date" {...register("start_date", { required: true })} />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input
                                    type="date"
                                    {...register("end_date", { required: !isHalfDay })}
                                    disabled={isHalfDay}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Leave Type</Label>
                            <Select onValueChange={(val) => setValue("type", val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASUAL">Casual Leave</SelectItem>
                                    <SelectItem value="SICK">Sick Leave</SelectItem>
                                    <SelectItem value="EARNED">Earned Privilege Leave</SelectItem>
                                    <SelectItem value="LOP">Loss of Pay (LOP)</SelectItem>
                                    <SelectItem value="MATERNITY">Maternity Leave</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Reason</Label>
                            <Textarea {...register("reason", { required: true })} placeholder="Reason for leave..." />
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

export default RequestPage;
