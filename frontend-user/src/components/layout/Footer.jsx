import { Link } from 'react-router-dom';
export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between gap-6">
        <div>
          <span className="text-brand-500 font-bold text-xl">event<span className="text-gray-900">go</span></span>
          <p className="text-gray-500 text-sm mt-1">Plan your perfect event.</p>
        </div>
        <div className="flex gap-8 text-sm text-gray-500">
          <Link to="/vendors" className="hover:text-gray-900">Explore</Link>
          <Link to="/events" className="hover:text-gray-900">My Events</Link>
          <Link to="/compare" className="hover:text-gray-900">Compare</Link>
        </div>
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} EventGo. All rights reserved.MMitrran</p>
      </div>
    </footer>
  );
}
