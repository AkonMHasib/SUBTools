import { isSuperAdmin, isAdmin } from "../../utils/permissionUtils";
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import {
  FiSearch, FiPlus, FiEdit2, FiTrash2, FiMapPin,
  FiChevronLeft, FiChevronRight, FiChevronUp, FiChevronDown,
  FiArrowUp, FiArrowDown, FiPlusCircle, FiMinusCircle
} from 'react-icons/fi';
import { BsQrCode } from 'react-icons/bs';
import {
  fetchBusesAndRoutes, createRoute, updateRoute, deleteRoute,
  setSearchQuery, clearTransportStatus
} from '../../redux/slices/transportSlice';
import Dialog from '../../components/common/Dialog';
import Badge from '../../components/common/Badge';
import DeleteConfirmDialog from '../../components/dialogs/DeleteConfirmDialog';
import QRDialog from '../../components/dialogs/QRDialog';

// Form validation schema
const schema = yup.object().shape({
  name: yup.string().min(3, 'Route Name must be at least 3 characters').required('Route Name is required'),
  code: yup.string().matches(/^R-[A-Z]{3}$/, 'Route Code must match R-XXX (e.g. R-UTT, R-MIR)').required('Route Code is required'),
  destination: yup.string().required('Destination is required'),
  obhaiUsername: yup.string().required('Obhai Username is required'),
  obhaiPassword: yup.string().min(4, 'Password must be at least 4 characters').required('Obhai Password is required')
});

const convertTo12Hour = (timeStr) => {
  if (!timeStr) return "";
  if (timeStr.toLowerCase().includes("am") || timeStr.toLowerCase().includes("pm")) {
    return timeStr.trim();
  }
  const [hourStr, minuteStr] = timeStr.split(":");
  let hour = parseInt(hourStr, 10);
  const minutes = minuteStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  hour = hour ? hour : 12;
  return `${hour}:${minutes} ${ampm}`;
};

const convertTo24Hour = (time12h) => {
  if (!time12h) return "";
  if (time12h.includes(":") && !time12h.toLowerCase().includes("am") && !time12h.toLowerCase().includes("pm")) {
    return time12h.trim();
  }
  const match = time12h.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return time12h;
  let [_, hours, minutes, ampm] = match;
  hours = parseInt(hours, 10);
  if (ampm.toUpperCase() === "PM" && hours < 12) {
    hours += 12;
  } else if (ampm.toUpperCase() === "AM" && hours === 12) {
    hours = 0;
  }
  return `${String(hours).padStart(2, "0")}:${minutes}`;
};

