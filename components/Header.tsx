
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="py-6 px-4">
      <div className="container mx-auto flex justify-between items-center">
        <a href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="FindAName.live Logo" className="h-10 w-auto" />
        </a>
        {/* Can add navigation links here if needed */}
      </div>
    </header>
  );
};
