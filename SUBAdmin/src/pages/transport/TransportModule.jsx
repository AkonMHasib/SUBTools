// Consolidated Transport Management Module
import { useState } from 'react';
import { useSelector } from 'react-redux';
import BusManagement from './BusManagement';
import RouteManagement from './RouteManagement';
import { GpsReminderPanel } from '../../components/transport/GpsReminderPanel';
import { FiTruck, FiMap, FiMail } from 'react-icons/fi';

export const TransportModule = () => {
  const [activeTab, setActiveTab] = useState('buses');

  // Pass the full unfiltered bus list to the reminder panel
  const { buses, routes } = useSelector((state) => state.transport);

  const tabs = [
    { id: 'buses',   label: 'Shuttle Buses',     icon: FiTruck },
    { id: 'routes',  label: 'Route Coordinator',  icon: FiMap   },
    { id: 'gps',     label: 'GPS Reminders',      icon: FiMail  },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Selector */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-px">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center px-4 py-2.5 text-xs font-semibold border-b-2 cursor-pointer transition-all ${
              activeTab === id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-extrabold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Icon className="mr-2 text-sm shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="fade-in">
        {activeTab === 'buses'  && <BusManagement />}
        {activeTab === 'routes' && <RouteManagement />}
        {activeTab === 'gps'    && <GpsReminderPanel buses={buses || []} routes={routes || []} />}
      </div>
    </div>
  );
};

export default TransportModule;
