import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, MapPin, ArrowLeft, Send, GitCompareArrows } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useCompareStore } from '../../store/compareStore';

export default function VendorDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { toggle, has } = useCompareStore();
  const [showContact, setShowContact] = useState(false);
  const [contactForm, setContactForm] = useState({ message: '', contactEmail: '', eventId: '' });

  const { data, isLoading } = useQuery({ queryKey: ['vendor', id], queryFn: () => api.get('/vendors/' + id).then(r => r.data.data) });
  const { data: eventsData } = useQuery({ queryKey: ['events'], queryFn: () => api.get('/events').then(r => r.data.data), enabled: !!user });
  const { data: favsData } = useQuery({ queryKey: ['favorites'], queryFn: () => api.get('/favorites').then(r => r.data.data), enabled: !!user });

  const vendor = data?.vendor;
  const isFav = favsData?.favorites?.some(f => f.vendor?.id === id);
  const inCompare = has(id);

  const favMutation = useMutation({ mutationFn: () => isFav ? api.delete('/favorites/' + id) : api.post('/favorites/' + id), onSuccess: () => { qc.invalidateQueries(['favorites']); toast.success(isFav ? 'Removed' : 'Saved to favourites'); } });
  const contactMutation = useMutation({
    mutationFn: () => api.post('/contact', { vendorId: id, ...contactForm }),
    onSuccess: () => { toast.success('Inquiry sent!'); setShowContact(false); setContactForm({ message: '', contactEmail: '', eventId: '' }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to send'),
  });

  if (isLoading) return <div className="max-w-5xl mx-auto px-6 py-12 animate-pulse"><div className="h-72 bg-gray-100 rounded-2xl mb-6" /></div>;
  if (!vendor) return <div className="text-center py-20 text-gray-400">Vendor not found</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/vendors" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"><ArrowLeft size={16} /> Back to vendors</Link>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="h-64 sm:h-80 rounded-2xl overflow-hidden bg-gray-100 mb-6">
            {vendor.imageUrl ? <img src={vendor.imageUrl} alt={vendor.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-brand-100 to-pink-100 flex items-center justify-center text-6xl">🎪</div>}
          </div>
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs font-semibold text-brand-500 bg-brand-50 px-2.5 py-1 rounded-full">{vendor.category?.name}</span>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">{vendor.name}</h1>
              {vendor.location && <p className="text-gray-500 flex items-center gap-1 mt-1"><MapPin size={14} />{vendor.location}</p>}
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => toggle(vendor)} className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${inCompare ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}><GitCompareArrows size={18} /></button>
              {user && <button onClick={() => favMutation.mutate()} className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${isFav ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}><Heart size={18} fill={isFav ? 'white' : 'none'} /></button>}
            </div>
          </div>
          <p className="text-gray-600 leading-relaxed">{vendor.description}</p>
        </div>
        <div>
          <div className="card p-6 sticky top-24">
            <p className="text-2xl font-bold text-gray-900 mb-1">RM {Number(vendor.minPrice).toLocaleString()} – RM {Number(vendor.maxPrice).toLocaleString()}</p>
            <p className="text-sm text-gray-500 mb-5">Price range</p>
            {user ? (
              <>
                <button onClick={() => setShowContact(!showContact)} className="btn-primary w-full flex items-center justify-center gap-2 mb-3"><Send size={16} />{showContact ? 'Cancel' : 'Send Inquiry'}</button>
                {showContact && (
                  <div className="mt-4 space-y-3">
                    <div><label className="label text-xs">Contact Email</label><input className="input text-sm" type="email" value={contactForm.contactEmail || user.email} onChange={(e) => setContactForm({ ...contactForm, contactEmail: e.target.value })} /></div>
                    <div><label className="label text-xs">Link to Event (optional)</label>
                      <select className="input text-sm" value={contactForm.eventId} onChange={(e) => setContactForm({ ...contactForm, eventId: e.target.value })}>
                        <option value="">No event</option>
                        {eventsData?.events?.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </div>
                    <div><label className="label text-xs">Message</label><textarea className="input text-sm resize-none" rows={4} placeholder="Tell the vendor about your event..." value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} /></div>
                    <button onClick={() => contactMutation.mutate()} disabled={contactMutation.isLoading} className="btn-primary w-full text-sm">{contactMutation.isLoading ? 'Sending...' : 'Send Inquiry'}</button>
                  </div>
                )}
              </>
            ) : <Link to="/login" className="btn-primary w-full text-center block">Log in to Contact</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}
