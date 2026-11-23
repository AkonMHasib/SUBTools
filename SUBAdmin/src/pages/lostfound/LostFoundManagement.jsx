// Lost and Found Management Component
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "react-toastify";
import {
  FiSearch,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiMapPin,
  FiPhone,
  FiMail,
  FiClock,
  FiPlusCircle,
  FiUser,
  FiUploadCloud,
  FiCamera,
  FiGrid,
  FiCheckCircle,
  FiXCircle,
  FiBell,
} from "react-icons/fi";
import {
  fetchLostFoundItems,
  createLostFoundItem,
  updateLostFoundItem,
  deleteLostFoundItem,
  fetchPendingLostFoundItems,
  approveLostFoundItem,
  rejectLostFoundItem,
  setSearchQuery,
  setTypeFilter,
  setStatusFilter,
  clearLostFoundStatus,
} from "../../redux/slices/lostFoundSlice";
import Dialog from "../../components/common/Dialog";
import Badge from "../../components/common/Badge";
import DeleteConfirmDialog from "../../components/dialogs/DeleteConfirmDialog";
import { uploadImageToImgBB } from "../../utils/imageUpload";
import { isSuperAdmin } from "../../utils/permissionUtils";

// Form validation schema
const schema = yup.object().shape({
  title: yup.string().min(3, "Title must be at least 3 characters").required("Title is required"),
  description: yup.string().required("Description is required"),
  type: yup.string().oneOf(["Lost", "Found"]).required("Type is required"),
  status: yup.string().oneOf(["Lost", "Found", "Claimed"]).required("Status is required"),
  reporterName: yup.string().required("Reporter Name is required"),
  reporterPhone: yup
    .string()
    .matches(/^01\d{9}$/, "Use an 11-digit phone number (e.g. 01811223344)")
    .required("Reporter Phone is required"),
  reporterEmail: yup.string().email("Invalid email format").required("Reporter Email is required"),
  location: yup.string().required("Location is required"),
  date: yup.string().required("Date is required"),
});

