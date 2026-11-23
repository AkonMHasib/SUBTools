import { useState } from 'react';
import Dialog from '../common/Dialog';
import Badge from '../common/Badge';
import { FiUser, FiMail, FiPhone, FiCalendar, FiBookOpen, FiBookmark, FiShield, FiClock, FiKey, FiMapPin, FiHeart, FiDroplet } from 'react-icons/fi';

import { formatDOBDisplay, getDepartmentName } from '../../utils/academic';
import { getUserRoles } from '../../utils/permissionUtils';
import ResetPasswordDialog from './ResetPasswordDialog';

export const UserDetailDialog = ({ isOpen, onClose, user }) => {
  const [imgError, setImgError] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  if (!user) return null;

  const photoUrl =
    user.photo_url ||
    user.photoURL ||
    user.photoUrl ||
    user.profileImage ||
    user.avatar ||
    user.avatarUrl ||
    user.image ||
    user.photo ||
    user.picture;

  const deptFullName = getDepartmentName(user.department) || user.department;
  const phoneNumber = user.phone || user.phoneNumber || user.contactPhone || 'Not Set';
  const device = user.deviceModel
    ? `${user.deviceManufacturer ? user.deviceManufacturer + ' ' : ''}${user.deviceModel} ${user.androidVersion ? '(Android ' + user.androidVersion + ')' : ''}`
    : (user.device || 'N/A');

  const userRoles = getUserRoles(user);
  const formattedRoles = userRoles
    .map((r) => (r === 'super_admin' ? 'Super Admin' : r === 'admin' ? 'Admin' : 'Student'))
    .join(', ');

  const studentId = user.studentId || user.student_id || user.data?.studentId || user.data?.student_id || 'Not Assigned';
  const bloodGroup = user.bloodGroup || user.blood_group || user.data?.bloodGroup || user.data?.blood_group || 'Not Set';
  const batch = user.batch || user.data?.batch ? `Batch ${user.batch || user.data?.batch}` : 'N/A';
  const academicLevel = user.academicLevel || user.academic_level || user.term || user.data?.academicLevel || user.data?.academic_level || 'N/A';
  const academicSystem = user.academicSystem || user.academic_system || user.data?.academicSystem || user.data?.academic_system || 'Semester';
  const location = user.location || user.data?.location || (user.area && user.city ? `${user.area}, ${user.city}` : user.city || user.area || 'Not Set');

  const details = [
    { label: 'Student ID', value: studentId, icon: FiBookmark },
    { label: 'Full Name', value: user.name || user.fullName || user.data?.name || 'Student', icon: FiUser },
    { label: 'Assigned Role(s)', value: formattedRoles, icon: FiShield },
    { label: 'Email Address', value: user.email, icon: FiMail },
    { label: 'Phone Number', value: phoneNumber, icon: FiPhone },
    { label: 'Department', value: deptFullName, icon: FiBookOpen },
    { label: 'Batch', value: batch, icon: FiBookmark },
    { label: 'Academic System', value: academicSystem, icon: FiBookOpen },
    { label: 'Academic Level', value: academicLevel, icon: FiBookOpen },
    { label: 'Blood Group', value: bloodGroup, icon: FiDroplet },
    { label: 'Location', value: location, icon: FiMapPin },
    { label: 'Account Status', value: user.authMissing ? 'Auth Missing' : (user.disabled || user.status === 'banned' ? 'Banned / Disabled' : 'Active'), icon: FiShield },
    { label: 'Last Known IP', value: user.lastIp || user.ip || user.data?.lastIp || 'N/A', icon: FiKey },
    { label: 'Device Model', value: device, icon: FiShield },
    { label: 'Auth Created', value: user.creationTime ? new Date(user.creationTime).toLocaleString() : 'N/A', icon: FiCalendar },
    { label: 'Last Sign-in', value: user.lastSignInTime || user.lastLoginAt || user.data?.lastLoginAt ? new Date(user.lastSignInTime || user.lastLoginAt || user.data?.lastLoginAt).toLocaleString() : 'N/A', icon: FiClock },
  ];

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Student Profile Details" size="md">
      <div className="flex flex-col items-center mb-6">
        <div className="relative mb-3">
          {photoUrl && !imgError ? (
            <img
              src={photoUrl}
              alt={user.name}
              onError={() => setImgError(true)}
              className="w-20 h-20 rounded-full object-cover border-2 border-blue-500/40 shadow-md"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-3xl flex items-center justify-center shadow-md">
              {user.name ? user.name.charAt(0).toUpperCase() : "S"}
            </div>
          )}
        </div>
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{user.name || user.fullName || user.data?.name || "Student"}</h4>
        {studentId !== 'Not Assigned' && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{studentId}</span>
        )}
        
        <div className="mt-2.5 flex items-center gap-2 flex-wrap justify-center">
          {userRoles.map((role) => {
            if (role === 'super_admin') {
              return (
                <span
                  key="super_admin"
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50"
                >
                  Super Admin
                </span>
              );
            }
            if (role === 'admin') {
              return (
                <span
                  key="admin"
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/50"
                >
                  Admin
                </span>
              );
            }
            return (
              <span
                key="student"
                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50"
              >
                Student
              </span>
            );
          })}
          <Badge variant={(user.status || 'Active') === 'Active' ? 'success' : 'danger'}>
            {user.status || 'Active'}
          </Badge>
          {user.bloodGroup && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-[10px] font-bold border border-red-200 dark:border-red-900/40">
              <FiDroplet size={10} />
              {user.bloodGroup}
            </span>
          )}
          {user.allowBloodDonation && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-200 dark:border-rose-900/40">
              <FiHeart size={10} />
              Donor
            </span>
          )}
          {user.location && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-semibold border border-slate-200 dark:border-slate-700">
              <FiMapPin size={10} />
              {user.location}
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {details.map((detail, idx) => {
            const Icon = detail.icon;
            return (
              <div key={idx} className="bg-slate-50/50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800/40 flex items-start space-x-3">
                <div className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-500 rounded-lg text-sm shrink-0">
                  <Icon />
                </div>
                <div className="flex flex-col text-[11px] leading-tight">
                  <span className="text-slate-400 dark:text-slate-500 font-semibold mb-0.5">{detail.label}</span>
                  <span className="text-slate-700 dark:text-slate-300 font-bold break-all">{detail.value}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setIsResetOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-amber-200/60 dark:border-amber-800/50"
        >
          <FiKey className="w-3.5 h-3.5" /> Reset Password
        </button>

        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
        >
          Close Drawer
        </button>
      </div>

      <ResetPasswordDialog
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        user={user}
      />
    </Dialog>
  );
};

export default UserDetailDialog;
