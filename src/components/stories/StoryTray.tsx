
'use client';

import { useEffect, useRef } from 'react';

// Define the type for the Storyly DOM element
type StorylyWeb = HTMLElement & {
  init: (config: { token: string }) => void;
};

export default function StorylyTray() {
  const storylyRef = useRef<StorylyWeb>(null);

  useEffect(() => {
    // Check if the ref is attached to the element
    if (storylyRef.current) {
      // Initialize Storyly with your token
      storylyRef.current.init({
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NfaWQiOjE0NDcwLCJhcHBfaWQiOjIyMTE1LCJpbnNfaWQiOjI0OTc0fQ._SevrEiG7Vfe4311lScpVGM-49wgnzpEOhD4_bV_tn0",
      });
    }
  }, []);

  return (
    <div className="w-full border-b pb-3">
        {/* The storyly-web component will be rendered here.
            It controls its own internal layout and appearance.
            We just need to make sure it's in the DOM.
        */}
        <storyly-web ref={storylyRef}></storyly-web>
    </div>
  );
}
