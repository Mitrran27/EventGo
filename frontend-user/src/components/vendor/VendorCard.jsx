import { Link } from 'react-router-dom';
import { Heart, GitCompareArrows, MapPin } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useCompareStore } from '../../store/compareStore';

export default function VendorCard({ vendor }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { toggle, has } = useCompareStore();
  const inCompare = has(vendor.id);
  const { data: favsData } = useQuery({ queryKey: ['favorites'], queryFn: () => api.get('/favorites').then(r => r.data.data), enabled: !!user });
  const isFav = favsData?.favorites?.some(f => f.vendor?.id === vendor.id);
  const favMutation = useMutation({
    mutationFn: () => isFav ? api.delete('/favorites/' + vendor.id) : api.post('/favorites/' + vendor.id),
    onSuccess: () => { qc.invalidateQueries(['favorites']); toast.success(isFav ? 'Removed from favourites' : 'Saved to favourites'); },
    onError: () => toast.error('Please log in to save vendors'),
  });
  return (
    <div className="card group cursor-pointer">
      <div className="relative h-48 overflow-hidden bg-gray-100">
        {vendor.imageUrl
          ? <img src={vendor.imageUrl} alt={vendor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full bg-gradient-to-br from-brand-100 to-pink-100 flex items-center justify-center text-5xl">🎪</div>
        }
        <div className="absolute top-3 right-3 flex gap-2">
          <button onClick={(e) => { e.preventDefault(); if (!user) { toast.error('Please log in'); return; } favMutation.mutate(); }}
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors ${isFav ? 'bg-brand-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            <Heart size={14} fill={isFav ? 'white' : 'none'} />
          </button>
          <button onClick={(e) => { e.preventDefault(); toggle(vendor); }}
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors ${inCompare ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            <GitCompareArrows size={14} />
          </button>
        </div>
        <span className="absolute bottom-3 left-3 bg-white text-xs font-semibold px-2.5 py-1 rounded-full text-gray-700 shadow-sm">{vendor.category?.name}</span>
      </div>
      <Link to={'/vendors/' + vendor.id} className="block p-4">
        <h3 className="font-semibold text-gray-900 mb-1 leading-tight">{vendor.name}</h3>
        {vendor.location && <p className="text-xs text-gray-500 flex items-center gap-1 mb-2"><MapPin size={11} />{vendor.location}</p>}
        <p className="text-sm font-semibold text-gray-900">RM {Number(vendor.minPrice).toLocaleString()} – RM {Number(vendor.maxPrice).toLocaleString()}</p>
      </Link>
    </div>
  );
}
