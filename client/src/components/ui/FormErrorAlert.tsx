
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { FieldErrors } from 'react-hook-form';

interface FormErrorAlertProps {
    errors: FieldErrors;
}

const FormErrorAlert: React.FC<FormErrorAlertProps> = ({ errors }) => {
    if (Object.keys(errors).length === 0) return null;

    return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 mb-4">
            <div className="flex items-start gap-3">
                <AlertCircle className="text-red-600 mt-0.5" size={18} />
                <div className="flex-1">
                    <h4 className="text-sm font-semibold text-red-800 mb-1">
                        Please fix the following errors:
                    </h4>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                        {Object.entries(errors).map(([key, error]: [string, any]) => (
                            <li key={key}>
                                <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span> {error?.message?.toString() || "Invalid value"}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default FormErrorAlert;
