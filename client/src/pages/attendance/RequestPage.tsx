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
    const { register, handleSubmit, formState: { errors }, setValue } = useForm();
    const [isLoading, setIsLoading] = useState(false);

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            await api.post('/leave/apply', {
                type: data.type,
                start_date: data.start_date,
                end_date: data.end_date,
                reason: data.reason
            });
            alert("Leave request submitted successfully!");
            // Reset form
            setValue("reason", "");
            setValue("type", "");
            setValue("start_date", "");
            setValue("end_date", "");
        } catch (error) {
            console.error(error);
            alert("Failed to submit request. Please try again.");
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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input type="date" {...register("start_date", { required: true })} />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input type="date" {...register("end_date", { required: true })} />
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
