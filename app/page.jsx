'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, addDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';

// --- ICONS ---
const Search = ({ size = 24, className = "" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const ArrowUp = ({ size = 24, className = "" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>;
const X = ({ size = 24, className = "" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const MessageSquare = ({ size = 16, className = "" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;

const formatCurrency = (amount) => (amount || 0).toLocaleString('da-DK');

// --- FEEDBACK MODAL KOMPONENT ---
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
  const [filters, setFilters] = useState([{ id: 'carltons_udvalgte', label: "Carlton's Udvalgte" }]);
  const [loading, setLoading] = useState(true);

  // Client States
  const [activeTypeFilter, setActiveTypeFilter] = useState('all');
  const [activeSubFilter, setActiveSubFilter] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState(null); 
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWine, setSelectedWine] = useState(null); 
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // GENSKABT: Avancerede filtre & Feedback
  const [showFilters, setShowFilters] = useState(false);
  const [filterValues, setFilterValues] = useState({ country: 'all', region: 'all', producer: 'all', price: 'all' });
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showThanks, setShowThanks] = useState(false);

  // Data Fetching
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

  // GENSKABT: Dropdown Data lister
  const uniqueCountries = useMemo(() => Array.from(new Set(wines.map(w => w.country).filter(Boolean))).sort(), [wines]);
  const uniqueProducers = useMemo(() => Array.from(new Set(wines.map(w => w.producer).filter(Boolean))).sort(), [wines]);
  const uniqueRegions = useMemo(() => {
    if (filterValues.country === 'all') return [];
    return Array.from(new Set(wines.filter(w => w.country === filterValues.country).map(w => w.region).filter(Boolean))).sort();
  }, [wines, filterValues.country]);

  // GENSKABT: Dyb filtreringslogik
  const filteredClientWines = useMemo(() => {
    let result = wines.filter(w => !w.isSoldOut);

    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      const searchTerms = lower.split(/\s+/).filter(Boolean);
      result = result.filter(w => {
        // DYB SØGNING GENSKABT
        const searchableText = [w.producer, w.name, w.classification, w.description, w.grapes, w.type, w.pairing, w.facts, w.country, w.region, w.year].join(' ').toLowerCase();
        return searchTerms.every(term => searchableText.includes(term));
      });
    }

    if (activeTypeFilter !== 'all') result = result.filter(w => w.type === activeTypeFilter);
    if (selectedCountry) result = result.filter(w => w.country === selectedCountry);

    // GENSKABT: Dropdown filtre check
    if (filterValues.producer !== 'all') result = result.filter(w => w.producer === filterValues.producer);
    if (filterValues.country !== 'all') result = result.filter(w => w.country === filterValues.country);
    if (filterValues.region !== 'all') result = result.filter(w => w.region === filterValues.region);
    if (filterValues.price !== 'all') {
        if (filterValues.price === '2000+') {
            result = result.filter(w => (w.price || 0) >= 2000);
        } else {
            const [min, max] = filterValues.price.split('-').map(Number);
            result = result.filter(w => (w.price || 0) >= min && (w.price || 0) <= max);
        }
    }

    if (activeSubFilter !== 'all') {
      if (activeSubFilter === 'carltons_udvalgte') {
        result = result.filter(w => w.carltonsChoice);
      } else if (activeSubFilter === 'seasonsChoice') {
        result = result.filter(w => w.seasonsChoice);
      } else {
        const filterObj = filters.find(f => f.id === activeSubFilter);
        const term = (filterObj?.value || filterObj?.label || '').toLowerCase();
        result = result.filter(w => [w.country, w.region, w.description, w.type].join(' ').toLowerCase().includes(term));
      }
    }

    result.sort((a, b) => (a.price || 0) - (b.price || 0));
    return result;
  }, [wines, searchQuery, activeTypeFilter, activeSubFilter, selectedCountry, filters, filterValues]);

  const groupedWines = useMemo(() => {
    const groups = {};
    if (activeSubFilter === 'carltons_udvalgte') {
        groups["Carlton's Udvalgte"] = { wines: filteredClientWines };
        return groups;
    }
    filteredClientWines.forEach(w => {
      const type = w.type || 'Andet';
      if (!groups[type]) groups[type] = { countries: {} };
      const country = w.country || 'Diverse';
      if (!groups[type].countries[country]) groups[type].countries[country] = [];
      groups[type].countries[country].push(w);
    });
    return groups;
  }, [filteredClientWines, activeSubFilter]);

  const handleFeedbackSuccess = () => {
      setShowThanks(true);
      setTimeout(() => setShowThanks(false), 3000);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-pulse text-gray-400 font-serif text-2xl">Henter Carlton's Vinkælder...</div></div>;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-800 font-sans pb-20 relative">
      
      {/* GENSKABT: Feedback Knap */}
      <button onClick={() => setShowFeedbackModal(true)} className="absolute top-6 right-6 text-gray-400 hover:text-[#991b1b] transition-colors flex items-center gap-2 font-bold text-xs uppercase tracking-widest z-10">
          <MessageSquare size={16}/> Giv Feedback
      </button>

      {/* HEADER */}
      <header className="bg-white px-6 py-16 text-center shadow-sm border-b border-gray-100">
        <h1 className="text-6xl font-bold text-[#1b4332] font-serif tracking-tight">Carlton</h1>
        <div className="w-24 h-1 bg-[#991b1b] mx-auto mt-6"></div>
        <p className="text-xl text-gray-500 mt-6 font-serif italic">Udforsk vores håndplukket udvalg</p>
      </header>

      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-5xl -mt-6 relative z-20">
        
        {/* SØG & FILTRE TOGGLE */}
        <div className="mb-6 bg-white p-2 rounded-2xl shadow-md border border-gray-100 flex flex-col sm:flex-row items-center gap-2">
            <div className="flex items-center flex-1 w-full">
                <Search className="text-gray-400 ml-4 mr-2" size={20} />
                <input 
                    type="text" 
                    placeholder="Søg i kælderen..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    className="flex-1 p-4 bg-transparent outline-none text-lg w-full" 
                />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={`w-full sm:w-auto px-6 py-4 rounded-xl font-bold transition-colors ${showFilters ? 'bg-[#1b4332] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {showFilters ? 'Skjul Filtre' : 'Vis Filtre'}
            </button>
        </div>

        {/* GENSKABT: Avancerede Dropdown Filtre */}
        {showFilters && (
            <div className="mb-8 p-6 bg-white rounded-2xl shadow-sm border border-gray-100 animate-in slide-in-from-top-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 items-end gap-4">
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Land</label><select value={filterValues.country} onChange={e => setFilterValues({...filterValues, country: e.target.value, region: 'all'})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#991b1b] outline-none"><option value="all">Alle lande</option>{uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Område</label><select value={filterValues.region} onChange={e => setFilterValues({...filterValues, region: e.target.value})} disabled={filterValues.country === 'all'} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#991b1b] outline-none disabled:opacity-50"><option value="all">Alle områder</option>{uniqueRegions.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Producent</label><select value={filterValues.producer} onChange={e => setFilterValues({...filterValues, producer: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#991b1b] outline-none"><option value="all">Alle producenter</option>{uniqueProducers.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Pris</label><select value={filterValues.price} onChange={e => setFilterValues({...filterValues, price: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#991b1b] outline-none"><option value="all">Alle priser</option><option value="0-499">Under 500 kr.</option><option value="500-799">500 - 799 kr.</option><option value="800-1299">800 - 1.299 kr.</option><option value="1300-1999">1.300 - 1.999 kr.</option><option value="2000+">Over 2.000 kr.</option></select></div>
                <button onClick={() => { setFilterValues({ country: 'all', region: 'all', producer: 'all', price: 'all' }); setActiveTypeFilter('all'); setActiveSubFilter('all'); setSearchQuery(''); }} className="w-full bg-gray-800 text-white p-3 rounded-xl hover:bg-black font-bold transition-colors">Nulstil Alt</button>
              </div>
            </div>
        )}

        {/* TOP FILTRE (Type) */}
        <nav className="flex flex-wrap justify-center gap-3 mb-6 mt-10">
             {['all', 'Mousserende', 'Hvidvin', 'Rødvin', 'Rosévin', 'Dessertvin'].map(type => (
                 <button 
                    key={type} 
                    onClick={() => { setActiveTypeFilter(type); setActiveSubFilter('all'); }} 
                    className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${activeTypeFilter === type ? 'bg-[#991b1b] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}
                 >
                    {type === 'all' ? 'Alle Vine' : type}
                 </button>
             ))}
        </nav>

        {/* SUB FILTRE (Carltons Udvalgte osv) */}
        <div className="flex flex-wrap justify-center gap-2 mb-12 border-t border-gray-200 pt-6">
            {filters.map(f => (
                <button 
                    key={f.id} 
                    onClick={() => setActiveSubFilter(prev => prev === f.id ? 'all' : f.id)}
                    className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeSubFilter === f.id ? 'bg-[#1b4332] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                    {f.label}
                </button>
            ))}
        </div>

        {/* VIN LISTE */}
        <div className="space-y-16">
            {Object.keys(groupedWines).length === 0 && (
                <div className="text-center py-20 text-gray-400 italic">Ingen vine matchede din søgning...</div>
            )}
            
            {Object.keys(groupedWines).map(groupName => (
                <div key={groupName}>
                    <h2 className="text-3xl font-bold text-[#1b4332] font-serif border-b-2 border-[#991b1b] pb-2 mb-8">{groupName}</h2>
                    
                    {groupedWines[groupName].wines ? (
                        <div className="divide-y divide-gray-200">
                            {groupedWines[groupName].wines.map(wine => <WineItem key={wine.id} wine={wine} onClick={() => setSelectedWine(wine)} />)}
                        </div>
                    ) : (
                        Object.keys(groupedWines[groupName].countries).sort().map(country => (
                            <div key={country} className="mb-10">
                                <h3 className="text-xl font-bold text-gray-400 font-serif uppercase tracking-widest mb-4">{country}</h3>
                                <div className="divide-y divide-gray-200">
                                    {groupedWines[groupName].countries[country].map(wine => <WineItem key={wine.id} wine={wine} onClick={() => setSelectedWine(wine)} />)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ))}
        </div>
      </div>

      {/* FLYDENDE TAK BESKED */}
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
                <p className="text-sm text-gray-500 mt-1">
                    {wine.year} — {wine.region}{wine.classification ? `, ${wine.classification}` : ''}
                </p>
            </div>
            <div className="text-right flex-shrink-0">
                <p className="text-xl font-bold text-gray-900">{formatCurrency(wine.price)} kr.</p>
                {wine.glass_price && <p className="text-sm text-gray-500 italic">Glas: {wine.glass_price}</p>}
            </div>
        </div>
    );
}

function WineDetailsModal({ wine, onClose }) {
  useEffect(() => {
    if (wine) document.body.style.overflow = 'hidden';
    return () => document.body.style.overflow = 'unset';
  }, [wine]);

  if (!wine) return null;
  const displayOrigin = [wine.classification, wine.region, wine.country].filter(Boolean).join(', ');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-black/60 backdrop-blur-sm flex items-center justify-center transition-opacity" onClick={onClose}>
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl my-8 mx-auto animate-in zoom-in-95 duration-200 border-t-8 border-[#991b1b]" onClick={e => e.stopPropagation()}>
        <div className="relative p-8 sm:p-10">
          
          <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
              <X size={24} />
          </button>
          
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 pr-8">
            <div className="pr-4">
              <p className="text-3xl sm:text-4xl font-bold text-[#991b1b] font-serif leading-tight">{wine.producer}</p>
              {wine.name && <h2 className="text-2xl font-normal text-gray-800 font-serif mt-2">{wine.name}</h2>}
              <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-4">{wine.type} - {wine.year}</p>
              <p className="text-base font-medium text-gray-600 mt-1">{displayOrigin}</p>
            </div>
            
            <div className="text-left sm:text-right flex-shrink-0 mt-4 sm:mt-0 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{wine.size && <span className="text-base font-normal mr-1">{wine.size}</span>}{formatCurrency(wine.price)} kr.</p>
              {wine.glass_price && <p className="text-sm text-gray-600 font-medium mt-1">Glas: {wine.glass_price}</p>}
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-100 space-y-6">
            {wine.description && (
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Beskrivelse</p>
                    <p className="text-gray-800 leading-relaxed text-lg">{wine.description}</p>
                </div>
            )}
            
            {wine.grapes && (
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Druer</p>
                    <p className="text-gray-800">{wine.grapes}</p>
                </div>
            )}
            
            {wine.pairing && (
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Vinifikation & Madmatch</p>
                    <p className="text-gray-800 leading-relaxed">{wine.pairing}</p>
                </div>
            )}
            
            {wine.facts && (
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Fakta</p>
                    <p className="text-gray-800">{wine.facts}</p>
                </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}