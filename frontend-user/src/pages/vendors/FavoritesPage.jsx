import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, MapPin, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

export default function FavoritesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['favorites'], queryFn: () => api.get('/favorites').then(r => r.data.data) });
  const favorites = data?.favorites || [];
  const removeMutation = useMutation({ mutationFn: (vendorId) => api.delete('/favorites/' + vendorId), onSuccess: () => { qc.invalidateQueries(['favorites']); toast.success('Removed from favourites'); } });

  if (isLoading) return <div className="max-w-7xl mx-auto px-6 py-12 text-center text-gray-400">Loading...</div>;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Saved Vendors</h1>
      <p className="text-gray-500 mb-8">{favorites.length} saved {favorites.length === 1 ? 'vendor' : 'vendors'}</p>
      {favorites.length === 0 ? (
        <div className="text-center py-20">
          <Heart size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 mb-4">No saved vendors yet</p>
          <Link to="/vendors" className="btn-primary inline-block">Explore Vendors</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {favorites.map(fav => (
            <div key={fav.id} className="card group">
              <div className="relative h-44 overflow-hidden bg-gray-100">
                {fav.vendor.imageUrl ? <img src={fav.vendor.imageUrl} alt={fav.vendor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full bg-gradient-to-br from-brand-100 to-pink-100 flex items-center justify-center text-4xl">🎪</div>}
                <button onClick={() => removeMutation.mutate(fav.vendor.id)} className="absolute top-3 right-3 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400 hover:text-red-500"><X size={13} /></button>
              </div>
              <Link to={'/vendors/' + fav.vendor.id} className="block p-4">
                <p className="text-xs font-medium text-brand-500 mb-1">{fav.vendor.category?.name}</p>
                <h3 className="font-semibold text-gray-900 leading-tight mb-1">{fav.vendor.name}</h3>
                {fav.vendor.location && <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={11} />{fav.vendor.location}</p>}
                <p className="text-sm font-semibold text-gray-900 mt-2">RM {Number(fav.vendor.minPrice).toLocaleString()} – RM {Number(fav.vendor.maxPrice).toLocaleString()}</p>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
