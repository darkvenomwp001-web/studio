'use client';

import { useLayoutEffect, useRef } from 'react';

// Define the type for the Storyly DOM element
type StorylyWeb = HTMLElement & {
  init: (config: { token: string }) => void;
};

export default function StorylyTray() {
  const storylyRef = useRef<StorylyWeb>(null);

  useLayoutEffect(() => {
    // Check if the ref is attached to the element
    if (storylyRef.current) {
      // Initialize Storyly with your token
      storylyRef.current.init({
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NfaWQiOjE0NDcwLCJhcHBfaWQiOjIyMTE1LCJpbnNfaWQiOjI0OTc1fQ.Hn0jUM4FoEZ3DjFnYk7a82JNO7_M4G-yyVYFwmdOP1k",
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
