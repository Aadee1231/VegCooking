import React, { useState } from 'react';
import { Image, ImageProps, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SafeImageProps extends Omit<ImageProps, 'source'> {
  uri?: string | null;
  fallback?: React.ReactNode;
  showLoading?: boolean;
  onError?: (error: any) => void;
  onLoad?: () => void;
}

const theme = {
  colors: {
    chip: "#EEF2F7",
    subtext: "#6B7280",
  }
};

export function SafeImage({
  uri,
  fallback,
  showLoading = true,
  onError,
  onLoad,
  style,
  ...props
}: SafeImageProps) {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleError = (error: any) => {
    console.error('SafeImage failed to load:', uri, error);
    setHasError(true);
    setLoading(false);
    onError?.(error);
  };

  const handleLoad = () => {
    console.log('SafeImage loaded successfully:', uri);
    setLoading(false);
    setHasError(false);
    onLoad?.();
  };

  if (!uri) {
    return fallback || (
      <View style={[style, { backgroundColor: theme.colors.chip, alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="image-outline" size={24} color={theme.colors.subtext} />
      </View>
    );
  }

  if (hasError) {
    return fallback || (
      <View style={[style, { backgroundColor: theme.colors.chip, alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="image-outline" size={24} color={theme.colors.subtext} />
      </View>
    );
  }

  return (
    <View style={{ position: 'relative' }}>
      <Image
        source={{ uri }}
        style={style}
        onError={handleError}
        onLoad={handleLoad}
        {...props}
      />
      {loading && showLoading && (
        <View 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.chip,
          }}
        >
          <ActivityIndicator size="small" color={theme.colors.subtext} />
        </View>
      )}
    </View>
  );
}