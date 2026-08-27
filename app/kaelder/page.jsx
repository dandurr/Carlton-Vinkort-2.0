'use client';

import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, onSnapshot, addDoc, arrayRemove } from "firebase/firestore";
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
const Star = ({size=16, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const Bell = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>;
const CheckCircle = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

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
    
    // NYT: Et State der holder styr på hele køen
    const [queue, setQueue] = useState([]);
    const [lastProcessedTimestamp, setLastProcessedTimestamp] = useState(0);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'wines'), (snapshot) => {
            const loaded = [];
            snapshot.forEach(doc => { if (doc.id !== 'config' && !doc.data().isArchived) loaded.push({ id: doc.id, ...doc.data() }); });
            setWines(loaded);
        });
        return () => unsub();
    }, []);

    // LYTTER TIL KØEN
    useEffect(() => {
        if (wines.length === 0) return;
        const unsub = onSnapshot(doc(db, 'wines', 'cellar_request'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.queue && Array.isArray(data.queue)) {
                    // Sorterer køen så den ældste besked er først
                    const sortedQueue = data.queue.sort((a,b) => a.timestamp - b.timestamp);
                    setQueue(sortedQueue);

                    // Hvis der er kommet en NY request i køen, som vi ikke har set før, auto-vælger vi den ældste ubehandlede
                    if (sortedQueue.length > 0) {
                        const newestTimestamp = sortedQueue[sortedQueue.length - 1].timestamp;
                        if (newestTimestamp > lastProcessedTimestamp) {
                            const oldestWine = wines.find(w => w.id === sortedQueue[0].wineId);
                            if (oldestWine) {
                                setSelectedWine(oldestWine);
                                setIsStatusMode(false);
                                setLastProcessedTimestamp(newestTimestamp);
                            }
                        }
                    }
                } else {
                    setQueue([]);
                }
            }
        });
        return () => unsub();
    }, [wines, lastProcessedTimestamp]);

    // NYT: Funktion til at markere vinen som hentet (fjerner den fra køen i databasen)
    const handleRemoveFromQueue = async (queueItem, e) => {
        if (e) e.stopPropagation(); // Undgå at klikket trigger bagvedliggende knapper
        try {
            await updateDoc(doc(db, 'wines', 'cellar_request'), {
                queue: arrayRemove(queueItem)
            });
            // Hvis vi lige har fjernet den vin, vi kigger på, så lukker vi for den (eller går til næste i køen via useEffect)
            if (selectedWine && selectedWine.id === queueItem.wineId) {
                setSelectedWine(null);
            }
        } catch (err) {
            console.error("Kunne ikke fjerne fra køen", err);
        }
    };

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
                action: `PC-skærm: Lager justeret med ${change > 0 ? '+'+change : change} (nu: ${newStock})`,
                createdAt: new Date().toISOString()
            });
            setSelectedWine({...wine, stockCount: newStock});
        } catch (error) { console.error("Fejl:", error); }
    };

    return (
        <div className="h-screen w-screen bg-[#FDFBF7] text-gray-900 font-sans flex p-4 gap-4 overflow-hidden selection:bg-[#991b1b] selection:text-white">
            
            {/* VENSTRE SPALTE: Søgning, Kø & Liste */}
            <div className="w-1/3 flex flex-col bg-white rounded-[2rem] shadow-lg border border-gray-100 overflow-hidden min-w-[350px]">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                    <Link href="/admin" className="p-3 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-700 shadow-sm transition-colors" title="Tilbage til Admin">
                        <Home size={20} />
                    </Link>
                    <button 
                        onClick={() => { setIsStatusMode(!isStatusMode); setSelectedWine(null); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm ${isStatusMode ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Package size={16}/> 
                        {isStatusMode ? 'STATUS TILSTAND' : 'SKIFT TIL STATUS'}
                    </button>
                </div>

                {/* KØ-MODUL (Vises kun hvis der er en kø) */}
                {queue.length > 0 && (
                    <div className="p-4 bg-red-50/50 border-b border-red-100 flex flex-col gap-3 shrink-0">
                        <h3 className="font-bold text-[#991b1b] flex items-center gap-2 text-sm uppercase tracking-widest">
                            <Bell size={18} className="animate-bounce" /> Tjener-kald ({queue.length})
                        </h3>
                        <div className="flex flex-col gap-2 max-h-[30vh] overflow-y-auto pr-1">
                            {queue.map((qItem, idx) => {
                                const qWine = wines.find(w => w.id === qItem.wineId);
                                if (!qWine) return null;
                                const isSelected = selectedWine?.id === qWine.id;
                                
                                return (
                                    <div 
                                        key={idx} 
                                        onClick={() => { setSelectedWine(qWine); setIsStatusMode(false); }} 
                                        className={`p-3 rounded-xl cursor-pointer flex justify-between items-center transition-all border-2 ${isSelected ? 'border-[#991b1b] bg-white shadow-md' : 'border-red-100 bg-white/60 hover:bg-white'}`}
                                    >
                                        <div className="flex-1 pr-2">
                                            <p className={`font-bold text-sm line-clamp-1 ${isSelected ? 'text-[#991b1b]' : 'text-gray-900'}`}>{qWine.producer}</p>
                                            <p className="text-xs text-gray-500 line-clamp-1">{qWine.name}</p>
                                        </div>
                                        <button 
                                            onClick={(e) => handleRemoveFromQueue(qItem, e)} 
                                            className="p-2.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors border border-green-200 shadow-sm shrink-0 flex items-center justify-center gap-1"
                                            title="Markér som hentet"
                                        >
                                            <CheckCircle size={18} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="p-4 border-b border-gray-100 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Søg i systemet..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className={`w-full bg-gray-50 border-2 rounded-xl py-4 pl-12 pr-12 text-lg outline-none transition-colors placeholder-gray-400 font-medium
                                ${isStatusMode ? 'border-amber-200 focus:border-amber-400 bg-amber-50/30' : 'border-gray-100 focus:border-[#991b1b]'}`}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-700 bg-gray-200 hover:bg-gray-300 p-1 rounded-full transition-colors">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {!searchQuery ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300">
                            <Search size={48} className="mb-4 opacity-50" />
                            <p className="text-lg font-serif text-gray-400">Søg for at finde vin manuelt</p>
                        </div>
                    ) : (
                        filteredWines.map(wine => {
                            const isSelected = selectedWine?.id === wine.id;
                            return (
                                <div 
                                    key={wine.id} 
                                    onClick={() => setSelectedWine(wine)}
                                    className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${isSelected ? 'border-[#991b1b] bg-red-50' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}
                                >
                                    <p className={`text-lg font-bold mb-1 leading-tight ${isSelected ? 'text-[#991b1b]' : 'text-gray-900'}`}>{wine.producer}</p>
                                    <p className="text-gray-500 mb-2 text-sm line-clamp-1">{wine.name} - {wine.year}</p>
                                    <div className="flex justify-between items-end">
                                        <span className="px-2 py-1 bg-white border border-gray-200 rounded text-[10px] font-bold text-gray-500 uppercase">{wine.type}</span>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Lager</p>
                                            <p className="text-base font-black text-gray-900 leading-none">{wine.stockCount || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* HØJRE SPALTE: Kort eller Tæller */}
            <div className="w-2/3 flex flex-col bg-white rounded-[2rem] shadow-lg border border-gray-100 p-6 relative">
                {!selectedWine ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300">
                        <MapPin size={64} className="mb-4 opacity-50" />
                        <p className="text-xl font-serif text-gray-400">Vælg en vin for at se detaljer</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
                        {/* Vin Info */}
                        <div className="mb-6 pb-6 border-b border-gray-100 flex justify-between items-start">
                            <div>
                                <h2 className="text-3xl font-bold font-serif text-gray-900 mb-1">{selectedWine.producer}</h2>
                                <h3 className="text-xl text-gray-500">{selectedWine.name} - {selectedWine.year}</h3>
                            </div>
                            <button onClick={() => setSelectedWine(null)} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {isStatusMode ? (
                            /* STATUS MODE */
                            <div className="flex-1 flex flex-col items-center justify-center pb-10">
                                <p className="text-lg text-gray-400 uppercase tracking-widest font-bold mb-8">Lagerbeholdning</p>
                                <div className="flex items-center gap-10 bg-gray-50 p-10 rounded-[2rem] border border-gray-100 shadow-sm">
                                    <button onClick={() => handleStockChange(selectedWine, -1)} className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-red-600 hover:bg-red-50 active:scale-90 transition-all border-2 border-red-100 shadow-sm"><Minus size={40} /></button>
                                    <div className="w-40 text-center"><p className="text-[6rem] font-black leading-none text-gray-900">{selectedWine.stockCount || 0}</p></div>
                                    <button onClick={() => handleStockChange(selectedWine, 1)} className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-green-600 hover:bg-green-50 active:scale-90 transition-all border-2 border-green-100 shadow-sm"><Plus size={40} /></button>
                                </div>
                            </div>
                        ) : (
                            /* DET FYSISKE KÆLDERKORT */
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex justify-center gap-4 mb-4">
                                    <div className="flex items-center gap-3 bg-red-50 border border-red-100 px-6 py-3 rounded-xl shadow-sm">
                                        <MapPin size={24} className="text-[#991b1b]" />
                                        <div>
                                            <p className="text-lg font-bold text-gray-900 leading-tight">Skab {selectedWine.wineCabinet || '?'}</p>
                                            <p className="text-sm text-[#991b1b] font-medium leading-tight">Hylde {selectedWine.shelf || '?'}</p>
                                        </div>
                                    </div>
                                </div>

                                {!selectedWine.wineCabinet || !CELLAR_MAP[selectedWine.wineCabinet] ? (
                                    <div className="flex-1 flex items-center justify-center text-gray-400 text-lg italic bg-gray-50 rounded-2xl border border-gray-100">Lokationen findes ikke på kortet endnu.</div>
                                ) : (
                                    <PhysicalCellarMap targetCabinet={selectedWine.wineCabinet} targetShelf={selectedWine.shelf} />
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// DET FYSISKE KÆLDERKORT
// ============================================================================
function PhysicalCellarMap({ targetCabinet, targetShelf }) {
    return (
        <div className="flex-1 flex gap-4 w-full h-full pb-2">
            
            {/* RUM 2 */}
            <div className="flex-1 bg-gray-50 rounded-2xl border-2 border-gray-200 p-4 relative flex flex-col">
                <h3 className="text-center text-gray-400 font-bold mb-2 uppercase tracking-widest text-xs">Rum 2</h3>
                
                <div className="flex-1 grid grid-cols-5 grid-rows-5 gap-2 relative h-full">
                    <div className="col-start-5 row-start-1 flex items-center justify-end text-gray-400 text-xs font-bold pr-1">Dør ➔</div>

                    <div className="col-start-1 row-start-2 row-span-2">
                        <Cabinet num={7} targetCabinet={targetCabinet} targetShelf={targetShelf} />
                    </div>

                    <div className="col-start-1 row-start-5"><Cabinet num={8} targetCabinet={targetCabinet} targetShelf={targetShelf} /></div>
                    <div className="col-start-2 row-start-5"><Cabinet num={9} targetCabinet={targetCabinet} targetShelf={targetShelf} /></div>
                    <div className="col-start-3 row-start-5"><Cabinet num={10} targetCabinet={targetCabinet} targetShelf={targetShelf} /></div>
                    <div className="col-start-4 row-start-5"><Cabinet num={11} targetCabinet={targetCabinet} targetShelf={targetShelf} /></div>
                    <div className="col-start-5 row-start-5"><Cabinet num={12} targetCabinet={targetCabinet} targetShelf={targetShelf} /></div>
                </div>
            </div>

            {/* RUM 1 */}
            <div className="flex-1 bg-gray-50 rounded-2xl border-2 border-gray-200 p-4 relative flex flex-col">
                <h3 className="text-center text-gray-400 font-bold mb-2 uppercase tracking-widest text-xs">Rum 1</h3>
                
                <div className="flex-1 grid grid-cols-4 grid-rows-5 gap-2 relative h-full">
                    <div className="col-start-1 row-start-1"><Cabinet num={4} targetCabinet={targetCabinet} targetShelf={targetShelf} /></div>
                    <div className="col-start-2 row-start-1"><Cabinet num={5} targetCabinet={targetCabinet} targetShelf={targetShelf} /></div>

                    <div className="col-start-3 row-start-1 flex items-start pt-1 justify-center text-gray-400 text-xs font-bold">Dør</div>
                    <div className="col-start-4 row-start-1"><Cabinet num={6} targetCabinet={targetCabinet} targetShelf={targetShelf} /></div>

                    <div className="col-start-1 row-start-2 flex items-center justify-start text-gray-400 text-xs font-bold pl-1"> Rum 2</div>

                    <div className="col-start-2 col-span-2 row-start-3 flex items-center justify-center relative">
                        <div className="flex flex-col items-center text-[#991b1b] animate-pulse">
                            <Star size={24} />
                            <span className="text-[10px] font-black uppercase mt-1 whitespace-nowrap">Dig</span>
                        </div>
                    </div>

                    <div className="col-start-1 row-start-5"><Cabinet num={1} targetCabinet={targetCabinet} targetShelf={targetShelf} /></div>
                    <div className="col-start-2 row-start-5"><Cabinet num={2} targetCabinet={targetCabinet} targetShelf={targetShelf} /></div>
                    <div className="col-start-3 row-start-5"><Cabinet num={3} targetCabinet={targetCabinet} targetShelf={targetShelf} /></div>
                </div>
            </div>

        </div>
    );
}

function Cabinet({ num, targetCabinet, targetShelf }) {
    const cabData = CELLAR_MAP[num];
    if (!cabData) return null;
    
    const isTargetCab = parseInt(targetCabinet) === num;

    return (
        <div className={`w-full h-full flex flex-col border rounded-lg overflow-hidden transition-all ${isTargetCab ? 'border-[#991b1b] shadow-xl scale-110 z-10' : 'border-gray-200 opacity-70 bg-white'}`}>
            <div className={`text-center py-0.5 font-bold text-[10px] uppercase tracking-wider ${isTargetCab ? 'bg-[#991b1b] text-white' : 'bg-gray-100 text-gray-500'}`}>
                {num}
            </div>
            <div className="flex-1 p-1 flex flex-col gap-[2px] bg-white justify-center min-h-0">
                {Array.from({ length: cabData.shelves }).map((_, i) => {
                    const shelfNumber = cabData.start + i;
                    const isTargetShelf = isTargetCab && parseInt(targetShelf) === shelfNumber;
                    
                    return (
                        <div 
                            key={i} 
                            className={`flex-1 rounded-sm transition-all min-h-[3px] ${isTargetShelf ? 'bg-[#991b1b] shadow-[0_0_8px_rgba(153,27,27,0.8)]' : 'bg-gray-100'}`}
                            title={`Hylde ${shelfNumber}`}
                        ></div>
                    );
                })}
            </div>
        </div>
    );
}