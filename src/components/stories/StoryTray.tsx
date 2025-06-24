
'use client';

import { useEffect, useRef, useLayoutEffect } from 'react';

type StorylyWeb = HTMLElement & {
  init: (config: { token: string }) => void;
  refresh: () => void;
};

export default function StorylyTray() {
  const storylyRef = useRef<StorylyWeb>(null);

  useLayoutEffect(() => {
    const storylyElement = storylyRef.current;
    if (storylyElement && typeof storylyElement.init === 'function') {
      // A short delay to ensure the component is fully ready in the DOM
      const timer = setTimeout(() => {
          try {
            storylyElement.init({
              token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NfaWQiOjE0NDcwLCJhcHBfaWQiOjIyMTE1LCJpbnNfaWQiOjI0OTc1fQ.Hn0jUM4FoEZ3DjFnYk7a82JNO7_M4G-yyVYFwmdOP1k",
            });
          } catch (error) {
            console.error("Storyly initialization failed:", error);
          }
      }, 100); // 100ms delay as a safeguard

      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="h-full">
      <storyly-web ref={storylyRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
