'use client';

import React, { useState, useEffect, useMemo } from 'react';
// Tilføjet setDoc heroppe!
import { collection, onSnapshot, doc, addDoc, setDoc, arrayUnion } from "firebase/firestore";
import { db } from '@/lib/firebase';

// --- ICONS ---
const Search = ({ size = 24, className = "" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const ArrowUp = ({ size = 24, className = "" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>;
const X = ({ size = 24, className = "" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const MessageSquare = ({ size = 16, className = "" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;

const formatCurrency = (amount) => (amount || 0).toLocaleString('da-DK');

function FeedbackModal({ onClose, onSuccess }) {
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if(!text.trim()) return;
        setSending(true);
        try {
            await addDoc(collection(db, 'feedback'), { text, createdAt: new Date().toISOString() });
            onSuccess();
            onClose();
        } catch (error) {
            alert("Kunne ikke sende feedback. Prøv igen senere.");
        }
        setSending(false);
    };

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto p-4 bg-black/60 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-8 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 bg-gray-50 rounded-full"><X size={20} /></button>
                <h3 className="text-2xl font-bold mb-2 font-serif text-[#1b4332]">Giv os din mening</h3>
                <p className="text-gray-600 mb-6">Hvad synes du om vinkortet? Har du ønsker eller ris/ros?</p>
                <form onSubmit={handleSubmit}>
                    <textarea 
                        className="w-full p-4 border border-gray-200 rounded-xl mb-4 h-32 outline-none focus:border-[#991b1b] bg-gray-50" 
                        placeholder="Skriv din besked her..." value={text} onChange={e => setText(e.target.value)} required
                    />
                    <button disabled={sending} className="w-full bg-[#1b4332] text-white py-4 font-bold rounded-xl hover:bg-[#123023] transition disabled:opacity-50">
                        {sending ? 'Sender...' : 'Send Feedback'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function VinkortClient() {
  const [wines, setWines] = useState([]);
  const [filters, setFilters] = useState([{ id: 'carltons_udvalgte', label: "Carlton's Udvalgte på glas" }]);
  const [loading, setLoading] = useState(true);

  const [activeTypeFilter, setActiveTypeFilter] = useState('all');
  const [activeSubFilter, setActiveSubFilter] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState(null); 
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWine, setSelectedWine] = useState(null); 
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  const [filterValues, setFilterValues] = useState({ country: 'all', region: 'all', producer: 'all', price: 'all' });
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showThanks, setShowThanks] = useState(false);

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'wines', 'config'), (docSnap) => {
        if (docSnap.exists() && docSnap.data().filters) setFilters(docSnap.data().filters);
    });

    const unsubWines = onSnapshot(collection(db, 'wines'), (snapshot) => {
      const loadedWines = [];
      snapshot.forEach(doc => { if (doc.id !== 'config') loadedWines.push({ id: doc.id, ...doc.data() }); });
      setWines(loadedWines);
      setLoading(false);
    });

    return () => { unsubConfig(); unsubWines(); };
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const filteredClientWines = useMemo(() => {
    let result = wines.filter(w => !w.isSoldOut);

    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      const searchTerms = lower.split(/\s+/).filter(Boolean);
      result = result.filter(w => {
        const searchableText = [w.producer, w.name, w.classification, w.description, w.grapes, w.type, w.pairing, w.facts, w.country, w.region, w.year].join(' ').toLowerCase();
        return searchTerms.every(term => searchableText.includes(term));
      });
    }

    if (activeTypeFilter !== 'all') result = result.filter(w => w.type === activeTypeFilter);
    if (selectedCountry) result = result.filter(w => w.country === selectedCountry);
    if (filterValues.region !== 'all') result = result.filter(w => w.region === filterValues.region);

    if (activeSubFilter !== 'all') {
      if (activeSubFilter === 'carltons_udvalgte') {
        result = result.filter(w => w.carltonsChoice);
      } else {
        result = result.filter(w => w.tags && w.tags.includes(activeSubFilter));
      }
    }

    result.sort((a, b) => (a.price || 0) - (b.price || 0));
    return result;
  }, [wines, searchQuery, activeTypeFilter, activeSubFilter, selectedCountry, filterValues]);

  const groupedWines = useMemo(() => {
    const groups = {};
    const isSpecialCollection = ['carltons_udvalgte'].includes(activeSubFilter) || (activeSubFilter !== 'all');
    const typeOrder = ["Mousserende", "Hvidvin", "Rødvin", "Rosévin", "Dessertvin"];
    
    const types = [...new Set([...typeOrder, ...filteredClientWines.map(w => w.type).filter(Boolean)])];

    types.forEach(type => {
      const winesOfType = filteredClientWines.filter(w => w.type === type);
      if (winesOfType.length === 0) return;

      if (isSpecialCollection) {
         groups[type] = { wines: winesOfType };
      } else {
         groups[type] = { countries: {} };
         winesOfType.forEach(w => {
           const country = w.country || 'Diverse';
           if (!groups[type].countries[country]) groups[type].countries[country] = [];
           groups[type].countries[country].push(w);
         });
      }
    });
    return groups;
  }, [filteredClientWines, activeSubFilter]);

  const handleFeedbackSuccess = () => {
      setShowThanks(true);
      setTimeout(() => setShowThanks(false), 3000);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-pulse text-gray-400 font-serif text-2xl">Henter Carlton&apos;s Vinkælder...</div></div>;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-800 font-sans pb-20 relative">
      
      <button onClick={() => setShowFeedbackModal(true)} className="absolute top-6 right-6 text-gray-400 hover:text-[#991b1b] transition-colors flex items-center gap-2 font-bold text-xs uppercase tracking-widest z-10">
          <MessageSquare size={16}/> Giv Feedback
      </button>

      <header className="bg-white px-6 py-16 text-center shadow-sm border-b border-gray-100">
        <h1 className="text-6xl font-bold text-[#1b4332] font-serif tracking-tight">Carlton</h1>
        <div className="w-24 h-1 bg-[#991b1b] mx-auto mt-6"></div>
        <p className="text-xl text-gray-500 mt-6 font-serif italic">Vinkort</p>
      </header>

      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-5xl -mt-6 relative z-20">
        
        <div className="mb-6 bg-white p-2 rounded-2xl shadow-md border border-gray-100 flex items-center">
            <Search className="text-gray-400 ml-4 mr-2" size={20} />
            <input type="text" placeholder="Søg på navn, drue, producent..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 p-4 bg-transparent outline-none text-lg w-full" />
        </div>

        <div className="space-y-4 mb-12">
            <div className="flex flex-wrap justify-center gap-3">
                 {['all', 'Mousserende', 'Hvidvin', 'Rødvin', 'Rosévin', 'Dessertvin'].map(type => (
                     <button key={type} onClick={() => { setActiveTypeFilter(type); setSelectedCountry(null); setFilterValues(prev => ({...prev, region: 'all'})); }} className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${activeTypeFilter === type ? 'bg-[#991b1b] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
                        {type === 'all' ? 'Alle Vine' : type}
                     </button>
                 ))}
            </div>

            {activeTypeFilter !== 'all' && (() => {
                const availableCountriesForType = Array.from(new Set(wines.filter(w => w.type === activeTypeFilter && !w.isSoldOut).map(w => w.country).filter(Boolean))).sort();
                if (availableCountriesForType.length === 0) return null;
                return (
                    <div className="flex flex-wrap justify-center gap-2 pt-2 animate-in fade-in slide-in-from-top-2">
                        {availableCountriesForType.map(country => (
                            <button key={country} onClick={() => { setSelectedCountry(country === selectedCountry ? null : country); setFilterValues(prev => ({...prev, region: 'all'})); }} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${selectedCountry === country ? 'bg-[#1b4332] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                {country}
                            </button>
                        ))}
                    </div>
                );
            })()}

            {selectedCountry && (() => {
                const availableRegions = Array.from(new Set(wines.filter(w => w.type === activeTypeFilter && w.country === selectedCountry && !w.isSoldOut).map(w => w.region).filter(Boolean))).sort();
                if (availableRegions.length === 0) return null;
                return (
                    <div className="flex flex-wrap justify-center gap-2 pt-2 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                        {availableRegions.map(region => (
                            <button key={region} onClick={() => setFilterValues(prev => ({...prev, region: region === prev.region ? 'all' : region}))} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${filterValues.region === region ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100'}`}>
                                {region}
                            </button>
                        ))}
                    </div>
                );
            })()}
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-12 border-t border-gray-200 pt-6">
            {filters.map(f => (
                <button key={f.id} onClick={() => setActiveSubFilter(prev => prev === f.id ? 'all' : f.id)} className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeSubFilter === f.id ? 'bg-[#1b4332] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {f.label}
                </button>
            ))}
        </div>

        <div className="space-y-16">
            {Object.keys(groupedWines).length === 0 && (
                <div className="text-center py-20 text-gray-400 italic">Ingen vine matchede din filtrering...</div>
            )}
            
            {Object.keys(groupedWines).map(groupName => {
                const groupData = groupedWines[groupName];
                return (
                <div key={groupName}>
                    <h2 className="text-3xl font-bold text-[#1b4332] font-serif border-b-2 border-[#991b1b] pb-2 mb-8">{groupName}</h2>
                    
                    {groupData.wines ? (
                        <div className="divide-y divide-gray-200">
                            {groupData.wines.map(wine => <WineItem key={wine.id} wine={wine} onClick={() => setSelectedWine(wine)} />)}
                        </div>
                    ) : (
                        Object.keys(groupData.countries).sort().map(country => (
                            <div key={country} className="mb-10">
                                <h3 className="text-xl font-bold text-gray-400 font-serif uppercase tracking-widest mb-4">{country}</h3>
                                <div className="divide-y divide-gray-200">
                                    {groupData.countries[country].map(wine => <WineItem key={wine.id} wine={wine} onClick={() => setSelectedWine(wine)} />)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )})}
        </div>
      </div>

      {showThanks && (
          <div className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold z-50 animate-in slide-in-from-top-10">
              Tak for din feedback!
          </div>
      )}

      {showBackToTop && (
        <button onClick={scrollToTop} className="fixed bottom-8 right-8 p-4 bg-[#991b1b] text-white rounded-full shadow-2xl active:scale-95 transition-transform z-30">
          <ArrowUp size={24} />
        </button>
      )}

      <WineDetailsModal wine={selectedWine} onClose={() => setSelectedWine(null)} />
      {showFeedbackModal && <FeedbackModal onClose={() => setShowFeedbackModal(false)} onSuccess={handleFeedbackSuccess} />}
    </div>
  );
}

function WineItem({ wine, onClick }) {
    return (
        <div onClick={onClick} className="py-6 flex justify-between items-start group cursor-pointer hover:bg-white transition-colors rounded-xl px-2 -mx-2">
            <div className="pr-4">
                <p className="text-xl font-bold text-[#991b1b] group-hover:text-red-700 transition-colors">{wine.producer}</p>
                {wine.name && <p className="text-lg text-gray-800">{wine.name}</p>} 
                
                <p className="text-sm text-gray-500 mt-1 flex items-center flex-wrap gap-2">
                    <span>{wine.year} — {wine.region}{wine.classification ? `, ${wine.classification}` : ''}</span>
                    {wine.note && (
                        <><span className="text-gray-300 font-normal text-xs">•</span><span className="text-[#991b1b] font-serif italic text-[15px]">{wine.note}</span></>
                    )}
                </p>
            </div>
            <div className="text-right flex-shrink-0">
                {/* Her har vi samlet størrelse og pris */}
                <div className="flex items-baseline justify-end gap-2">
                    {wine.size && <span className="text-sm text-gray-500 font-medium">{wine.size}</span>}
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(wine.price)} kr.</p>
                </div>
                {wine.glass_price && <p className="text-sm text-gray-500 italic mt-0.5">Glas: {wine.glass_price}</p>}
            </div>
        </div>
    );
}

function WineDetailsModal({ wine, onClose }) {
  const [sentToCellar, setSentToCellar] = useState(false);

  useEffect(() => {
    if (wine) {
        document.body.style.overflow = 'hidden';
        setSentToCellar(false); // Nulstiller knappen hver gang vi åbner en ny vin
    }
    return () => document.body.style.overflow = 'unset';
  }, [wine]);

  const handleSendToCellar = async (wineObj) => {
    setSentToCellar(true);
    setTimeout(() => setSentToCellar(false), 2000); 

    try {
        // Vi bruger 'arrayUnion' til at tilføje vinen bagerst i køen, uden at slette de andre!
        await setDoc(doc(db, 'wines', 'cellar_request'), {
            queue: arrayUnion({
                wineId: wineObj.id,
                timestamp: Date.now()
            })
        }, { merge: true });
    } catch (error) {
        console.error("Kunne ikke sende til kælder:", error);
        alert("Beskeden kunne ikke sendes. Det er sandsynligvis en rettigheds-fejl i Firebase.");
    }
  };

  if (!wine) return null;
  const displayOrigin = [wine.classification, wine.region, wine.country].filter(Boolean).join(', ');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-black/60 backdrop-blur-sm flex items-center justify-center transition-opacity" onClick={onClose}>
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl my-8 mx-auto animate-in zoom-in-95 duration-200 border-t-8 border-[#991b1b]" onClick={e => e.stopPropagation()}>
        <div className="relative p-8 sm:p-10">
          
          <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"><X size={24} /></button>
          
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 pr-8">
            <div className="pr-4">
              <p className="text-3xl sm:text-4xl font-bold text-[#991b1b] font-serif leading-tight">{wine.producer}</p>
              {wine.name && <h2 className="text-2xl font-normal text-gray-800 font-serif mt-2">{wine.name}</h2>}
              
              <div className="flex flex-wrap items-center gap-3 mt-4">
                  <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">{wine.type} - {wine.year}</p>
                  {wine.note && (<><span className="text-gray-300 font-normal text-xs">•</span><span className="text-[#991b1b] font-serif italic text-base">{wine.note}</span></>)}
              </div>
              <p className="text-base font-medium text-gray-600 mt-2">{displayOrigin}</p>
            </div>
            
            <div className="text-left sm:text-right flex-shrink-0 mt-4 sm:mt-0 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{wine.size && <span className="text-base font-normal mr-1">{wine.size}</span>}{formatCurrency(wine.price)} kr.</p>
              {wine.glass_price && <p className="text-sm text-gray-600 font-medium mt-1">Glas: {wine.glass_price}</p>}
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-100 space-y-6">
            {wine.description && (<div><p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Beskrivelse</p><p className="text-gray-800 leading-relaxed text-lg">{wine.description}</p></div>)}
            {wine.grapes && (<div><p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Druer</p><p className="text-gray-800">{wine.grapes}</p></div>)}
            {wine.pairing && (<div><p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Vinifikation & Madmatch</p><p className="text-gray-800 leading-relaxed">{wine.pairing}</p></div>)}
            {wine.facts && (<div><p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Fakta</p><p className="text-gray-800">{wine.facts}</p></div>)}
          </div>

          {(wine.wineCabinet || wine.shelf) && (
            <div className="mt-6 text-right">
                <span 
                    onClick={() => handleSendToCellar(wine)}
                    className="text-[10px] text-gray-300 font-mono tracking-widest cursor-pointer select-none hover:text-[#991b1b] transition-colors" 
                    title="Send til kælderskærm"
                >
                    {sentToCellar ? 'SENDT TIL KÆLDER' : `${wine.wineCabinet || '-'} / ${wine.shelf || '-'}`}
                </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}