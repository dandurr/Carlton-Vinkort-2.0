'use client';

import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, onSnapshot, addDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';
import Link from 'next/link';

// Ikoner
const Search = ({size=32, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const X = ({size=32, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const MapPin = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const Package = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;
const Plus = ({size=40, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
const Minus = ({size=40, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/></svg>;
const Home = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;

// --- KÆLDERENS GEOGRAFI ---
const CELLAR_MAP = {
    1: { shelves: 4, start: 1, room: 1 },
    2: { shelves: 4, start: 1, room: 1 },
    3: { shelves: 8, start: 2, room: 1 }, // Starter ved 2 (altså 2, 3, 4, 5, 6, 7, 8, 9)
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
    const [isStatusMode, setIsStatusMode] = useState(false); // Skifter mellem "Find Vin" og "Tæl Vin"

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'wines'), (snapshot) => {
            const loaded = [];
            snapshot.forEach(doc => { if (doc.id !== 'config' && !doc.data().isArchived) loaded.push({ id: doc.id, ...doc.data() }); });
            setWines(loaded);
        });
        return () => unsub();
    }, []);

    const filteredWines = wines.filter(w => {
        if (!searchQuery) return false; // Vis intet hvis der ikke er søgt endnu (for at holde touch-skærmen ren)
        const terms = searchQuery.toLowerCase().split(' ').filter(Boolean);
        const text = [w.producer, w.name, w.type, w.grapes, w.sku, w.region, w.classification, w.country, w.note].join(' ').toLowerCase();
        return terms.every(t => text.includes(t));
    }).slice(0, 15); // Vis kun top 15 så det ikke bliver for tungt på en touchskærm

    const handleStockChange = async (wine, change) => {
        const newStock = (parseFloat(wine.stockCount) || 0) + change;
        
        try {
            await updateDoc(doc(db, 'wines', wine.id), { 
                stockCount: newStock,
                isSoldOut: newStock <= 0,
                updatedAt: new Date().toISOString()
            });
            
            // Log handlingen
            await addDoc(collection(db, 'history_logs'), {
                wineName: `${wine.producer} ${wine.name || ''}`,
                action: `Touch-skærm: Lager justeret med ${change > 0 ? '+'+change : change} (nu: ${newStock})`,
                createdAt: new Date().toISOString()
            });

            // Opdater lokalt så skærmen reagerer lynhurtigt
            setSelectedWine({...wine, stockCount: newStock});
        } catch (error) {
            console.error("Fejl ved opdatering:", error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-red-900 overflow-hidden">
            
            {/* TOP BAR */}
            <header className="bg-slate-900 border-b border-slate-800 p-6 flex justify-between items-center shadow-xl">
                <div className="flex items-center gap-6">
                    <Link href="/admin" className="p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-colors">
                        <Home size={28} className="text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold font-serif text-white tracking-wide">Kælder Dashboard</h1>
                        <p className="text-slate-400 text-lg">Hurtig adgang for personale</p>
                    </div>
                </div>
                
                {/* STATUS MODE TOGGLE */}
                <button 
                    onClick={() => { setIsStatusMode(!isStatusMode); setSelectedWine(null); }}
                    className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-xl transition-all ${isStatusMode ? 'bg-amber-500 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'bg-slate-800 text-slate-300'}`}
                >
                    <Package size={28}/> 
                    {isStatusMode ? 'STATUS TILSTAND ER AKTIV' : 'SKIFT TIL STATUS TILSTAND'}
                </button>
            </header>

            {/* HOVEDOMRÅDE */}
            <div className="p-6 h-[calc(100vh-110px)] flex flex-col">
                
                {/* KÆMPE SØGEFELT */}
                <div className="relative mb-6">
                    <Search className="absolute left-8 top-1/2 transform -translate-y-1/2 text-slate-500" />
                    <input 
                        type="text" 
                        placeholder={isStatusMode ? "Søg efter vin til optælling..." : "Søg efter vin for at finde lokation..."}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className={`w-full bg-slate-900 border-4 rounded-3xl py-8 pl-24 pr-8 text-4xl outline-none transition-colors placeholder-slate-600 font-medium shadow-2xl
                            ${isStatusMode ? 'border-amber-500/50 focus:border-amber-500' : 'border-slate-800 focus:border-red-900'}`}
                        autoFocus
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-8 top-1/2 transform -translate-y-1/2 text-slate-500 bg-slate-800 p-2 rounded-full">
                            <X size={28} />
                        </button>
                    )}
                </div>

                {/* SØGERESULTATER */}
                {!selectedWine && (
                    <div className="flex-1 overflow-y-auto pr-2 pb-20">
                        {!searchQuery ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-6">
                                <Search size={80} className="opacity-20" />
                                <p className="text-3xl font-serif">Brug søgefeltet til at finde en vin</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredWines.map(wine => (
                                    <div 
                                        key={wine.id} 
                                        onClick={() => setSelectedWine(wine)}
                                        className="bg-slate-900 border border-slate-800 p-8 rounded-3xl cursor-pointer hover:bg-slate-800 active:scale-95 transition-all shadow-lg flex justify-between items-center"
                                    >
                                        <div>
                                            <p className="text-3xl font-bold text-white mb-2">{wine.producer}</p>
                                            <p className="text-xl text-slate-400 mb-4">{wine.name}</p>
                                            <div className="flex gap-3">
                                                <span className="px-4 py-2 bg-slate-950 rounded-lg text-sm font-bold text-slate-300 uppercase">{wine.type}</span>
                                                <span className="px-4 py-2 bg-slate-950 rounded-lg text-sm font-bold text-slate-300">{wine.year}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="text-right">
                                            {isStatusMode ? (
                                                <div className="bg-amber-500 text-slate-900 px-6 py-4 rounded-2xl text-center">
                                                    <p className="text-sm font-bold uppercase tracking-widest">På lager</p>
                                                    <p className="text-4xl font-black">{wine.stockCount || 0}</p>
                                                </div>
                                            ) : (
                                                <div className="bg-slate-950 border border-slate-800 px-6 py-4 rounded-2xl text-center">
                                                    <MapPin size={24} className="mx-auto text-red-700 mb-1" />
                                                    <p className="text-slate-300 font-bold">Skab {wine.wineCabinet || '?'}</p>
                                                    <p className="text-slate-500 text-sm">Hylde {wine.shelf || '?'}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* MODAL / VISNING AF EN ENKELT VIN */}
                {selectedWine && (
                    <div className="flex-1 bg-slate-900 rounded-3xl border border-slate-800 p-8 flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
                        <div className="flex justify-between items-start mb-8 border-b border-slate-800 pb-8">
                            <div>
                                <h2 className="text-5xl font-bold font-serif text-white mb-2">{selectedWine.producer}</h2>
                                <h3 className="text-3xl text-slate-400">{selectedWine.name} - {selectedWine.year}</h3>
                            </div>
                            <button onClick={() => setSelectedWine(null)} className="p-4 bg-slate-800 rounded-full text-slate-400 hover:text-white">
                                <X size={40} />
                            </button>
                        </div>

                        {isStatusMode ? (
                            /* STATUS MODE UI (Kæmpe knapper) */
                            <div className="flex-1 flex flex-col items-center justify-center">
                                <p className="text-2xl text-slate-500 uppercase tracking-widest font-bold mb-10">Aktuel Lagerbeholdning</p>
                                
                                <div className="flex items-center gap-12 bg-slate-950 p-12 rounded-[3rem] border border-slate-800 shadow-2xl">
                                    <button 
                                        onClick={() => handleStockChange(selectedWine, -1)}
                                        className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center text-red-500 hover:bg-slate-700 active:scale-90 transition-all border-4 border-slate-700"
                                    >
                                        <Minus />
                                    </button>
                                    
                                    <div className="w-64 text-center">
                                        <p className="text-[8rem] font-black leading-none text-white">{selectedWine.stockCount || 0}</p>
                                    </div>
                                    
                                    <button 
                                        onClick={() => handleStockChange(selectedWine, 1)}
                                        className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center text-green-500 hover:bg-slate-700 active:scale-90 transition-all border-4 border-slate-700"
                                    >
                                        <Plus />
                                    </button>
                                </div>
                                <p className="text-slate-500 mt-12 text-xl italic">Ændringer gemmes i systemet med det samme.</p>
                            </div>
                        ) : (
                            /* FIND VIN UI (Visuelt kort) */
                            <div className="flex-1 flex gap-12">
                                {/* Venstre: Detaljer */}
                                <div className="w-1/3 bg-slate-950 p-8 rounded-3xl border border-slate-800">
                                    <p className="text-xl text-slate-500 uppercase tracking-widest font-bold mb-8">Lokation</p>
                                    
                                    <div className="flex items-center gap-6 mb-8 bg-red-900/20 border border-red-900 p-6 rounded-2xl">
                                        <MapPin size={48} className="text-red-500" />
                                        <div>
                                            <p className="text-4xl font-bold text-white">Skab {selectedWine.wineCabinet || '?'}</p>
                                            <p className="text-2xl text-red-400">Hylde {selectedWine.shelf || '?'}</p>
                                        </div>
                                    </div>

                                    {selectedWine.stockCount > 0 ? (
                                        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 text-center">
                                            <p className="text-slate-400 mb-1">På lager</p>
                                            <p className="text-4xl font-bold text-white">{selectedWine.stockCount} fl.</p>
                                        </div>
                                    ) : (
                                        <div className="p-6 bg-red-900/30 rounded-2xl border border-red-900 text-center text-red-400 font-bold text-xl">
                                            Udsolgt
                                        </div>
                                    )}
                                </div>

                                {/* Højre: Grafisk kort over kælderen */}
                                <div className="w-2/3 bg-slate-950 p-8 rounded-3xl border border-slate-800 flex flex-col justify-center">
                                    {!selectedWine.wineCabinet || !CELLAR_MAP[selectedWine.wineCabinet] ? (
                                        <div className="text-center text-slate-500 text-2xl italic">Lokationen for denne vin findes ikke på kortet endnu.</div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-12 h-full">
                                            <RoomMap title="Rum 1" cabinets={[1,2,3,4,5,6]} targetCabinet={selectedWine.wineCabinet} targetShelf={selectedWine.shelf} />
                                            <RoomMap title="Rum 2" cabinets={[7,8,9,10,11,12]} targetCabinet={selectedWine.wineCabinet} targetShelf={selectedWine.shelf} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// HJÆLPEKOMPONENT: Tegner et enkelt rum med skabe
function RoomMap({ title, cabinets, targetCabinet, targetShelf }) {
    const isTargetRoom = cabinets.includes(parseInt(targetCabinet));

    return (
        <div className={`p-6 rounded-3xl border-4 transition-all ${isTargetRoom ? 'border-red-900 bg-slate-900/50' : 'border-slate-800/50 bg-slate-900/20'}`}>
            <h4 className={`text-2xl font-bold text-center mb-6 uppercase tracking-widest ${isTargetRoom ? 'text-red-500' : 'text-slate-600'}`}>{title}</h4>
            
            <div className="grid grid-cols-3 gap-4">
                {cabinets.map(cabNum => {
                    const cabData = CELLAR_MAP[cabNum];
                    if (!cabData) return null;
                    
                    const isTargetCab = parseInt(targetCabinet) === cabNum;
                    
                    return (
                        <div key={cabNum} className={`flex flex-col border-2 rounded-lg overflow-hidden transition-all ${isTargetCab ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'border-slate-800 opacity-50'}`}>
                            <div className={`text-center py-2 font-bold text-sm ${isTargetCab ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                Skab {cabNum}
                            </div>
                            <div className="flex-1 p-2 flex flex-col gap-1 bg-slate-950">
                                {/* Tegner hylderne. Vi udregner nummeret baseret på 'start' */}
                                {Array.from({ length: cabData.shelves }).map((_, i) => {
                                    const shelfNumber = cabData.start + i;
                                    const isTargetShelf = isTargetCab && parseInt(targetShelf) === shelfNumber;
                                    
                                    return (
                                        <div 
                                            key={i} 
                                            className={`h-4 rounded-sm transition-all ${isTargetShelf ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)]' : 'bg-slate-800'}`}
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