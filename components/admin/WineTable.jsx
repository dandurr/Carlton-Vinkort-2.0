// components/admin/WineTable.jsx
'use client';

import React from 'react';

// Ikoner til tabellen
const Edit2 = ({size=18, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>;
const Archive = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>;
const Check = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 6 9 17l-5-5"/></svg>;
const AlertCircle = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>;
const Plus = ({size=16, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>;

export default function WineTable({ 
    wines, 
    onUpdateSku, 
    onUpdatePrice, 
    onUpdatePurchasePrice, 
    onUpdateStock, 
    onToggleSoldOut, 
    onEdit, 
    onArchive, 
    onAdjustStock 
}) {
    if (wines.length === 0) {
        return <div className="text-center py-10 text-gray-500 italic">Ingen vine at vise i denne kategori.</div>;
    }

    return (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-600">
                    <tr>
                        <th className="px-6 py-4 font-bold uppercase">Producent & Vin</th>
                        {/* NY KOLONNE TIL VINTYPE */}
                        <th className="px-4 py-4 font-bold uppercase">Type</th>
                        <th className="px-4 py-4 font-bold uppercase text-center">PLU</th>
                        <th className="px-4 py-4 font-bold uppercase text-right">Salgspris</th>
                        <th className="px-4 py-4 font-bold uppercase text-right">Købspris</th>
                        <th className="px-4 py-4 font-bold uppercase text-right">Lager</th>
                        <th className="px-6 py-4 font-bold uppercase text-center">Status</th>
                        <th className="px-6 py-4 font-bold uppercase text-center">Valg</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {wines.map(wine => (
                        <tr key={wine.id} className={`hover:bg-gray-50 transition-colors ${wine.isSoldOut ? 'bg-red-50/30' : ''}`}>
                            <td className="px-6 py-4">
                                <div className="font-bold text-gray-900 text-base">{wine.producer}</div>
                                <div className="text-gray-600">{wine.name}</div>
                            </td>
                            
                            {/* NY DATA-CELLE TIL VINTYPE */}
                            <td className="px-4 py-4">
                                <span className="px-3 py-1 bg-gray-100 border border-gray-200 text-gray-600 rounded-md text-xs font-bold uppercase tracking-wider">
                                    {wine.type || 'Ukendt'}
                                </span>
                            </td>

                            <td className="px-4 py-4 text-center">
                                <input 
                                    key={`sku-${wine.id}-${wine.sku}`}
                                    type="text" 
                                    defaultValue={wine.sku} 
                                    onBlur={(e) => onUpdateSku(wine, e.target.value)} 
                                    className="w-20 p-2 border border-gray-200 rounded-lg text-center font-mono focus:border-[#991b1b] outline-none" 
                                />
                            </td>
                            <td className="px-4 py-4 text-right">
                                <input 
                                    key={`price-${wine.id}-${wine.price}`}
                                    type="number" 
                                    step="any" 
                                    defaultValue={wine.price} 
                                    onBlur={(e) => onUpdatePrice(wine, e.target.value)} 
                                    className="w-24 p-2 border border-gray-200 rounded-lg text-right font-bold text-gray-900 focus:border-[#991b1b] outline-none" 
                                />
                            </td>
                            <td className="px-4 py-4 text-right">
                                <input 
                                    key={`pur-${wine.id}-${wine.purchasePrice}`}
                                    type="number" 
                                    step="any" 
                                    defaultValue={wine.purchasePrice} 
                                    onBlur={(e) => onUpdatePurchasePrice(wine, e.target.value)} 
                                    className="w-24 p-2 border border-gray-200 rounded-lg text-right focus:border-[#991b1b] outline-none" 
                                />
                            </td>
                            <td className="px-4 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <input 
                                        key={`stock-${wine.id}-${wine.stockCount}`}
                                        type="number" 
                                        step="any" 
                                        defaultValue={wine.stockCount} 
                                        onBlur={(e) => onUpdateStock(wine, e.target.value)} 
                                        className={`w-16 p-2 border rounded-lg text-right font-bold focus:border-[#991b1b] outline-none ${wine.stockCount <= 3 ? 'text-red-600 border-red-200 bg-red-50' : 'border-gray-200'}`} 
                                    />
                                    <button 
                                        onClick={() => onAdjustStock(wine)} 
                                        className="bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-700 p-2 rounded-lg transition-colors border border-transparent hover:border-green-200" 
                                        title="Tilføj modtagne varer til eksisterende lager"
                                    >
                                        <Plus size={16}/>
                                    </button>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <button 
                                    onClick={() => onToggleSoldOut(wine)} 
                                    className={`p-2 rounded-full transition-colors ${wine.isSoldOut ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}
                                >
                                    {wine.isSoldOut ? <AlertCircle size={20}/> : <Check size={20}/>}
                                </button>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <button onClick={() => onEdit(wine)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg mr-2 transition-colors" title="Rediger">
                                    <Edit2 size={18}/>
                                </button>
                                <button onClick={() => onArchive(wine)} className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors" title="Arkiver">
                                    <Archive size={18}/>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}