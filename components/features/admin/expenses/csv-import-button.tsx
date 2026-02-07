'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { importMoniepointCSVAction } from '@/app/actions/expenses/csv-import-actions';
import { useRouter } from 'next/navigation';

export function CSVImportButton() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function handleUpload() {
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await importMoniepointCSVAction(formData);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        setOpen(false);
        setFile(null);
        router.push('/dashboard/expenses/uploaded');
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to import Excel file',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Client-side upload error:', error);
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileName = selectedFile.name.toLowerCase();
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        toast({
          title: 'Invalid File',
          description: 'Please select an Excel file (.xlsx or .xls)',
          variant: 'destructive',
        });
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'File size must be less than 10 MB',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Import Moniepoint Excel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Moniepoint Excel File</DialogTitle>
          <DialogDescription>
            Upload a Moniepoint account statement Excel file (.xlsx or .xls) to import expenses
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="xlsx-upload"
              disabled={isUploading}
            />
            <label
              htmlFor="xlsx-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                {file ? file.name : 'Click to select Excel file'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Excel files (.xlsx, .xls) only, max 10 MB
              </p>
              {file && (
                <p className="text-xs text-green-600 mt-2">
                  ✓ File selected ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setOpen(false);
                setFile(null);
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload & Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
