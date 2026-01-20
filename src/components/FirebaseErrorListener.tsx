
'use client';

import { useEffect, useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';

export default function FirebaseErrorListener() {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleError = (permissionError: Error) => {
      // Throw the error in a timeout to break out of the current render cycle
      // and ensure Next.js's error overlay can catch it reliably.
      setTimeout(() => {
        setError(permissionError);
      }, 0);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  if (error) {
    // Re-throwing the error here will be caught by the nearest Next.js Error Boundary,
    // which in development, is the error overlay.
    throw error;
  }

  return null;
}
