import React from "react";
import { Upload } from "lucide-react";

interface CoverImageUploaderProps {
  imagePreview: string | null;
  setImagePreview: React.Dispatch<React.SetStateAction<string | null>>;
  selectedFile: File | null;
  setSelectedFile: React.Dispatch<React.SetStateAction<File | null>>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  coverImage: string;
}

export const CoverImageUploader: React.FC<CoverImageUploaderProps> = ({
  imagePreview,
  setImagePreview,
  selectedFile,
  setSelectedFile,
  fileInputRef,
  coverImage,
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  return (
    <div className="border rounded-lg bg-white">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-medium text-gray-800">Cover Image</h3>
      </div>
      <div className="p-4">
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />
        {imagePreview ? (
          <div className="space-y-4">
            <img src={imagePreview} alt="Cover" className="w-full h-48 object-cover rounded-lg border" />
            <div className="flex justify-between">
              <p className="text-sm text-gray-500">
                {selectedFile?.name || (coverImage && decodeURIComponent(coverImage.split("/").pop() || ""))}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Change Image
              </button>
            </div>
          </div>
        ) : (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={32} className="text-gray-400 mb-2 mx-auto" />
            <p className="text-gray-600">Click to upload cover image</p>
            <p className="text-xs text-gray-500">PNG, JPG or WEBP (max. 2MB)</p>
          </div>
        )}
      </div>
    </div>
  );
};