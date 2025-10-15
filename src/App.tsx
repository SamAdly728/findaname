import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { DomainCard } from './components/DomainCard';
import { WhoisModal } from './components/WhoisModal';
import { AdsenseBlock } from './components/AdsenseBlock';
import { ProgressBar } from './components/ProgressBar';
import { generateDomains, checkAvailability, getWhoisInfo } from './services/geminiService';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { DomainInfo, WhoisData } from './types';
import { SearchIcon, LoaderIcon } from './components/icons/Icons';

const App: React.FC = () => {
  const [keyword, setKeyword] = useState<string>('');
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useLocalStorage<string[]>('favoriteDomains', []);
  
  const [selectedDomain, setSelectedDomain] = useState<DomainInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [whoisData, setWhoisData] = useState<WhoisData | null>(null);
  const [isWhoisLoading, setIsWhoisLoading] = useState<boolean>(false);

  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const resultsRef = useRef<HTMLDivElement>(null);

  const loadingMessages = [
    'Brewing creative ideas...',
    'Consulting the digital oracle...',
    'Searching across the web...',
    'Checking TLD availability...',
    'Analyzing brand potential...',
    'Polishing domain gems...',
    'Uncovering hidden domains...',
    'Finalizing suggestions...'
  ];

  useEffect(() => {
    let interval: number;
    if (isLoading) {
      setProgressText(loadingMessages[0]);
      interval = window.setInterval(() => {
        setProgressText(prevText => {
          const currentIndex = loadingMessages.indexOf(prevText);
          const nextIndex = (currentIndex + 1) % loadingMessages.length;
          return loadingMessages[nextIndex];
        });
      }, 1200);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  useEffect(() => {
    // Scroll after the first few results are in, not just at the end
    if (domains.length > 0 && domains.length < 5) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [domains.length]);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) {
      setError('Please enter a keyword.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setDomains([]);
    setProgress(0);
    setProgressText(loadingMessages[0]);

    try {
      const generatedDomains = await generateDomains(keyword);
      if (generatedDomains.length === 0) {
        setError("The AI couldn't generate domains for this keyword. Try something else!");
        setIsLoading(false);
        return;
      }
      
      let processedDomains: DomainInfo[] = [];
      for (let i = 0; i < generatedDomains.length; i++) {
        const domain = generatedDomains[i];
        const status = await checkAvailability(domain.name);
        const newDomainInfo = { name: domain.name, status, description: domain.description };
        
        processedDomains = [...processedDomains, newDomainInfo];
        setDomains(processedDomains);
        
        setProgress(((i + 1) / generatedDomains.length) * 100);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      console.error(err);
      if (errorMessage.includes('VITE_GEMINI_API_KEY')) {
        setError('Configuration Error: The AI service is not set up correctly.');
      } else {
        setError(`Failed to generate domains: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [keyword]);

  const handleViewWhois = useCallback(async (domain: DomainInfo) => {
    setSelectedDomain(domain);
    setIsModalOpen(true);
    setIsWhoisLoading(true);
    setWhoisData(null);
    try {
      const data = await getWhoisInfo(domain.name);
      setWhoisData(data);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setWhoisData({ error: `Failed to fetch WHOIS data: ${errorMessage}` });
    } finally {
      setIsWhoisLoading(false);
    }
  }, []);

  const handleToggleFavorite = useCallback((domainName: string) => {
    setFavorites(prev => 
      prev.includes(domainName) 
        ? prev.filter(d => d !== domainName)
        : [...prev, domainName]
    );
  }, [setFavorites]);

  const generateAffiliateLink = (domainName: string) => {
    // The user has requested to use 'a5fe41269e066dfef064e' for NameSilo affiliate links.
    // This value will be used as the affiliate ID ('rid').
    const nameSiloAffiliateCode = 'a5fe41269e066dfef064e';
    const encodedDomain = encodeURIComponent(domainName);
    
    // CORRECTED: The path for domain search on NameSilo is '/domain/search-domains'.
    // The previous path '/domain/search' was incorrect and caused a 404 error.
    const searchLink = `https://www.namesilo.com/domain/search-domains?query=${encodedDomain}`;
    
    if (nameSiloAffiliateCode) {
        return `${searchLink}&rid=${nameSiloAffiliateCode}`;
    }
    
    return searchLink;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0a1024] to-[#0d183a] text-white font-sans">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300">
            Find Your Perfect Domain
          </h1>
          <p className="text-lg md:text-xl text-blue-100/80 mb-8">
            Leverage AI to generate unique, brandable names and check availability instantly.
          </p>
        </div>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g., 'quantum ai' or 'sustainable travel'"
              className="w-full pl-12 pr-36 py-4 text-lg bg-white/10 border border-white/20 rounded-full focus:ring-2 focus:ring-blue-400 focus:outline-none backdrop-blur-sm transition-all duration-300"
              disabled={isLoading}
            />
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <SearchIcon className="h-6 w-6 text-blue-200/50" />
            </div>
            <button
              type="submit"
              className="absolute inset-y-0 right-0 m-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-full font-semibold flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? <LoaderIcon className="animate-spin h-5 w-5" /> : 'Generate'}
            </button>
          </div>
          {error && <p className="text-red-400 text-center mt-2">{error}</p>}
        </form>
        
        {isLoading && (
          <ProgressBar progress={progress} text={progressText} />
        )}

        <div className="max-w-2xl mx-auto">
          <AdsenseBlock slot="5928091834" />
        </div>
        
        <div ref={resultsRef}>
          {!isLoading && domains.length > 0 && (
            <div className="text-center my-6">
              <h2 className="text-2xl font-semibold text-blue-200">
                Found {domains.length} creative domains for you:
              </h2>
            </div>
          )}

          {domains.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {domains.map((domain) => (
                <DomainCard
                  key={domain.name}
                  domain={domain}
                  isFavorite={favorites.includes(domain.name)}
                  onToggleFavorite={() => handleToggleFavorite(domain.name)}
                  onViewWhois={() => handleViewWhois(domain)}
                  onBuy={() => window.open(generateAffiliateLink(domain.name), '_blank', 'noopener,noreferrer')}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {isModalOpen && selectedDomain && (
        <WhoisModal
          domainName={selectedDomain.name}
          isLoading={isWhoisLoading}
          whoisData={whoisData}
          onClose={() => setIsModalOpen(false)}
        />
      )}
      
      <Footer />
    </div>
  );
};

export default App;