export const RouteManagement = () => {
  const dispatch = useDispatch();
  const { filteredRoutes, searchQuery, loading, success, error } = useSelector((state) => state.transport);
  const { user } = useSelector((state) => state.auth);

  const isSuperAdminUser = isSuperAdmin(user);
  const isAdminUser = isAdmin(user);
  const adminDept = user?.department;

  const hasAccessToRoute = (route) => {
    return isAdminUser;
  };

  // States
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState(null);

  // Dynamic Pickup Points State for Add/Edit Form (stores names)
  const [pickupPoints, setPickupPoints] = useState(['Campus']);
  const [initialPickupPoints, setInitialPickupPoints] = useState(['Campus']);
  const [newPointInput, setNewPointInput] = useState('');
  const [unsavedConfirmOpen, setUnsavedConfirmOpen] = useState(false);

  // Bulk Import States
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkJson, setBulkJson] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isDirty }
  } = useForm({
    resolver: yupResolver(schema)
  });

  useEffect(() => {
    dispatch(fetchBusesAndRoutes());
  }, [dispatch]);

  // Sync Thunk Success/Error
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearTransportStatus());
    }
    if (success) {
      toast.success(editMode ? 'Route modified successfully!' : 'Shuttle route created!');
      setModalOpen(false);
      reset();
      dispatch(clearTransportStatus());
    }
  }, [success, error, editMode, dispatch, reset]);

  const handleCloseAttempt = () => {
    const hasChanges = isDirty || JSON.stringify(pickupPoints) !== JSON.stringify(initialPickupPoints);
    if (hasChanges) {
      setUnsavedConfirmOpen(true);
    } else {
      setModalOpen(false);
    }
  };

  const handleSearchChange = (e) => {
    dispatch(setSearchQuery(e.target.value));
    setCurrentPage(1);
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRoutes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRoutes.length / itemsPerPage);

  const onSubmit = (data) => {
    const pointsArray = [...pickupPoints];

    const routePayload = {
      ...data,
      pickupPoints: pointsArray,
    };

    if (editMode) {
      dispatch(updateRoute({ id: activeRoute.id, updatedData: routePayload }));
    } else {
      dispatch(createRoute(routePayload));
    }
  };

  const openAddModal = () => {
    setEditMode(false);
    const initialPoints = ['Campus'];
    setPickupPoints(initialPoints);
    setInitialPickupPoints(initialPoints);
    reset({
      name: '',
      code: '',
      destination: 'SUB Campus',
      obhaiUsername: '',
      obhaiPassword: ''
    });
    setModalOpen(true);
  };

  const openEditModal = (route) => {
    setEditMode(true);
    setActiveRoute(route);
    const pointsList = [...(route.pickupPoints || [])];
    setPickupPoints(pointsList);
    setInitialPickupPoints(pointsList);
    reset({
      name: route.name,
      code: route.code,
      destination: route.destination,
      obhaiUsername: route.obhaiUsername,
      obhaiPassword: route.obhaiPassword
    });
    setModalOpen(true);
  };

  const openDeleteDialog = (route) => {
    setActiveRoute(route);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (activeRoute) {
      await dispatch(deleteRoute(activeRoute.id));
      toast.success('Route removed successfully!');
      setDeleteOpen(false);
      setActiveRoute(null);
    }
  };

  const openQrDialog = (route) => {
    setActiveRoute(route);
    setQrOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setBulkJson(event.target.result);
      reader.readAsText(file);
    }
  };

  const handleBulkImport = async () => {
    setBulkLoading(true);
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) {
        toast.error('JSON must be an array of route objects.');
        setBulkLoading(false);
        return;
      }
      let successCount = 0;
      let errorCount = 0;
      for (const item of parsed) {
        const isValid = item.name && item.code && item.destination;
        if (isValid) {
          await dispatch(createRoute({
            ...item,
            pickupPoints: item.pickupPoints || ['Campus'],
            obhaiUsername: item.obhaiUsername || '',
            obhaiPassword: item.obhaiPassword || ''
          }));
          successCount++;
        } else {
          errorCount++;
        }
      }
      toast.success(`Successfully imported ${successCount} routes!`);
      if (errorCount > 0) toast.warn(`${errorCount} routes skipped due to missing required fields.`);
      setBulkOpen(false);
      setBulkJson('');
    } catch (e) {
      toast.error('Invalid JSON: ' + e.message);
    } finally {
      setBulkLoading(false);
    }
  };

  // Pickup Points Ordering Handlers (Simulated Drag & Drop)
  const addPickupPoint = () => {
    const trimmed = newPointInput.trim();
    if (!trimmed) return;
    if (pickupPoints.includes(trimmed)) {
      toast.warn("Pickup point already exists in the list.");
      return;
    }
    setPickupPoints([...pickupPoints, trimmed]);
    setNewPointInput('');
  };

  const removePickupPoint = (idx) => {
    setPickupPoints(pickupPoints.filter((_, i) => i !== idx));
  };

  const movePoint = (index, direction) => {
    const newPoints = [...pickupPoints];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;

    if (targetIdx < 0 || targetIdx >= newPoints.length) return;

    // Swap points
    const temp = newPoints[index];
    newPoints[index] = newPoints[targetIdx];
    newPoints[targetIdx] = temp;
    setPickupPoints(newPoints);
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Route Management
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
            Define pick-up terminals, configure GPS Obhai VTS configurations, and generate tracking QR codes.
          </p>
        </div>
        {isAdminUser && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-4 sm:mt-0">
            {isSuperAdminUser && (
              <button
                onClick={() => setBulkOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800"
              >
                <span>Bulk Import (JSON)</span>
              </button>
            )}
            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer btn-primary-gradient"
            >
              <FiPlus className="text-sm" />
              <span>Create Shuttle Route</span>
            </button>
          </div>
        )}
      </div>

      {/* Search Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
        <div className="relative w-full md:max-w-xs text-slate-400 dark:text-slate-500">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" />
          <input
            type="text"
            placeholder="Search by route code, destination, stop name..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs transition-colors focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500/30"
          />
        </div>
      </div>

      {/* Routes Grid list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {currentItems.length > 0 ? (
          currentItems.map((route) => (
            <div key={route.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all relative group">

              {/* Actions panel */}
              <div className="absolute top-4 right-4 flex space-x-1">
                <button
                  onClick={() => openQrDialog(route)}
                  className="p-1.5 text-slate-500 hover:text-purple-500 hover:bg-purple-50/50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                  title="Generate QR Code"
                >
                  <BsQrCode size={13} />
                </button>
                {isAdminUser && (
                  <>
                    <button
                      onClick={() => openEditModal(route)}
                      className="p-1.5 text-slate-500 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                      title="Edit Route"
                    >
                      <FiEdit2 size={13} />
                    </button>
                    <button
                      onClick={() => openDeleteDialog(route)}
                      className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                      title="Delete Route"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </>
                )}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{route.code}</Badge>
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1.5">
                  {route.name}
                </h3>

                {/* Pickup stops list */}
                <div className="mt-4">
                  <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Shuttle Pickup Sequence</h4>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {route.pickupPoints.map((point, idx) => (
                        <div key={idx} className="flex items-center text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 border border-slate-200/40 dark:border-slate-800 px-2 py-0.5 rounded-md">
                          <FiMapPin size={9} className="mr-1 text-slate-400 shrink-0" />
                          <span>{point}</span>
                          {idx < route.pickupPoints.length - 1 && (
                            <span className="text-slate-300 dark:text-slate-700 ml-1.5">→</span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Obhai VTS configurations */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 mt-5 pt-3 flex flex-col space-y-1 text-[10px] text-slate-400 font-mono">
                <div className="flex justify-between items-center">
                  <span>Obhai User: <strong className="font-semibold text-slate-700 dark:text-slate-300">{route.obhaiUsername}</strong></span>
                  <span>Obhai Pass: <strong className="font-semibold text-slate-700 dark:text-slate-300">{route.obhaiPassword}</strong></span>
                </div>
                <div className="text-right text-[9px] font-bold text-emerald-500 uppercase tracking-wider mt-0.5">
                  VTS System Active
                </div>
              </div>

            </div>
          ))
        ) : (
          <div className="col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-16 text-center text-slate-400 dark:text-slate-500 font-semibold">
            No shuttle routes registered in database matching search.
          </div>
        )}
      </div>

      {/* Pagination Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            {filteredRoutes.length > 0
              ? `Showing ${indexOfFirstItem + 1}–${Math.min(indexOfLastItem, filteredRoutes.length)} of ${filteredRoutes.length} Routes`
              : 'No routes found'}
          </span>
          <select
            value={itemsPerPage}
            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={30}>30 / page</option>
          </select>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
            >
              <FiChevronLeft className="text-sm" />
            </button>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
            >
              <FiChevronRight className="text-sm" />
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Route Dialog */}
      <Dialog isOpen={modalOpen} onClose={handleCloseAttempt} title={editMode ? 'Edit Shuttle Route' : 'Create Shuttle Route'}>
        <form onSubmit={handleSubmit(onSubmit, (err) => {
          console.error("Validation Errors:", err);
          toast.error("Form validation failed: " + Object.keys(err).map(key => `${key}: ${err[key].message}`).join(", "));
        })} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Route Name */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Route Name</label>
              <input
                type="text"
                placeholder="Uttara - Campus"
                {...register('name')}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'} rounded-lg px-3 py-2 text-xs transition-colors`}
              />
              {errors.name && <span className="text-[9px] text-red-500 mt-1 font-semibold">{errors.name.message}</span>}
            </div>

            {/* Route Code */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Route Code</label>
              <input
                type="text"
                placeholder="R-UTT"
                {...register('code')}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.code ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'} rounded-lg px-3 py-2 text-xs transition-colors`}
              />
              {errors.code && <span className="text-[9px] text-red-500 mt-1 font-semibold">{errors.code.message}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Destination */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Destination Terminal</label>
              <input
                type="text"
                placeholder="Campus"
                {...register('destination')}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.destination ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'} rounded-lg px-3 py-2 text-xs transition-colors`}
              />
              {errors.destination && <span className="text-[9px] text-red-500 mt-1 font-semibold">{errors.destination.message}</span>}
            </div>
          </div>

          {/* Pickup Stops sequencing with dynamic order modification controls (Drag & Drop replacement) */}
          <div className="border border-slate-100 dark:border-slate-850 p-4 rounded-xl space-y-3">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Shuttle Pickup Sequence Editor</label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                placeholder="Add stop point..."
                value={newPointInput}
                onChange={(e) => setNewPointInput(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs flex-1 transition-colors focus:border-blue-500/30"
              />
              <button
                type="button"
                onClick={addPickupPoint}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 text-xs font-semibold flex items-center space-x-1 cursor-pointer shrink-0"
              >
                <FiPlusCircle />
                <span>Add Stop</span>
              </button>
            </div>

            {/* List of stops with sorting controls */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {pickupPoints.map((point, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-200/40 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center space-x-2 flex-1 mr-2">
                    <span className="w-4 h-4 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-[9px] text-slate-500 font-bold shrink-0">{idx + 1}</span>
                    <input
                      type="text"
                      placeholder="Stop Point Name"
                      value={point}
                      onChange={(e) => {
                        const newPoints = [...pickupPoints];
                        newPoints[idx] = e.target.value;
                        setPickupPoints(newPoints);
                      }}
                      className="bg-transparent border-b border-slate-200 dark:border-slate-800 focus:border-blue-500/30 px-1 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 outline-hidden transition-colors flex-1 min-w-[80px]"
                    />
                  </div>

                  {/* Shifts controls */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => movePoint(idx, 'up')}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      <FiArrowUp size={11} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === pickupPoints.length - 1}
                      onClick={() => movePoint(idx, 'down')}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <FiArrowDown size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePickupPoint(idx)}
                      className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-400 hover:text-red-500 rounded cursor-pointer"
                      title="Delete Stop"
                    >
                      <FiMinusCircle size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-850 pt-4">
            {/* Obhai VTS Username */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Obhai VTS Username</label>
              <input
                type="text"
                placeholder="sub_uttara_shuttle"
                {...register('obhaiUsername')}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.obhaiUsername ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'} rounded-lg px-3 py-2 text-xs transition-colors`}
              />
              {errors.obhaiUsername && <span className="text-[9px] text-red-500 mt-1 font-semibold">{errors.obhaiUsername.message}</span>}
            </div>

            {/* Obhai VTS Password */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Obhai VTS Password</label>
              <input
                type="password"
                placeholder="••••••••"
                {...register('obhaiPassword')}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.obhaiPassword ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'} rounded-lg px-3 py-2 text-xs transition-colors`}
              />
              {errors.obhaiPassword && <span className="text-[9px] text-red-500 mt-1 font-semibold">{errors.obhaiPassword.message}</span>}
            </div>
          </div>

          <div className="flex items-center space-x-3 justify-end mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-sm"
            >
              {loading ? 'Processing...' : (editMode ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        itemName={activeRoute ? activeRoute.name : ''}
        loading={loading}
      />

      {/* QR Code dialog */}
      {activeRoute && (
        <QRDialog
          isOpen={qrOpen}
          onClose={() => setQrOpen(false)}
          routeName={activeRoute.name}
          routeCode={activeRoute.code}
        />
      )}

      {/* Bulk Import Dialog */}
      <Dialog isOpen={bulkOpen} onClose={() => setBulkOpen(false)} title="Bulk Import Shuttle Routes">
        <div className="space-y-4">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Select JSON File</label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 dark:file:bg-blue-950 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100/50 cursor-pointer"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Paste JSON Data</label>
            <textarea
              rows={8}
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
              placeholder={`[\n  {\n    "name": "Uttara - Campus",\n    "code": "R-UTT",\n    "destination": "SUB Campus",\n    "pickupPoints": ["Campus", "Uttara Sector-7", "Uttara Sector-10"],\n    "obhaiUsername": "user",\n    "obhaiPassword": "pass"\n  }\n]`}
              className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono transition-colors focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500/30"
            />
          </div>
          <div className="flex items-center space-x-3 justify-end border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-6">
            <button
              type="button"
              onClick={() => setBulkOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer btn-secondary-gradient"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={bulkLoading || !bulkJson.trim()}
              onClick={handleBulkImport}
              className="px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer btn-primary-gradient"
            >
              {bulkLoading ? 'Importing...' : 'Import Data'}
            </button>
          </div>
        </div>
      </Dialog>

      {/* Unsaved Changes Confirmation Dialog */}
      <Dialog
        isOpen={unsavedConfirmOpen}
        onClose={() => setUnsavedConfirmOpen(false)}
        title="Discard Unsaved Changes?"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            You have unsaved changes in the route form or stoppage sequence list. Discarding will lose all adjustments. Are you sure you want to exit?
          </p>
          <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-900 pt-3">
            <button
              onClick={() => setUnsavedConfirmOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Keep Editing
            </button>
            <button
              onClick={() => {
                setUnsavedConfirmOpen(false);
                setModalOpen(false);
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
            >
              Discard Changes
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default RouteManagement;
