
import React, { useState, useRef, useCallback } from 'react';
import { UploadIcon, LinkIcon, SparklesIcon } from './Icons';
import LoadingSpinner from './LoadingSpinner';

interface InputAreaProps {
  onExtract: (file: File | null, text: string) => void;
  isLoading: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({ onExtract, isLoading }) => {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string>('');
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFile(null);
      setPreview(null);
      if (selectedFile) {
        alert('Please upload a valid image file (JPEG, PNG, WEBP). For documents, please take a screenshot.');
      }
    }
    event.target.value = '';
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onExtract(file, text);
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg mt-6">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div
            onClick={handleFileClick}
            className="group relative border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/png, image/jpeg, image/webp"
            />
            {preview ? (
              <div>
                <img src={preview} alt="Preview" className="mx-auto max-h-48 rounded-md" />
                 <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }} className="mt-2 text-sm text-red-500 hover:text-red-700">Remove Image</button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-slate-500 dark:text-slate-400">
                <UploadIcon className="w-12 h-12 mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">Click to upload an image</p>
                <p className="text-sm">PNG, JPG, or WEBP. (For docs, use screenshots)</p>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="text-input" className="flex items-center mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <LinkIcon className="w-5 h-5 mr-2" />
              Or paste text content here
            </label>
            <textarea
              id="text-input"
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              placeholder="Paste text from a website, email, or document..."
            />
          </div>
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={isLoading || (!file && !text)}
            className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                Extracting...
              </>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5" />
                Extract Information
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InputArea;
