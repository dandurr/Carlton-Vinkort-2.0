// components/admin/WineFormModal.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, addDoc, updateDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';

// Ikoner vi skal bruge i formularen
const X = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const Plus = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>;

const formatCurrency = (amount) => (amount || 0).toLocaleString('da-DK');
const calculateProfit = (salesPrice, purchasePriceExVat) => {
  if (!purchasePriceExVat || !salesPrice) return { priceWithVat: 0, profit: 0, margin: 0 };
  const priceWithVat = purchasePriceExVat * 1.25;
  const profit = salesPrice - priceWithVat;
  const margin = salesPrice > 0 ? (profit / salesPrice) * 100 : 0;
  return { priceWithVat, profit, margin };
};

export default function WineFormModal({ wineToEdit, filters, suggestions, onClose, onSuccess, onError }: any) {
    const [mathState, setMathState] = useState({ price: 0, purchasePrice: 0 });
    const isEditing = !!wineToEdit;

    useEffect(() => {
        if (wineToEdit) {
            setMathState({ 
                price: parseFloat(wineToEdit.price) || 0, 
                purchasePrice: parseFloat(wineToEdit.purchasePrice) || 0 
            });
        }
    }, [wineToEdit]);

    const profitData = useMemo(() => calculateProfit(mathState.price, mathState.purchasePrice), [mathState]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const timestamp = new Date().toISOString();
        
        // Saml custom tags
        const customTags = filters
            .filter(f => f.id !== 'carltons_udvalgte')
            .filter(f => formData.get(`customFilter_${f.id}`) === 'on')
            .map(f => f.id);

        const wineData = {
            producer: data.producer || "", name: data.name || "", year: data.year || "", type: data.type || "",
            country: data.country || "", region: data.region || "", classification: data.classification || "",
            price: parseFloat(data.price) || 0, glass_price: data.glass_price || "", size: data.size || "",
            note: data.note || "", sku: data.sku || "", 
            notes: wineToEdit?.notes || "", origin: wineToEdit?.origin || "", description: data.description || "",
            grapes: data.grapes || "", pairing: data.pairing || "", facts: data.facts || "",
            carltonsChoice: formData.get('carltonsChoice') === 'on', 
            tags: customTags,
            isSoldOut: isEditing ? wineToEdit.isSoldOut : false, // Bevar status hvis vi redigerer
            updatedAt: timestamp, 
            wineCabinet: data.wineCabinet ? parseInt(data.wineCabinet, 10) : "", 
            shelf: data.shelf ? parseInt(data.shelf, 10) : "",
            purchasePrice: parseFloat(data.purchasePrice) || 0, 
            stockCount: parseFloat(data.stockCount) || 0
        };

        try {
            if (isEditing) {
                await updateDoc(doc(db, 'wines', wineToEdit.id), wineData);
                onSuccess(wineData.name, wineData.producer, 'Redigerede vinkort-info (formular)');
            } else {
                wineData.createdAt = timestamp;
                wineData.isArchived = false;
                await addDoc(collection(db, 'wines'), wineData);
                onSuccess(wineData.name, wineData.producer, 'Oprettet som ny vin i systemet');
            }
            onClose();
        } catch (err) { 
            onError("Fejl ved gemning: " + err.message); 
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-black/60 flex items-start justify-center" onClick={onClose}>
            <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl my-8 mx-auto p-8 border-t-8 border-[#991b1b]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-8 border-b pb-4">
                    <h2 className="text-3xl font-bold font-serif text-[#1b4332] flex items-center gap-3">
                        {isEditing ? 'Rediger Vin' : <><Plus size={28}/> Tilføj Ny Vin</>}
                    </h2>
                    <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"><X size={24} /></button>
                </div>
                
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <input name="producer" list="list-producers" defaultValue={wineToEdit?.producer} placeholder="Producent *" className="p-3 border border-gray-300 rounded-xl focus:border-[#991b1b] outline-none" required />
                    <input name="classification" list="list-classifications" defaultValue={wineToEdit?.classification} placeholder="AOC/DOC *" className="p-3 border border-gray-300 rounded-xl focus:border-[#991b1b] outline-none" required />
                    <input name="year" defaultValue={wineToEdit?.year} placeholder="Årgang *" className="p-3 border border-gray-300 rounded-xl focus:border-[#991b1b] outline-none" required />
                    <select name="type" defaultValue={wineToEdit?.type || ""} className="p-3 border border-gray-300 rounded-xl focus:border-[#991b1b] outline-none bg-white" required>
                        <option value="" disabled>Vælg type *</option>
                        <option value="Mousserende">Mousserende</option>
                        <option value="Hvidvin">Hvidvin</option>
                        <option value="Rødvin">Rødvin</option>
                        <option value="Rosévin">Rosévin</option>
                        <option value="Dessertvin">Dessertvin</option>
                    </select>
                    <input name="country" list="list-countries" defaultValue={wineToEdit?.country} placeholder="Land" className="p-3 border border-gray-300 rounded-xl focus:border-[#991b1b] outline-none" />
                    <input name="region" list="list-regions" defaultValue={wineToEdit?.region} placeholder="Område" className="p-3 border border-gray-300 rounded-xl focus:border-[#991b1b] outline-none" />
                    <input name="name" defaultValue={wineToEdit?.name} placeholder="Navn på vin (valgfri)" className="p-3 border border-gray-300 rounded-xl focus:border-[#991b1b] outline-none" />
                    <input name="sku" defaultValue={wineToEdit?.sku} placeholder="PLU nummer" className="p-3 border border-gray-300 rounded-xl font-mono focus:border-[#991b1b] outline-none" />
                    <input name="note" defaultValue={wineToEdit?.note} placeholder="Særlig Note" className="p-3 border border-gray-300 rounded-xl focus:border-[#991b1b] outline-none" />
                    
                    <div className="space-y-1">
                        <input name="price" type="number" step="any" defaultValue={wineToEdit?.price} placeholder="Salgspris *" className="p-3 border border-gray-300 rounded-xl w-full focus:border-[#991b1b] outline-none" required onChange={(e) => setMathState(s => ({ ...s, price: parseFloat(e.target.value) || 0 }))}/>
                    </div>

                    <div className="space-y-1">
                        <input name="purchasePrice" type="number" step="any" defaultValue={wineToEdit?.purchasePrice} placeholder="Indkøbspris ex. moms" className="p-3 border border-gray-300 rounded-xl w-full focus:border-[#991b1b] outline-none" onChange={(e) => setMathState(s => ({ ...s, purchasePrice: parseFloat(e.target.value) || 0 }))}/>
                        {(mathState.purchasePrice > 0) && (
                            <div className="text-xs bg-blue-50 p-2 rounded-lg border border-blue-100 mt-2 flex justify-between">
                                <span className="text-gray-600">Inkl. moms: {formatCurrency(profitData.priceWithVat)}</span>
                                <span className={profitData.profit > 0 ? "text-green-700 font-bold" : "text-gray-500"}>
                                    Profit: {formatCurrency(profitData.profit)} ({profitData.margin.toFixed(0)}%)
                                </span>
                            </div>
                        )}
                    </div>

                    <input name="stockCount" type="number" step="any" defaultValue={wineToEdit?.stockCount} placeholder="Antal på lager" className="p-3 border border-gray-300 rounded-xl focus:border-[#991b1b] outline-none" />
                    <input name="wineCabinet" type="number" defaultValue={wineToEdit?.wineCabinet} placeholder="Vinskab Nr." className="p-3 border border-gray-300 rounded-xl focus:border-[#991b1b] outline-none" />
                    <input name="shelf" type="number" defaultValue={wineToEdit?.shelf} placeholder="Hylde Nr." className="p-3 border border-gray-300 rounded-xl focus:border-[#991b1b] outline-none" />
                    <input name="glass_price" defaultValue={wineToEdit?.glass_price} placeholder="Glaspris" className="p-3 border border-gray-300 rounded-xl focus:border-[#991b1b] outline-none" />
                    <input name="size" defaultValue={wineToEdit?.size} placeholder="Størrelse" className="p-3 border border-gray-300 rounded-xl focus:border-[#991b1b] outline-none" />
                    
                    <textarea name="description" defaultValue={wineToEdit?.description} placeholder="Beskrivelse" className="p-3 border border-gray-300 rounded-xl md:col-span-3 min-h-[100px] focus:border-[#991b1b] outline-none" />
                    <textarea name="grapes" defaultValue={wineToEdit?.grapes} placeholder="Druer" className="p-3 border border-gray-300 rounded-xl md:col-span-3 focus:border-[#991b1b] outline-none" />
                    <textarea name="pairing" defaultValue={wineToEdit?.pairing} placeholder="Vinifikation / Madmatch" className="p-3 border border-gray-300 rounded-xl md:col-span-3 focus:border-[#991b1b] outline-none" />
                    <textarea name="facts" defaultValue={wineToEdit?.facts} placeholder="Tekniske Fakta" className="p-3 border border-gray-300 rounded-xl md:col-span-3 focus:border-[#991b1b] outline-none" />
                    
                    {/* DYNAMISKE AFKRYDSNINGSBOKSE */}
                    <div className="lg:col-span-3 flex flex-wrap items-center gap-6 mt-2 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <label className="flex items-center gap-2 font-bold text-gray-700 cursor-pointer">
                                <input type="checkbox" name="carltonsChoice" defaultChecked={wineToEdit?.carltonsChoice} className="h-5 w-5 text-red-600 rounded" /> Carltons Udvalgte
                            </label>
                            {filters.filter(f => f.id !== 'carltons_udvalgte').map(f => (
                                <label key={f.id} className="flex items-center gap-2 font-bold text-gray-700 cursor-pointer">
                                    <input type="checkbox" name={`customFilter_${f.id}`} defaultChecked={wineToEdit?.tags?.includes(f.id)} className="h-5 w-5 text-red-600 rounded" /> {f.label}
                                </label>
                            ))}
                    </div>

                    <div className="lg:col-span-3 flex gap-4">
                        <button type="submit" className="bg-[#1b4332] text-white px-8 py-4 rounded-xl hover:bg-[#123023] transition-colors font-bold text-lg shadow-md">
                            {isEditing ? 'Gem Ændringer' : 'Opret Vin'}
                        </button>
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors px-8 py-4 rounded-xl font-bold text-lg">
                            Annuller
                        </button>
                    </div>
                </form>

                <datalist id="list-producers">{suggestions.producers.map(v => <option key={v} value={v}/>)}</datalist>
                <datalist id="list-classifications">{suggestions.classifications.map(v => <option key={v} value={v}/>)}</datalist>
                <datalist id="list-countries">{suggestions.countries.map(v => <option key={v} value={v}/>)}</datalist>
                <datalist id="list-regions">{suggestions.regions.map(v => <option key={v} value={v}/>)}</datalist>
            </div>
        </div>
    );
}