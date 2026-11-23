import { useState, useRef } from 'react';
import { isSuperAdmin } from "../../utils/permissionUtils";
import { useSelector, useDispatch } from 'react-redux';
import { FiUser, FiMail, FiBookmark, FiCalendar, FiShield, FiCamera, FiLoader } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Badge from '../../components/common/Badge';
import { updateAdminProfile } from '../../redux/slices/authSlice';
import { uploadImageToImgBB } from '../../utils/imageUpload';
import ProfileImageCropperModal from '../../components/common/ProfileImageCropperModal';
import { getDepartmentFullName } from '../../utils/academic';

const formatRole = (role) => {
  if (!role) return 'Administrator';
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'admin') return 'Admin';
  return role.charAt(0).toUpperCase() + role.slice(1);
};

export const Profile = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const [cropperImageSrc, setCropperImageSrc] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropperImageSrc(ev.target.result);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmCrop = async (croppedBlob) => {
    setCropperImageSrc(null);
    setIsUploading(true);

    try {
      const url = await uploadImageToImgBB(croppedBlob);
      await dispatch(updateAdminProfile({ photo_url: url, photoURL: url })).unwrap();
      toast.success("Profile photo cropped (1:1), compressed (≤50KB) and updated!");
    } catch (err) {
      console.error("Failed to upload avatar:", err);
      toast.error(err.message || "Failed to upload avatar to ImgBB.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Admin Profile
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
          View your supervisor credentials, clearance permissions, and audit logs.
        </p>
      </div>

      <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">

        {/* Profile Avatar Graphic */}
        <div className="shrink-0 relative group">
          <img
            src={user?.photo_url || user?.photoURL || (isSuperAdmin(user) ? '/Profile.jpg' : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Admin')}&background=3b82f6&color=fff&size=160`)}
            alt="Profile Avatar"
            className="w-28 h-28 rounded-full object-cover ring-4 ring-slate-100 dark:ring-slate-800/80 shadow-md"
          />

          {/* Camera upload overlay */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute inset-0 rounded-full bg-slate-950/50 backdrop-blur-xs flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-bold gap-1"
            title="Upload profile picture"
          >
            {isUploading ? <FiLoader className="animate-spin text-lg" /> : <FiCamera className="text-xl" />}
            <span className="text-[10px]">{isUploading ? "Uploading..." : "Change"}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelect}
          />

          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2">
            <Badge variant="success" className="shadow-xs font-display">
              Online
            </Badge>
          </div>
        </div>

        {/* Profile details grid */}
        <div className="flex-1 space-y-4 w-full text-center md:text-left">
          <div>
            <h2 className="text-base font-extrabold text-slate-850 dark:text-slate-100 font-display">
              {user?.name || auth?.currentUser?.displayName || user?.email || 'Administrator'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{user?.uid || 'admin-uid-1'}</p>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Email */}
            <div className="flex items-start justify-center md:justify-start space-x-3 text-left">
              <div className="p-2 bg-slate-50 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800 text-slate-550 rounded-xl text-xs">
                <FiMail />
              </div>
              <div className="flex flex-col text-[11px] leading-tight">
                <span className="text-slate-400 dark:text-slate-500 font-semibold mb-0.5">Email Address</span>
                <span className="text-slate-700 dark:text-slate-350 font-bold">{user?.email || 'akonmhasib@gmail.com'}</span>
              </div>
            </div>

            {/* Role Clearance */}
            <div className="flex items-start justify-center md:justify-start space-x-3 text-left">
              <div className="p-2 bg-slate-50 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800 text-slate-550 rounded-xl text-xs">
                <FiShield />
              </div>
              <div className="flex flex-col text-[11px] leading-tight">
                <span className="text-slate-400 dark:text-slate-500 font-semibold mb-0.5">Clearance Role</span>
                <span className="text-slate-750 dark:text-slate-350 font-bold">{formatRole(user?.role)}</span>
              </div>
            </div>

            {/* Department */}
            <div className="flex items-start justify-center md:justify-start space-x-3 text-left">
              <div className="p-2 bg-slate-50 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800 text-slate-550 rounded-xl text-xs">
                <FiBookmark />
              </div>
              <div className="flex flex-col text-[11px] leading-tight">
                <span className="text-slate-400 dark:text-slate-500 font-semibold mb-0.5">Department Mappings</span>
                <span className="text-slate-750 dark:text-slate-350 font-bold">University Admin Panel</span>
              </div>
            </div>

            {/* Session Created */}
            <div className="flex items-start justify-center md:justify-start space-x-3 text-left">
              <div className="p-2 bg-slate-50 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800 text-slate-550 rounded-xl text-xs">
                <FiCalendar />
              </div>
              <div className="flex flex-col text-[11px] leading-tight">
                <span className="text-slate-400 dark:text-slate-500 font-semibold mb-0.5">Session Created At</span>
                <span className="text-slate-750 dark:text-slate-350 font-bold">Today, 06:24 AM</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;
