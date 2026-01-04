import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, GripVertical, Trash2 } from 'lucide-react';
import type { FormField } from '@/pages/AICampaignBuilder';
import { useToast } from '@/hooks/use-toast';

interface LeadFormBuilderProps {
  fields: FormField[];
  onFieldsChange: (fields: FormField[]) => void;
}

export default function LeadFormBuilder({ fields, onFieldsChange }: LeadFormBuilderProps) {
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const { toast } = useToast();

  // Initialize with suggested fields if empty
  useState(() => {
    if (fields.length === 0) {
      const suggestedFields: FormField[] = [
        { id: '1', label: 'Full Name', type: 'text', required: true, enabled: true },
        { id: '2', label: 'Email Address', type: 'email', required: true, enabled: true },
        { id: '3', label: 'Phone Number', type: 'tel', required: false, enabled: true },
        { id: '4', label: 'Company Name', type: 'text', required: false, enabled: false },
        { id: '5', label: 'Job Title', type: 'text', required: false, enabled: false },
      ];
      onFieldsChange(suggestedFields);
    }
  });

  const handleToggleField = (fieldId: string) => {
    const updatedFields = fields.map(field =>
      field.id === fieldId ? { ...field, enabled: !field.enabled } : field
    );
    onFieldsChange(updatedFields);
  };

  const handleToggleRequired = (fieldId: string) => {
    const updatedFields = fields.map(field =>
      field.id === fieldId ? { ...field, required: !field.required } : field
    );
    onFieldsChange(updatedFields);
  };

  const handleAddField = () => {
    if (!newFieldLabel.trim()) {
      toast({
        title: "Invalid Field",
        description: "Please enter a field label.",
        variant: "destructive",
      });
      return;
    }

    const newField: FormField = {
      id: Date.now().toString(),
      label: newFieldLabel,
      type: 'text',
      required: false,
      enabled: true,
    };

    onFieldsChange([...fields, newField]);
    setNewFieldLabel('');
    
    toast({
      title: "Field Added",
      description: "New custom field has been added to the form.",
    });
  };

  const handleRemoveField = (fieldId: string) => {
    const updatedFields = fields.filter(field => field.id !== fieldId);
    onFieldsChange(updatedFields);
    
    toast({
      title: "Field Removed",
      description: "Field has been removed from the form.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Generation Form</CardTitle>
        <CardDescription>
          AI-suggested form fields based on campaign objective
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {fields.map((field) => (
            <div 
              key={field.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                field.enabled ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/30'
              }`}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              
              <div className="flex-1">
                <Label className="text-sm font-medium">{field.label}</Label>
                <p className="text-xs text-muted-foreground">{field.type}</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor={`required-${field.id}`} className="text-xs">
                    Required
                  </Label>
                  <Switch
                    id={`required-${field.id}`}
                    checked={field.required}
                    onCheckedChange={() => handleToggleRequired(field.id)}
                    disabled={!field.enabled}
                  />
                </div>

                <div className="flex items-center gap-1">
                  <Label htmlFor={`enabled-${field.id}`} className="text-xs">
                    Enabled
                  </Label>
                  <Switch
                    id={`enabled-${field.id}`}
                    checked={field.enabled}
                    onCheckedChange={() => handleToggleField(field.id)}
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveField(field.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Input
            placeholder="Add custom field (e.g., Budget Range)"
            value={newFieldLabel}
            onChange={(e) => setNewFieldLabel(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddField()}
          />
          <Button onClick={handleAddField}>
            <Plus className="w-4 h-4 mr-2" />
            Add Field
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
