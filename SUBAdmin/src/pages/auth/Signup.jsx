// Student Registration Component (3-Stage Workflow matching Android SignupActivity.java)
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiUser,
  FiMail,
  FiLock,
  FiPhone,
  FiSun,
  FiMoon,
  FiArrowRight,
  FiArrowLeft,
  FiCheck,
  FiCalendar,
  FiMapPin,
  FiEye,
  FiEyeOff,
  FiHeart,
  FiShield,
  FiBook,
} from 'react-icons/fi';
import useTheme from '../../hooks/useTheme';
import authApi from '../../api/authApi';

// Canonical department definitions
const DEPARTMENTS = [
  { code: 'CSE', name: 'B.Sc. in Computer Science & Engineering (CSE)' },
  { code: 'DSE', name: 'B.Sc. in Data Science and Engineering (DSE)' },
  { code: 'ARCH', name: 'Bachelor of Architecture (B.Arch)' },
  { code: 'BBA', name: 'Bachelor of Business Administration (BBA)' },
  { code: 'ENG', name: 'BA (Hons) in English' },
  { code: 'ES', name: 'B.Sc. in Environmental Science' },
  { code: 'FENS', name: 'B.Sc. in Food Engineering and Nutrition Science' },
  { code: 'JCMS', name: 'BSS (Hons) in Journalism, Communication and Media Studies' },
  { code: 'LLB', name: 'LL.B. (Hons) - Bachelor of Laws' },
  { code: 'B.PHARM', name: 'B. Pharm (Bachelor of Pharmacy)' },
  { code: 'MIB', name: 'Bachelor of Science in Microbiology' },
];

const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female'];

const CITY_AREAS = {
  Dhaka: [
    'Adabor', 'Badda', 'Bangshal', 'Cantonment', 'Chawkbazar', 'Dakshinkhan',
    'Darus Salam', 'Demra', 'Dhanmondi', 'Gendaria', 'Gulshan', 'Hazaribagh',
    'Jatrabari', 'Kadamtali', 'Kafrul', 'Kalabagan', 'Kamrangirchar', 'Khilgaon',
    'Khilkhet', 'Kotwali', 'Lalbagh', 'Mirpur', 'Mohammadpur', 'Motijheel',
    'New Market', 'Pallabi', 'Paltan', 'Ramna', 'Rampura', 'Sabujbagh',
    'Shah Ali', 'Shahbagh', 'Sher-e-Bangla Nagar', 'Shyampur', 'Sutrapur',
    'Tejgaon', 'Tejgaon Industrial Area', 'Turag', 'Uttara', 'Uttara East',
    'Uttara West', 'Uttarkhan', 'Vatara', 'Wari', 'Ashulia', 'Savar',
    'Dhamrai', 'Keraniganj', 'South Keraniganj', 'Dohar', 'Nawabganj', 'Purbachal'
  ],
  Gazipur: [
    'Gazipur Sadar', 'Tongi', 'Joydebpur', 'Gacha', 'Basan', 'Kashimpur',
    'Konabari', 'Board Bazar', 'Gazipur Chowrasta', 'Pubail', 'Kaliakair',
    'Kaliganj', 'Kapasia', 'Sreepur', 'Mawna', 'Rajendrapur'
  ],
  Mymensingh: [
    'Mymensingh Sadar', 'Bhaluka', 'Dhobaura', 'Fulbaria', 'Gafargaon',
    'Gouripur', 'Haluaghat', 'Ishwarganj', 'Muktagacha', 'Nandail',
    'Phulpur', 'Tarakanda', 'Trishal'
  ],
  Narayanganj: [
    'Narayanganj Sadar', 'Chashara', 'Fatullah', 'Siddhirganj', 'Bandar',
    'Rupganj', 'Sonargaon', 'Araihazar', 'Signboard', 'Kanchpur', 'Madanpur',
    'Bhulta', 'Murapara', 'Pagla', 'Adamjee', 'Shimrail', 'Mograpara', 'Bhoberchar'
  ],
  Narsingdi: [
    'Narsingdi Sadar', 'Madhabdi', 'Belabo', 'Monohardi', 'Palash',
    'Raipura', 'Shibpur', 'Ghorashal', 'Char Sindur', 'Velanagar', 'Panchdona'
  ],
};

const CITIES = Object.keys(CITY_AREAS);

