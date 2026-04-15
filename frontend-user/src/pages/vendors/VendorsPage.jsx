import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, GitCompareArrows } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import VendorCard from '../../components/vendor/VendorCard';
import { useCompareStore } from '../../store/compareStore';

export default function VendorsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [page, setPage] = useState(1);
  const { items: compareList } = useCompareStore();

  const { data: catsData } = useQuery({ queryKey: ['vendorCats'], queryFn: () => api.get('/categories/vendors').then(r => r.data.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['vendors', { search, category, minPrice, maxPrice, page }],
    queryFn: () => api.get('/vendors', { params: { search, category, minPrice, maxPrice, page, limit: 12 } }).then(r => r.data.data),
    keepPreviousData: true,
  });

  const vendors = data?.vendors || [];
  const categories = catsData?.categories || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Find the perfect vendors</h1>
        <p className="text-lg text-gray-500">Browse top venues, caterers, photographers and more across Malaysia.</p>
      </div>
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-11" placeholder="Search vendors..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mb-8">
        <select className="input w-auto text-sm" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="input w-36 text-sm" type="number" placeholder="Min price (RM)" value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }} />
        <input className="input w-36 text-sm" type="number" placeholder="Max price (RM)" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} />
        {(category || minPrice || maxPrice) && (
          <button onClick={() => { setCategory(''); setMinPrice(''); setMaxPrice(''); setPage(1); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 border border-gray-200 rounded-xl">
            <X size={14} /> Clear
          </button>
        )}
      </div>
      {compareList.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-2xl px-6 py-3 shadow-2xl flex items-center gap-4">
          <span className="text-sm font-medium">{compareList.length} vendors selected</span>
          <Link to="/compare" className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-2">
            <GitCompareArrows size={16} /> Compare
          </Link>
        </div>
      )}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="card animate-pulse"><div className="h-48 bg-gray-100" /><div className="p-4 space-y-2"><div className="h-4 bg-gray-100 rounded w-3/4" /><div className="h-3 bg-gray-100 rounded w-1/2" /></div></div>)}
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-20"><p className="text-gray-400 text-lg">No vendors found.</p></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {vendors.map(v => <VendorCard key={v.id} vendor={v} />)}
        </div>
      )}
      {data?.pages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          {Array.from({ length: data.pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`w-10 h-10 rounded-xl text-sm font-medium ${p === page ? 'bg-brand-500 text-white' : 'border border-gray-200 text-gray-600 hover:border-gray-400'}`}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}
