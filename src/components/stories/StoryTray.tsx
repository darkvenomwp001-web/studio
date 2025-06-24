'use client';

import { useEffect, useRef } from 'react';

// Define the type for the Storyly DOM element
type StorylyWeb = HTMLElement & {
  init: (config: { token: string }) => void;
};

export default function StorylyTray() {
  const storylyRef = useRef<StorylyWeb>(null);

  useEffect(() => {
    // This ensures we only try to initialize Storyly after its script has
    // fully loaded and defined the <storyly-web> custom element.
    // This prevents a "race condition" where the component tries to initialize
    // before it's ready.
    window.customElements.whenDefined('storyly-web').then(() => {
      if (storylyRef.current) {
        storylyRef.current.init({
          token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NfaWQiOjE0NDcwLCJhcHBfaWQiOjIyMTE1LCJpbnNfaWQiOjI0OTc1fQ.Hn0jUM4FoEZ3DjFnYk7a82JNO7_M4G-yyVYFwmdOP1k",
        });
      }
    });
  }, []);

  return (
    // Add a container with a defined height to ensure the widget has space to render.
    <div className="storyly-container h-[120px]">
       <storyly-web ref={storylyRef} />
    </div>
  );
}
