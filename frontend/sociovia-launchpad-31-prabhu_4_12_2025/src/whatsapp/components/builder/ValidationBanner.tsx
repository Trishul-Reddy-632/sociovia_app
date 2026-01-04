// Validation Banner Component
// ===========================
// Displays validation errors and warnings

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ValidationErrors } from '../../utils/templateUtils';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ValidationBannerProps {
    errors: ValidationErrors;
    isValid: boolean;
}

export function ValidationBanner({ errors, isValid }: ValidationBannerProps) {
    const errorList = Object.entries(errors).filter(([_, msg]) => msg);

    if (isValid) {
        return (
            <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertTitle className="text-green-800 text-sm">Ready to submit</AlertTitle>
                <AlertDescription className="text-green-700 text-xs">
                    Your template looks good! Click "Submit for Approval" to send to Meta.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertTitle className="text-sm">Please fix the following issues</AlertTitle>
            <AlertDescription>
                <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                    {errorList.map(([field, message]) => (
                        <li key={field}>
                            <span className="capitalize">{field}</span>: {message}
                        </li>
                    ))}
                </ul>
            </AlertDescription>
        </Alert>
    );
}
