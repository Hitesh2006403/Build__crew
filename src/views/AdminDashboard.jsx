import { useState, useMemo, useRef } from 'react';
import HackathonDetailsModal from '../components/hackathons/HackathonDetailsModal';
import hackathonsApi from '../api/hackathons';

export default function AdminDashboard({
  currentUser,
  hackathons,
  onUpdateHackathons,
  onRefreshHackathons,
  onResetDefaults,
  showToast,
  onNavigate
}) {
  // Navigation: 'list' | 'form'
  const [view, setView] = useState('list');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Table filters & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'published' | 'draft'
  const [modeFilter, setModeFilter] = useState('all'); // 'all' | 'online' | 'offline' | 'hybrid'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'prize' | 'title'

  // Modals & previews
  const [hackToDelete, setHackToDelete] = useState(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [previewHackathon, setPreviewHackathon] = useState(null);

  // File input ref for cover image upload
  const fileInputRef = useRef(null);

  // Initial Empty Form Template adhering to the 10 data-entry specifications
  const emptyForm = {
    image: '',
    title: '',
    organizer: '',
    description: '',
    officialWebsite: '',
    registrationLink: '',
    // Dates & Times in IST
    regDeadlineDate: '',
    regDeadlineTime: '23:59',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '18:00',
    // Mode & Location
    mode: 'Online', // 'Online' | 'Offline' | 'Hybrid'
    location: '',
    // Team & Eligibility
    minTeamSize: '2',
    maxTeamSize: '4',
    eligibility: 'Open to undergraduate students. Students must be currently enrolled in a recognized college.',
    // Registration Fee
    feeType: 'free', // 'free' | 'paid'
    feeAmount: '',
    // Tracks
    tracks: ['AI', 'Web Development'],
    // Prizes
    prizePool: '₹50,000',
    // Rules
    rules: [
      'Team size must be 2–4 members.',
      'Students must submit their project before the deadline.',
      'Original work is required.'
    ],
    // Verification
    verifiedDate: new Date().toISOString().split('T')[0],
    verifiedBy: 'BuildCrew Collegiate Sanctioning Board'
  };

  const [formData, setFormData] = useState(emptyForm);
  const [trackInput, setTrackInput] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Parse date strings into YYYY-MM-DD
  const parseDateToYMD = (str) => {
    if (!str) return '';
    const isoMatch = str.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (isoMatch) return isoMatch[1];
    const clean = str.replace(/\(.*?\)/g, '').replace(/[·,]\s*\d{1,2}:\d{2}.*$/, '').replace(/at\s+\d+:\d+.*$/, '').trim();
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  // Parse time strings into HH:MM
  const parseTimeToHM = (str) => {
    if (!str) return '';
    const hmMatch = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (hmMatch) {
      let hours = parseInt(hmMatch[1], 10);
      const mins = hmMatch[2];
      const ampm = hmMatch[3]?.toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      return `${String(hours).padStart(2, '0')}:${mins}`;
    }
    return '';
  };

  // Format date and time for IST display across BuildCrew
  const formatToISTDisplay = (dateStr, timeStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(month, 10) - 1] || month;
    
    if (!timeStr) {
      return `${monthName} ${parseInt(day, 10)}, ${year}`;
    }

    const [hoursStr, mins] = timeStr.split(':');
    let hours = parseInt(hoursStr, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const formattedHours = String(hours).padStart(2, '0');
    
    return `${monthName} ${parseInt(day, 10)}, ${year} · ${formattedHours}:${mins} ${ampm} IST`;
  };

  // Normalize mode strings helper
  const normalizeMode = (m) => {
    if (!m) return 'Hybrid';
    const lower = m.toLowerCase();
    if (lower === 'virtual' || lower === 'online') return 'Online';
    if (lower === 'in-person' || lower === 'offline') return 'Offline';
    return 'Hybrid';
  };

  // Convert raw team size string if formatted as "X to Y"
  const parseTeamSizes = (hack) => {
    let minSize = '2';
    let maxSize = '4';
    const sizeStr = hack.squadLimits || hack.teamSize || '';
    const sizeMatch = sizeStr.match(/(\d+)\s*(?:to|–|-)\s*(\d+)/i);
    if (sizeMatch) {
      minSize = sizeMatch[1];
      maxSize = sizeMatch[2];
    }
    return {
      min: hack.minTeamSize || minSize,
      max: hack.maxTeamSize || maxSize
    };
  };

  // Handle Cover Image File Upload via FileReader
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, image: event.target?.result }));
    };
    reader.readAsDataURL(file);
  };

  // Open Form to Add New Hackathon
  const handleOpenAdd = () => {
    setFormData(emptyForm);
    setTrackInput('');
    setFormErrors({});
    setIsEditing(false);
    setEditingId(null);
    setView('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open Form to Edit Existing Hackathon
  const handleOpenEdit = (hack) => {
    setIsEditing(true);
    setEditingId(hack._id || hack.id);
    setFormErrors({});

    const { min, max } = parseTeamSizes(hack);

    // Extract tracks
    let tracksArr = [];
    if (Array.isArray(hack.trackLabels) && hack.trackLabels.length > 0) {
      tracksArr = [...hack.trackLabels];
    } else if (Array.isArray(hack.tracks) && hack.tracks.length > 0) {
      tracksArr = hack.tracks.map(t => typeof t === 'string' ? t.toUpperCase() : t);
    } else if (typeof hack.tracks === 'string') {
      tracksArr = hack.tracks.split(',').map(t => t.trim()).filter(Boolean);
    }

    // Extract rules
    let rulesArr;
    if (Array.isArray(hack.rules) && hack.rules.length > 0) {
      rulesArr = [...hack.rules];
    } else if (typeof hack.rules === 'string') {
      rulesArr = hack.rules.split('\n').map(r => r.trim()).filter(Boolean);
    } else {
      rulesArr = emptyForm.rules;
    }

    // Fee extraction
    const rawFee = hack.registrationFee || '';
    const feeNumeric = rawFee.replace(/[^0-9]/g, '');
    const isPaid = feeNumeric && parseInt(feeNumeric, 10) > 0;

    // Image extraction
    const coverImg = hack.heroImage || hack.coverImage || hack.image || hack.logo || '';

    // Date & Time extraction
    const regDate = hack.regDeadlineDate || parseDateToYMD(hack.registrationDeadline) || '';
    const regTime = hack.regDeadlineTime || parseTimeToHM(hack.registrationDeadline) || '23:59';
    const sDate = hack.startDateRaw || parseDateToYMD(hack.startDate) || parseDateToYMD(hack.dates?.split('–')[0]) || '';
    const sTime = hack.startTimeRaw || parseTimeToHM(hack.startDate) || '09:00';
    const eDate = hack.endDateRaw || parseDateToYMD(hack.endDate) || parseDateToYMD(hack.dates?.split('–')[1]) || '';
    const eTime = hack.endTimeRaw || parseTimeToHM(hack.endDate) || '18:00';

    const vDate = typeof hack.lastVerified === 'object'
      ? parseDateToYMD(hack.lastVerified?.verifiedAt)
      : parseDateToYMD(hack.lastVerified) || new Date().toISOString().split('T')[0];
    const vBy = typeof hack.lastVerified === 'object'
      ? hack.lastVerified?.verifier || ''
      : hack.officialSource || 'BuildCrew Collegiate Sanctioning Board';

    setFormData({
      image: coverImg,
      title: hack.title || '',
      organizer: typeof hack.organizer === 'object' ? hack.organizer?.name || '' : hack.organizer || '',
      description: hack.description || '',
      officialWebsite: hack.officialWebsite || (typeof hack.organizer === 'object' ? hack.organizer?.website || '' : '') || '',
      registrationLink: hack.officialRegistrationLink || hack.registrationLink || '',
      regDeadlineDate: regDate,
      regDeadlineTime: regTime,
      startDate: sDate,
      startTime: sTime,
      endDate: eDate,
      endTime: eTime,
      mode: normalizeMode(hack.mode),
      location: hack.location === 'Virtual Online (Discord & Zoom)' ? 'Online event' : hack.location || '',
      feeType: isPaid ? 'paid' : 'free',
      feeAmount: isPaid ? feeNumeric : '',
      minTeamSize: min,
      maxTeamSize: max,
      eligibility: hack.eligibility || emptyForm.eligibility,
      tracks: tracksArr.length > 0 ? tracksArr : emptyForm.tracks,
      prizePool: (hack.prizePool || '₹50,000').replace(/\$/g, '₹'),
      rules: rulesArr,
      verifiedDate: vDate || new Date().toISOString().split('T')[0],
      verifiedBy: vBy
    });

    setTrackInput('');
    setView('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Duplicate / Clone Existing Hackathon
  const handleDuplicate = async (hack) => {
    try {
      const cloned = {
        ...hack,
        circuitId: `BC-CIRC-${Math.floor(1000 + Math.random() * 9000)}`,
        title: `${hack.title} (Copy)`,
        status: 'draft',
        statusLabel: 'Draft',
        isPublished: false
      };
      delete cloned._id;
      delete cloned.id;

      const res = await hackathonsApi.createHackathon(cloned);
      const saved = res.hackathon || res;
      onUpdateHackathons([saved, ...hackathons]);
      showToast?.(`Cloned "${hack.title}" as a draft in MongoDB!`);
    } catch (err) {
      console.error('Clone hackathon failed:', err);
      showToast?.(`Clone failed: ${err.message}`);
    }
  };

  // Quick Toggle Publish / Unpublish directly from table
  const handleTogglePublish = async (hack) => {
    const targetId = hack._id || hack.id;
    const willBePublished = !hack.isPublished;

    try {
      const res = await hackathonsApi.togglePublish(targetId, willBePublished);
      const updatedHack = res.hackathon || {
        ...hack,
        isPublished: willBePublished,
        status: willBePublished ? (hack.status === 'draft' ? 'open' : hack.status) : 'draft',
        statusLabel: willBePublished ? (hack.status === 'draft' ? 'Registration open' : hack.statusLabel) : 'Draft'
      };

      const updated = hackathons.map(h => ((h._id === targetId || h.id === targetId) ? updatedHack : h));
      onUpdateHackathons(updated);
      showToast?.(
        willBePublished
          ? `"${hack.title}" published live in MongoDB and visible to students.`
          : `"${hack.title}" saved as draft in MongoDB.`
      );
    } catch (err) {
      console.error('Toggle publish failed:', err);
      showToast?.(`Error updating status: ${err.message}`);
    }
  };

  // Validate form fields
  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = 'Hackathon Name is required.';
    if (!formData.organizer.trim()) errors.organizer = 'Organizer is required.';
    if (!formData.description.trim()) errors.description = 'Description is required.';
    if (parseInt(formData.minTeamSize, 10) > parseInt(formData.maxTeamSize, 10)) {
      errors.teamSize = 'Minimum team size cannot be greater than maximum team size.';
    }
    if (formData.feeType === 'paid' && (!formData.feeAmount || parseInt(formData.feeAmount, 10) <= 0)) {
      errors.feeAmount = 'Please enter a valid registration fee amount.';
    }
    if (formData.mode !== 'Online' && !formData.location.trim()) {
      errors.location = 'Location is required for Offline / Hybrid mode.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form Save Handler (Draft or Publish)
  const handleSave = async (shouldPublish) => {
    if (!validateForm()) {
      showToast?.('Please resolve the highlighted form errors.');
      return;
    }

    const teamSizeString = `${formData.minTeamSize} to ${formData.maxTeamSize} Builders`;
    
    // Dates formatting in IST
    const deadlineString = formData.regDeadlineDate
      ? formatToISTDisplay(formData.regDeadlineDate, formData.regDeadlineTime)
      : 'TBD';
      
    const startFormatted = formData.startDate
      ? formatToISTDisplay(formData.startDate, formData.startTime)
      : '';
    const endFormatted = formData.endDate
      ? formatToISTDisplay(formData.endDate, formData.endTime)
      : '';
    
    const datesString = (formData.startDate && formData.endDate)
      ? `${formatToISTDisplay(formData.startDate, '')} – ${formatToISTDisplay(formData.endDate, '')}`
      : (startFormatted || 'TBD');

    const feeString = formData.feeType === 'paid' ? `₹${formData.feeAmount || 0}` : '₹0 / Free';

    const locationString = formData.mode === 'Online'
      ? 'Online event'
      : (formData.location.trim() || 'Offline Campus Venue');

    const tracksClean = formData.tracks.length > 0 ? formData.tracks : ['General'];
    const trackKeys = tracksClean.map(t => t.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const rulesClean = formData.rules.filter(r => r && r.trim().length > 0);

    const verifiedDateVal = formData.verifiedDate || new Date().toISOString().split('T')[0];
    const verifiedByVal = formData.verifiedBy.trim() || 'BuildCrew Collegiate Sanctioning Board';

    if (!isEditing) {
      // Create New
      const newHack = {
        id: `hack-${Date.now()}`,
        circuitId: `BC-CIRC-${Math.floor(1000 + Math.random() * 9000)}`,
        title: formData.title.trim(),
        subtitle: `Organized by ${formData.organizer.trim()}`,
        organizer: {
          name: formData.organizer.trim(),
          website: formData.officialWebsite.trim() || ''
        },
        description: formData.description.trim(),
        officialWebsite: formData.officialWebsite.trim(),
        officialRegistrationLink: formData.registrationLink.trim(),
        registrationLink: formData.registrationLink.trim(),
        registrationDeadline: deadlineString,
        regDeadlineDate: formData.regDeadlineDate,
        regDeadlineTime: formData.regDeadlineTime,
        startDate: startFormatted,
        startDateRaw: formData.startDate,
        startTimeRaw: formData.startTime,
        endDate: endFormatted,
        endDateRaw: formData.endDate,
        endTimeRaw: formData.endTime,
        dates: datesString,
        mode: formData.mode,
        location: locationString,
        registrationFee: feeString,
        feeType: formData.feeType,
        feeAmount: formData.feeAmount,
        minTeamSize: formData.minTeamSize,
        maxTeamSize: formData.maxTeamSize,
        teamSize: teamSizeString,
        squadLimits: teamSizeString,
        eligibility: formData.eligibility.trim(),
        tracks: trackKeys,
        trackLabels: tracksClean,
        prizePool: (formData.prizePool.trim() || '₹0').replace(/\$/g, '₹'),
        rules: rulesClean.length > 0 ? rulesClean : emptyForm.rules,
        officialSource: verifiedByVal,
        image: formData.image || '',
        heroImage: formData.image || '',
        coverImage: formData.image || '',
        logo: formData.image || '',
        status: shouldPublish ? 'open' : 'draft',
        statusLabel: shouldPublish ? 'Registration open' : 'Draft',
        isPublished: shouldPublish,
        registeredTeams: 0,
        maxCap: 500,
        lastVerified: {
          verifiedAt: verifiedDateVal,
          verifier: verifiedByVal
        }
      };

      try {
        const res = await hackathonsApi.createHackathon(newHack);
        const savedHack = res.hackathon || res;
        onUpdateHackathons([savedHack, ...hackathons]);
        showToast?.(`Hackathon "${savedHack.title}" ${shouldPublish ? 'published live in MongoDB!' : 'saved as draft in MongoDB.'}`);
      } catch (err) {
        console.error('Failed to create hackathon:', err);
        showToast?.(`Create error: ${err.message}`);
      }
    } else {
      // Update Existing in MongoDB
      const updatePayload = {
        title: formData.title.trim(),
        subtitle: `Organized by ${formData.organizer.trim()}`,
        organizer: {
          name: formData.organizer.trim(),
          website: formData.officialWebsite.trim() || ''
        },
        description: formData.description.trim(),
        officialWebsite: formData.officialWebsite.trim(),
        officialRegistrationLink: formData.registrationLink.trim(),
        registrationLink: formData.registrationLink.trim(),
        registrationDeadline: deadlineString,
        regDeadlineDate: formData.regDeadlineDate,
        regDeadlineTime: formData.regDeadlineTime,
        startDate: startFormatted,
        startDateRaw: formData.startDate,
        startTimeRaw: formData.startTime,
        endDate: endFormatted,
        endDateRaw: formData.endDate,
        endTimeRaw: formData.endTime,
        dates: datesString,
        mode: formData.mode,
        location: locationString,
        registrationFee: feeString,
        feeType: formData.feeType,
        feeAmount: formData.feeAmount,
        minTeamSize: formData.minTeamSize,
        maxTeamSize: formData.maxTeamSize,
        teamSize: teamSizeString,
        squadLimits: teamSizeString,
        eligibility: formData.eligibility.trim(),
        tracks: trackKeys,
        trackLabels: tracksClean,
        prizePool: (formData.prizePool.trim() || '₹0').replace(/\$/g, '₹'),
        rules: rulesClean.length > 0 ? rulesClean : emptyForm.rules,
        officialSource: verifiedByVal,
        image: formData.image || '',
        heroImage: formData.image || '',
        coverImage: formData.image || '',
        logo: formData.image || '',
        status: shouldPublish ? 'open' : 'draft',
        statusLabel: shouldPublish ? 'Registration open' : 'Draft',
        isPublished: shouldPublish,
        lastVerified: {
          verifiedAt: verifiedDateVal,
          verifier: verifiedByVal
        }
      };

      try {
        const res = await hackathonsApi.updateHackathon(editingId, updatePayload);
        const savedHack = res.hackathon || updatePayload;
        const updated = hackathons.map(h => ((h._id === editingId || h.id === editingId) ? { ...h, ...savedHack } : h));
        onUpdateHackathons(updated);
        showToast?.(`Updated "${formData.title}" ${shouldPublish ? 'and published in MongoDB!' : 'as draft in MongoDB.'}`);
      } catch (err) {
        console.error('Failed to update hackathon:', err);
        showToast?.(`Update error: ${err.message}`);
      }
    }

    setView('list');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Confirm Delete in MongoDB
  const handleConfirmDelete = async () => {
    if (!hackToDelete) return;
    const targetId = hackToDelete._id || hackToDelete.id;
    const title = hackToDelete.title;

    try {
      await hackathonsApi.deleteHackathon(targetId);
      const updated = hackathons.filter(h => (h._id !== targetId && h.id !== targetId));
      onUpdateHackathons(updated);
      setHackToDelete(null);
      showToast?.(`Deleted "${title}" from MongoDB database.`);
    } catch (err) {
      console.error('Delete failed:', err);
      showToast?.(`Delete failed: ${err.message}`);
    }
  };

  // Tracks chip actions
  const handleAddTrack = () => {
    const trimmed = trackInput.trim();
    const currentTracks = Array.isArray(formData.tracks) ? formData.tracks : [];
    if (trimmed && !currentTracks.includes(trimmed)) {
      setFormData(prev => ({ ...prev, tracks: [...(Array.isArray(prev.tracks) ? prev.tracks : []), trimmed] }));
      setTrackInput('');
    }
  };

  const handleRemoveTrack = (trackName) => {
    setFormData(prev => ({
      ...prev,
      tracks: (Array.isArray(prev.tracks) ? prev.tracks : []).filter(t => t !== trackName)
    }));
  };

  // Rules list actions
  const handleAddRule = () => {
    setFormData(prev => ({
      ...prev,
      rules: [...(Array.isArray(prev.rules) ? prev.rules : []), '']
    }));
  };

  const handleRemoveRule = (index) => {
    setFormData(prev => ({
      ...prev,
      rules: (Array.isArray(prev.rules) ? prev.rules : []).filter((_, i) => i !== index)
    }));
  };

  const handleUpdateRule = (index, value) => {
    const updated = [...(Array.isArray(formData.rules) ? formData.rules : [])];
    updated[index] = value;
    setFormData(prev => ({ ...prev, rules: updated }));
  };

  // Calculate stats for Executive Strip
  const stats = useMemo(() => {
    const total = hackathons.length;
    const published = hackathons.filter(h => h.isPublished !== false).length;
    const drafts = total - published;

    // Sum prize money
    let totalPrizesNumeric = 0;
    hackathons.forEach(h => {
      const match = (h.prizePool || '').replace(/[^0-9]/g, '');
      if (match) totalPrizesNumeric += parseInt(match, 10);
    });

    return {
      total,
      published,
      drafts,
      prizeSum: totalPrizesNumeric > 0 ? `₹${totalPrizesNumeric.toLocaleString('en-IN')}+` : '₹0'
    };
  }, [hackathons]);

  // Filtered and sorted hackathons for Table
  const filteredHackathons = useMemo(() => {
    return hackathons.filter(h => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = h.title?.toLowerCase().includes(q);
        const orgName = typeof h.organizer === 'object' ? h.organizer?.name : h.organizer || '';
        const matchesOrg = orgName.toLowerCase().includes(q);
        const matchesLoc = h.location?.toLowerCase().includes(q);
        const matchesTracks = h.trackLabels?.some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesOrg && !matchesLoc && !matchesTracks) {
          return false;
        }
      }

      // Status Filter
      const isPub = h.isPublished !== false;
      if (statusFilter === 'published' && !isPub) return false;
      if (statusFilter === 'draft' && isPub) return false;

      // Mode Filter
      if (modeFilter !== 'all') {
        const norm = normalizeMode(h.mode).toLowerCase();
        if (norm !== modeFilter.toLowerCase()) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'prize') {
        const prizeA = parseInt((a.prizePool || '').replace(/[^0-9]/g, ''), 10) || 0;
        const prizeB = parseInt((b.prizePool || '').replace(/[^0-9]/g, ''), 10) || 0;
        return prizeB - prizeA;
      }
      // Newest default
      return 0;
    });
  }, [hackathons, searchQuery, statusFilter, modeFilter, sortBy]);

  // ========================================================
  // VIEW 1: MANAGE HACKATHONS LIST / TABLE PAGE
  // ========================================================
  if (view === 'list') {
    return (
      <div className="flex flex-col w-full pb-space-xl space-y-6">
        {/* Top Header & Quick Add */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-surface-container-high/80">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-secondary font-label-md text-label-md uppercase tracking-wider mb-0.5">
              <span className="material-symbols-outlined text-base">admin_panel_settings</span>
              <span>ADMIN CONSOLE · HACKATHON CIRCUIT MANAGEMENT</span>
              {currentUser && (
                <span className="text-[11px] text-on-surface-variant font-medium normal-case ml-2 pl-2 border-l border-surface-container-high hidden sm:inline">
                  Operator: <strong className="text-on-surface">{currentUser.name}</strong>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight uppercase">
              MANAGE HACKATHONS
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
              Create, modify, verify, duplicate, and schedule collegiate competitions across the platform.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold border border-surface-container-high transition-all cursor-pointer"
              title="Restore standard circuit seed data"
            >
              <span className="material-symbols-outlined text-sm text-outline">history</span>
              <span>Reset to Defaults</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-surface-tint active:scale-[0.98] text-on-primary text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              <span>+ Add Hackathon</span>
            </button>
          </div>
        </div>

        {/* Executive Stats Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div
            onClick={() => setStatusFilter('all')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-surface-container-lowest border-secondary shadow-xs'
                : 'bg-surface-container-low/70 border-surface-container-high/70 hover:bg-surface-container-low'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-outline tracking-wider">Total Circuit Events</span>
              <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-base">terminal</span>
              </span>
            </div>
            <div className="text-2xl font-black text-on-surface mt-2">{stats.total}</div>
            <span className="text-[11px] text-on-surface-variant mt-0.5 block">Registered competitions</span>
          </div>

          <div
            onClick={() => setStatusFilter('published')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'published'
                ? 'bg-surface-container-lowest border-emerald-500 shadow-xs'
                : 'bg-surface-container-low/70 border-surface-container-high/70 hover:bg-surface-container-low'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">Live &amp; Published</span>
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-base">visibility</span>
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-900 mt-2">{stats.published}</div>
            <span className="text-[11px] text-on-surface-variant mt-0.5 block">Active on student portal</span>
          </div>

          <div
            onClick={() => setStatusFilter('draft')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'draft'
                ? 'bg-surface-container-lowest border-amber-500 shadow-xs'
                : 'bg-surface-container-low/70 border-surface-container-high/70 hover:bg-surface-container-low'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider">Drafts &amp; Staging</span>
              <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-base">draft</span>
              </span>
            </div>
            <div className="text-2xl font-black text-amber-900 mt-2">{stats.drafts}</div>
            <span className="text-[11px] text-on-surface-variant mt-0.5 block">Unpublished / Admin only</span>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-low/70 border border-surface-container-high/70">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-purple-800 tracking-wider">Cumulative Grants</span>
              <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-base">military_tech</span>
              </span>
            </div>
            <div className="text-2xl font-black text-purple-900 mt-2">{stats.prizeSum}</div>
            <span className="text-[11px] text-on-surface-variant mt-0.5 block">Available prize capital (IND Rs)</span>
          </div>
        </div>

        {/* Filter, Search & Sort Bar */}
        <div className="p-3.5 bg-surface-container-lowest rounded-2xl border border-surface-container-high shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 min-w-[220px]">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-base text-outline pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hackathons by name, organizer, venue, or track..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-xs text-on-surface font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>

          {/* Controls: Status Tabs, Mode Selector, Sort Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Pills */}
            <div className="flex items-center p-1 bg-surface-container-low rounded-xl text-xs font-bold">
              {[
                { id: 'all', label: 'All' },
                { id: 'published', label: 'Published' },
                { id: 'draft', label: 'Drafts' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Mode Select */}
            <div className="flex items-center gap-1">
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="bg-surface-container-low px-2.5 py-1.5 rounded-xl text-xs font-bold text-on-surface outline-none border border-surface-container-high cursor-pointer"
              >
                <option value="all">All Modes</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-surface-container-low px-2.5 py-1.5 rounded-xl text-xs font-bold text-on-surface outline-none border border-surface-container-high cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="prize">Highest Prize</option>
                <option value="title">Alphabetical (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-surface-container-lowest rounded-2xl border border-surface-container-high overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-outline uppercase font-extrabold text-[10px] tracking-wider border-b border-surface-container-high">
              <tr>
                <th className="py-3.5 px-4">Hackathon Name</th>
                <th className="py-3.5 px-3">Organizer</th>
                <th className="py-3.5 px-3">Registration Deadline</th>
                <th className="py-3.5 px-3">Event Date</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3 text-center">Toggle Live</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/60">
              {filteredHackathons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-4xl text-outline mb-2">search_off</span>
                    <p className="font-bold text-sm text-on-surface">No hackathons match your search criteria.</p>
                    <p className="text-xs text-outline mt-1">Try resetting the filters or adding a new hackathon.</p>
                  </td>
                </tr>
              ) : (
                filteredHackathons.map((h) => {
                  const isPub = h.isPublished !== false;
                  const orgName = typeof h.organizer === 'object' ? h.organizer?.name : h.organizer || 'Collegiate Host';
                  const normMode = normalizeMode(h.mode);

                  return (
                    <tr key={h._id || h.id} className="hover:bg-surface-container-low/40 transition-colors">
                      {/* Name & Mode */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <span className="material-symbols-outlined text-xl text-secondary mt-0.5">terminal</span>
                          <div>
                            <span className="font-bold text-xs sm:text-sm text-on-surface block truncate max-w-[240px]" title={h.title}>
                              {h.title}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-surface-container text-on-surface-variant uppercase">
                                {normMode}
                              </span>
                              <span className="text-[10px] text-outline">
                                {h.circuitId || 'BC-CIRC'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Organizer */}
                      <td className="py-3.5 px-3 text-on-surface-variant font-medium">
                        <span className="truncate max-w-[170px] block" title={orgName}>
                          {orgName}
                        </span>
                      </td>

                      {/* Registration Deadline */}
                      <td className="py-3.5 px-3 text-amber-900 font-semibold">
                        <span className="truncate max-w-[150px] block">
                          {h.registrationDeadline || 'TBD'}
                        </span>
                      </td>

                      {/* Event Date */}
                      <td className="py-3.5 px-3 text-on-surface font-medium">
                        <span className="truncate max-w-[150px] block">
                          {h.dates || (h.startDate ? `${h.startDate} – ${h.endDate}` : 'TBD')}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isPub
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isPub ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                          <span>{isPub ? 'Published' : 'Draft'}</span>
                        </span>
                      </td>

                      {/* Quick Toggle Live */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(h)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                            isPub
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                          }`}
                          title={isPub ? 'Unpublish to Draft' : 'Publish Live to Students'}
                        >
                          {isPub ? 'Unpublish' : 'Publish'}
                        </button>
                      </td>

                      {/* Actions: Edit, Duplicate, Preview, Delete */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Live Preview Button */}
                          <button
                            type="button"
                            onClick={() => setPreviewHackathon(h)}
                            className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all cursor-pointer"
                            title="Preview Student View"
                          >
                            <span className="material-symbols-outlined text-base text-secondary">visibility</span>
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(h)}
                            className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            title="Modify Hackathon Data"
                          >
                            <span className="material-symbols-outlined text-sm text-secondary">edit</span>
                            <span>Edit</span>
                          </button>

                          {/* Clone Button */}
                          <button
                            type="button"
                            onClick={() => handleDuplicate(h)}
                            className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
                            title="Duplicate as Draft"
                          >
                            <span className="material-symbols-outlined text-base">content_copy</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setHackToDelete(h)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-on-surface-variant hover:text-red-700 transition-all cursor-pointer"
                            title="Delete Hackathon"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile / Tablet Responsive Cards */}
        <div className="md:hidden space-y-3">
          {filteredHackathons.map((h) => {
            const isPub = h.isPublished !== false;
            const orgName = typeof h.organizer === 'object' ? h.organizer?.name : h.organizer || 'Collegiate Host';
            const normMode = normalizeMode(h.mode);

            return (
              <div
                key={h._id || h.id}
                className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container-high shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container text-on-surface-variant uppercase">
                        {normMode}
                      </span>
                      <span className="text-[10px] text-outline">
                        {h.circuitId || 'BC-CIRC'}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-on-surface truncate" title={h.title}>
                      {h.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant truncate mt-0.5">
                      {orgName}
                    </p>
                  </div>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    isPub
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isPub ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                    <span>{isPub ? 'Published' : 'Draft'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-surface-container-low text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-outline block">Event Date</span>
                    <span className="font-semibold text-on-surface truncate block mt-0.5">
                      {h.dates || h.startDate || 'TBD'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-800 block">Registration Deadline</span>
                    <span className="font-semibold text-amber-900 truncate block mt-0.5">
                      {h.registrationDeadline || 'TBD'}
                    </span>
                  </div>
                </div>

                {/* Mobile Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-surface-container-high/60">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(h)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        isPub
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isPub ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(h)}
                      className="p-1.5 rounded-lg bg-surface-container text-on-surface text-xs font-bold"
                      title="Clone"
                    >
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(h)}
                      className="py-1.5 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm text-secondary">edit</span>
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHackToDelete(h)}
                      className="p-1.5 rounded-xl hover:bg-red-50 text-red-600 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Delete Confirmation Modal */}
        {hackToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-modal">
            <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl p-6 shadow-2xl border border-surface-container-high space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl">warning</span>
                </span>
                <div>
                  <h4 className="font-bold text-on-surface text-base">
                    Delete Hackathon?
                  </h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Are you sure you want to remove <strong>{hackToDelete.title}</strong>?
                  </p>
                </div>
              </div>

              <p className="text-xs text-on-surface-variant leading-relaxed">
                This action is permanent and will eliminate this hackathon from both the admin directory and the student platform.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setHackToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset to Defaults Confirmation Modal */}
        {isResetConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-modal">
            <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl p-6 shadow-2xl border border-surface-container-high space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl">restart_alt</span>
                </span>
                <div>
                  <h4 className="font-bold text-on-surface text-base">
                    Re-synchronize with MongoDB Atlas?
                  </h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Refresh live hackathon records from buildcrew_db database
                  </p>
                </div>
              </div>

              <p className="text-xs text-on-surface-variant leading-relaxed">
                Fetch the latest circuit state directly from the MongoDB backend database to ensure all records match platform truth.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsResetConfirmOpen(false);
                    if (onRefreshHackathons) {
                      onRefreshHackathons();
                      showToast?.('Re-synchronized circuit records from MongoDB Atlas.');
                    } else {
                      onResetDefaults?.();
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary-fixed text-on-secondary font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">sync</span>
                  <span>Sync from MongoDB</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Preview Modal for Table Rows */}
        {previewHackathon && (
          <HackathonDetailsModal
            hackathon={previewHackathon}
            isOpen={Boolean(previewHackathon)}
            onClose={() => setPreviewHackathon(null)}
            onFindSquad={() => {
              setPreviewHackathon(null);
              onNavigate?.('hackathons');
            }}
          />
        )}
      </div>
    );
  }

  // ========================================================
  // VIEW 2: PROFESSIONAL HACKATHON ADD / EDIT FORM
  // ========================================================
  const currentEditingHack = isEditing ? hackathons.find(h => (h._id === editingId || h.id === editingId)) : null;
  const isCurrentPublished = currentEditingHack ? currentEditingHack.isPublished !== false : false;

  return (
    <div className="flex flex-col w-full pb-space-xl space-y-6 max-w-4xl mx-auto animate-fadeIn">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container-high/80">
        <div>
          <button
            type="button"
            onClick={() => setView('list')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:underline cursor-pointer mb-2"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Back to Manage Hackathons</span>
          </button>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight uppercase">
              {isEditing ? 'EDIT HACKATHON' : 'ADD HACKATHON'}
            </h1>
            {isEditing && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isCurrentPublished
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {isCurrentPublished ? 'Published' : 'Draft'}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
            {isEditing
              ? `Update registry data for "${formData.title || 'hackathon'}"`
              : 'Enter hackathon details below to register a new collegiate circuit event.'}
          </p>
        </div>
      </div>

      {/* Main Single-Column Professional Data-Entry Form Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 border border-surface-container-high shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(isEditing ? isCurrentPublished : true);
          }}
          className="space-y-8"
        >
          {/* ======================================================== */}
          {/* ADD HACKATHON IMAGE */}
          {/* ======================================================== */}
          <div className="space-y-3 pb-6 border-b border-surface-container-high">
            <div>
              <h3 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-lg text-secondary">image</span>
                <span>Add Hackathon Image</span>
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Upload a cover image/banner for this hackathon. Recommended ratio: 16:9
              </p>
            </div>

            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageFileChange}
              className="hidden"
            />

            {!formData.image ? (
              <div className="rounded-xl border-2 border-dashed border-surface-container-high bg-surface-container-low/50 p-6 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-secondary text-on-secondary text-xs font-bold hover:bg-secondary/90 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-base">upload</span>
                    <span>+ Upload Hackathon Image</span>
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-outline">
                  <span>PNG, JPG, WebP up to 5MB</span>
                  <span>•</span>
                  <span>Recommended ratio: 16:9</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative aspect-video max-w-lg rounded-xl overflow-hidden border border-surface-container-high bg-surface-container-low shadow-xs">
                  <img
                    src={formData.image}
                    alt="Hackathon cover preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 border border-surface-container-high"
                  >
                    <span className="material-symbols-outlined text-sm">sync</span>
                    <span>Replace Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                    className="px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 border border-red-200"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    <span>Remove Image</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* 1. BASIC INFORMATION */}
          {/* ======================================================== */}
          <div className="space-y-4 pb-6 border-b border-surface-container-high">
            <h3 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-lg text-secondary">info</span>
              <span>1. BASIC INFORMATION</span>
            </h3>

            {/* Hackathon Name */}
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Hackathon Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (formErrors.title) setFormErrors({ ...formErrors, title: null });
                }}
                placeholder="e.g. Smart India Hackathon 2026"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border text-xs text-on-surface font-medium outline-none focus:border-secondary transition-all ${
                  formErrors.title ? 'border-red-500 bg-red-50/20' : 'border-surface-container-high'
                }`}
              />
              {formErrors.title && (
                <p className="text-[11px] text-red-500 font-semibold mt-1">{formErrors.title}</p>
              )}
            </div>

            {/* Organizer */}
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Organizer <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.organizer}
                onChange={(e) => {
                  setFormData({ ...formData, organizer: e.target.value });
                  if (formErrors.organizer) setFormErrors({ ...formErrors, organizer: null });
                }}
                placeholder="e.g. Ministry of Education & AICTE"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border text-xs text-on-surface font-medium outline-none focus:border-secondary transition-all ${
                  formErrors.organizer ? 'border-red-500 bg-red-50/20' : 'border-surface-container-high'
                }`}
              />
              {formErrors.organizer && (
                <p className="text-[11px] text-red-500 font-semibold mt-1">{formErrors.organizer}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (formErrors.description) setFormErrors({ ...formErrors, description: null });
                }}
                placeholder="Provide a comprehensive description of the hackathon theme, target students, problem statements, and requirements..."
                className={`w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border text-xs text-on-surface font-medium outline-none focus:border-secondary transition-all resize-y ${
                  formErrors.description ? 'border-red-500 bg-red-50/20' : 'border-surface-container-high'
                }`}
              />
              {formErrors.description && (
                <p className="text-[11px] text-red-500 font-semibold mt-1">{formErrors.description}</p>
              )}
            </div>

            {/* Official Website & Registration Link */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Official Website
                </label>
                <input
                  type="url"
                  value={formData.officialWebsite}
                  onChange={(e) => setFormData({ ...formData, officialWebsite: e.target.value })}
                  placeholder="https://sih.gov.in"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-xs text-on-surface font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Registration Link
                </label>
                <input
                  type="url"
                  value={formData.registrationLink}
                  onChange={(e) => setFormData({ ...formData, registrationLink: e.target.value })}
                  placeholder="https://sih.gov.in/register"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-xs text-on-surface font-medium"
                />
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 2. DATE & TIME */}
          {/* ======================================================== */}
          <div className="space-y-4 pb-6 border-b border-surface-container-high">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-lg text-secondary">calendar_clock</span>
                <span>2. DATE &amp; TIME</span>
              </h3>
              <span className="text-[11px] font-semibold text-secondary bg-secondary/10 px-2.5 py-0.5 rounded-md inline-flex items-center gap-1 w-fit">
                <span className="material-symbols-outlined text-xs">schedule</span>
                <span>All times in IST (Asia/Kolkata)</span>
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Registration Deadline */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Registration Deadline
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.regDeadlineDate}
                      onChange={(e) => setFormData({ ...formData, regDeadlineDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-xs text-on-surface font-medium"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="time"
                      value={formData.regDeadlineTime}
                      onChange={(e) => setFormData({ ...formData, regDeadlineTime: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-xs text-on-surface font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Hackathon Start */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Hackathon Start
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-xs text-on-surface font-medium"
                  />
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-xs text-on-surface font-medium"
                  />
                </div>
              </div>

              {/* Hackathon End */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Hackathon End
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-xs text-on-surface font-medium"
                  />
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-xs text-on-surface font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 3. MODE & LOCATION */}
          {/* ======================================================== */}
          <div className="space-y-4 pb-6 border-b border-surface-container-high">
            <h3 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-lg text-secondary">location_on</span>
              <span>3. MODE &amp; LOCATION</span>
            </h3>

            {/* Mode Selector */}
            <div>
              <label className="block text-xs font-bold text-on-surface mb-2">
                Mode
              </label>
              <div className="grid grid-cols-3 gap-2.5 max-w-md">
                {['Online', 'Offline', 'Hybrid'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        mode: m,
                        location: m === 'Online' ? 'Online event' : (prev.location === 'Online event' ? '' : prev.location)
                      }));
                      if (formErrors.location) setFormErrors({ ...formErrors, location: null });
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      formData.mode === m
                        ? 'bg-secondary text-on-secondary border-secondary shadow-xs'
                        : 'bg-surface-container-low hover:bg-surface-container text-on-surface border-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {m === 'Online' ? 'language' : m === 'Offline' ? 'apartment' : 'devices'}
                    </span>
                    <span>{m}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Conditional Rendering */}
            {formData.mode === 'Online' ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>Online event</span>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => {
                    setFormData({ ...formData, location: e.target.value });
                    if (formErrors.location) setFormErrors({ ...formErrors, location: null });
                  }}
                  placeholder="e.g. Main Auditorium, College Campus / City"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border text-xs text-on-surface font-medium outline-none focus:border-secondary transition-all ${
                    formErrors.location ? 'border-red-500 bg-red-50/20' : 'border-surface-container-high'
                  }`}
                />
                {formErrors.location && (
                  <p className="text-[11px] text-red-500 font-semibold mt-1">{formErrors.location}</p>
                )}
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* 4. TEAM & ELIGIBILITY */}
          {/* ======================================================== */}
          <div className="space-y-4 pb-6 border-b border-surface-container-high">
            <h3 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-lg text-secondary">groups</span>
              <span>4. TEAM &amp; ELIGIBILITY</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Minimum Team Size */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Minimum Team Size
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.minTeamSize}
                  onChange={(e) => {
                    setFormData({ ...formData, minTeamSize: e.target.value });
                    if (formErrors.teamSize) setFormErrors({ ...formErrors, teamSize: null });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-xs text-on-surface font-medium"
                />
              </div>

              {/* Maximum Team Size */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Maximum Team Size
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.maxTeamSize}
                  onChange={(e) => {
                    setFormData({ ...formData, maxTeamSize: e.target.value });
                    if (formErrors.teamSize) setFormErrors({ ...formErrors, teamSize: null });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-xs text-on-surface font-medium"
                />
              </div>
            </div>
            {formErrors.teamSize && (
              <p className="text-[11px] text-red-500 font-semibold">{formErrors.teamSize}</p>
            )}

            {/* Eligibility */}
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Eligibility
              </label>
              <textarea
                rows={3}
                value={formData.eligibility}
                onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
                placeholder="Open to undergraduate students. Students must be currently enrolled in a recognized college."
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-xs text-on-surface font-medium resize-y"
              />
            </div>
          </div>

          {/* ======================================================== */}
          {/* 5. REGISTRATION FEE */}
          {/* ======================================================== */}
          <div className="space-y-4 pb-6 border-b border-surface-container-high">
            <h3 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-lg text-secondary">payments</span>
              <span>5. REGISTRATION FEE</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-2">
                Registration Fee
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, feeType: 'free', feeAmount: '' });
                    if (formErrors.feeAmount) setFormErrors({ ...formErrors, feeAmount: null });
                  }}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    formData.feeType === 'free'
                      ? 'bg-secondary text-on-secondary border-secondary shadow-xs'
                      : 'bg-surface-container-low hover:bg-surface-container text-on-surface border-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>Free</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, feeType: 'paid' })}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    formData.feeType === 'paid'
                      ? 'bg-secondary text-on-secondary border-secondary shadow-xs'
                      : 'bg-surface-container-low hover:bg-surface-container text-on-surface border-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">currency_rupee</span>
                  <span>Paid</span>
                </button>
              </div>
            </div>

            {formData.feeType === 'free' ? (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-base">verified</span>
                <span>Display: ₹0 / Free</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-w-xs">
                <label className="block text-xs font-bold text-on-surface">
                  Amount (IND Rs / ₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-on-surface-variant">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={formData.feeAmount}
                    onChange={(e) => {
                      setFormData({ ...formData, feeAmount: e.target.value });
                      if (formErrors.feeAmount) setFormErrors({ ...formErrors, feeAmount: null });
                    }}
                    placeholder="499"
                    className={`w-full pl-8 pr-3.5 py-2 rounded-xl bg-surface-container-low border text-xs text-on-surface font-medium outline-none focus:border-secondary transition-all ${
                      formErrors.feeAmount ? 'border-red-500 bg-red-50/20' : 'border-surface-container-high'
                    }`}
                  />
                </div>
                {formErrors.feeAmount ? (
                  <p className="text-[11px] text-red-500 font-semibold">{formErrors.feeAmount}</p>
                ) : (
                  <p className="text-[11px] text-on-surface-variant font-medium">
                    Display: <strong className="text-on-surface">₹{formData.feeAmount || '499'}</strong>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* 6. TRACKS */}
          {/* ======================================================== */}
          <div className="space-y-4 pb-6 border-b border-surface-container-high">
            <h3 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-lg text-secondary">category</span>
              <span>6. TRACKS</span>
            </h3>

            {/* Add Track Input & Button */}
            <div className="flex items-center gap-2 max-w-lg">
              <input
                type="text"
                value={trackInput}
                onChange={(e) => setTrackInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTrack();
                  }
                }}
                placeholder="Type track name (e.g. AI, Web Development)..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-xs text-on-surface font-medium"
              />
              <button
                type="button"
                onClick={handleAddTrack}
                className="px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 text-on-secondary text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs"
              >
                + Add Track
              </button>
            </div>

            {/* Removable Tags List */}
            {(formData.tracks || []).length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {(formData.tracks || []).map((track, tIdx) => (
                  <span
                    key={tIdx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface font-semibold text-xs border border-surface-container-high shadow-xs"
                  >
                    <span>{track}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTrack(track)}
                      className="text-on-surface-variant hover:text-red-500 cursor-pointer flex items-center justify-center p-0.5 rounded-full hover:bg-surface-container-high transition-colors"
                      title={`Remove ${track}`}
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-outline italic">
                No tracks added yet. Type a track name above and click "+ Add Track".
              </p>
            )}
          </div>

          {/* ======================================================== */}
          {/* 7. PRIZES */}
          {/* ======================================================== */}
          <div className="space-y-4 pb-6 border-b border-surface-container-high">
            <h3 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-lg text-secondary">military_tech</span>
              <span>7. PRIZES</span>
            </h3>

            <div className="max-w-md">
              <label className="block text-xs font-bold text-on-surface mb-1">
                Prize Pool (₹ / IND Rs)
              </label>
              <input
                type="text"
                value={formData.prizePool}
                onChange={(e) => setFormData({ ...formData, prizePool: e.target.value })}
                placeholder="e.g. ₹50,000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-xs text-on-surface font-medium"
              />
              <span className="text-[11px] text-outline mt-1 block">
                Total prize pool or breakdown in Indian Rupees (e.g. ₹50,000 or ₹10,00,000).
              </span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 8. RULES */}
          {/* ======================================================== */}
          <div className="space-y-4 pb-6 border-b border-surface-container-high">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-lg text-secondary">gavel</span>
                <span>8. RULES</span>
              </h3>
              <button
                type="button"
                onClick={handleAddRule}
                className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 border border-surface-container-high"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>Add Rule</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {(formData.rules || []).map((rule, rIdx) => (
                <div key={rIdx} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-surface-container-high text-on-surface font-bold text-xs flex items-center justify-center shrink-0">
                    {rIdx + 1}
                  </span>
                  <input
                    type="text"
                    value={rule}
                    onChange={(e) => handleUpdateRule(rIdx, e.target.value)}
                    placeholder={`e.g. Rule ${rIdx + 1}`}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-xs text-on-surface font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveRule(rIdx)}
                    className="p-1.5 text-on-surface-variant hover:text-red-500 rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
                    title="Remove Rule"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ======================================================== */}
          {/* 9. VERIFICATION */}
          {/* ======================================================== */}
          <div className="space-y-4 pb-6 border-b border-surface-container-high">
            <h3 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-lg text-secondary">verified_user</span>
              <span>9. VERIFICATION</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Last Verified
                </label>
                <input
                  type="date"
                  value={formData.verifiedDate}
                  onChange={(e) => setFormData({ ...formData, verifiedDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-xs text-on-surface font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Verified By
                </label>
                <input
                  type="text"
                  value={formData.verifiedBy}
                  onChange={(e) => setFormData({ ...formData, verifiedBy: e.target.value })}
                  placeholder="e.g. BuildCrew Collegiate Sanctioning Board"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container-high focus:border-secondary outline-none text-xs text-on-surface font-medium"
                />
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 10. PUBLISHING */}
          {/* ======================================================== */}
          <div className="pt-2">
            <h3 className="font-bold text-sm text-on-surface mb-4 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-lg text-secondary">publish</span>
              <span>10. PUBLISHING</span>
            </h3>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setView('list')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs transition-all cursor-pointer text-center"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {!isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSave(false)}
                      className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-xs border border-surface-container-high transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-sm text-amber-700">draft</span>
                      <span>Save Draft</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSave(true)}
                      className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-primary hover:bg-surface-tint text-on-primary font-bold text-xs shadow-md transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-sm">publish</span>
                      <span>Publish Hackathon</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSave(false)}
                      className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-xs border border-surface-container-high transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-xs"
                      title="Save edits and store as draft"
                    >
                      <span className="material-symbols-outlined text-sm text-amber-700">draft</span>
                      <span>Save Draft</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSave(isCurrentPublished)}
                      className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-surface-container-highest hover:bg-surface-container-high text-on-surface font-bold text-xs border border-surface-container-high transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-xs"
                      title="Save all changes preserving current status"
                    >
                      <span className="material-symbols-outlined text-sm">save</span>
                      <span>Save Changes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSave(!isCurrentPublished)}
                      className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                        isCurrentPublished
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-primary hover:bg-surface-tint text-on-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {isCurrentPublished ? 'unpublished' : 'publish'}
                      </span>
                      <span>{isCurrentPublished ? 'Unpublish' : 'Publish'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
