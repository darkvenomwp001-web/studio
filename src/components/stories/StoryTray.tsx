
'use client';

import { useEffect, useRef } from 'react';

// Define the type for the Storyly DOM element
type StorylyWeb = HTMLElement & {
  init: (config: { token: string }) => void;
};

export default function StorylyTray() {
  const storylyRef = useRef<StorylyWeb>(null);

  useEffect(() => {
    // This timeout is a robust way to ensure that the Storyly script
    // has fully executed and the <storyly-web> custom element is ready
    // in the DOM before we try to initialize it.
    const timer = setTimeout(() => {
      if (storylyRef.current && typeof storylyRef.current.init === 'function') {
        try {
          storylyRef.current.init({
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NfaWQiOjE0NDcwLCJhcHBfaWQiOjIyMTE1LCJpbnNfaWQiOjI0OTc1fQ.Hn0jUM4FoEZ3DjFnYk7a82JNO7_M4G-yyVYFwmdOP1k",
          });
        } catch (error) {
          console.error("Storyly initialization failed inside timeout:", error);
        }
      } else {
        console.error("Storyly init function not found after delay. The script might not have loaded correctly.");
      }
    }, 100); // A 100ms delay is usually sufficient.

    return () => clearTimeout(timer);
  }, []);

  return (
    <storyly-web ref={storylyRef} />
  );
}
