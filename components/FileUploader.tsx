import React, { ChangeEvent } from 'react';
import { UploadCloud, FileText, CheckCircle } from 'lucide-react';

interface FileUploaderProps {
  label: string;
  file: File | null;
  onFileSelect: (file: File) => void;
  accept?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ label, file, onFileSelect, accept = ".csv" }) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative group">
        <label className={`
          flex flex-col items-center justify-center w-full h-32 
          border-2 border-dashed rounded-lg cursor-pointer 
          transition-colors duration-200
          ${file 
            ? 'border-green-400 bg-green-50' 
            : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-blue-400'}
        `}>
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {file ? (
              <>
                <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                <p className="mb-1 text-sm text-green-700 font-semibold">{file.name}</p>
                <p className="text-xs text-green-600">{(file.size / 1024).toFixed(1)} KB</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-8 h-8 text-gray-400 mb-2 group-hover:text-blue-500" />
                <p className="mb-1 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">CSV files only</p>
              </>
            )}
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept={accept} 
            onChange={handleChange} 
          />
        </label>
      </div>
    </div>
  );
};

export default FileUploader;