export const LostFoundManagement = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const isSuperAdminUser = isSuperAdmin(user);
  const { filteredList, pendingList, searchQuery, filters, loading, success, error } = useSelector(
    (state) => state.lostFound
  );

  const safeFilteredList = Array.isArray(filteredList) ? filteredList : [];
  const safePendingList = Array.isArray(pendingList) ? pendingList : [];

  // States
  const [activeTab, setActiveTab] = useState("registry"); // "registry" | "pending"
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);

  // Image Uploading States
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUrlPreview, setImageUrlPreview] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    dispatch(fetchLostFoundItems());
    dispatch(fetchPendingLostFoundItems());
  }, [dispatch]);



  // Sync Thunk Success/Error
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearLostFoundStatus());
    }
    if (success) {
      toast.success(editMode ? "Item registry updated successfully!" : "Lost/Found item reported!");
      setModalOpen(false);
      reset();
      setImageUrlPreview("");
      dispatch(clearLostFoundStatus());
    }
  }, [success, error, editMode, dispatch, reset]);

  const handleImageFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const uploadedUrl = await uploadImageToImgBB(file);
      setImageUrlPreview(uploadedUrl);
      setValue("imageUrl", uploadedUrl);
      toast.success("Image uploaded successfully to ImgBB!");
    } catch (err) {
      toast.error(err.message || "Failed to upload image. Make sure API key is configured.");
    } finally {
      setUploadingImage(false);
    }
  };

  const onSubmit = (data) => {
    const photo = imageUrlPreview || data.imageUrl || data.photo_url || data.photoUrl || "";
    const payload = {
      ...data,
      imageUrl: photo,
      photo_url: photo,
      photoUrl: photo,
    };

    if (editMode) {
      dispatch(updateLostFoundItem({ id: activeItem.id, updatedData: payload }));
    } else {
      dispatch(createLostFoundItem(payload));
    }
  };

  const openAddModal = () => {
    setEditMode(false);
    setImageUrlPreview("");
    reset({
      title: "",
      description: "",
      type: "Lost",
      status: "Lost",
      reporterName: "",
      reporterPhone: "",
      reporterEmail: "",
      location: "",
      date: new Date().toLocaleDateString("en-CA"),
      imageUrl: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditMode(true);
    setActiveItem(item);
    const photo = item.photo_url || item.imageUrl || item.photoUrl || "";
    setImageUrlPreview(photo);
    reset({
      title: item.title,
      description: item.description,
      type: item.type,
      status: item.status,
      reporterName: item.reporterName,
      reporterPhone: item.reporterPhone,
      reporterEmail: item.reporterEmail,
      location: item.location,
      date: item.date,
      imageUrl: photo,
      photo_url: photo,
      photoUrl: photo,
    });
    setModalOpen(true);
  };

  const openDeleteDialog = (item) => {
    setActiveItem(item);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!isSuperAdminUser) {
      toast.error("Security Policy: Only Super Admin can delete lost & found items.");
      return;
    }
    if (activeItem) {
      await dispatch(deleteLostFoundItem(activeItem.id));
      toast.success("Item removed successfully!");
      setDeleteOpen(false);
      setActiveItem(null);
    }
  };

  const handleApprove = async (item) => {
    if (!isSuperAdminUser) {
      toast.error("Security Policy: Only Super Admin can approve lost & found items.");
      return;
    }
    await dispatch(approveLostFoundItem(item.id));
    toast.success(`"${item.title}" approved and published!`);
    // Refresh the approved list too
    dispatch(fetchLostFoundItems({ forceRefresh: true }));
  };

  const handleReject = async (item) => {
    if (!isSuperAdminUser) {
      toast.error("Security Policy: Only Super Admin can reject lost & found items.");
      return;
    }
    await dispatch(rejectLostFoundItem(item.id));
    toast.info(`"${item.title}" rejected and removed.`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Lost & Found Desk
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Manage reported lost and found campus belongings.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="btn-primary-gradient flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer"
        >
          <FiPlus size={14} />
          <span>Report Item</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("registry")}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "registry"
              ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
          }`}
        >
          Registry
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === "pending"
              ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
          }`}
        >
          <FiBell size={11} />
          Pending Approvals
          {safePendingList.length > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-black">
              {safePendingList.length}
            </span>
          )}
        </button>
      </div>

      {/* Pending Approvals Tab */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {safePendingList.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-900 rounded-2xl">
              <FiCheckCircle size={36} className="text-green-400 mb-3" />
              <span className="text-xs font-semibold">No pending approvals — you're all caught up!</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {safePendingList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-950 border-2 border-amber-300/60 dark:border-amber-800/50 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between"
                >
                  {/* Image */}
                  <div className="relative h-44 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                    {item.photo_url || item.imageUrl || item.photoUrl ? (
                      <img src={item.photo_url || item.imageUrl || item.photoUrl} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-300 dark:text-slate-800">
                        <FiCamera size={36} />
                        <span className="text-[10px] font-bold mt-1 uppercase">No Photo</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-300/60">
                        <FiBell size={9} /> Awaiting Approval
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge variant={item.type === "Lost" ? "danger" : "blue"}>{item.type}</Badge>
                      </div>
                      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{item.title}</h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2 mt-1 leading-relaxed">{item.description}</p>
                    </div>

                    <div className="space-y-1 text-[10px] text-slate-500 dark:text-slate-400 font-semibold border-t border-slate-100 dark:border-slate-900/60 pt-2">
                      <div className="flex items-center gap-1.5">
                        <FiMapPin className="text-slate-400" />
                        <span className="truncate">{item.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FiUser className="text-slate-400" />
                        <span className="truncate">{item.reporterName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FiClock className="text-slate-400" />
                        <span>{item.date}</span>
                      </div>
                    </div>

                    {/* Approve / Reject */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-900/60">
                      <button
                        onClick={() => handleApprove(item)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-50 hover:bg-green-100 dark:bg-green-950/20 dark:hover:bg-green-900/30 border border-green-200/60 dark:border-green-900/40 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                      >
                        <FiCheckCircle size={11} />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleReject(item)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 border border-red-200/40 dark:border-red-900/30 text-red-500 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                      >
                        <FiXCircle size={11} />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Registry Tab */}
      {activeTab === "registry" && (
        <>
      {/* Filters & Search Panel */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-905 p-5 rounded-2xl shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search items, reporters..."
            value={searchQuery}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-hidden"
          />
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        </div>

        {/* Type / Status Selectors */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Type Filter */}
          <select
            value={filters.type}
            onChange={(e) => dispatch(setTypeFilter(e.target.value))}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="All">All Types</option>
            <option value="Lost">Lost Only</option>
            <option value="Found">Found Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => dispatch(setStatusFilter(e.target.value))}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Lost">Lost</option>
            <option value="Found">Found</option>
            <option value="Claimed">Claimed</option>
          </select>
        </div>
      </div>

      {/* Grid of Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading && safeFilteredList.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <span className="text-xs font-semibold">Loading items registry...</span>
          </div>
        ) : safeFilteredList.length > 0 ? (
          safeFilteredList.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-950 border border-slate-200/40 dark:border-slate-900 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              {/* Product Picture */}
              <div className="relative h-44 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 group">
                {item.photo_url || item.imageUrl || item.photoUrl ? (
                  <img
                    src={item.photo_url || item.imageUrl || item.photoUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center text-slate-300 dark:text-slate-800">
                    <FiCamera size={36} />
                    <span className="text-[10px] font-bold mt-1 uppercase">No Photo</span>
                  </div>
                )}

                {/* Badge tags */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  <Badge variant={item.type === "Lost" ? "danger" : "blue"}>
                    {item.type}
                  </Badge>
                  <Badge
                    variant={
                      item.status === "Claimed"
                        ? "success"
                        : item.status === "Found"
                        ? "blue"
                        : "danger"
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {item.title}
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-3 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Logistics */}
                <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-900/60 pt-3 text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <FiMapPin className="text-slate-400" />
                    <span className="truncate">{item.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FiClock className="text-slate-400" />
                    <span>{item.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-650 dark:text-slate-350">
                    <FiUser className="text-slate-400" />
                    <span className="truncate">{item.reporterName}</span>
                  </div>
                  {item.reporterPhone && (
                    <div className="flex items-center gap-1.5 font-mono text-[9px]">
                      <FiPhone className="text-slate-400" />
                      <span>{item.reporterPhone}</span>
                    </div>
                  )}
                </div>

                {/* Edit/Delete Actions */}
                <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-900/60 pt-3">
                  <button
                    onClick={() => openEditModal(item)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200/50 dark:border-slate-800 text-[10px] font-bold text-slate-650 dark:text-slate-350 rounded-lg cursor-pointer"
                  >
                    <FiEdit2 size={10} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => openDeleteDialog(item)}
                    className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 border border-red-200/40 dark:border-red-900/30 text-red-500 rounded-lg cursor-pointer shrink-0"
                    title="Delete entry"
                  >
                    <FiTrash2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
            <FiGrid size={40} className="text-slate-300 dark:text-slate-800" />
            <span className="text-xs font-semibold mt-3">No lost & found logs matched.</span>
          </div>
        )}
      </div>
        </>
      )}

      {/* Add / Edit Registry Dialog */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editMode ? "Modify Lost/Found Registry" : "Report Lost/Found Belonging"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Photo Uploader */}
          <div className="flex flex-col items-center justify-center border border-dashed border-slate-250 dark:border-slate-800 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 relative">
            {uploadingImage ? (
              <div className="flex flex-col items-center justify-center text-slate-400 py-4">
                <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2" />
                <span className="text-[10px] font-bold">Uploading Image to ImgBB...</span>
              </div>
            ) : imageUrlPreview ? (
              <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <img src={imageUrlPreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrlPreview("")}
                  className="absolute inset-0 bg-black/40 text-white flex items-center justify-center text-[10px] font-bold opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  Remove Image
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center cursor-pointer text-slate-450 dark:text-slate-500 py-3 w-full">
                <FiUploadCloud size={28} className="text-slate-400" />
                <span className="text-[10px] font-bold mt-1 uppercase">Upload Image (via ImgBB)</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Select jpg, png image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

            {/* Title */}
            <div className="flex flex-col sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Item Title</label>
              <input
                type="text"
                placeholder="e.g. Blue Water Bottle"
                {...register("title")}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.title ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs transition-colors`}
              />
              {errors.title && <span className="text-[9px] text-red-500 mt-1 font-semibold">{errors.title.message}</span>}
            </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Location */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Location Lost/Found</label>
              <input
                type="text"
                placeholder="e.g. Lab 4 (Campus)"
                {...register("location")}
                className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.location ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs`}
              />
              {errors.location && <span className="text-[9px] text-red-500 mt-1 font-semibold">{errors.location.message}</span>}
            </div>

            {/* Incident Date */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Date</label>
              <input
                type="date"
                {...register("date")}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Type */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Type</label>
              <select
                {...register("type")}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs"
              >
                <option value="Lost">Lost</option>
                <option value="Found">Found</option>
              </select>
            </div>

            {/* Status */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Status</label>
              <select
                {...register("status")}
                className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs"
              >
                <option value="Lost">Lost</option>
                <option value="Found">Found</option>
                <option value="Claimed">Claimed</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Item Description</label>
            <textarea
              placeholder="Provide identifiable markings, brand names, colors, etc."
              rows="3"
              {...register("description")}
              className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.description ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs focus:outline-hidden`}
            />
            {errors.description && <span className="text-[9px] text-red-500 mt-1 font-semibold">{errors.description.message}</span>}
          </div>

          {/* Reporter Details Section */}
          <div className="border-t border-slate-100 dark:border-slate-850 pt-4 mt-2">
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wide mb-3">Reporter Details</h4>
            
            <div className="space-y-4">
              {/* Reporter Name */}
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Abdur Rahman"
                  {...register("reporterName")}
                  className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.reporterName ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs`}
                />
                {errors.reporterName && <span className="text-[9px] text-red-500 mt-1 font-semibold">{errors.reporterName.message}</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Reporter Phone */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="01811223344"
                    {...register("reporterPhone")}
                    className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.reporterPhone ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs`}
                  />
                  {errors.reporterPhone && <span className="text-[9px] text-red-500 mt-1 font-semibold">{errors.reporterPhone.message}</span>}
                </div>

                {/* Reporter Email */}
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-505 dark:text-slate-400 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="rahman@gmail.com"
                    {...register("reporterEmail")}
                    className={`bg-slate-50 dark:bg-slate-950/40 border ${errors.reporterEmail ? "border-red-500" : "border-slate-200 dark:border-slate-800"} rounded-lg px-3 py-2 text-xs`}
                  />
                  {errors.reporterEmail && <span className="text-[9px] text-red-500 mt-1 font-semibold">{errors.reporterEmail.message}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-850 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadingImage}
              className="btn-primary-gradient px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer shadow-md disabled:opacity-50"
            >
              {editMode ? "Update Item" : "Report Item"}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Remove Lost & Found Listing"
        message={`Are you sure you want to remove the reported item "${activeItem?.title}" from the registry?`}
      />
    </div>
  );
};

export default LostFoundManagement;
