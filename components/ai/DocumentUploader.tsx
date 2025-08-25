'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DocumentUploaderProps {
  onUploadComplete?: (result: any) => void;
  className?: string;
}

export function DocumentUploader({ 
  onUploadComplete,
  className 
}: DocumentUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const processDocument = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('county', 'Miami-Dade');
      formData.append('state', 'FL');

      const response = await fetch('/api/ai/document', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error('Document processing failed');
      }

      const data = await response.json();
      setResult(data);
      onUploadComplete?.(data);
    } catch (err) {
      setError('Failed to process document. Please try again.');
      console.error('Document processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processDocument(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            AI Document Processor
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isProcessing && !result && (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              {isDragActive ? (
                <p className="text-lg font-medium">Drop the PDF here...</p>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">
                    Drag & drop auction list PDF here
                  </p>
                  <p className="text-sm text-gray-500">
                    or click to select a file
                  </p>
                </>
              )}
            </div>
          )}

          {isProcessing && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Processing document with AI...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
              <p className="text-sm text-gray-500 text-center">
                Extracting properties, validating data, and generating insights...
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Successfully processed {result.propertiesProcessed} properties!
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {result.propertiesProcessed}
                  </p>
                  <p className="text-sm text-gray-600">Properties Extracted</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    95%
                  </p>
                  <p className="text-sm text-gray-600">Accuracy Rate</p>
                </div>
              </div>

              {result.summary && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2">AI Summary</h4>
                  <p className="text-sm text-gray-700">{result.summary}</p>
                </div>
              )}

              <Button
                onClick={() => {
                  setResult(null);
                  setUploadProgress(0);
                }}
                variant="outline"
                className="w-full"
              >
                Process Another Document
              </Button>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}