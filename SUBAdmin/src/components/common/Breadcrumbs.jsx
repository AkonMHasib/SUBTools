// Breadcrumbs Component
import { Link, useLocation } from 'react-router-dom';
import { FiChevronRight, FiHome } from 'react-icons/fi';

export const Breadcrumbs = () => {
  const location = useLocation();
  const rawPathnames = location.pathname.split('/').filter((x) => x);
  // Filter out 'admin' prefix from breadcrumb items
  const pathnames = rawPathnames.filter((p) => p !== 'admin');

  // Translate paths to readable formats
  const formatName = (name) => {
    if (name === 'ads-analytics') return 'Ads Analytics';
    if (name === 'rbac') return 'RBAC Management';
    if (name === 'lost-found') return 'Lost & Found';
    return name
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  if (
    location.pathname === '/' ||
    location.pathname === '/admin' ||
    location.pathname === '/admin/dashboard' ||
    location.pathname === '/dashboard'
  ) {
    return (
      <div className="flex items-center text-xs text-slate-400 dark:text-slate-500 mb-5 font-medium">
        <FiHome className="mr-1.5 text-indigo-500" />
        <span className="text-slate-600 dark:text-slate-300 font-semibold">Dashboard</span>
      </div>
    );
  }

  return (
    <nav className="flex items-center space-x-2 text-xs text-slate-400 dark:text-slate-500 mb-6 font-medium">
      <Link
        to="/admin/dashboard"
        className="flex items-center hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
      >
        <FiHome className="mr-1" />
        <span>Dashboard</span>
      </Link>
      {pathnames.map((value, index) => {
        const to = `/admin/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const name = formatName(value);

        return (
          <div key={to} className="flex items-center space-x-2">
            <FiChevronRight className="text-slate-300 dark:text-slate-700" />
            {isLast ? (
              <span className="text-slate-600 dark:text-slate-300 font-semibold">{name}</span>
            ) : (
              <Link
                to={to}
                className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
              >
                {name}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
