'use client';

import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, onSnapshot, addDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';
import Link from 'next/link';

// Ikoner
const Search = ({size=28, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const X = ({size=28, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const MapPin = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const Package = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;
const Plus = ({size=40, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
const Minus = ({size=40, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/></svg>;
const Home = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;

// --- KÆLDERENS GEOGRAFI ---
const CELLAR_MAP = {
    1: { shelves: 4, start: 1, room: 1 },
    2: { shelves: 4, start: 1, room: 1 },
    3: { shelves: 8, start: 2, room: 1 },
    4: { shelves: 2, start: 1, room: 1 },
    5: { shelves: 2, start: 1, room: 1 },
    6: { shelves: 2, start: 1, room: 1 },
    7: { shelves: 7, start: 1, room: 2 },
    8: { shelves: 2, start: 1, room: 2 },
    9: { shelves: 5, start: 1, room: 2 },
    10: { shelves: 11, start: 1, room: 2 },
    11: { shelves: 11, start: 1, room: 2 },
    12: { shelves: 7, start: 1, room: 2 },
};

export default function KaelderTouch() {
    const [wines, setWines] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedWine, setSelectedWine] = useState(null);
    const [isStatusMode, setIsStatusMode] = useState(false);
    const [lastRequestTime, setLastRequestTime] = useState(0);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'wines'), (snapshot) => {
            const loaded = [];
            snapshot.forEach(doc => { if (doc.id !== 'config' && !doc.data().isArchived) loaded.push({ id: doc.id, ...doc.data() }); });
            setWines(loaded);
        });
        return () => unsub();
    }, []);
    // NY LYTTER: Holder øje med beskeder fra restauranten!
    useEffect(() => {
        if (wines.length === 0) return; // Vent til vinene er indlæst
        
        const unsub = onSnapshot(doc(db, 'wines', 'cellar_request'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Hvis beskeden er ny (inden for de sidste 2 minutter) og vi ikke har set den før
                if (data && data.wineId && data.timestamp > lastRequestTime && (Date.now() - data.timestamp < 120000)) {
                    const requestedWine = wines.find(w => w.id === data.wineId);
                    if (requestedWine) {
                        setSelectedWine(requestedWine);
                        setIsStatusMode(false); // Hop ud af status-tilstand og vis kortet!
                        setLastRequestTime(data.timestamp); // Husk at vi har åbnet den
                    }
                }
            }
        });
        return () => unsub();
    }, [wines, lastRequestTime]);

    const filteredWines = wines.filter(w => {
        if (!searchQuery) return false;
        const terms = searchQuery.toLowerCase().split(' ').filter(Boolean);
        const text = [w.producer, w.name, w.type, w.grapes, w.sku, w.region, w.classification, w.country, w.note].join(' ').toLowerCase();
        return terms.every(t => text.includes(t));
    }).slice(0, 20);

    const handleStockChange = async (wine, change) => {
        const newStock = (parseFloat(wine.stockCount) || 0) + change;
        try {
            await updateDoc(doc(db, 'wines', wine.id), { 
                stockCount: newStock,
                isSoldOut: newStock <= 0,
                updatedAt: new Date().toISOString()
            });
            await addDoc(collection(db, 'history_logs'), {
                wineName: `${wine.producer} ${wine.name || ''}`,
                action: `Touch-skærm: Lager justeret med ${change > 0 ? '+'+change : change} (nu: ${newStock})`,
                createdAt: new Date().toISOString()
            });
            setSelectedWine({...wine, stockCount: newStock});
        } catch (error) { console.error("Fejl:", error); }
    };

    return (
        <div className="h-screen w-screen bg-[#FDFBF7] text-gray-900 font-sans flex p-4 gap-4 overflow-hidden selection:bg-[#991b1b] selection:text-white">
            
            {/* VENSTRE SPALTE: Søgning & Liste (Ca. 45% bredde) */}
            <div className="w-[45%] flex flex-col bg-white rounded-[2rem] shadow-lg border border-gray-100 overflow-hidden">
                {/* Header i venstre spalte */}
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <Link href="/admin" className="p-3 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-700 shadow-sm transition-colors">
                        <Home size={24} />
                    </Link>
                    <button 
                        onClick={() => { setIsStatusMode(!isStatusMode); setSelectedWine(null); }}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${isStatusMode ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Package size={18}/> 
                        {isStatusMode ? 'STATUS TILSTAND' : 'SKIFT TIL STATUS'}
                    </button>
                </div>

                {/* Kæmpe søgefelt */}
                <div className="p-6 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Søg..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className={`w-full bg-gray-50 border-2 rounded-2xl py-6 pl-16 pr-16 text-2xl outline-none transition-colors placeholder-gray-400 font-medium
                                ${isStatusMode ? 'border-amber-200 focus:border-amber-400 bg-amber-50/30' : 'border-gray-100 focus:border-[#991b1b]'}`}
                            autoFocus
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-700 bg-gray-200 hover:bg-gray-300 p-1.5 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Resultat-liste */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {!searchQuery ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300">
                            <Search size={60} className="mb-4 opacity-50" />
                            <p className="text-xl font-serif text-gray-400">Find en vin i systemet</p>
                        </div>
                    ) : (
                        filteredWines.map(wine => {
                            const isSelected = selectedWine?.id === wine.id;
                            return (
                                <div 
                                    key={wine.id} 
                                    onClick={() => setSelectedWine(wine)}
                                    className={`p-5 rounded-2xl cursor-pointer transition-all border-2 ${isSelected ? 'border-[#991b1b] bg-red-50' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}
                                >
                                    <p className={`text-xl font-bold mb-1 ${isSelected ? 'text-[#991b1b]' : 'text-gray-900'}`}>{wine.producer}</p>
                                    <p className="text-gray-500 mb-3 line-clamp-1">{wine.name} - {wine.year}</p>
                                    
                                    <div className="flex justify-between items-end">
                                        <div className="flex gap-2">
                                            <span className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-500 uppercase">{wine.type}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-0.5">Lager</p>
                                            <p className="text-lg font-black text-gray-900 leading-none">{wine.stockCount || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* HØJRE SPALTE: Detaljer & Kort (Ca. 55% bredde) */}
            <div className="w-[55%] flex flex-col bg-white rounded-[2rem] shadow-lg border border-gray-100 p-8 overflow-y-auto relative">
                {!selectedWine ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300">
                        <MapPin size={80} className="mb-6 opacity-50" />
                        <p className="text-2xl font-serif text-gray-400">Vælg en vin i listen for at se detaljer</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
                        {/* Hovedinfo om vinen i toppen */}
                        <div className="mb-8 pb-8 border-b border-gray-100 flex justify-between items-start">
                            <div>
                                <h2 className="text-4xl font-bold font-serif text-gray-900 mb-2">{selectedWine.producer}</h2>
                                <h3 className="text-2xl text-gray-500">{selectedWine.name} - {selectedWine.year}</h3>
                            </div>
                            <button onClick={() => setSelectedWine(null)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {isStatusMode ? (
                            /* STATUS MODE: Gigantiske tælleknapper */
                            <div className="flex-1 flex flex-col items-center justify-center pb-10">
                                <p className="text-xl text-gray-400 uppercase tracking-widest font-bold mb-12">Lagerbeholdning</p>
                                
                                <div className="flex items-center gap-10 bg-gray-50 p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                                    <button 
                                        onClick={() => handleStockChange(selectedWine, -1)}
                                        className="w-28 h-28 bg-white rounded-full flex items-center justify-center text-red-600 hover:bg-red-50 active:scale-90 transition-all border-2 border-red-100 shadow-sm"
                                    >
                                        <Minus size={48} />
                                    </button>
                                    
                                    <div className="w-48 text-center">
                                        <p className="text-[7rem] font-black leading-none text-gray-900">{selectedWine.stockCount || 0}</p>
                                    </div>
                                    
                                    <button 
                                        onClick={() => handleStockChange(selectedWine, 1)}
                                        className="w-28 h-28 bg-white rounded-full flex items-center justify-center text-green-600 hover:bg-green-50 active:scale-90 transition-all border-2 border-green-100 shadow-sm"
                                    >
                                        <Plus size={48} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* KORT MODE: Vis kælderen */
                            <div className="flex-1 flex flex-col">
                                {/* Skab og hylde indikator i toppen */}
                                <div className="flex justify-center gap-4 mb-10">
                                    <div className="flex items-center gap-4 bg-red-50 border border-red-100 px-8 py-4 rounded-2xl">
                                        <MapPin size={32} className="text-[#991b1b]" />
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900">Skab {selectedWine.wineCabinet || '?'}</p>
                                            <p className="text-lg text-[#991b1b] font-medium">Hylde {selectedWine.shelf || '?'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Selve det grafiske kort */}
                                {!selectedWine.wineCabinet || !CELLAR_MAP[selectedWine.wineCabinet] ? (
                                    <div className="flex-1 flex items-center justify-center text-gray-400 text-xl italic bg-gray-50 rounded-3xl border border-gray-100">
                                        Lokationen findes ikke på kortet endnu.
                                    </div>
                                ) : (
                                    <div className="flex-1 grid grid-cols-2 gap-8">
                                        <RoomMap title="Rum 1" cabinets={[1,2,3,4,5,6]} targetCabinet={selectedWine.wineCabinet} targetShelf={selectedWine.shelf} />
                                        <RoomMap title="Rum 2" cabinets={[7,8,9,10,11,12]} targetCabinet={selectedWine.wineCabinet} targetShelf={selectedWine.shelf} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// HJÆLPEKOMPONENT: Lyst tema til rum-kortet
function RoomMap({ title, cabinets, targetCabinet, targetShelf }) {
    const isTargetRoom = cabinets.includes(parseInt(targetCabinet));

    return (
        <div className={`p-5 rounded-3xl border-2 transition-all flex flex-col ${isTargetRoom ? 'border-[#991b1b] bg-white shadow-md' : 'border-gray-200 bg-gray-50/50'}`}>
            <h4 className={`text-lg font-bold text-center mb-4 uppercase tracking-widest ${isTargetRoom ? 'text-[#991b1b]' : 'text-gray-400'}`}>{title}</h4>
            
            <div className="grid grid-cols-3 gap-3 flex-1 content-start">
                {cabinets.map(cabNum => {
                    const cabData = CELLAR_MAP[cabNum];
                    if (!cabData) return null;
                    
                    const isTargetCab = parseInt(targetCabinet) === cabNum;
                    
                    return (
                        <div key={cabNum} className={`flex flex-col border rounded-xl overflow-hidden transition-all ${isTargetCab ? 'border-[#991b1b] shadow-lg scale-105' : 'border-gray-200 opacity-60 bg-white'}`}>
                            <div className={`text-center py-1.5 font-bold text-xs uppercase tracking-wider ${isTargetCab ? 'bg-[#991b1b] text-white' : 'bg-gray-100 text-gray-500'}`}>
                                Skab {cabNum}
                            </div>
                            <div className="flex-1 p-2 flex flex-col gap-1.5 bg-white justify-center">
                                {Array.from({ length: cabData.shelves }).map((_, i) => {
                                    const shelfNumber = cabData.start + i;
                                    const isTargetShelf = isTargetCab && parseInt(targetShelf) === shelfNumber;
                                    
                                    return (
                                        <div 
                                            key={i} 
                                            className={`h-2.5 rounded-sm transition-all ${isTargetShelf ? 'bg-[#991b1b] shadow-[0_0_8px_rgba(153,27,27,0.5)]' : 'bg-gray-100'}`}
                                            title={`Hylde ${shelfNumber}`}
                                        ></div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}