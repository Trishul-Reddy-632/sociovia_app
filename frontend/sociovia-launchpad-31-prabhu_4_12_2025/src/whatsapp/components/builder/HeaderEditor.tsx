// Header Editor Component
// =======================
// Configures template header: None, Text, or Image

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { TemplateHeader, HeaderType } from '../../utils/templateUtils';
import { Image, Type, X } from 'lucide-react';

interface HeaderEditorProps {
    header: TemplateHeader;
    onChange: (header: TemplateHeader) => void;
    error?: string;
}

export function HeaderEditor({ header, onChange, error }: HeaderEditorProps) {
    const handleTypeChange = (type: HeaderType) => {
        onChange({
            type,
            text: type === 'text' ? header.text || '' : undefined,
            imageUrl: type === 'image' ? header.imageUrl || '' : undefined,
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Header (Optional)</Label>
                {header.type !== 'none' && (
                    <span className="text-xs text-muted-foreground">
                        {header.type === 'text'
                            ? `${header.text?.length || 0}/60 characters`
                            : 'Image URL required'
                        }
                    </span>
                )}
            </div>

            <RadioGroup
                value={header.type}
                onValueChange={(v) => handleTypeChange(v as HeaderType)}
                className="flex gap-4"
            >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="text" id="header-text" />
                    <Label htmlFor="header-text" className="flex items-center gap-1.5 cursor-pointer">
                        <Type className="w-4 h-4" />
                        Text
                    </Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="image" id="header-image" />
                    <Label htmlFor="header-image" className="flex items-center gap-1.5 cursor-pointer">
                        <Image className="w-4 h-4" />
                        Image
                    </Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="header-none" />
                    <Label htmlFor="header-none" className="flex items-center gap-1.5 cursor-pointer">
                        <X className="w-4 h-4" />
                        None
                    </Label>
                </div>
            </RadioGroup>

            {header.type === 'text' && (
                <Input
                    placeholder="Enter header text (max 60 characters)"
                    value={header.text || ''}
                    onChange={(e) => onChange({ ...header, text: e.target.value })}
                    maxLength={60}
                    className={error ? 'border-destructive' : ''}
                />
            )}

            {header.type === 'image' && (
                <div className="space-y-2">
                    <Input
                        placeholder="Enter image URL for sample (required for Meta approval)"
                        value={header.imageUrl || ''}
                        onChange={(e) => onChange({ ...header, imageUrl: e.target.value })}
                        className={error ? 'border-destructive' : ''}
                    />
                    <p className="text-xs text-muted-foreground">
                        Provide a sample image URL for Meta's review process. The actual image can be different when sending.
                    </p>
                </div>
            )}

            {error && (
                <p className="text-xs text-destructive">{error}</p>
            )}
        </div>
    );
}