const STUDENT_ID_REGEX = /^UG\d{2}-\d{2}-\d{2}-\d{3}$/i;
const PHONE_REGEX = /^(?:\+?88)?01\d{9}$/;

export const Signup = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Wizard Stage: 1 | 2 | 3
  const [stage, setStage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  // Stage 1 Fields: Account Info
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Stage 2 Fields: Academic Details
  const [department, setDepartment] = useState('CSE');
  const [academicSystem, setAcademicSystem] = useState('Semester');
  const [term, setTerm] = useState('Semester 1');
  const [section, setSection] = useState('A');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');

  // Stage 3 Fields: Personal & Location
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [allowBloodDonation, setAllowBloodDonation] = useState(true);
  const [city, setCity] = useState('Dhaka');
  const [area, setArea] = useState(CITY_AREAS.Dhaka[0]);

  // Handle department change (ARCH forces Architecture system)
  const handleDeptChange = (newDept) => {
    setDepartment(newDept);
    if (newDept === 'ARCH') {
      setAcademicSystem('Architecture');
      setTerm('Studio 1');
    } else {
      if (academicSystem === 'Architecture') {
        setAcademicSystem('Semester');
        setTerm('Semester 1');
      }
    }
  };

  const handleAcademicSystemChange = (newSystem) => {
    setAcademicSystem(newSystem);
    if (newSystem === 'Semester') {
      setTerm('Semester 1');
    } else if (newSystem === 'Trimester') {
      setTerm('Trimester 1');
    } else if (newSystem === 'Architecture') {
      setTerm('Studio 1');
    }
  };

  const handleCityChange = (newCity) => {
    setCity(newCity);
    const areas = CITY_AREAS[newCity] || [];
    setArea(areas[0] || '');
  };

  const getDynamicTerms = () => {
    if (academicSystem === 'Architecture' || department === 'ARCH') {
      return Array.from({ length: 10 }, (_, i) => `Studio ${i + 1}`);
    }
    if (academicSystem === 'Trimester') {
      return Array.from({ length: 12 }, (_, i) => `Trimester ${i + 1}`);
    }
    return Array.from({ length: 8 }, (_, i) => `Semester ${i + 1}`);
  };

  const isAllowedEmail = (val) => {
    const lower = val.toLowerCase().trim();
    const allowed = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'sub.edu.bd'];
    return allowed.some((domain) => lower.endsWith(`@${domain}`) || lower.includes(`@${domain}`));
  };

  // Stage 1 Validation & Uniqueness Check
  const handleProceedStage1 = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Full name is required');
      return;
    }
    const cleanId = studentId.trim().toUpperCase();
    if (!STUDENT_ID_REGEX.test(cleanId)) {
      toast.error('Student ID must match format UGxx-xx-xx-xxx (e.g. UG09-59-25-004)');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Valid email address is required');
      return;
    }
    if (!isAllowedEmail(email)) {
      toast.error('Only Gmail, Yahoo, Outlook, Hotmail, and university addresses are allowed');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!PHONE_REGEX.test(phone.trim())) {
      toast.error('Please enter a valid 11-digit Bangladeshi mobile number (01xxxxxxxxx)');
      return;
    }

    setLoading(true);
    try {
      const exists = await authApi.checkStudentId(cleanId);
      if (exists) {
        toast.error('This Student ID is already registered! Please login or reset your password.');
        setLoading(false);
        return;
      }
      setStage(2);
    } catch (err) {
      console.warn('Student ID check failed:', err);
      setStage(2);
    } finally {
      setLoading(false);
    }
  };

  // Stage 2 Validation
  const handleProceedStage2 = (e) => {
    e.preventDefault();
    if (!department) {
      toast.error('Department is required');
      return;
    }
    if (!dob) {
      toast.error('Date of birth is required');
      return;
    }
    setStage(3);
  };

  // Stage 3 Submission
  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!city || !area) {
      toast.error('City and Area/Thana are required');
      return;
    }

    // Auto extract batch from Student ID e.g. UG09-59-25-004 -> "59th Batch"
    let autoBatch = 'N/A';
    const cleanId = studentId.trim().toUpperCase();
    if (cleanId.includes('-')) {
      const parts = cleanId.split('-');
      if (parts.length >= 2) {
        autoBatch = `${parts[1]}th Batch`;
      }
    }

    setLoading(true);
    try {
      await authApi.signup({
        name: name.trim(),
        studentId: cleanId,
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        department,
        batch: autoBatch,
        academicSystem,
        academicLevel: term,
        section,
        gender,
        bloodGroup,
        allowBloodDonation,
        city,
        area,
        dob,
      });

      setRegistrationComplete(true);
      toast.success('Registration Successful! 🎉');
    } catch (err) {
      toast.error(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-8 transition-colors duration-200">
      {/* Theme Toggle in top-right */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
        title="Toggle Theme"
      >
        {theme === 'light' ? <FiMoon className="text-lg" /> : <FiSun className="text-lg text-yellow-400" />}
      </button>

      {/* Main card */}
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between relative">
        {/* Registration Complete Modal Dialog */}
        {registrationComplete && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-3xl">
                <FiCheck />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Registration Successful! 🎉
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Welcome to SUBTools! Your student account has been provisioned and your profile is active in State University of Bangladesh database. You can now sign in immediately.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all cursor-pointer"
              >
                Sign In Now
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center mx-auto shadow-md shadow-blue-600/30 font-black text-white text-lg mb-3">
            S
          </div>
          <h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Create Student Account
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Join SUBTools ecosystem • State University of Bangladesh
          </p>

          {/* Progress Bar & Stage Indicator */}
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span>
                {stage === 1 && 'Step 1 of 3: Account Information'}
                {stage === 2 && 'Step 2 of 3: Academic Details'}
                {stage === 3 && 'Step 3 of 3: Personal & Location'}
              </span>
              <span className="text-blue-600 dark:text-blue-400">
                {stage === 1 && '33%'}
                {stage === 2 && '66%'}
                {stage === 3 && '100%'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${(stage / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* STAGE 1: ACCOUNT INFORMATION */}
        {stage === 1 && (
          <form onSubmit={handleProceedStage1} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Full Name *
              </label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Akon M Hasib"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Student ID * (UGxx-xx-xx-xxx)
              </label>
              <div className="relative">
                <FiShield className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. UG09-59-25-004"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                  required
                  className="w-full font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Email Address * (Gmail, Yahoo, Outlook, SUB)
              </label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="e.g. student@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Mobile Number * (01xxxxxxxxx)
              </label>
              <div className="relative">
                <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  placeholder="e.g. 01712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Password * (minimum 6 characters)
              </label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Continue to Academic Details</span>
                  <FiArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        )}

        {/* STAGE 2: ACADEMIC DETAILS */}
        {stage === 2 && (
          <form onSubmit={handleProceedStage2} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Department *
              </label>
              <select
                value={department}
                onChange={(e) => handleDeptChange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {department !== 'ARCH' && (
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Academic System *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Semester', 'Trimester'].map((sys) => (
                    <button
                      type="button"
                      key={sys}
                      onClick={() => handleAcademicSystemChange(sys)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        academicSystem === sys
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {sys}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  {department === 'ARCH' ? 'Current Studio *' : 'Current Term *'}
                </label>
                <select
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
                >
                  {getDynamicTerms().map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Section *
                </label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
                >
                  {SECTIONS.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Gender *
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
                >
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStage(1)}
                className="w-1/3 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer"
              >
                <FiArrowLeft size={14} />
                <span>Back</span>
              </button>
              <button
                type="submit"
                className="w-2/3 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Continue to Location</span>
                <FiArrowRight size={14} />
              </button>
            </div>
          </form>
        )}

        {/* STAGE 3: PERSONAL & LOCATION */}
        {stage === 3 && (
          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Blood Group *
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
                >
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Blood Donor? *
                </label>
                <select
                  value={allowBloodDonation ? 'Yes' : 'No'}
                  onChange={(e) => setAllowBloodDonation(e.target.value === 'Yes')}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
                >
                  <option value="Yes">Yes (Emergency Donor)</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  City *
                </label>
                <select
                  value={city}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Area / Thana *
                </label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-blue-500"
                >
                  {(CITY_AREAS[city] || []).map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-slate-700 dark:text-slate-300">
              <p className="font-semibold text-blue-900 dark:text-blue-300 mb-1">Account Summary:</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Department: <strong>{department}</strong> • Term: <strong>{term}</strong> (Sec: {section}) • Location: <strong>{area}, {city}</strong>
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStage(2)}
                className="w-1/3 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer"
              >
                <FiArrowLeft size={14} />
                <span>Back</span>
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Account</span>
                    <FiCheck size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="mt-6 text-center border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Already have a student account?{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
