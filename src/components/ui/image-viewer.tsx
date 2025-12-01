"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Download, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageUrl: string | null
  alt?: string
}

export function ImageViewer({ open, onOpenChange, imageUrl, alt = "Receipt image" }: ImageViewerProps) {
  const [imageError, setImageError] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [displayUrl, setDisplayUrl] = React.useState<string | null>(null)

  // Handle Supabase Storage URLs - try to get signed URL if needed
  React.useEffect(() => {
    const getSignedUrl = async (url: string) => {
      // Check if it's a Supabase Storage URL
      // Pattern: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
      // Or: https://[project].supabase.co/storage/v1/object/sign/[bucket]/[path]
      const supabaseUrlPattern = /https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/(public|sign)\/([^/]+)\/(.+)/;
      const match = url.match(supabaseUrlPattern);
      
      if (match) {
        try {
          const { supabase } = await import('@/lib/supabase/client');
          if (supabase) {
            const bucket = match[2];
            const filePath = decodeURIComponent(match[3]);
            
            // If it's already a public URL and works, we might still want to try signed URL
            // for better reliability (handles private buckets)
            try {
              // Try to get a signed URL (valid for 1 hour)
              const { data, error } = await supabase.storage
                .from(bucket)
                .createSignedUrl(filePath, 3600); // 1 hour expiry

              if (!error && data?.signedUrl) {
                return data.signedUrl;
              }
            } catch (signError) {
              // If signed URL creation fails, try the public URL first
              console.warn('Error creating signed URL, using public URL:', signError);
            }
          }
        } catch (error) {
          console.warn('Error processing Supabase URL:', error);
        }
      }
      // Return original URL if signed URL creation fails or not a Supabase URL
      return url;
    };

    if (open && imageUrl) {
      setImageError(false);
      setIsLoading(true);
      
      // Handle Base64 data URLs directly
      if (imageUrl.startsWith('data:')) {
        setDisplayUrl(imageUrl);
        setIsLoading(false);
        return;
      }

      // For Supabase URLs, try to get signed URL, otherwise use original
      getSignedUrl(imageUrl).then(url => {
        setDisplayUrl(url);
      }).catch(() => {
        setDisplayUrl(imageUrl); // Fallback to original URL
      });
    } else {
      setDisplayUrl(null);
    }
  }, [open, imageUrl]);

  const handleImageLoad = () => {
    setIsLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    setIsLoading(false)
    setImageError(true)
  }

  const handleDownload = () => {
    if (!displayUrl) return
    
    // Handle base64 data URLs
    if (displayUrl.startsWith('data:')) {
      const link = document.createElement('a')
      link.href = displayUrl
      link.download = `receipt-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return
    }

    // Handle regular URLs (Supabase, etc.)
    fetch(displayUrl)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch image');
        return response.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `receipt-${Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      })
      .catch(error => {
        console.error('Error downloading image:', error)
        // Fallback: open in new tab
        window.open(displayUrl || imageUrl, '_blank')
      })
  }

  const handleOpenInNewTab = () => {
    if (displayUrl || imageUrl) {
      window.open(displayUrl || imageUrl, '_blank', 'noopener,noreferrer')
    }
  }

  if (!imageUrl) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] p-0 gap-0 overflow-hidden">
        <div className="flex flex-col h-full max-h-[95vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">Receipt Image</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="h-9 px-3"
              >
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Download</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenInNewTab}
                className="h-9 px-3"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Open</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-9 w-9"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </div>

          {/* Image Container */}
          <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4 sm:p-6 min-h-0">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                  <p className="text-sm text-gray-600">Loading image...</p>
                </div>
              </div>
            )}
            
            {imageError ? (
              <div className="text-center py-12 px-6">
                <div className="inline-block p-4 bg-red-50 rounded-full mb-4">
                  <X className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load image</h3>
                <p className="text-sm text-gray-600 mb-4">
                  The receipt image could not be loaded. It may have been deleted or is no longer accessible.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenInNewTab}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Try opening in new tab
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImageError(false)
                      setIsLoading(true)
                    }}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              displayUrl && (
                <div className="relative max-w-full max-h-full">
                  <img
                    src={displayUrl}
                    alt={alt}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    className={cn(
                      "max-w-full max-h-[calc(95vh-120px)] object-contain rounded-lg shadow-lg",
                      isLoading && "opacity-0"
                    )}
                    style={{
                      maxHeight: 'calc(95vh - 120px)'
                    }}
                  />
                </div>
              )
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
