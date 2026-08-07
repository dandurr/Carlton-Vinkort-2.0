'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, addDoc, deleteDoc, updateDoc, onSnapshot, setDoc } from "firebase/firestore";
import { app, auth, db } from '@/lib/firebase';
import Link from 'next/link';

// --- ICONS ---
const Search = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const X = ({size=24, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const LogOut = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>;
const Printer = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>;
const Download = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;
const Plus = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
const Edit2 = ({size=18, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>;
const Trash2 = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const Check = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 6 9 17l-5-5"/></svg>;
const AlertCircle = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>;
const Settings = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const HistoryIcon = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>;
const MessageSquare = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const Activity = ({size=20, className=""}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;

const formatCurrency = (amount) => (amount || 0).toLocaleString('da-DK');
const calculateProfit = (salesPrice, purchasePriceExVat) => {
  if (!purchasePriceExVat || !salesPrice) return { priceWithVat: 0, profit: 0, margin: 0 };
  const priceWithVat = purchasePriceExVat * 1.25;
  const profit = salesPrice - priceWithVat;
  const margin = salesPrice > 0 ? (profit / salesPrice) * 100 : 0;
  return { priceWithVat, profit, margin };
};

export default function AdminVinkort() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  
  const [publicWines, setPublicWines] = useState([]);
  const [sensitiveWines, setSensitiveWines] = useState({});
  const [filters, setFilters] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [syncLogs, setSyncLogs] = useState([]);

  // Tabs
  const [adminTab, setAdminTab] = useState('wines'); // wines, history, feedback, sync

  // Login States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // UI States
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilterSettings, setShowFilterSettings] = useState(false); 
  const [newFilterLabel, setNewFilterLabel] = useState('');
  const [newFilterSearch, setNewFilterSearch] = useState('');
  const [editingWine, setEditingWine] = useState(null);
  const [expandedSync, setExpandedSync] = useState(null);
  
  // Filter & Search States
  const [adminSort, setAdminSort] = useState('producer_asc');
  const [adminSearch, setAdminSearch] = useState('');
  const [adminTypeFilter, setAdminTypeFilter] = useState('all');
  const [showSoldOut, setShowSoldOut] = useState(false);

  const [mathState, setMathState] = useState({ price: 0, purchasePrice: 0 });

  // Dialogs
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [alertDialog, setAlertDialog] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user || user.isAnonymous) return;

    const unsubConfig = onSnapshot(doc(db, 'wines', 'config'), (docSnap) => {
        if (docSnap.exists() && docSnap.data().filters) setFilters(docSnap.data().filters);
    });

    const unsubPublic = onSnapshot(collection(db, 'wines'), (snapshot) => {
      const loadedWines = [];
      snapshot.forEach(doc => { if (doc.id !== 'config') loadedWines.push({ id: doc.id, ...doc.data() }); });
      setPublicWines(loadedWines);
    });

    const unsubSensitive = onSnapshot(collection(db, 'wines_sensitive'), (snapshot) => {
        const sensitiveData = {};
        snapshot.docs.forEach(doc => { sensitiveData[doc.id] = doc.data(); });
        setSensitiveWines(sensitiveData);
    });

    const unsubFeedback = onSnapshot(collection(db, 'feedback'), (snapshot) => {
        const fb = [];
        snapshot.forEach(doc => fb.push({ id: doc.id, ...doc.data() }));
        fb.sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setFeedbacks(fb);
    });

    const unsubSync = onSnapshot(collection(db, 'sync_logs'), (snapshot) => {
        const logs = [];
        snapshot.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));
        logs.sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setSyncLogs(logs);
    });

    return () => { unsubConfig(); unsubPublic(); unsubSensitive(); unsubFeedback(); unsubSync(); };
  }, [user]);

  useEffect(() => {
    if (editingWine) {
        setMathState({ price: parseFloat(editingWine.price) || 0, purchasePrice: parseFloat(editingWine.purchasePrice) || 0 });
    } else {
        setMathState({ price: 0, purchasePrice: 0 });
    }
  }, [editingWine, showAddForm]);

  const wines = useMemo(() => {
      return publicWines.map(w => {
          const sensitive = sensitiveWines[w.id] || {};
          return { ...w, purchasePrice: sensitive.purchasePrice ?? w.purchasePrice, stockCount: sensitive.stockCount ?? w.stockCount, wineCabinet: sensitive.wineCabinet ?? w.wineCabinet, shelf: sensitive.shelf ?? w.shelf };
      });
  }, [publicWines, sensitiveWines]);

  const historyWines = useMemo(() => {
      return [...wines]
          .filter(w => w.updatedAt)
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .slice(0, 50);
  }, [wines]);

  const adminSuggestions = useMemo(() => {
    const s = { producers: new Set(), classifications: new Set(), regions: new Set(), countries: new Set() };
    wines.forEach(w => {
      if(w.producer) s.producers.add(w.producer);
      if(w.classification) s.classifications.add(w.classification);
      if(w.region) s.regions.add(w.region);
      if(w.country) s.countries.add(w.country);
    });
    return { producers: Array.from(s.producers).sort(), classifications: Array.from(s.classifications).sort(), regions: Array.from(s.regions).sort(), countries: Array.from(s.countries).sort() };
  }, [wines]);

  const adminWines = useMemo(() => {
      let res = [...wines];
      
      if (showSoldOut) {
          res = res.filter(w => w.isSoldOut);
      }

      if (adminSearch) {
          const lower = adminSearch.toLowerCase();
          const terms = lower.split(/\s+/).filter(Boolean);
          res = res.filter(w => terms.every(t => [w.producer, w.name, w.classification, w.description, w.grapes, w.type, w.sku].join(' ').toLowerCase().includes(t)));
      }
      if (adminTypeFilter !== 'all') res = res.filter(w => w.type === adminTypeFilter);
      
      res.sort((a, b) => {
          let comparison = 0;
          if (adminSort === 'producer_asc') comparison = (a.producer || '').localeCompare(b.producer || '');
          else if (adminSort === 'name_asc') comparison = (a.name || a.classification || '').localeCompare(b.name || a.classification || '');
          else if (adminSort === 'stock_asc') comparison = (a.stockCount || 0) - (b.stockCount || 0);
          else if (adminSort === 'stock_desc') comparison = (b.stockCount || 0) - (a.stockCount || 0);
          else if (adminSort === 'cabinet_asc') {
             const cabA = a.wineCabinet || 9999;
             const cabB = b.wineCabinet || 9999;
             if (cabA !== cabB) comparison = cabA - cabB;
             else comparison = (a.shelf || 9999) - (b.shelf || 9999);
          }
          return comparison || a.id.localeCompare(b.id);
      });
      return res;
  }, [wines, adminSearch, adminTypeFilter, adminSort, showSoldOut]);

  const handleLogin = async (e) => { e.preventDefault(); try { await signInWithEmailAndPassword(auth, loginEmail, loginPassword); } catch (err) { setLoginError('Forkert email eller adgangskode.'); }};
  const handleLogout = async () => { await signOut(auth); };

  const saveFilter = async () => {
      if(!newFilterLabel || !newFilterSearch) return setAlertDialog({ message: "Udfyld venligst både knaptekst og søgeord."});
      const id = newFilterLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (filters.some(f => f.id === id)) return setAlertDialog({ message: "Et filter med dette navn findes allerede." });
      
      const newFilter = { id, label: newFilterLabel, value: newFilterSearch };
      try {
          await setDoc(doc(db, 'wines', 'config'), { filters: [...filters, newFilter] });
          setNewFilterLabel(''); setNewFilterSearch(''); setAlertDialog({ message: "Filteret er nu oprettet!"});
      } catch (error) { setAlertDialog({ message: "Kunne ikke gemme filter." }); }
  };

  const deleteFilter = (filterIdToDelete) => {
      setConfirmDialog({
          message: "Er du sikker på, at du vil slette dette filter?",
          onConfirm: async () => {
              try { await setDoc(doc(db, 'wines', 'config'), { filters: filters.filter(f => f.id !== filterIdToDelete) }); } 
              catch (error) { setAlertDialog({ message: "Kunne ikke slette filter." }); }
          }
      });
  };

  const deleteFeedback = (id) => {
      setConfirmDialog({
          message: "Er du sikker på, at du vil slette denne besked?",
          onConfirm: async () => { await deleteDoc(doc(db, 'feedback', id)); }
      });
  };

  const handleWineSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const timestamp = new Date().toISOString();
    
    const parsedWineCabinet = data.wineCabinet ? parseInt(data.wineCabinet, 10) : "";
    const parsedShelf = data.shelf ? parseInt(data.shelf, 10) : "";

    const publicData = {
        producer: data.producer || "", name: data.name || "", year: data.year || "", type: data.type || "",
        country: data.country || "", region: data.region || "", classification: data.classification || "",
        price: parseFloat(data.price) || 0, glass_price: data.glass_price || "", size: data.size || "",
        note: data.note || "", sku: data.sku || "", 
        notes: editingWine?.notes || "", origin: editingWine?.origin || "", description: data.description || "",
        grapes: data.grapes || "", pairing: data.pairing || "", facts: data.facts || "",
        carltonsChoice: formData.get('carltonsChoice') === 'on', seasonsChoice: formData.get('seasonsChoice') === 'on',
        isSoldOut: formData.get('isSoldOut') === 'on', updatedAt: timestamp, wineCabinet: parsedWineCabinet, shelf: parsedShelf,
    };
    
    const sensitiveData = { purchasePrice: parseFloat(data.purchasePrice) || 0, stockCount: parseFloat(data.stockCount) || 0, wineCabinet: parsedWineCabinet, shelf: parsedShelf };

    try {
        if (editingWine) {
            await updateDoc(doc(db, 'wines', editingWine.id), publicData);
            await setDoc(doc(db, 'wines_sensitive', editingWine.id), sensitiveData, { merge: true });
            setEditingWine(null);
        } else {
            publicData.createdAt = timestamp;
            const docRef = await addDoc(collection(db, 'wines'), publicData);
            await setDoc(doc(db, 'wines_sensitive', docRef.id), sensitiveData);
            e.target.reset(); setMathState({ price: 0, purchasePrice: 0 }); setShowAddForm(false);
        }
    } catch (err) { setAlertDialog({ message: "Fejl ved gemning: " + err.message }); }
  };

  const deleteWine = (id) => { 
      setConfirmDialog({
          message: "Er du sikker på, at du vil slette denne vin? Dette kan ikke fortrydes.",
          onConfirm: async () => { await deleteDoc(doc(db, 'wines', id)); await deleteDoc(doc(db, 'wines_sensitive', id)); }
      });
  };
  
  const toggleSoldOut = async (wine) => { await updateDoc(doc(db, 'wines', wine.id), { isSoldOut: !wine.isSoldOut, updatedAt: new Date().toISOString() }); };
  const updateStock = async (id, val) => { await setDoc(doc(db, 'wines_sensitive', id), { stockCount: parseFloat(val) || 0 }, { merge: true }); await updateDoc(doc(db, 'wines', id), { updatedAt: new Date().toISOString() }); };
  const updatePurchasePrice = async (id, val) => { await setDoc(doc(db, 'wines_sensitive', id), { purchasePrice: parseFloat(val) || 0 }, { merge: true }); await updateDoc(doc(db, 'wines', id), { updatedAt: new Date().toISOString() }); };

  // --- NYT: Direkte opdatering af Salgspris og PLU ---
  const updatePrice = async (id, val) => { await updateDoc(doc(db, 'wines', id), { price: parseFloat(val) || 0, updatedAt: new Date().toISOString() }); };
  const updateSku = async (id, val) => { await updateDoc(doc(db, 'wines', id), { sku: val.trim(), updatedAt: new Date().toISOString() }); };

  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,PLU/SKU;Producent;Navn;År;Salgspris;Indkøbspris;Antal\n";
    adminWines.forEach(w => { csvContent += `"${w.sku || ''}";"${w.producer}";"${w.name}";"${w.year}";${w.price};${w.purchasePrice};${w.stockCount}\n`; });
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", "lager_eksport.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const printMenu = () => { 
    const printWindow = window.open('', '_blank');
    const activeWines = wines.filter(w => !w.isSoldOut);
    const createItem = (w) => `
        <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #ccc;page-break-inside:avoid;">
            <div style="padding-right:1rem;"><p style="font-weight:bold;margin:0;">${w.producer}</p><p style="margin:2px 0;">${w.name || ''}</p><p style="font-size:0.8em;color:#666;margin:0;">${w.year}</p></div>
            <div style="text-align:right;"><p style="font-weight:600;margin:0;">${w.price},-</p></div>
        </div>`;
    
    let html = `<html><head><title>Vinkort</title><style>body{font-family:sans-serif;}</style></head><body><h1 style="text-align:center;">Vinkort - Carlton</h1>`;
    activeWines.forEach(w => html += createItem(w));
    html += `</body></html>`;
    printWindow.document.write(html); printWindow.document.close(); setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const profitData = useMemo(() => calculateProfit(mathState.price, mathState.purchasePrice), [mathState]);

  if (authChecking) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-8 w-8 border-4 border-[#991b1b] border-t-transparent rounded-full"></div></div>;

  if (!user || user.isAnonymous) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] font-sans">
            <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100">
                <h2 className="text-3xl font-bold text-center mb-8 font-serif text-[#1b4332]">Kælder Login</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#991b1b] outline-none" type="email" placeholder="Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                    <input className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#991b1b] outline-none" type="password" placeholder="Kode" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                    <button className="w-full bg-[#991b1b] text-white py-4 rounded-xl font-bold text-lg hover:bg-red-900 transition-colors mt-4 shadow-md">Log ind</button>
                    {loginError && <p className="text-red-500 text-sm mt-4 text-center font-bold bg-red-50 p-2 rounded-lg">{loginError}</p>}
                </form>
                <div className="mt-8 text-center border-t pt-6">
                    <Link href="/" className="text-sm text-gray-500 hover:text-gray-800 font-medium flex items-center justify-center gap-2">← Tilbage til vinkortet</Link>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-20">
      <div className="container mx-auto p-4 lg:p-8 max-w-7xl">
          
          <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <div>
                <h1 className="text-3xl font-bold font-serif text-[#1b4332]">Vinkælder Admin</h1>
                <p className="text-sm text-gray-500 mt-1">Logget ind som: {user.email}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowFilterSettings(!showFilterSettings)} className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl hover:bg-gray-200 flex items-center gap-2 font-medium transition-colors">
                    <Settings size={18}/> Filtre
                </button>
                <Link href="/" className="bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-xl hover:bg-gray-50 font-medium transition-colors">Vis Vinkort</Link>
                <button onClick={handleLogout} className="bg-gray-800 text-white px-5 py-2.5 rounded-xl hover:bg-black flex items-center gap-2 font-medium transition-colors"><LogOut size={18}/> Log ud</button>
              </div>
          </header>

          <div className="flex gap-4 border-b border-gray-300 mb-8 overflow-x-auto">
              <button onClick={() => setAdminTab('wines')} className={`px-4 py-3 font-bold whitespace-nowrap transition-colors border-b-2 ${adminTab === 'wines' ? 'text-[#991b1b] border-[#991b1b]' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>
                  Varelager
              </button>
              <button onClick={() => setAdminTab('history')} className={`px-4 py-3 font-bold whitespace-nowrap flex items-center gap-2 transition-colors border-b-2 ${adminTab === 'history' ? 'text-[#991b1b] border-[#991b1b]' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>
                  <HistoryIcon size={18}/> Historik
              </button>
              <button onClick={() => setAdminTab('sync')} className={`px-4 py-3 font-bold whitespace-nowrap flex items-center gap-2 transition-colors border-b-2 ${adminTab === 'sync' ? 'text-[#991b1b] border-[#991b1b]' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>
                  <Activity size={18}/> Synkronisering
              </button>
              <button onClick={() => setAdminTab('feedback')} className={`px-4 py-3 font-bold whitespace-nowrap flex items-center gap-2 transition-colors border-b-2 ${adminTab === 'feedback' ? 'text-[#991b1b] border-[#991b1b]' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>
                  <MessageSquare size={18}/> Feedback ({feedbacks.length})
              </button>
          </div>

          {/* TAB: HISTORY */}
          {adminTab === 'history' && (
              <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200 animate-in fade-in">
                  <div className="flex items-center gap-3 mb-6 border-b pb-4">
                      <HistoryIcon className="text-[#991b1b]" size={28}/>
                      <h2 className="text-2xl font-bold font-serif text-gray-900">Seneste Ændringer i Lager</h2>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                              <tr>
                                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tidspunkt</th>
                                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vin</th>
                                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Handling</th>
                              </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                              {historyWines.map(wine => {
                                  const dateObj = new Date(wine.updatedAt);
                                  const displayTime = dateObj.toLocaleString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                                  return (
                                      <tr key={wine.id} className="hover:bg-gray-50 transition-colors">
                                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{displayTime}</td>
                                          <td className="px-6 py-4">
                                              <div className="font-bold text-gray-900">{wine.producer}</div>
                                              <div className="text-sm text-gray-600">{wine.name}</div>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                              <button onClick={() => { setAdminTab('wines'); setEditingWine(wine); }} className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-100">
                                                  <Edit2 size={14}/> Rediger
                                              </button>
                                          </td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {/* TAB: SYNKRONISERING LOGS */}
{adminTab === 'sync' && (
    <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200 animate-in fade-in">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <div className="flex items-center gap-3">
                <Activity className="text-[#991b1b]" size={28}/>
                <h2 className="text-2xl font-bold font-serif text-gray-900">NemPOS Integration</h2>
            </div>
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">CRON Job Logs</span>
        </div>
        
        {syncLogs.length === 0 ? (
            <p className="text-gray-500 italic py-10 text-center">Ingen kørsler registreret endnu.</p>
        ) : (
            <div className="space-y-4">
                {syncLogs.map(log => {
                    const isSuccess = log.status === 'success';
                    const isExpanded = expandedSync === log.id;
                    const hasDetails = log.processedCount > 0 || log.unmatchedCount > 0;
                    
                    return (
                        <div key={log.id} className={`border p-5 rounded-xl transition-all ${!isSuccess ? 'border-red-200 bg-red-50' : log.unmatchedCount > 0 ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200 bg-white'}`}>
                            <div className="flex justify-between items-center cursor-pointer" onClick={() => hasDetails && setExpandedSync(isExpanded ? null : log.id)}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full ${!isSuccess ? 'bg-red-500' : log.unmatchedCount > 0 ? 'bg-amber-500' : 'bg-green-500'}`}></div>
                                    <div>
                                        <div className="font-bold text-gray-900">{new Date(log.createdAt).toLocaleString('da-DK', { dateStyle: 'full', timeStyle: 'short' })}</div>
                                        <div className="text-sm text-gray-500 mt-0.5">
                                            {!isSuccess ? (
                                                <span className="text-red-600 font-medium">Fejl: {log.error}</span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    <span>{log.processedCount} {log.processedCount === 1 ? 'vare' : 'varer'} opdateret</span>
                                                    {log.unmatchedCount > 0 && (
                                                        <span className="text-amber-700 font-medium bg-amber-100 px-2 py-0.5 rounded text-xs">
                                                            {log.unmatchedCount} ukendt PLU fundet
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {isSuccess && hasDetails && (
                                    <button className="text-sm font-medium text-[#991b1b] bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors border border-gray-200">
                                        {isExpanded ? 'Skjul detaljer' : 'Vis detaljer'}
                                    </button>
                                )}
                            </div>
                            
                            {isExpanded && isSuccess && hasDetails && (
                                <div className="mt-5 pt-5 border-t border-gray-100 space-y-6">
                                    
                                    {/* SUCCES TABEL - Varer opdateret */}
                                    {log.details && log.details.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                Opdateret Lager
                                            </h4>
                                            <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-gray-100 text-gray-500 font-bold uppercase tracking-wider text-xs">
                                                        <tr>
                                                            <th className="px-4 py-3">Varenavn (NemPOS)</th>
                                                            <th className="px-4 py-3">PLU</th>
                                                            <th className="px-4 py-3">Type</th>
                                                            <th className="px-4 py-3 text-right">Fratrukket</th>
                                                            <th className="px-4 py-3 text-right">Nyt Lager</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 bg-white">
                                                        {log.details.map((detail, idx) => (
                                                            <tr key={idx} className="hover:bg-gray-50">
                                                                <td className="px-4 py-3 font-medium text-gray-800">{detail.name}</td>
                                                                <td className="px-4 py-3 font-mono text-gray-500">{detail.plu || detail.sku}</td>
                                                                <td className="px-4 py-3">
                                                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium border border-gray-200">
                                                                        {detail.type}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-bold text-red-600">-{detail.deducted}</td>
                                                                <td className="px-4 py-3 text-right font-bold text-gray-900">{detail.newStock}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* SLADRHANK TABEL - Ukendte PLU'er */}
                                    {log.unmatchedDetails && log.unmatchedDetails.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                                Sladrhank: Solgt på kassen, men mangler i Firebase
                                            </h4>
                                            <div className="bg-amber-50 rounded-lg overflow-hidden border border-amber-200">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-amber-100 text-amber-700 font-bold uppercase tracking-wider text-xs">
                                                        <tr>
                                                            <th className="px-4 py-3">Varenavn (NemPOS)</th>
                                                            <th className="px-4 py-3">PLU (Mangler)</th>
                                                            <th className="px-4 py-3 text-right">Salgsdato</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-amber-100 bg-white">
                                                        {log.unmatchedDetails.map((detail, idx) => (
                                                            <tr key={idx} className="hover:bg-amber-50/50">
                                                                <td className="px-4 py-3 font-medium text-gray-800">{detail.name}</td>
                                                                <td className="px-4 py-3 font-mono font-bold text-amber-600">{detail.plu}</td>
                                                                <td className="px-4 py-3 text-right text-gray-500">
                                                                    {new Date(detail.orderDate).toLocaleString('da-DK', { dateStyle: 'short', timeStyle: 'short' })}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                    
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}
    </div>
)}

          {/* TAB: FEEDBACK */}
          {adminTab === 'feedback' && (
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
                                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-3">{new Date(f.createdAt).toLocaleString('da-DK')}</p>
                                  </div>
                                  <button onClick={() => deleteFeedback(f.id)} className="text-red-500 hover:bg-red-100 p-2 rounded-lg ml-4 transition-colors"><Trash2 size={20}/></button>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          )}

          {/* TAB: WINES */}
          {adminTab === 'wines' && (
          <div className="animate-in fade-in">
              {showFilterSettings && (
                  <div className="bg-white rounded-2xl shadow-sm mb-8 p-8 border-t-4 border-[#991b1b]">
                      <div className="flex justify-between items-start mb-8 border-b pb-4">
                          <div>
                              <h2 className="text-2xl font-bold font-serif text-gray-900">Administrer Genveje (Filtre)</h2>
                              <p className="text-gray-600 mt-1">Styr knapperne i toppen af kundernes vinkort.</p>
                          </div>
                          <button onClick={() => setShowFilterSettings(false)} className="text-gray-400 hover:text-gray-800 bg-gray-50 p-2 rounded-full"><X size={24}/></button>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                              <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2"><Plus size={20} className="text-[#991b1b]"/> Opret ny knap</h3>
                              <div className="space-y-4">
                                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Knaptekst</label><input className="w-full p-3 border border-gray-300 rounded-lg focus:border-[#991b1b] outline-none" placeholder="F.eks. Naturvin" value={newFilterLabel} onChange={e => setNewFilterLabel(e.target.value)} /></div>
                                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Søgeord</label><input className="w-full p-3 border border-gray-300 rounded-lg focus:border-[#991b1b] outline-none" placeholder="F.eks. natur" value={newFilterSearch} onChange={e => setNewFilterSearch(e.target.value)} /></div>
                                  <button onClick={saveFilter} className="w-full bg-[#991b1b] text-white p-3 rounded-lg hover:bg-red-900 font-bold mt-2">Gem Knap</button>
                              </div>
                          </div>

                          <div>
                              <h3 className="font-bold text-lg mb-4 text-gray-800">Aktive Knapper</h3>
                              <div className="space-y-3">
                                  {filters.map((f, idx) => (
                                      <div key={idx} className="flex justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                          <div>
                                              <div className="font-bold text-gray-800">{f.label}</div>
                                              <div className="text-gray-500 text-xs mt-1">Søger: <span className="font-mono bg-gray-100 px-1 rounded">{f.value || f.id}</span></div>
                                          </div>
                                          <button onClick={() => deleteFilter(f.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={20}/></button>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {!showFilterSettings && (
              <div className="bg-white rounded-2xl shadow-sm mb-8 overflow-hidden border border-gray-200">
                  <div className="p-6 flex justify-between items-center cursor-pointer hover:bg-gray-50" onClick={() => { setShowAddForm(!showAddForm); setEditingWine(null); }}>
                      <h2 className="text-2xl font-bold font-serif text-[#1b4332] flex items-center gap-3"><Plus size={28} className={showAddForm ? 'rotate-45 transition-transform' : 'transition-transform'}/> Tilføj Ny Vin</h2>
                  </div>
                  
                  {showAddForm && !editingWine && (
                      <div className="p-8 bg-gray-50 border-t border-gray-200">
                          <form onSubmit={handleWineSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <input name="producer" list="list-producers" placeholder="Producent *" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" required />
                            <input name="classification" list="list-classifications" placeholder="AOC/DOC *" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" required />
                            <input name="year" placeholder="Årgang *" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" required />
                            <select name="type" defaultValue="" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none bg-white" required>
                                <option value="" disabled>Vælg type *</option>
                                <option value="Mousserende">Mousserende</option>
                                <option value="Hvidvin">Hvidvin</option>
                                <option value="Rødvin">Rødvin</option>
                                <option value="Rosévin">Rosévin</option>
                                <option value="Dessertvin">Dessertvin</option>
                            </select>
                            <input name="country" list="list-countries" placeholder="Land" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" />
                            <input name="region" list="list-regions" placeholder="Område" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" />
                            <input name="name" placeholder="Navn på vin (valgfri)" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" />
                            
                            <input name="sku" placeholder="PLU nummer" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none font-mono" />
                            <input name="note" placeholder="Særlig Note (f.eks. Egen Import)" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" />
                            
                            <div className="space-y-1">
                                <input name="price" type="number" step="any" placeholder="Salgspris (DKK) *" className="p-3 border rounded-xl w-full focus:border-[#991b1b] outline-none" required onChange={(e) => setMathState(s => ({ ...s, price: parseFloat(e.target.value) || 0 }))}/>
                            </div>

                            <div className="space-y-1">
                                <input name="purchasePrice" type="number" step="any" placeholder="Indkøbspris ex. moms" className="p-3 border rounded-xl w-full focus:border-[#991b1b] outline-none" onChange={(e) => setMathState(s => ({ ...s, purchasePrice: parseFloat(e.target.value) || 0 }))}/>
                                {(mathState.purchasePrice > 0) && (
                                    <div className="text-xs bg-blue-50 p-2 rounded-lg border border-blue-100 mt-2">
                                        <div className="text-gray-600">M/moms: {formatCurrency(profitData.priceWithVat)}</div>
                                        <div className={profitData.profit > 0 ? "text-green-700 font-bold" : "text-gray-500"}>
                                            Profit: {formatCurrency(profitData.profit)} ({profitData.margin.toFixed(0)}%)
                                        </div>
                                    </div>
                                )}
                            </div>

                            <input name="stockCount" type="number" step="any" placeholder="Antal på lager" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" />
                            <input name="wineCabinet" type="number" placeholder="Vinskab Nr." className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" />
                            <input name="shelf" type="number" placeholder="Hylde Nr." className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" />
                            
                            <input name="glass_price" placeholder="Glaspris (valgfri)" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" />
                            <input name="size" placeholder="Størrelse (f.eks. Magnum)" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" />
                            
                            <textarea name="description" placeholder="Beskrivelse (vises til kunden)" className="p-3 border rounded-xl md:col-span-3 focus:border-[#991b1b] outline-none min-h-[100px]" />
                            <textarea name="grapes" placeholder="Druer" className="p-3 border rounded-xl md:col-span-3 focus:border-[#991b1b] outline-none" />
                            <textarea name="pairing" placeholder="Vinifikation / Madmatch" className="p-3 border rounded-xl md:col-span-3 focus:border-[#991b1b] outline-none" />
                            <textarea name="facts" placeholder="Tekniske Fakta" className="p-3 border rounded-xl md:col-span-3 focus:border-[#991b1b] outline-none" />
                            
                            <div className="lg:col-span-3 flex flex-wrap items-center gap-6 mt-2 mb-2 bg-white p-4 rounded-xl border border-gray-200">
                                 <label className="flex items-center gap-2 font-bold text-gray-700 cursor-pointer"><input type="checkbox" name="carltonsChoice" className="h-5 w-5 text-red-600 rounded" /> Carltons Udvalgte</label>
                                 <label className="flex items-center gap-2 font-bold text-gray-700 cursor-pointer"><input type="checkbox" name="seasonsChoice" className="h-5 w-5 text-red-600 rounded" /> Sæsonens Udvalgte</label>
                            </div>

                            <div className="lg:col-span-3 flex gap-4 mt-2">
                                <button type="submit" className="bg-[#991b1b] text-white px-8 py-4 rounded-xl hover:bg-red-900 font-bold text-lg flex items-center gap-2 shadow-md">
                                    <Plus size={24}/> Opret Vin
                                </button>
                            </div>
                        </form>
                      </div>
                  )}
              </div>
              )}

              {!showFilterSettings && (
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
                      <div>
                          <h2 className="text-2xl font-bold font-serif text-[#1b4332]">Kælderens Indhold</h2>
                          <p className="text-gray-500 mt-1">{adminWines.filter(w=>!w.isSoldOut).length} aktive varer ({wines.length} total)</p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                          <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Søg..." value={adminSearch} onChange={e => setAdminSearch(e.target.value)} className="pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl w-full focus:border-[#991b1b] outline-none" />
                          </div>
                          <select value={adminSort} onChange={e => setAdminSort(e.target.value)} className="p-3 bg-gray-50 border border-gray-200 rounded-xl w-full sm:w-auto focus:border-[#991b1b] outline-none">
                              <option value="producer_asc">Sorter: Producent (A-Å)</option>
                              <option value="name_asc">Sorter: Navn (A-Å)</option>
                              <option value="stock_asc">Sorter: Lager (Lavest)</option>
                              <option value="stock_desc">Sorter: Lager (Højest)</option>
                              <option value="cabinet_asc">Sorter: Lokation</option>
                          </select>
                          
                          <button
                            onClick={() => setShowSoldOut(!showSoldOut)}
                            className={`px-4 py-3 text-sm font-bold rounded-xl transition-colors border whitespace-nowrap ${
                              showSoldOut
                                ? 'bg-red-100 text-red-700 border-red-200'
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {showSoldOut ? 'Viser Udsolgte' : 'Filtrér Udsolgte'}
                          </button>

                          <div className="flex gap-2">
                              <button onClick={printMenu} className="bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 font-bold flex justify-center items-center gap-2"><Printer size={18}/> Print</button>
                              <button onClick={exportCSV} className="bg-[#1b4332] text-white px-4 py-3 rounded-xl hover:bg-[#123023] font-bold flex justify-center items-center gap-2"><Download size={18}/> CSV</button>
                          </div>
                      </div>
                  </div>

                  <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                      {['all', 'Mousserende', 'Hvidvin', 'Rødvin', 'Rosévin', 'Dessertvin'].map(type => (
                          <button 
                            key={type} onClick={() => setAdminTypeFilter(type)} 
                            className={`px-5 py-2.5 rounded-full text-sm font-bold tracking-wide transition-colors whitespace-nowrap ${adminTypeFilter === type ? 'bg-[#991b1b] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                          >
                            {type === 'all' ? 'Alle Typer' : type}
                          </button>
                      ))}
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider">Producent & Vin</th>
                                <th className="px-4 py-4 font-bold uppercase tracking-wider text-center">PLU</th>
                                <th className="px-4 py-4 font-bold uppercase tracking-wider text-right">Salgspris</th>
                                <th className="px-4 py-4 font-bold uppercase tracking-wider text-right">Købspris</th>
                                <th className="px-4 py-4 font-bold uppercase tracking-wider text-right">Lager</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider">Lokation</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-center">Status</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-center">Valg</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {adminWines.map(wine => (
                                <tr key={wine.id} className={`hover:bg-gray-50 transition-colors ${wine.isSoldOut ? 'bg-red-50/30' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900 text-base">{wine.producer}</div>
                                        <div className="text-gray-600">{wine.name} {wine.year ? `- ${wine.year}` : ''}</div>
                                        <div className="text-xs text-gray-400 mt-1">{wine.classification}</div>
                                    </td>
                                    {/* DIREKTE TASTING AF PLU */}
                                    <td className="px-4 py-4 text-center">
                                        <input 
                                          type="text" 
                                          defaultValue={wine.sku} 
                                          onBlur={(e) => updateSku(wine.id, e.target.value)} 
                                          placeholder="PLU"
                                          className="w-20 p-2 border rounded-lg text-center font-mono focus:border-[#991b1b] outline-none" 
                                        />
                                    </td>
                                    {/* DIREKTE TASTING AF SALGSPRIS */}
                                    <td className="px-4 py-4 text-right">
                                        <input 
                                          type="number" 
                                          step="any" 
                                          defaultValue={wine.price} 
                                          onBlur={(e) => updatePrice(wine.id, e.target.value)} 
                                          className="w-24 p-2 border rounded-lg text-right font-bold text-gray-900 focus:border-[#991b1b] outline-none" 
                                        />
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <input type="number" step="any" defaultValue={wine.purchasePrice} onBlur={(e) => updatePurchasePrice(wine.id, e.target.value)} className="w-24 p-2 border rounded-lg text-right focus:border-[#991b1b] outline-none" />
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <input type="number" step="any" defaultValue={wine.stockCount} onBlur={(e) => updateStock(wine.id, e.target.value)} className={`w-20 p-2 border rounded-lg text-right font-bold focus:border-[#991b1b] outline-none ${wine.stockCount <= 3 ? 'text-red-600 border-red-200 bg-red-50' : ''}`} />
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 font-mono">
                                        {(wine.wineCabinet || wine.shelf) ? `${wine.wineCabinet || '-'} / ${wine.shelf || '-'}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => toggleSoldOut(wine)} className={`p-2 rounded-full transition-colors ${wine.isSoldOut ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`} title={wine.isSoldOut ? "Marker på lager" : "Marker som udsolgt"}>
                                            {wine.isSoldOut ? <AlertCircle size={20}/> : <Check size={20}/>}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            <button onClick={() => {setEditingWine(wine); setShowAddForm(false);}} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"><Edit2 size={18}/></button>
                                            <button onClick={() => deleteWine(wine.id)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
              </div>
              )}
          </div>
          )}

          {/* EDIT MODAL */}
          {editingWine && (
              <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-black/60 backdrop-blur-sm flex items-start justify-center" onClick={() => setEditingWine(null)}>
                  <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl my-8 mx-auto p-8 border-t-8 border-[#991b1b]" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-between items-center mb-8 border-b pb-4">
                          <h2 className="text-3xl font-bold font-serif text-[#1b4332]">Rediger Vin</h2>
                          <button onClick={() => setEditingWine(null)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"><X size={24} /></button>
                      </div>
                      
                      <form onSubmit={handleWineSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <input name="producer" list="list-producers" defaultValue={editingWine.producer} placeholder="Producent *" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" required />
                        <input name="classification" list="list-classifications" defaultValue={editingWine.classification} placeholder="AOC/DOC *" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" required />
                        <input name="year" defaultValue={editingWine.year} placeholder="Årgang *" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" required />
                        <select name="type" defaultValue={editingWine.type} className="p-3 border rounded-xl focus:border-[#991b1b] outline-none bg-white" required>
                            <option value="Mousserende">Mousserende</option>
                            <option value="Hvidvin">Hvidvin</option>
                            <option value="Rødvin">Rødvin</option>
                            <option value="Rosévin">Rosévin</option>
                            <option value="Dessertvin">Dessertvin</option>
                        </select>
                        <input name="country" list="list-countries" defaultValue={editingWine.country} placeholder="Land" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" />
                        <input name="region" list="list-regions" defaultValue={editingWine.region} placeholder="Område" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" />
                        <input name="name" defaultValue={editingWine.name} placeholder="Navn på vin" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" />
                        
                        <input name="sku" defaultValue={editingWine.sku} placeholder="PLU nummer" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none font-mono" />
                        <input name="note" defaultValue={editingWine.note} placeholder="Særlig Note (f.eks. Egen Import)" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" />
                        
                        <div className="space-y-1">
                            <input name="price" type="number" step="any" defaultValue={editingWine.price} placeholder="Salgspris (DKK) *" className="p-3 border rounded-xl w-full focus:border-[#991b1b] outline-none" required onChange={(e) => setMathState(s => ({ ...s, price: parseFloat(e.target.value) || 0 }))}/>
                        </div>

                        <div className="space-y-1">
                            <input name="purchasePrice" type="number" step="any" defaultValue={editingWine.purchasePrice} placeholder="Indkøbspris ex. moms" className="p-3 border rounded-xl w-full focus:border-[#991b1b] outline-none" onChange={(e) => setMathState(s => ({ ...s, purchasePrice: parseFloat(e.target.value) || 0 }))}/>
                            {(mathState.purchasePrice > 0) && (
                                <div className="text-xs bg-blue-50 p-2 rounded-lg border border-blue-100 mt-2 flex justify-between">
                                    <span className="text-gray-600">Inkl. moms: {formatCurrency(profitData.priceWithVat)}</span>
                                    <span className={profitData.profit > 0 ? "text-green-700 font-bold" : "text-gray-500"}>
                                        Profit: {formatCurrency(profitData.profit)} ({profitData.margin.toFixed(0)}%)
                                    </span>
                                </div>
                            )}
                        </div>

                        <input name="stockCount" type="number" step="any" defaultValue={editingWine.stockCount} placeholder="Antal på lager" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" />
                        <input name="wineCabinet" type="number" defaultValue={editingWine.wineCabinet} placeholder="Vinskab Nr." className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" />
                        <input name="shelf" type="number" defaultValue={editingWine.shelf} placeholder="Hylde Nr." className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" />
                        <input name="glass_price" defaultValue={editingWine.glass_price} placeholder="Glaspris" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" />
                        <input name="size" defaultValue={editingWine.size} placeholder="Størrelse" className="p-3 border rounded-xl focus:border-[#991b1b] outline-none" />
                        
                        <textarea name="description" defaultValue={editingWine.description} placeholder="Beskrivelse" className="p-3 border rounded-xl md:col-span-3 focus:border-[#991b1b] outline-none min-h-[100px]" />
                        <textarea name="grapes" defaultValue={editingWine.grapes} placeholder="Druer" className="p-3 border rounded-xl md:col-span-3 focus:border-[#991b1b] outline-none" />
                        <textarea name="pairing" defaultValue={editingWine.pairing} placeholder="Vinifikation / Madmatch" className="p-3 border rounded-xl md:col-span-3 focus:border-[#991b1b] outline-none" />
                        <textarea name="facts" defaultValue={editingWine.facts} placeholder="Tekniske Fakta" className="p-3 border rounded-xl md:col-span-3 focus:border-[#991b1b] outline-none" />
                        
                        <div className="lg:col-span-3 flex flex-wrap items-center gap-6 mt-2 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                             <label className="flex items-center gap-2 font-bold text-gray-700 cursor-pointer"><input type="checkbox" name="carltonsChoice" defaultChecked={editingWine.carltonsChoice} className="h-5 w-5 text-red-600 rounded" /> Carltons Udvalgte</label>
                             <label className="flex items-center gap-2 font-bold text-gray-700 cursor-pointer"><input type="checkbox" name="seasonsChoice" defaultChecked={editingWine.seasonsChoice} className="h-5 w-5 text-red-600 rounded" /> Sæsonens Udvalgte</label>
                        </div>

                        <div className="lg:col-span-3 flex gap-4">
                            <button type="submit" className="bg-[#1b4332] text-white px-8 py-4 rounded-xl hover:bg-[#123023] font-bold text-lg shadow-md transition-colors">
                                Gem Ændringer
                            </button>
                            <button type="button" onClick={() => setEditingWine(null)} className="bg-gray-200 text-gray-800 px-8 py-4 rounded-xl hover:bg-gray-300 font-bold text-lg transition-colors">
                                Annuller
                            </button>
                        </div>
                      </form>
                  </div>
              </div>
          )}

          <datalist id="list-producers">{adminSuggestions.producers.map(v => <option key={v} value={v}/>)}</datalist>
          <datalist id="list-classifications">{adminSuggestions.classifications.map(v => <option key={v} value={v}/>)}</datalist>
          <datalist id="list-countries">{adminSuggestions.countries.map(v => <option key={v} value={v}/>)}</datalist>
          <datalist id="list-regions">{adminSuggestions.regions.map(v => <option key={v} value={v}/>)}</datalist>
          
          {confirmDialog && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                  <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
                      <h3 className="text-xl font-bold mb-2 font-serif text-gray-900">Bekræft handling</h3>
                      <p className="text-gray-600 mb-8">{confirmDialog.message}</p>
                      <div className="flex justify-end gap-3">
                          <button onClick={() => setConfirmDialog(null)} className="px-5 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors">Annuller</button>
                          <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} className="px-5 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl font-bold shadow-sm transition-colors">Bekræft</button>
                      </div>
                  </div>
              </div>
          )}
          
          {alertDialog && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                  <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
                      <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4"><Check size={24}/></div>
                      <h3 className="text-xl font-bold mb-2 font-serif text-gray-900">Information</h3>
                      <p className="text-gray-600 mb-8">{alertDialog.message}</p>
                      <button onClick={() => setAlertDialog(null)} className="w-full py-3 bg-[#1b4332] text-white hover:bg-[#123023] rounded-xl font-bold transition-colors">Forstået</button>
                  </div>
              </div>
          )}

      </div>
    </div>
  );
}