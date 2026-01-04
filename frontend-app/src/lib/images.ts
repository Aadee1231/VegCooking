import { supabase } from "./supabase";
import { ImagePickerAsset } from "expo-image-picker";

/**
 * Converts a Supabase storage path OR full URL into a usable image URL
 */
export function resolveImageUrl(
  bucket: "profile-avatars" | "recipe-media",
  value: string | null
): string | undefined {
  if (!value) return undefined;

  console.log('resolveImageUrl called with:', { bucket, value });

  // Already a full URL (safe fallback)
  if (value.startsWith("http://") || value.startsWith("https://")) {
    console.log('Value is already a full URL, returning as-is');
    return value;
  }

  // Storage path → public URL
  const publicUrl = supabase.storage.from(bucket).getPublicUrl(value).data.publicUrl;
  console.log('Generated public URL:', publicUrl);
  return publicUrl;
}

/**
 * Test if an image URL is accessible
 */
export async function testImageUrl(url?: string): Promise<boolean> {
  if (!url) return false;
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Image URL test failed:', error);
    return false;
  }
}


export async function uploadImage(img: ImagePickerAsset, bucket: string, pathWithoutSuffix: string): Promise<string> {
    const fileExtension = img.uri.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${pathWithoutSuffix}_${Date.now()}.${fileExtension}`;
    console.log('uploadImage called with:', { img, bucket, pathWithoutSuffix, fileExtension, path });
    
    try {
      const response = await fetch(img.uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      console.log('Fetched image buffer, size:', buffer.byteLength);
      
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, buffer, {
        upsert: true,
        contentType: img.mimeType || `image/${fileExtension}`,
      });
      
      if (upErr) throw upErr;
      console.log('Successfully uploaded to path:', path);
      return path;
    } catch (e: any) {
      console.error("Error uploading image:", e);
      throw e;
    }
}

/**
 * Gets a signed URL for private images (expires after specified time)
 */
export async function getSignedImageUrl(
  bucket: "profile-avatars" | "recipe-media", 
  path: string | null,
  expiresIn: number = 3600 // 1 hour default
): Promise<string | null> {
  if (!path) return null;
  
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    
    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error('Error creating signed URL:', error);
    // Fallback to public URL if signed URL fails
    return resolveImageUrl(bucket, path) || null;
  }
}
