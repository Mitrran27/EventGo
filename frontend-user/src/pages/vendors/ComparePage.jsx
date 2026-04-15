import { Link } from 'react-router-dom';
import { X, ArrowLeft } from 'lucide-react';
import { useCompareStore } from '../../store/compareStore';

export default function ComparePage() {
  const { items, toggle, clear } = useCompareStore();
  if (items.length === 0) return (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center">
      <p className="text-gray-400 text-lg mb-4">No vendors selected for comparison.</p>
      <Link to="/vendors" className="btn-primary inline-block">Browse Vendors</Link>
    </div>
  );
  const fields = [
    { label: 'Category', fn: v => v.category?.name || '—' },
    { label: 'Min Price', fn: v => 'RM ' + Number(v.minPrice).toLocaleString() },
    { label: 'Max Price', fn: v => 'RM ' + Number(v.maxPrice).toLocaleString() },
    { label: 'Location', fn: v => v.location || '—' },
  ];
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link to="/vendors" className="text-gray-500 hover:text-gray-700"><ArrowLeft size={20} /></Link>
          <h1 className="text-2xl font-bold text-gray-900">Compare Vendors</h1>
        </div>
        <button onClick={clear} className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1"><X size={15} /> Clear all</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <td className="w-36 pr-4" />
              {items.map(v => (
                <th key={v.id} className="pb-4 px-3 text-left">
                  <div className="card overflow-hidden">
                    <div className="h-32 bg-gray-100 overflow-hidden">
                      {v.imageUrl ? <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-brand-100 to-pink-100" />}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-sm text-gray-900 leading-tight">{v.name}</p>
                      <button onClick={() => toggle(v)} className="text-xs text-gray-400 hover:text-red-500 mt-1 flex items-center gap-1"><X size={11} /> Remove</button>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map(({ label, fn }) => (
              <tr key={label} className="border-t border-gray-100">
                <td className="py-4 pr-4 text-sm font-medium text-gray-600">{label}</td>
                {items.map(v => <td key={v.id} className="py-4 px-3 text-sm text-gray-900">{fn(v)}</td>)}
              </tr>
            ))}
            <tr className="border-t border-gray-100">
              <td className="py-4 pr-4 text-sm font-medium text-gray-600">Action</td>
              {items.map(v => <td key={v.id} className="py-4 px-3"><Link to={'/vendors/' + v.id} className="btn-primary text-sm py-2 px-4 inline-block">View Vendor</Link></td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
