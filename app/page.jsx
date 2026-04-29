'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// --- ICONS ---
const Search = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
const ArrowUp = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </svg>
);
const X = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const formatCurrency = (amount) => (amount || 0).toLocaleString('da-DK');

export default function VinkortClient() {
  const [wines, setWines] = useState([]);
  const [filters, setFilters] = useState([
    { id: 'carltons_udvalgte', label: "Carlton's Udvalgte" },
  ]);
  const [loading, setLoading] = useState(true);

  // Client States
  const [activeTypeFilter, setActiveTypeFilter] = useState('all');
  const [activeSubFilter, setActiveSubFilter] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWine, setSelectedWine] = useState(null); // Styrer pop-up'en
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Data Fetching
  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'wines', 'config'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().filters) {
        setFilters(docSnap.data().filters);
      }
    });

    const unsubWines = onSnapshot(collection(db, 'wines'), (snapshot) => {
      const loadedWines = [];
      snapshot.forEach((doc) => {
        if (doc.id !== 'config')
          loadedWines.push({ id: doc.id, ...doc.data() });
      });
      setWines(loadedWines);
      setLoading(false);
    });

    return () => {
      unsubConfig();
      unsubWines();
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // --- FILTRERINGS LOGIK ---
  const filteredClientWines = useMemo(() => {
    let result = wines.filter((w) => !w.isSoldOut);

    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter((w) =>
        [w.producer, w.name, w.grapes, w.region, w.country]
          .join(' ')
          .toLowerCase()
          .includes(lower)
      );
    }

    if (activeTypeFilter !== 'all')
      result = result.filter((w) => w.type === activeTypeFilter);
    if (selectedCountry)
      result = result.filter((w) => w.country === selectedCountry);

    if (activeSubFilter !== 'all') {
      if (activeSubFilter === 'carltons_udvalgte') {
        result = result.filter((w) => w.carltonsChoice);
      } else if (activeSubFilter === 'seasonsChoice') {
        result = result.filter((w) => w.seasonsChoice);
      } else {
        const filterObj = filters.find((f) => f.id === activeSubFilter);
        const term = (filterObj?.value || filterObj?.label || '').toLowerCase();
        result = result.filter((w) =>
          [w.country, w.region, w.description, w.type]
            .join(' ')
            .toLowerCase()
            .includes(term)
        );
      }
    }

    result.sort((a, b) => (a.price || 0) - (b.price || 0));
    return result;
  }, [
    wines,
    searchQuery,
    activeTypeFilter,
    activeSubFilter,
    selectedCountry,
    filters,
  ]);

  const groupedWines = useMemo(() => {
    const groups = {};
    if (activeSubFilter === 'carltons_udvalgte') {
      groups["Carlton's Udvalgte"] = { wines: filteredClientWines };
      return groups;
    }

    filteredClientWines.forEach((w) => {
      const type = w.type || 'Andet';
      if (!groups[type]) groups[type] = { countries: {} };
      const country = w.country || 'Diverse';
      if (!groups[type].countries[country])
        groups[type].countries[country] = [];
      groups[type].countries[country].push(w);
    });
    return groups;
  }, [filteredClientWines, activeSubFilter]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400 font-serif text-2xl">
          Henter Carlton's Vinkælder...
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-gray-800 font-sans pb-20">
      {/* HEADER */}
      <header className="bg-white px-6 py-12 text-center shadow-sm border-b border-gray-100">
        <h1 className="text-6xl font-bold text-[#1b4332] font-serif tracking-tight">
          Carlton
        </h1>
        <div className="w-24 h-1 bg-[#991b1b] mx-auto mt-4"></div>
        <p className="text-xl text-gray-500 mt-4 font-serif italic">Vinkort</p>
      </header>

      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-5xl">
        {/* SØG */}
        <div className="mb-8 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center">
          <Search className="text-gray-400 ml-4 mr-2" size={20} />
          <input
            type="text"
            placeholder="Søg i kælderen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 p-4 bg-transparent outline-none text-lg"
          />
        </div>

        {/* TOP FILTRE */}
        <nav className="flex flex-wrap justify-center gap-3 mb-6">
          {[
            'all',
            'Mousserende',
            'Hvidvin',
            'Rødvin',
            'Rosévin',
            'Dessertvin',
          ].map((type) => (
            <button
              key={type}
              onClick={() => {
                setActiveTypeFilter(type);
                setActiveSubFilter('all');
              }}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                activeTypeFilter === type
                  ? 'bg-[#991b1b] text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {type === 'all' ? 'Alle Vine' : type}
            </button>
          ))}
        </nav>

        {/* SUB FILTRE */}
        <div className="flex flex-wrap justify-center gap-2 mb-12 border-t border-gray-200 pt-6">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() =>
                setActiveSubFilter((prev) => (prev === f.id ? 'all' : f.id))
              }
              className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                activeSubFilter === f.id
                  ? 'bg-[#1b4332] text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* VIN LISTE */}
        <div className="space-y-16">
          {Object.keys(groupedWines).length === 0 && (
            <div className="text-center py-20 text-gray-400 italic">
              Ingen vine fundet...
            </div>
          )}

          {Object.keys(groupedWines).map((groupName) => (
            <div key={groupName}>
              <h2 className="text-3xl font-bold text-[#1b4332] font-serif border-b-2 border-[#991b1b] pb-2 mb-8">
                {groupName}
              </h2>

              {groupedWines[groupName].wines ? (
                <div className="divide-y divide-gray-200">
                  {/* Her sendes funktionen ned, så vinen kan vælges! */}
                  {groupedWines[groupName].wines.map((wine) => (
                    <WineItem
                      key={wine.id}
                      wine={wine}
                      onClick={() => setSelectedWine(wine)}
                    />
                  ))}
                </div>
              ) : (
                Object.keys(groupedWines[groupName].countries)
                  .sort()
                  .map((country) => (
                    <div key={country} className="mb-10">
                      <h3 className="text-xl font-bold text-gray-400 font-serif uppercase tracking-widest mb-4">
                        {country}
                      </h3>
                      <div className="divide-y divide-gray-200">
                        {/* Samme her! */}
                        {groupedWines[groupName].countries[country].map(
                          (wine) => (
                            <WineItem
                              key={wine.id}
                              wine={wine}
                              onClick={() => setSelectedWine(wine)}
                            />
                          )
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          ))}
        </div>
      </div>

      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-4 bg-[#991b1b] text-white rounded-full shadow-2xl active:scale-95 transition-transform z-30"
        >
          <ArrowUp size={24} />
        </button>
      )}

      {/* POP-UP MODALEN */}
      <WineDetailsModal
        wine={selectedWine}
        onClose={() => setSelectedWine(null)}
      />
    </div>
  );
}

// LILLE KOMPONENT TIL HVER VIN-RÆKKE
function WineItem({ wine, onClick }) {
  return (
    <div
      onClick={onClick}
      className="py-6 flex justify-between items-start group cursor-pointer hover:bg-white transition-colors rounded-xl px-2 -mx-2"
    >
      <div className="pr-4">
        <p className="text-xl font-bold text-[#991b1b] group-hover:text-red-700 transition-colors">
          {wine.producer}
        </p>
        {wine.name && <p className="text-lg text-gray-800">{wine.name}</p>}
        <p className="text-sm text-gray-500 mt-1">
          {wine.year} — {wine.region}
          {wine.classification ? `, ${wine.classification}` : ''}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xl font-bold text-gray-900">
          {formatCurrency(wine.price)} kr.
        </p>
        {wine.glass_price && (
          <p className="text-sm text-gray-500 italic">
            Glas: {wine.glass_price}
          </p>
        )}
      </div>
    </div>
  );
}

// POP-UP MODAL KOMPONENT
function WineDetailsModal({ wine, onClose }) {
  // Låser baggrunden så man ikke scroller siden når pop-up er åben
  useEffect(() => {
    if (wine) document.body.style.overflow = 'hidden';
    return () => (document.body.style.overflow = 'unset');
  }, [wine]);

  if (!wine) return null;
  const displayOrigin = [wine.classification, wine.region, wine.country]
    .filter(Boolean)
    .join(', ');

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto p-4 bg-black/60 backdrop-blur-sm flex items-center justify-center transition-opacity"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl my-8 mx-auto animate-in zoom-in-95 duration-200 border-t-8 border-[#991b1b]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-8 sm:p-10">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>

          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 pr-8">
            <div className="pr-4">
              <p className="text-3xl sm:text-4xl font-bold text-[#991b1b] font-serif leading-tight">
                {wine.producer}
              </p>
              {wine.name && (
                <h2 className="text-2xl font-normal text-gray-800 font-serif mt-2">
                  {wine.name}
                </h2>
              )}
              <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-4">
                {wine.type} - {wine.year}
              </p>
              <p className="text-base font-medium text-gray-600 mt-1">
                {displayOrigin}
              </p>
            </div>

            <div className="text-left sm:text-right flex-shrink-0 mt-4 sm:mt-0 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-2xl font-bold text-gray-900">
                {wine.size && (
                  <span className="text-base font-normal mr-1">
                    {wine.size}
                  </span>
                )}
                {formatCurrency(wine.price)} kr.
              </p>
              {wine.glass_price && (
                <p className="text-sm text-gray-600 font-medium mt-1">
                  Glas: {wine.glass_price}
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-100 space-y-6">
            {wine.description && (
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                  Beskrivelse
                </p>
                <p className="text-gray-800 leading-relaxed text-lg">
                  {wine.description}
                </p>
              </div>
            )}

            {wine.grapes && (
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                  Druer
                </p>
                <p className="text-gray-800">{wine.grapes}</p>
              </div>
            )}

            {wine.pairing && (
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                  Vinifikation & Madmatch
                </p>
                <p className="text-gray-800 leading-relaxed">{wine.pairing}</p>
              </div>
            )}

            {wine.facts && (
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                  Fakta
                </p>
                <p className="text-gray-800">{wine.facts}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
