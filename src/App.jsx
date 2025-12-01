import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Camera, QrCode, LogOut, FileText, List, CheckCircle, XCircle, User, Zap, Calendar, Users, Briefcase, ChevronLeft, Download, Link, Trash2, Share2, Plus, Minus, Mail, Clock } from 'lucide-react';

// --- Global Constants and Utilities (Simulating Backend Data & Services) ---

const MOCK_API_KEY = ""; // Placeholder for Gemini API key, not used for the app logic
const TRUSTEE_EMAIL = 'trusteelogin@app.com';
const TRUSTEE_PASSWORD = 'TRUST45332784';
const PRO_EMAIL = 'proteamlogin@app.com';
const PRO_PASSWORD = 'PRO4517084';

// VERCEL FRIENDLY: Base URL construction for deep linking
const getBaseUrl = () => {
    return window.location.origin;
};

const generateUniqueId = () => `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

// Replaced alert() with a simple custom message display utility
const showMessage = (message, type = 'success') => {
  const container = document.getElementById('message-container');
  if (!container) return console.warn('Message container not found.');
  
  const element = document.createElement('div');
  element.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-xl text-white font-semibold transition-opacity duration-300 ${
    type === 'success' ? 'bg-green-600' : 'bg-red-600'
  }`;
  element.textContent = message;
  
  container.appendChild(element);
  
  setTimeout(() => {
    element.style.opacity = '0';
    setTimeout(() => container.removeChild(element), 300);
  }, 3000);
};

// Utility to get initial state from localStorage
const getInitialData = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error("Error loading data from localStorage:", error);
    return defaultValue;
  }
};

// --- QR Code SVG Generation Function (Self-contained replacement for qrcode.react) ---
const QRCodeSVG = ({ value, size = 200, foreground = '#c2410c', background = '#ffffff' }) => {
    const qrcode = useMemo(() => {
        const blocks = [];
        const moduleSize = size / 29; // Use 29x29 grid for better visual complexity

        for (let i = 0; i < 29; i++) {
            for (let j = 0; j < 29; j++) {
                // Generate a pseudo-random yet consistent pattern based on indices
                // Added logic for the three corner alignment patterns (finders)
                const isFinder = 
                    ((i < 7 || i > 21) && (j < 7)) ||
                    ((i < 7) && (j > 21)) ||
                    ((i > 21) && (j > 21));

                let isBlock = (i % 5 === 0 || j % 5 === 0) ^ (i * j % 7 < 3);

                if (isFinder) {
                    // Create solid finder pattern blocks
                    isBlock = (i < 2 || i > 4) && (j < 2 || j > 4);
                    if (i > 21) isBlock = ((i - 22) < 2 || (i - 22) > 4) && (j < 2 || j > 4);
                    if (j > 21) isBlock = (i < 2 || i > 4) && ((j - 22) < 2 || (j - 22) > 4);
                    if (i > 21 && j > 21) isBlock = ((i - 22) < 2 || (i - 22) > 4) && ((j - 22) < 2 || (j - 22) > 4);
                }

                if (isBlock) {
                    blocks.push(
                        <rect 
                            key={`${i}-${j}`}
                            x={j * moduleSize} 
                            y={i * moduleSize} 
                            width={moduleSize} 
                            height={moduleSize} 
                            fill={foreground}
                        />
                    );
                }
            }
        }

        return (
            <svg id="qr-svg-export" width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
                <rect width={size} height={size} fill={background} />
                {blocks}
            </svg>
        );
    }, [value, size, foreground, background]);

    return qrcode;
};

// --- NEW UTILITY: Converts SVG XML to an Image Data URL (Base64) ---
// This is required to make the SVG shareable/downloadable like a PNG/JPEG.
const svgToDataURL = (svgElement) => {
    return new Promise((resolve) => {
        const svgString = new XMLSerializer().serializeToString(svgElement);
        // Clean up the string for use in a data URL
        const encoded = encodeURIComponent(svgString)
            .replace(/%20/g, ' ')
            .replace(/%0A/g, ' ')
            .replace(/%0D/g, ' ');

        const dataUrl = `data:image/svg+xml;charset=utf-8,${encoded}`;
        resolve(dataUrl);
    });
};


// --- Main Application Component ---

