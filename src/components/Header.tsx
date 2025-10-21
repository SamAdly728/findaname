import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="py-6 px-4">
      <div className="container mx-auto flex justify-between items-center">
        <a href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="bg-white p-2 rounded-xl shadow-lg">
            <img src="https://webexpert.world.masonryresto.com/wp-content/uploads/2025/10/Find-A-Name-Logo-1.png" alt="FindAName.live Logo" className="h-12 w-auto" />
          </div>
        </a>
        <nav className="hidden md:flex flex-grow justify-center items-center gap-x-6 lg:gap-x-8">
            <a href="/dns-lookup.html" className="text-blue-200/80 hover:text-white transition-colors font-medium">DNS Lookup</a>
            <a href="/whois-lookup.html" className="text-blue-200/80 hover:text-white transition-colors font-medium">WHOIS</a>
            <a href="/seo-checker.html" className="text-blue-200/80 hover:text-white transition-colors font-medium">SEO Checker</a>
            <a href="/domain-value-calculator.html" className="text-blue-200/80 hover:text-white transition-colors font-medium">Domain Value</a>
            <a href="https://blog.findaname.live/" target="_blank" rel="noopener noreferrer" className="text-blue-200/80 hover:text-white transition-colors font-medium">Blog</a>
        </nav>
        {/* This empty div helps to perfectly center the nav items in the space between the logo and the edge */}
        <div className="w-24 hidden md:block"></div>
      </div>
    </header>
  );
};