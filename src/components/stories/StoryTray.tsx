'use client';

import { useEffect } from 'react';

// Define the type for the Storyly DOM element
type StorylyWeb = HTMLElement & {
  init: (config: { token: string }) => void;
};

export default function StorylyTray() {
  useEffect(() => {
    // This is a robust way to ensure the component is initialized
    // after the DOM is fully ready and painted.
    const initializeStoryly = () => {
      // Use querySelector for a direct reference to the DOM element
      const storylyWeb = document.querySelector('storyly-web') as StorylyWeb | null;
      if (storylyWeb) {
        try {
          storylyWeb.init({
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NfaWQiOjE0NDcwLCJhcHBfaWQiOjIyMTE1LCJpbnNfaWQiOjI0OTc1fQ.Hn0jUM4FoEZ3DjFnYk7a82JNO7_M4G-yyVYFwmdOP1k",
          });
        } catch (error) {
            console.error("Storyly initialization failed:", error);
        }
      }
    }

    // Use a small timeout to ensure the component has been painted to the DOM
    // and layout is calculated, which can solve tricky race conditions.
    const timer = setTimeout(initializeStoryly, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    // The container MUST have a defined height for the Storyly widget to be visible.
    <div className="storyly-container h-[120px]">
       <storyly-web />
    </div>
  );
}
