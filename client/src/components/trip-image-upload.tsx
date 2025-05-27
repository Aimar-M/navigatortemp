import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TripImageUploadProps {
  tripId: number;
  currentImage?: string;
  isOrganizer: boolean;
  onImageUpdate: (imageUrl: string) => void;
}

export default function TripImageUpload({ 
  tripId, 
  currentImage, 
  isOrganizer, 
  onImageUpdate 
}: TripImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Convert image to base64 for simple storage
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64String = e.target?.result as string;
        
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`/api/trips/${tripId}/image`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ image: base64String })
        });

        if (!response.ok) {
          throw new Error('Failed to upload image');
        }

        const updatedTrip = await response.json();
        onImageUpdate(updatedTrip.cover);
        
        toast({
          title: "Image uploaded",
          description: "Trip image has been updated successfully"
        });
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleRemoveImage = async () => {
    setIsUploading(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/trips/${tripId}/image`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove image');
      }

      onImageUpdate('');
      
      toast({
        title: "Image removed",
        description: "Trip image has been removed"
      });
    } catch (error) {
      console.error('Error removing image:', error);
      toast({
        title: "Remove failed",
        description: "Failed to remove image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Trip Photo</h3>
          {isOrganizer && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center space-x-1"
              >
                <Camera className="h-4 w-4" />
                <span>{currentImage ? 'Change' : 'Upload'}</span>
              </Button>
              {currentImage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveImage}
                  disabled={isUploading}
                  className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                  <span>Remove</span>
                </Button>
              )}
            </div>
          )}
        </div>

        {currentImage && currentImage.trim() !== '' ? (
          <div className="relative">
            <img 
              src={currentImage} 
              alt="Trip cover" 
              className="w-full h-48 object-cover rounded-lg"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                <div className="text-white text-sm">Uploading...</div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500">
            <Upload className="h-12 w-12 mb-2" />
            <p className="text-sm">No photo uploaded</p>
            {isOrganizer && (
              <p className="text-xs text-gray-400 mt-1">Click upload to add a trip photo</p>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}