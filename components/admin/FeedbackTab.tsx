// components/admin/FeedbackTab.tsx
'use client';
import React from 'react';

const Trash2 = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;

export default function FeedbackTab({ feedbacks, onDelete }: any) {
    return (
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200 animate-in fade-in">
            <h2 className="text-2xl font-bold mb-6 font-serif border-b pb-4">Kundefeedback</h2>
            {feedbacks.length === 0 ? (
                <p className="text-gray-500 italic py-10 text-center">Ingen beskeder endnu.</p>
            ) : (
                <div className="space-y-4">
                    {feedbacks.map(f => (
                        <div key={f.id} className="border border-gray-200 p-6 rounded-xl bg-gray-50 flex justify-between items-start shadow-sm">
                            <div>
                                <p className="text-gray-800 text-lg whitespace-pre-wrap">{f.text}</p>
                                <p className="text-xs text-gray-400 mt-3 font-bold uppercase tracking-widest">{new Date(f.createdAt).toLocaleString('da-DK')}</p>
                            </div>
                            <button onClick={() => onDelete(f.id)} className="text-red-500 hover:bg-red-100 p-2 rounded-lg transition-colors"><Trash2 size={20}/></button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}