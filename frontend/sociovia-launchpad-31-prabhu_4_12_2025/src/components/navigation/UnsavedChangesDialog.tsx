/**
 * Unsaved Changes Dialog Component
 * =================================
 * Modal dialog to confirm navigation when there are unsaved changes.
 * Used in conjunction with useUnsavedChanges hook.
 */

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface UnsavedChangesDialogProps {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title?: string;
    description?: string;
}

/**
 * Dialog component for confirming navigation with unsaved changes.
 * 
 * @example
 * const { showDialog, confirmNavigation, cancelNavigation } = useUnsavedChanges(hasChanges);
 * 
 * return (
 *   <>
 *     <MyEditor onChange={() => setHasChanges(true)} />
 *     <UnsavedChangesDialog
 *       open={showDialog}
 *       onConfirm={confirmNavigation}
 *       onCancel={cancelNavigation}
 *     />
 *   </>
 * );
 */
export function UnsavedChangesDialog({
    open,
    onConfirm,
    onCancel,
    title = 'Unsaved Changes',
    description = 'You have unsaved changes. If you leave now, your changes will be lost. Are you sure you want to continue?',
}: UnsavedChangesDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onCancel}>
                        Stay on Page
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        Leave Without Saving
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default UnsavedChangesDialog;
