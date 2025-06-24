
'use client';

import { useEffect, useRef } from 'react';

// Define the type for the Storyly DOM element
type StorylyWeb = HTMLElement & {
  init: (config: { token: string }) => void;
};

export default function StorylyTray() {
  const storylyRef = useRef<StorylyWeb>(null);

  useEffect(() => {
    // We need to make sure the storylyRef.current is available
    if (storylyRef.current) {
        try {
          // A small timeout ensures the element is fully ready in the DOM
          const timer = setTimeout(() => {
             storylyRef.current?.init({
                token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NfaWQiOjE0NDcwLCJhcHBfaWQiOjIyMTE1LCJpbnNfaWQiOjI0OTc1fQ.Hn0jUM4FoEZ3DjFnYk7a82JNO7_M4G-yyVYFwmdOP1k",
              });
          }, 100);
          return () => clearTimeout(timer);
        } catch (error) {
            console.error("Storyly initialization failed:", error);
        }
    }
  }, []);

  return (
    <storyly-web ref={storylyRef} />
  );
}