const App = () => {
  // --- State Management ---
  const [auth, setAuth] = useState(getInitialData('appAuth', { isLoggedIn: false, role: null, email: '' }));
  const [requests, setRequests] = useState(getInitialData('appRequests', []));
  const [currentPage, setCurrentPage] = useState('login'); // login | form | list | ticket | scan
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false); // State for delete confirmation
  const [itemToDelete, setItemToDelete] = useState(null);
  const [cameraStatus, setCameraStatus] = useState(null); // New state for camera access status

  // --- Persistence Effect (Simulating Database Sync) ---
  useEffect(() => {
    localStorage.setItem('appAuth', JSON.stringify(auth));
    localStorage.setItem('appRequests', JSON.stringify(requests));
  }, [auth, requests]);

  // --- Computed State ---
  const selectedRequest = useMemo(() => 
    requests.find(r => r.id === selectedRequestId), 
    [requests, selectedRequestId]
  );
  
  const trusteeRequests = useMemo(() => 
    requests.filter(r => r.email === auth.email).sort((a, b) => b.timestamp - a.timestamp),
    [requests, auth.email]
  );

  // --- Auth Handlers ---
  const handleLogin = (email, password, role) => {
    let requiredPassword = '';
    let requiredEmail = '';
    
    if (role === 'trustee') {
        requiredEmail = TRUSTEE_EMAIL;
        requiredPassword = TRUSTEE_PASSWORD;
    } else if (role === 'pro') {
        requiredEmail = PRO_EMAIL;
        requiredPassword = PRO_PASSWORD;
    }

    if (email === requiredEmail && password === requiredPassword) {
      setAuth({ isLoggedIn: true, role, email });
      setLoginError('');
      if (role === 'trustee') setCurrentPage('list');
      if (role === 'pro') setCurrentPage('scan');
    } else {
      setLoginError(`Invalid credentials. Use ${requiredEmail} and password ${requiredPassword}.`);
    }
  };

  const handleLogout = () => {
    setAuth({ isLoggedIn: false, role: null, email: '' });
    setCurrentPage('login');
    setSelectedRequestId(null);
  };

  // --- Navigation & Flow Handlers ---
  const goToTicket = useCallback((id) => {
    setSelectedRequestId(id);
    setCurrentPage('ticket'); // Page 2
  }, []);
  
  const goToList = useCallback(() => {
    setCurrentPage('list'); // Page 3
    setSelectedRequestId(null);
  }, []);

  // --- Request Handlers (Simulating API Calls) ---
  const handleNewRequestSubmit = useCallback((formState) => {
    const newRequest = {
      ...formState,
      id: generateUniqueId(),
      email: auth.email,
      timestamp: Date.now(),
      status: 'Pending',
      entryGate: 'C', // Mock
    };
    setRequests(prev => [...prev, newRequest]);
    showMessage('Request submitted successfully!', 'success');
    goToList();
  }, [auth.email, goToList]);

  // Combined delete function for card delete button (Page 3) and trash button (Page 2)
  const handleDeleteRequest = useCallback((id) => {
    setRequests(prev => prev.filter(req => req.id !== id));
    showMessage('Request successfully removed.', 'success');
    goToList(); // Return to dashboard after deleting from ticket page
  }, [goToList]);
  
  // Initiates the confirmation modal
  const confirmDelete = (id) => {
    setItemToDelete(id);
    setShowConfirmation(true);
  };
  
  // Executes the delete after confirmation
  const executeDelete = () => {
    if (itemToDelete) {
      handleDeleteRequest(itemToDelete);
      setItemToDelete(null);
    }
    setShowConfirmation(false);
  };


  // *** UPDATED: Change status from 'Verified' to 'Done' ***
  const handleVerification = (requestId) => {
    const updatedRequests = requests.map(req => 
      req.id === requestId ? { ...req, status: 'Done' } : req
    );
    setRequests(updatedRequests);
    showMessage('Request marked as Darshan Done!', 'success');
  };

  // --- Modals ---
  const ConfirmationModal = ({ title, message, onConfirm, onCancel }) => {
    if (!showConfirmation) return null;
    return (
        <div className="fixed inset-0 bg-orange-950 bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onCancel}>
            <div 
                className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <Trash2 className="w-10 h-10 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-orange-950 mb-2 text-center">{title}</h3>
                <p className="text-gray-600 text-center mb-6">{message}</p>
                
                <div className="flex space-x-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-orange-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition"
                    >
                        Confirm Delete
                    </button>
                </div>
            </div>
        </div>
    );
  };

  // --- Sub-Components (Pages) ---

  const AuthPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('trustee');

    const handleSubmit = (e) => {
      e.preventDefault();
      handleLogin(email, password, role);
    };

    const displayPassword = role === 'trustee' ? TRUSTEE_PASSWORD : PRO_PASSWORD;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-orange-50 p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl border-t-4 border-orange-500">
          <h1 className="text-3xl font-extrabold text-orange-600 mb-6 text-center">App Login</h1>
          
          <div className="flex mb-6 space-x-2 p-1 bg-orange-50 rounded-lg">
            <button 
              onClick={() => setRole('trustee')} 
              className={`flex-1 py-2 rounded-lg transition-colors font-medium ${role === 'trustee' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-600 hover:bg-orange-100'}`}
            >
              Trustee
            </button>
            <button 
              onClick={() => setRole('pro')} 
              className={`flex-1 py-2 rounded-lg transition-colors font-medium ${role === 'pro' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-600 hover:bg-orange-100'}`}
            >
              Pro Team
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <label htmlFor="email" className="text-sm font-medium text-gray-700 block mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 transition duration-150"
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div className="relative">
              <label htmlFor="password" className="text-sm font-medium text-gray-700 block mb-1">Password </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 transition duration-150"
                placeholder="Enter password"
                required
              />
            </div>
            
            {loginError && (
              <p className="text-red-600 text-sm p-2 bg-red-50 rounded-lg border border-red-200">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-orange-600 text-white font-semibold rounded-lg shadow-lg hover:bg-orange-700 transition duration-200 focus:outline-none focus:ring-4 focus:ring-orange-500 focus:ring-opacity-50 mt-6"
            >
              Login / Register
            </button>
          </form>
        </div>
      </div>
    );
  };

  // Component manages its own form state to prevent focus loss issues
  const TrustyForm = ({ onSubmit, onBack }) => { // Page 1: Form Submission
    
    // Updated Category List
    const categories = [
      { key: 'VIP (Vastra)', icon: <Zap className="w-5 h-5" />, label: 'VIP (Vastra)' },
      { key: 'VIP (Reference)', icon: <Briefcase className="w-5 h-5" />, label: 'VIP (Reference)' },
      { key: 'Medical', icon: <User className="w-5 h-5" />, label: 'Medical' },
      { key: 'Senior Citizen', icon: <Users className="w-5 h-5" />, label: 'Senior Citizen' },
    ];

    const [form, setForm] = useState({ 
        name: '', 
        phone: '', 
        optionalEmail: '',
        guests: 1, 
        category: 'VIP (Vastra)', 
        date: new Date().toISOString().substring(0, 10), // Default to today
        timeHour: '09',
        timeMinute: '00',
        timePeriod: 'AM',
        referenceName: '', 
        vastraCount: 0, 
        vastraRecipients: [], // NEW: Names of guests who need Vastra
    });

    // Helper for time slot conversion to string
    const formatTimeSlot = () => `${form.timeHour}:${form.timeMinute} ${form.timePeriod}`;

    const validateEmail = (email) => {
        if (!email) return true; // Optional, so empty is fine
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    }, []);
    
    const handlePhoneChange = useCallback((e) => {
        const value = e.target.value.replace(/[^0-9]/g, ''); // Only allow numbers
        if (value.length <= 10) {
            setForm(prev => ({ ...prev, phone: value }));
        }
    }, []);

    const handleGuestChange = useCallback((amount) => {
        setForm(prev => {
            const newGuests = Math.max(1, prev.guests + amount);
            const newVastraCount = Math.min(prev.vastraCount, newGuests);
            
            // Synchronize recipients array length to the new Vastra count
            let newRecipients = Array.from({ length: newVastraCount }, (_, i) => 
                prev.vastraRecipients[i] || ''
            );

            return { ...prev, guests: newGuests, vastraCount: newVastraCount, vastraRecipients: newRecipients };
        });
    }, []);

    const handleVastraChange = useCallback((amount) => {
        setForm(prev => {
            const newVastraCount = Math.max(0, prev.vastraCount + amount);
            const finalCount = Math.min(newVastraCount, prev.guests);
            
            // Synchronize recipients array length
            let newRecipients = Array.from({ length: finalCount }, (_, i) => 
                prev.vastraRecipients[i] || ''
            );

            return { ...prev, vastraCount: finalCount, vastraRecipients: newRecipients };
        });
    }, []);
    
    const handleRecipientNameChange = useCallback((index, name) => {
        setForm(prev => {
            const newRecipients = [...prev.vastraRecipients];
            newRecipients[index] = name;
            return { ...prev, vastraRecipients: newRecipients };
        });
    }, []);
    
    const handleTimeChange = useCallback((name, value) => {
        let numericValue = parseInt(value, 10);
        
        if (name === 'timeHour') {
            if (numericValue < 1 || numericValue > 12 || isNaN(numericValue)) numericValue = 1;
            setForm(prev => ({ ...prev, timeHour: String(numericValue).padStart(2, '0') }));
        } else if (name === 'timeMinute') {
            if (numericValue < 0 || numericValue > 59 || isNaN(numericValue)) numericValue = 0;
            setForm(prev => ({ ...prev, timeMinute: String(numericValue).padStart(2, '0') }));
        }
    }, []);

    const handleCategoryChange = useCallback((newCategory) => {
        setForm(prev => {
            let updates = { category: newCategory };
            // Reset conditional fields when category changes
            if (newCategory !== 'VIP (Reference)') updates.referenceName = '';
            if (newCategory !== 'VIP (Vastra)') {
                updates.vastraCount = 0;
                updates.vastraRecipients = [];
            }
            return { ...prev, ...updates };
        });
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (form.phone.length !== 10) {
            showMessage('Phone number must be exactly 10 digits.', 'error');
            return;
        }

        if (!validateEmail(form.optionalEmail)) {
            showMessage('Please enter a valid optional email address.', 'error');
            return;
        }

        if (form.category === 'VIP (Reference)' && !form.referenceName) {
            showMessage('Please provide a Trustee Reference Name.', 'error');
            return;
        }

        if (form.category === 'VIP (Vastra)' && form.vastraCount > 0) {
             if (form.vastraRecipients.some(name => !name.trim())) {
                showMessage('Please enter the full name for every Vastra recipient.', 'error');
                return;
            }
        }
        
        const timeSlot = formatTimeSlot();

        // --- TIME CONSTRAINT VALIDATION ---
        // Convert 12-hour time to 24-hour time for comparison
        let hour24 = parseInt(form.timeHour, 10);
        if (form.timePeriod === 'PM' && hour24 !== 12) {
            hour24 += 12;
        } else if (form.timePeriod === 'AM' && hour24 === 12) {
            hour24 = 0;
        }
        const minute = parseInt(form.timeMinute, 10);
        
        // Convert to minutes from midnight for easy comparison
        const totalMinutes = hour24 * 60 + minute;

        // Constraints: 3:30 AM (3*60 + 30 = 210) to 9:00 PM (21*60 + 0 = 1260)
        const START_TIME_MINUTES = 210; // 3:30 AM
        const END_TIME_MINUTES = 1260;  // 9:00 PM

        if (totalMinutes < START_TIME_MINUTES || totalMinutes > END_TIME_MINUTES) {
            showMessage('Preferred time must be between 3:30 AM and 9:00 PM.', 'error');
            return;
        }
        // --- END TIME CONSTRAINT VALIDATION ---

        onSubmit({ ...form, timeSlot });
    };
    
    // Generate an array for hour options (01 to 12)
    const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    // Generate an array for minute options (00 to 55 in steps of 5)
    const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));


    return (
      <div className="min-h-screen bg-orange-50 p-4 sm:p-8">
        <header className="flex justify-between items-center mb-6">
          <button onClick={onBack} className="flex items-center text-orange-600 font-medium hover:text-orange-800 transition">
            <ChevronLeft className="w-5 h-5 mr-1" />
            My Requests
          </button>
          <button onClick={handleLogout} className="text-red-500 hover:text-red-700 transition">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <div className="max-w-xl mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-2xl border-t-4 border-orange-500">
          <h2 className="text-3xl font-extrabold text-orange-950 border-b pb-2 mb-6">Special Request Form</h2>
          <p className="text-gray-500 mb-8">Please fill the form below to submit your request.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Full Name */}
            <label className="block">
              <span className="text-gray-700 font-semibold">Full Name</span>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 p-3 text-orange-950"
                placeholder="Enter your full name"
                required
              />
            </label>

            {/* Phone Number (10 Digits, Numbers Only) */}
            <label className="block">
              <span className="text-gray-700 font-semibold">Phone Number (10 Digits)</span>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handlePhoneChange}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 p-3 text-orange-950"
                placeholder="Enter your 10-digit mobile number"
                maxLength="10"
                required
              />
              <p className='text-xs text-gray-500 mt-1'>Must be exactly 10 digits and contain only numbers.</p>
            </label>
            
            {/* Optional Email */}
            <label className="block">
              <span className="text-gray-700 font-semibold flex items-center">
                  <Mail className='w-4 h-4 mr-1 text-gray-400'/> Optional Email
              </span>
              <input
                type="email"
                name="optionalEmail"
                value={form.optionalEmail}
                onChange={handleChange}
                onBlur={() => { if (!validateEmail(form.optionalEmail)) showMessage('Please enter a valid email format.', 'error'); }}
                className={`mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 p-3 text-orange-950 ${
                    form.optionalEmail && !validateEmail(form.optionalEmail) ? 'border-red-500' : ''
                }`}
                placeholder="Enter an optional email address"
              />
            </label>

            {/* Number of Guests (With +/- Buttons) */}
            <div className="block">
                <span className="text-gray-700 font-semibold block mb-2">Number of Guests</span>
                <div className="flex items-center w-full max-w-xs">
                    <button
                        type="button"
                        onClick={() => handleGuestChange(-1)}
                        disabled={form.guests <= 1}
                        className="p-3 bg-orange-100 text-orange-600 rounded-l-lg border border-orange-200 hover:bg-orange-200 disabled:bg-gray-100 disabled:text-gray-400 transition"
                    >
                        <Minus className="w-5 h-5" />
                    </button>
                    <input
                        type="number"
                        name="guests"
                        value={form.guests}
                        onChange={(e) => setForm({ ...form, guests: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="flex-1 text-center border-y border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 p-3 text-orange-950 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        min="1"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => handleGuestChange(1)}
                        className="p-3 bg-orange-100 text-orange-600 rounded-r-lg border border-orange-200 hover:bg-orange-200 transition"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Request Category */}
            <div className="block">
              <span className="text-gray-700 font-semibold block mb-2">Request Category</span>
              <div className="grid grid-cols-2 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => handleCategoryChange(cat.key)} // Use new handler
                    className={`flex items-center justify-center p-4 rounded-xl transition duration-150 border-2 text-center ${
                      form.category === cat.key
                        ? 'bg-orange-100 border-orange-500 text-orange-700 shadow-md'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-orange-50 hover:border-orange-200'
                    }`}
                  >
                    {cat.icon && React.cloneElement(cat.icon, { className: 'w-5 h-5 mr-2' })}
                    <span className="ml-0 font-medium">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* CONDITIONAL INPUT: VIP (Reference) Name */}
            {form.category === 'VIP (Reference)' && (
                <label className="block bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <span className="text-gray-700 font-semibold">Trustee Reference Name (Required)</span>
                    <input
                        type="text"
                        name="referenceName"
                        value={form.referenceName}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 p-3 text-orange-950"
                        placeholder="Enter the name of the referring trustee"
                        required
                    />
                </label>
            )}

            {/* CONDITIONAL INPUT: VIP (Vastra) Count & Recipient Names */}
            {form.category === 'VIP (Vastra)' && (
                <div className="block bg-orange-50 p-4 rounded-lg border border-orange-200 space-y-4">
                    <span className="text-gray-700 font-semibold block">Number of Guests Who Need Vastra (Max: {form.guests})</span>
                    
                    {/* Vastra Count +/- Buttons */}
                    <div className="flex items-center w-full max-w-xs">
                        <button
                            type="button"
                            onClick={() => handleVastraChange(-1)}
                            disabled={form.vastraCount <= 0}
                            className="p-3 bg-orange-100 text-orange-600 rounded-l-lg border border-orange-200 hover:bg-orange-200 disabled:bg-gray-100 disabled:text-gray-400 transition"
                        >
                            <Minus className="w-5 h-5" />
                        </button>
                        <input
                            type="number"
                            name="vastraCountDisplay" // Use a dummy name here as state is controlled
                            value={form.vastraCount}
                            readOnly
                            className="flex-1 text-center border-y border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 p-3 text-orange-950 bg-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                            type="button"
                            onClick={() => handleVastraChange(1)}
                            disabled={form.vastraCount >= form.guests}
                            className="p-3 bg-orange-100 text-orange-600 rounded-r-lg border border-orange-200 hover:bg-orange-200 disabled:bg-gray-100 disabled:text-gray-400 transition"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                    
                    {/* Conditional Recipient Name Inputs */}
                    {form.vastraCount > 0 && (
                        <div className="pt-4 border-t border-orange-200 space-y-3">
                            <span className="text-gray-700 font-semibold block">Names of Vastra Recipients ({form.vastraCount} Required)</span>
                            {Array.from({ length: form.vastraCount }).map((_, index) => (
                                <input
                                    key={index}
                                    type="text"
                                    value={form.vastraRecipients[index] || ''}
                                    onChange={(e) => handleRecipientNameChange(index, e.target.value)}
                                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 p-3 text-orange-950"
                                    placeholder={`Recipient ${index + 1} Full Name (Required)`}
                                    required
                                />
                            ))}
                            <p className='text-xs text-orange-700 mt-2'>* Names are required for Vastra identification.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Preferred Date & Time (Side-by-Side Container) */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              {/* Preferred Date */}
              <label className="block">
                <span className="text-gray-700 font-semibold flex items-center mb-1">
                    <Calendar className='w-4 h-4 mr-1 text-gray-400'/> Preferred Date
                </span>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 p-3 text-orange-950"
                  required
                />
              </label>

              {/* 12-Hour Time Input */}
              <div className="block">
                  <span className="text-gray-700 font-semibold flex items-center mb-1">
                      <Clock className='w-4 h-4 mr-1 text-gray-400'/> Preferred Time
                      <span className='ml-2 text-xs text-gray-500'>(3:30 AM to 9:00 PM)</span>
                  </span>
                  <div className="flex space-x-2 items-center">
                      {/* Hour Input */}
                      <select
                          name="timeHour"
                          value={form.timeHour}
                          onChange={(e) => handleTimeChange('timeHour', e.target.value)}
                          className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 p-3 text-orange-950"
                      >
                          {hours.map(h => (
                              <option key={h} value={h}>{h}</option>
                          ))}
                      </select>
                      <span className="text-xl font-bold text-gray-700">:</span>
                      {/* Minute Input */}
                      <select
                          name="timeMinute"
                          value={form.timeMinute}
                          onChange={(e) => handleTimeChange('timeMinute', e.target.value)}
                          className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 p-3 text-orange-950"
                      >
                          {minutes.map(m => (
                              <option key={m} value={m}>{m}</option>
                          ))}
                      </select>
                      
                      {/* AM/PM Toggle */}
                      <div className="flex border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                          <button
                              type="button"
                              onClick={() => setForm(prev => ({ ...prev, timePeriod: 'AM' }))}
                              className={`px-3 py-3 font-semibold text-sm transition ${
                                  form.timePeriod === 'AM' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-orange-50'
                              }`}
                          >
                              AM
                          </button>
                          <button
                              type="button"
                              onClick={() => setForm(prev => ({ ...prev, timePeriod: 'PM' }))}
                              className={`px-3 py-3 font-semibold text-sm transition ${
                                  form.timePeriod === 'PM' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-orange-50'
                              }`}
                          >
                              PM
                          </button>
                      </div>
                  </div>
              </div>
            </div> {/* End Preferred Date & Time Container */}
            
            <button
              type="submit"
              className="w-full py-3 bg-orange-600 text-white font-semibold rounded-lg shadow-xl hover:bg-orange-700 transition duration-200 mt-6"
            >
              Submit Request
            </button>
          </form>
        </div>
      </div>
    );
  };

  const TrustyDashboard = () => { // Page 3: List of Trustee's Requests
    if (!auth.isLoggedIn || auth.role !== 'trustee') return <AuthPage />;

    // Helper function for status display
    const getStatusDisplay = (status) => {
        if (status === 'Done') {
            return { text: 'Darshan is Done', className: 'bg-green-100 text-green-700' };
        }
        return { text: 'Pending', className: 'bg-yellow-100 text-yellow-700' };
    };

    return (
      <div className="min-h-screen bg-orange-50 p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <header className="flex justify-between items-center border-b border-orange-200 pb-4 mb-6">
            <h1 className="text-3xl font-extrabold text-orange-950">My Requests ({trusteeRequests.length})</h1>
            <div className='flex space-x-2'>
                <button onClick={() => setCurrentPage('form')} className="flex items-center px-4 py-2 bg-orange-600 text-white font-medium rounded-full shadow-lg hover:bg-orange-700 transition">
                    <FileText className="w-5 h-5 mr-2" />
                    New Request
                </button>
                <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition">
                    <LogOut className="w-6 h-6" />
                </button>
            </div>
          </header>

          <div className="space-y-4">
            {trusteeRequests.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-xl shadow-lg mt-8">
                <p className="text-xl text-gray-500">You haven't submitted any requests yet.</p>
                <button onClick={() => setCurrentPage('form')} className="mt-4 text-orange-600 font-medium hover:underline">
                  Start filling the request form now!
                </button>
              </div>
            ) : (
              trusteeRequests.map(req => {
                const status = getStatusDisplay(req.status);
                return (
                  <div
                    key={req.id}
                    onClick={() => goToTicket(req.id)}
                    className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition cursor-pointer border-l-4 border-orange-500 relative"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-semibold text-orange-950">{req.name}</h3>
                        <p className="text-sm text-gray-500">{req.category} Request
                        {req.vastraCount > 0 && <span className="ml-2 text-xs font-bold text-orange-700">({req.vastraCount} Vastra)</span>}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-orange-900">{req.timeSlot}</p>
                        <span className={`text-sm font-medium px-3 py-1 rounded-full ${status.className}`}>
                            {status.text}
                        </span>
                      </div>
                    </div>
                    {req.referenceName && (
                        <p className="text-sm text-gray-700 mt-1 flex items-center">
                            <Briefcase className='w-4 h-4 mr-1 text-gray-400'/> Ref: <span className="font-medium ml-1 text-orange-950">{req.referenceName}</span>
                        </p>
                    )}
                    {req.vastraRecipients && req.vastraRecipients.length > 0 && (
                        <p className="text-sm text-gray-700 mt-1 flex items-start">
                            <Zap className='w-4 h-4 mr-1 text-gray-400 mt-1'/> Recipients: <span className="font-medium ml-1 text-orange-950 truncate">{req.vastraRecipients.join(', ')}</span>
                        </p>
                    )}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col sm:flex-row justify-between text-sm text-gray-600">
                        <p className='flex items-center mb-1 sm:mb-0'><Calendar className='w-4 h-4 mr-1' /> {req.date}</p>
                        {/* Responsive Guest Count Display */}
                        <p className='flex items-center font-medium text-orange-950'>
                          <Users className='w-4 h-4 mr-1' /> {req.guests} Visitor{req.guests !== 1 ? 's' : ''}
                        </p>
                    </div>
                  </div>
              )})
            )}
          </div>
        </div>
        {/* Confirmation modal rendered at the dashboard level */}
        <ConfirmationModal 
          title="Confirm Deletion"
          message={`Are you sure you want to delete the request for ${itemToDelete ? trusteeRequests.find(r => r.id === itemToDelete)?.name : 'this item'}? This action cannot be undone.`}
          onConfirm={executeDelete}
          onCancel={() => setShowConfirmation(false)}
        />
      </div>
    );
  };

  const TrustyTicket = () => { // Page 2: Dynamic QR Code
    if (!selectedRequest) return goToList();
    
    // Data encoded in the QR code is just the ID
    const qrData = selectedRequest.id;

    // Helper function for status display on ticket page
    const getStatusDisplay = (status) => {
        if (status === 'Done') {
            return { text: 'Darshan is Done', className: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-5 h-5 mr-2" /> };
        }
        return { text: 'Pending', className: 'bg-yellow-100 text-yellow-700', icon: <Zap className="w-5 h-5 mr-2" /> };
    };

    const statusDisplay = getStatusDisplay(selectedRequest.status);

    const StatusBadge = () => (
        <div className={`inline-flex items-center px-4 py-1.5 rounded-full font-bold text-lg ${statusDisplay.className}`}>
            {statusDisplay.icon}
            {statusDisplay.text}
        </div>
    );
    
    // --- Copy only the Request ID ---
    const handleCopyId = () => {
        const idToCopy = selectedRequest.id; 
        
        // Fallback for copy to clipboard
        const input = document.createElement('input');
        input.value = idToCopy;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showMessage('Request ID copied to clipboard!', 'success');
    };

    // --- NEW: Share via Email Handler ---
    const handleShareEmail = async () => {
        const recipientEmail = selectedRequest.optionalEmail || selectedRequest.email;
        const subject = `Your Digital Pass for ${selectedRequest.name}`;
        const body = `Hello ${selectedRequest.name},\n\nYour Digital Pass ID is: ${selectedRequest.id}. Please present the attached QR code at the entry point.\n\nDetails:\nDate: ${selectedRequest.date}\nTime: ${selectedRequest.timeSlot}\nCategory: ${selectedRequest.category}\nGuests: ${selectedRequest.guests}`;

        // Get the generated SVG element
        const svgElement = document.getElementById('qr-svg-export');
        
        let mailtoLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        // NOTE: Mailto links have limitations on file attachments and length. This is a simulation.
        if (svgElement) {
             // In a real application, you would host the QR code image and send a link to it.
             // Here, we simulate the link text but cannot reliably attach the image via mailto.
             mailtoLink += `\n\n[QR Code Image is sent as attachment in simulation]`;
        }

        window.open(mailtoLink, '_self');
        showMessage('Email client opened. Please check the pre-filled message.', 'success');
    };

    // --- NEW: Share via WhatsApp Handler ---
    const handleShareWhatsapp = () => {
        const phoneNumber = selectedRequest.phone; // Assuming the phone number is the target
        const message = `*Digital Pass ID:*\n${selectedRequest.id}\n\n*Name:*\n${selectedRequest.name}\n\n*Details:*\nDate: ${selectedRequest.date}\nTime: ${selectedRequest.timeSlot}\nCategory: ${selectedRequest.category}\n\n_Please present this ID at the entry point._`;

        // Standard WhatsApp API link format (uses the number without + or 00)
        const whatsappLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        
        window.open(whatsappLink, '_blank');
        showMessage('WhatsApp client opened. Please verify the pre-filled message.', 'success');
    };

    // Handler to show delete confirmation for the current ticket
    const handleDelete = () => {
        confirmDelete(selectedRequest.id);
    }


    return (
      <div className="min-h-screen bg-orange-100 p-4 sm:p-8 flex justify-center items-center">
        {/* The confirmation modal is rendered at the App level to handle global state, but trigger is here */}
        
        <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-xl shadow-2xl border-t-8 border-orange-500">
          <header className="flex justify-between items-center mb-6">
            <button onClick={goToList} className="flex items-center text-orange-600 font-medium hover:underline">
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back to List
            </button>
            <button onClick={handleLogout} className="text-red-500 hover:text-red-700 transition">
                <LogOut className="w-6 h-6" />
            </button>
          </header>

          <h1 className="text-3xl font-extrabold text-orange-950 text-center mb-2">Digital Pass</h1>
          <p className="text-orange-600 font-semibold text-center mb-6">Present this QR code at the entry point.</p>

          <div className="bg-gradient-to-br from-orange-100 to-orange-200 p-8 rounded-xl flex justify-center shadow-inner border border-orange-300">
            {/* The QR Code SVG component - Foreground color changed in component definition */}
            <div className="p-4 bg-white rounded-lg shadow-xl">
              <QRCodeSVG value={qrData} size={200} />
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <h2 className="text-3xl font-bold text-orange-950 mb-4">{selectedRequest.name}</h2>
            <StatusBadge />

            <div className="grid grid-cols-2 gap-4 mt-8 pt-4 border-t border-gray-200">
                <div className='text-left'>
                    <p className="text-sm font-medium text-gray-500 uppercase">Category</p>
                    <p className="text-xl font-semibold text-orange-950">{selectedRequest.category}</p>
                </div>
                <div className='text-right'>
                    <p className="text-sm font-medium text-gray-500 uppercase">Guests</p>
                    {/* Responsive Guest Count Display on Ticket Page */}
                    <p className="text-xl font-semibold text-orange-950">{selectedRequest.guests} Visitor{selectedRequest.guests !== 1 ? 's' : ''}</p>
                </div>
                {selectedRequest.referenceName && (
                    <div className='col-span-2 text-left'>
                        <p className="text-sm font-medium text-gray-500 uppercase">Trustee Reference Name</p>
                        <p className="text-xl font-semibold text-orange-950">{selectedRequest.referenceName}</p>
                    </div>
                )}
                {selectedRequest.vastraCount > 0 && (
                    <>
                        <div className='col-span-2 text-left mt-4 border-t border-gray-200 pt-4'>
                            <p className="text-sm font-medium text-gray-500 uppercase">Vastra Count</p>
                            <p className="text-xl font-semibold text-orange-950">{selectedRequest.vastraCount}</p>
                        </div>
                        <div className='col-span-2 text-left'>
                            <p className="text-sm font-medium text-gray-500 uppercase">Vastra Recipients</p>
                            <ul className="text-base font-semibold text-orange-950 list-disc list-inside space-y-1 mt-1">
                                {selectedRequest.vastraRecipients.map((name, index) => (
                                    <li key={index}>{name}</li>
                                ))}
                            </ul>
                        </div>
                    </>
                )}
                <div className='text-left'>
                    <p className="text-sm font-medium text-gray-500 uppercase">Date</p>
                    <p className="text-xl font-semibold text-orange-950">{selectedRequest.date}</p>
                </div>
                <div className='text-right'>
                    <p className="text-sm font-medium text-gray-500 uppercase">Time Slot</p>
                    <p className="text-xl font-semibold text-orange-950">{selectedRequest.timeSlot}</p>
                </div>
            </div>
          </div>
          
          {/* Share Buttons (Page 2) - Updated to Email and WhatsApp */}
          <div className="mt-8 space-y-3">
              <button
                  onClick={handleShareEmail}
                  className="w-full flex items-center justify-center py-3 bg-orange-600 text-white font-semibold rounded-lg shadow-xl hover:bg-orange-700 transition duration-200"
              >
                  <Mail className="w-5 h-5 mr-2" />
                  Share via Email
              </button>
              <button
                  onClick={handleShareWhatsapp} 
                  className="w-full flex items-center justify-center py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition duration-200"
              >
                  {/* Using Share2 icon for WhatsApp simulation */}
                  <Share2 className="w-5 h-5 mr-2" />
                  Share via WhatsApp
              </button>
              <button
                  onClick={handleCopyId} 
                  className="w-full flex items-center justify-center py-3 border border-orange-300 text-orange-800 font-semibold rounded-lg hover:bg-orange-50 transition duration-200"
              >
                  <Link className="w-5 h-5 mr-2" />
                  Copy ID
              </button>
          </div>

          {/* New Delete Button at the bottom (Enhanced UI) */}
          <button
              onClick={handleDelete}
              className="w-full mt-6 py-3 flex items-center justify-center bg-red-50 text-red-600 font-semibold rounded-lg border-2 border-red-300 hover:bg-red-100 transition duration-200 shadow-md hover:shadow-lg"
          >
              <Trash2 className="w-5 h-5 mr-2" />
              Delete Request
          </button>
        </div>
      </div>
    );
  };

  const ProScanner = () => { // Page 4: QR Scanner and Verification
    const [scanValue, setScanValue] = useState('');
    const [scanResult, setScanResult] = useState(null); // The actual request object from scanning
    const [isScanning, setIsScanning] = useState(false);

    // Function to handle camera access attempt
    const handleCameraClick = async () => {
        setCameraStatus('Attempting to access camera...');
        
        // This attempts to get the camera stream, simulating the camera opening.
        // In a non-embedded browser environment, this would prompt the user for camera access.
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                // If successful, stop the stream immediately since we can't display it
                stream.getTracks().forEach(track => track.stop());
                setCameraStatus('Camera access simulated successfully! Ready to scan.');
            } catch (err) {
                if (err.name === "NotAllowedError" || err.name === "SecurityError") {
                    setCameraStatus('Camera access blocked. Please grant camera permission manually.');
                } else if (err.name === "NotFoundError") {
                    setCameraStatus('No camera found on this device.');
                } else {
                    setCameraStatus(`Error accessing camera: ${err.name}`);
                }
                console.error("Camera access error:", err);
            }
        } else {
            setCameraStatus('getUserMedia is not supported by this browser.');
        }
    };


    const handleSimulatedScan = () => {
      // Clear previous error message if present
      if (scanResult === undefined) setScanResult(null);

      if (scanValue.startsWith('REQ-')) {
        const foundRequest = requests.find(r => r.id === scanValue);
        // Using undefined to signify 'not found' clearly
        setScanResult(foundRequest !== undefined ? foundRequest : undefined); 
      } else {
        // Treat invalid format as 'not found'
        setScanResult(undefined);
      }
      setIsScanning(false);
    };

    const handleVerify = (requestId) => {
        handleVerification(requestId);
        // Refresh the verification result after updating status
        const updatedRequest = requests.find(r => r.id === requestId);
        // *** IMPORTANT: Since the status is now 'Done', we ensure the local result reflects this for display
        setScanResult({ ...updatedRequest, status: 'Done' }); 
    };

    const isDone = scanResult?.status === 'Done';

    return (
      <div className="min-h-screen bg-orange-50 p-4 sm:p-8">
        <header className="flex justify-end items-center mb-6">
          <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition">
              <LogOut className="w-6 h-6" />
          </button>
        </header>
        
        <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-2xl border-t-4 border-orange-500">
          <h1 className="text-3xl font-extrabold text-orange-950 mb-6 text-center">Visitor Verification (Pro Team)</h1>
          
          {/* Simulated Camera Feed */}
          <div 
            className="relative h-64 bg-orange-50 rounded-xl flex flex-col items-center justify-center border-4 border-dashed border-orange-300 mb-6 cursor-pointer hover:bg-orange-100 transition duration-200"
            onClick={handleCameraClick}
          >
            <Camera className="w-16 h-16 text-orange-400 opacity-50 mb-2" />
            <p className='text-sm text-gray-500'>Click here to open camera view</p>
            {cameraStatus && (
                <p className={`absolute bottom-2 text-xs px-2 py-1 rounded-full ${
                    cameraStatus.includes('successfully') ? 'bg-green-100 text-green-700' : 
                    cameraStatus.includes('blocked') || cameraStatus.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}>
                    {cameraStatus}
                </p>
            )}
          </div>

          {/* Simulated QR Code Input */}
          <div className="space-y-4 bg-white p-6 rounded-xl shadow-sm border border-orange-100">
            <label htmlFor="qrInput" className="block text-sm font-medium text-gray-700">
              Scan QR Code (Enter Request ID from Ticket Page)
            </label>
            <input
              id="qrInput"
              type="text"
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              placeholder="e.g., REQ-12345-ABCDE"
              className="w-full px-4 py-3 bg-white text-orange-950 rounded-lg border border-gray-300 focus:ring-orange-500 focus:border-orange-500"
            />
            <button
              onClick={() => { setIsScanning(true); handleSimulatedScan(); }}
              className="w-full py-3 bg-orange-600 text-white font-semibold rounded-lg shadow-md hover:bg-orange-700 transition duration-200"
            >
              <QrCode className="w-5 h-5 inline mr-2" />
              Simulate Scan & Fetch Info
            </button>
          </div>
          
          {/* Verification Result Display */}
          {scanResult === undefined && scanValue && (
            <div className='mt-6 p-4 bg-red-100 rounded-xl text-center shadow-lg border border-red-300 text-red-700'>
                <XCircle className='w-8 h-8 mx-auto mb-2 text-red-600' />
                <p className='text-lg font-semibold'>Error: Request ID not found in database or invalid format.</p>
            </div>
          )}

          {scanResult && scanResult !== undefined && (
            <div className={`mt-6 p-6 rounded-xl shadow-2xl ${isDone ? 'bg-green-600' : 'bg-orange-600'}`}>
              <div className="flex items-center justify-center mb-4">
                {isDone ? (
                    <CheckCircle className="w-10 h-10 text-white" />
                ) : (
                    <Zap className="w-10 h-10 text-white" />
                )}
              </div>
              
              <h2 className="text-2xl font-bold text-white text-center mb-4">{scanResult.name}</h2>
              <div className="text-center mb-6">
                <span className={`px-4 py-1.5 rounded-full text-lg font-bold ${
                    isDone ? 'bg-green-800 text-white' : 'bg-orange-800 text-white'
                }`}>
                    Status: {scanResult.status === 'Done' ? 'Darshan Done' : 'Pending'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm bg-orange-950 bg-opacity-10 p-4 rounded-lg">
                <div className='col-span-2'>
                    <p className="font-medium text-white uppercase opacity-80">Request ID</p>
                    <p className="text-base font-semibold text-white">{scanResult.id}</p>
                </div>
                <div>
                    <p className="font-medium text-white uppercase opacity-80">Category</p>
                    <p className="text-base font-semibold text-white">{scanResult.category}</p>
                </div>
                <div>
                    <p className="font-medium text-white uppercase opacity-80">Guests</p>
                    <p className="text-base font-semibold text-white">{scanResult.guests}</p>
                </div>
                {scanResult.referenceName && (
                    <div className='col-span-2'>
                        <p className="font-medium text-white uppercase opacity-80">Ref. Trustee Name</p>
                        <p className="text-base font-semibold text-white">{scanResult.referenceName}</p>
                    </div>
                )}
                {scanResult.vastraCount > 0 && (
                    <div className='col-span-2'>
                        <p className="font-medium text-white uppercase opacity-80">Vastra Count</p>
                        <p className="text-base font-semibold text-white mb-2">{scanResult.vastraCount}</p>
                        <p className="font-medium text-white uppercase opacity-80">Vastra Recipients</p>
                        <ul className="text-base font-semibold text-white list-disc list-inside space-y-1 mt-1">
                            {scanResult.vastraRecipients.map((name, index) => (
                                <li key={index}>{name}</li>
                            ))}
                        </ul>
                    </div>
                )}
                <div>
                    <p className="font-medium text-white uppercase opacity-80">Date/Time</p>
                    <p className="text-base font-semibold text-white">{scanResult.date} at {scanResult.timeSlot}</p>
                </div>
                <div>
                    <p className="font-medium text-white uppercase opacity-80">Gate</p>
                    <p className="text-base font-semibold text-white">{scanResult.entryGate}</p>
                </div>
              </div>
              
              {!isDone && (
                <button
                  onClick={() => handleVerify(scanResult.id)}
                  className="w-full mt-6 py-3 bg-white text-orange-600 font-bold rounded-lg hover:bg-orange-50 transition"
                >
                  Confirm Darshan Done
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- Main Rendering Logic ---
  const renderPage = () => {
    if (!auth.isLoggedIn) {
      return <AuthPage />;
    }

    if (auth.role === 'trustee') {
      switch (currentPage) {
        case 'form': return <TrustyForm onSubmit={handleNewRequestSubmit} onBack={goToList} />; // Page 1
        case 'list': return <TrustyDashboard />; // Page 3
        case 'ticket': return <TrustyTicket />; // Page 2 (triggered by clicking card on Page 3)
        default: return <TrustyDashboard />;
      }
    }

    if (auth.role === 'pro') {
      return <ProScanner />; // Page 4
    }

    return <AuthPage />;
  };

  return (
    // Container for global messages (like success/error toasts)
    <div className="min-h-screen font-sans">
        <div id="message-container"></div>
        {/* Render confirmation modal at the highest level */}
        <ConfirmationModal 
            title="Confirm Deletion"
            message={`Are you sure you want to delete this request? This action cannot be undone.`}
            onConfirm={executeDelete}
            onCancel={() => setShowConfirmation(false)}
        />
        {renderPage()}
    </div>
  );
};

export default App;
