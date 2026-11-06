/**
 * Badminton Mixed Doubles Score & Position Guide Engine
 * Supports:
 * - BWF Official Rules + Custom Target Point & Deuce Cap (+3 default)
 * - Dedicated Master Teams & Squad Roster Database ('teams' screen)
 * - Dynamic Tournament Bracket ('bracket' screen) with Knockout + 3rd Place Playoff (Juara 1, 2, 3)
 * - Quick Team & Player Selection in Setup & Between Sets
 */

const STORAGE_KEY_ACTIVE = 'skor_badminton_active_v2';
const STORAGE_KEY_HISTORY = 'skor_badminton_history_v2';
const STORAGE_KEY_TEAMS = 'skor_badminton_master_teams_v3';
const STORAGE_KEY_BRACKET = 'skor_badminton_bracket_v3';
const STORAGE_KEY_ADMIN = 'skor_badminton_admin_unlocked_v1';

const ACTION_PASSWORDS = {
  wasit: 'solatlahdulu', // 1. Menambah tim baru, anggota baru, memulai pertandingan, & mode wasit
  edit: 'ngajilahdulu',  // 2. Edit nama tim, edit nama anggota, edit bracket
  delete: 'takbirlahdulu' // 3. Aksi hapus (tim, anggota, reset bracket, hapus riwayat)
};

const DEFAULT_MASTER_TEAMS = [
  // ==========================================
  // GRUP A (A1 - A4)
  // ==========================================
  {
    id: 'team-a1',
    code: 'A1',
    group: 'A',
    name: 'Tim A1 Alpha',
    subtitle: 'p turi cs',
    members: [
      { id: 'm-a1-1', name: 'Pak Turi', gender: 'male' },
      { id: 'm-a1-2', name: 'Noval', gender: 'male' },
      { id: 'm-a1-3', name: 'Muiz', gender: 'male' },
      { id: 'm-a1-4', name: 'Iwud', gender: 'female' }
    ]
  },
  {
    id: 'team-a2',
    code: 'A2',
    group: 'A',
    name: 'Tim A2 Bravo',
    subtitle: 'nabila cs',
    members: [
      { id: 'm-a2-1', name: 'Ilham', gender: 'male' },
      { id: 'm-a2-2', name: 'Afriza', gender: 'male' },
      { id: 'm-a2-3', name: 'Dhika', gender: 'male' },
      { id: 'm-a2-4', name: 'Nabila', gender: 'female' }
    ]
  },
  {
    id: 'team-a3',
    code: 'A3',
    group: 'A',
    name: 'Tim A3 Charlie',
    subtitle: 'tamara cs',
    members: [
      { id: 'm-a3-1', name: 'Dilla', gender: 'male' },
      { id: 'm-a3-2', name: 'Sello', gender: 'male' },
      { id: 'm-a3-3', name: 'Tamara', gender: 'female' },
      { id: 'm-a3-4', name: 'Mariyani', gender: 'female' }
    ]
  },
  {
    id: 'team-a4',
    code: 'A4',
    group: 'A',
    name: 'Tim A4 Delta',
    subtitle: 'fahmi cs',
    members: [
      { id: 'm-a4-1', name: 'Fahmi', gender: 'male' },
      { id: 'm-a4-2', name: 'Putra', gender: 'male' },
      { id: 'm-a4-3', name: 'Fakhri', gender: 'male' },
      { id: 'm-a4-4', name: 'Sela', gender: 'female' },
      { id: 'm-a4-5', name: 'Bu Indah', gender: 'female' }
    ]
  },
  // ==========================================
  // GRUP B (B1 - B4)
  // ==========================================
  {
    id: 'team-b1',
    code: 'B1',
    group: 'B',
    name: 'Tim B1 Echo',
    subtitle: 'tesar cs',
    members: [
      { id: 'm-b1-1', name: 'Tesar', gender: 'male' },
      { id: 'm-b1-2', name: 'Elang', gender: 'male' },
      { id: 'm-b1-3', name: 'Fathan', gender: 'male' },
      { id: 'm-b1-4', name: 'Nia', gender: 'female' },
      { id: 'm-b1-5', name: 'Bu Lila', gender: 'female' }
    ]
  },
  {
    id: 'team-b2',
    code: 'B2',
    group: 'B',
    name: 'Tim B2 Foxtrot',
    subtitle: 'darvis cs',
    members: [
      { id: 'm-b2-1', name: 'Darvis', gender: 'male' },
      { id: 'm-b2-2', name: 'Andrew', gender: 'male' },
      { id: 'm-b2-3', name: 'Sofia', gender: 'female' },
      { id: 'm-b2-4', name: 'Fitriyatil', gender: 'female' }
    ]
  },
  {
    id: 'team-b3',
    code: 'B3',
    group: 'B',
    name: 'Tim B3 Gold',
    subtitle: 'radja cs',
    members: [
      { id: 'm-b3-1', name: 'Radja', gender: 'male' },
      { id: 'm-b3-2', name: 'Reza', gender: 'male' },
      { id: 'm-b3-3', name: 'Bu Putri', gender: 'female' },
      { id: 'm-b3-4', name: 'Naily', gender: 'female' }
    ]
  },
  {
    id: 'team-b4',
    code: 'B4',
    group: 'B',
    name: 'Tim B4 Hotel',
    subtitle: 'rahmad cs',
    members: [
      { id: 'm-b4-1', name: 'Rahmad', gender: 'male' },
      { id: 'm-b4-2', name: 'Alvian', gender: 'male' },
      { id: 'm-b4-3', name: 'Fiter', gender: 'female' },
      { id: 'm-b4-4', name: 'Ilmi', gender: 'female' }
    ]
  }
];

function badmintonApp() {
  return {
    // Navigation view: 'setup' | 'teams' | 'bracket' | 'match' | 'rules' | 'history'
    screen: 'setup',

    // Sound / Umpire TTS
    voiceEnabled: true,

    // Admin / Umpire Session Lock (Spectator Mode vs Admin/Umpire Mode)
    isAdminUnlocked: false,
    matchStopwatchTimerId: null,

    // Centralized Server Sync State
    syncState: {
      status: 'connecting', // 'synced' | 'syncing' | 'offline' | 'connecting'
      lastServerUpdatedAt: 0,
      lastLocalMutationAt: 0,
      pollTimerId: null,
      pendingPushes: 0,
      isPushing: false
    },
    _pushQueue: Promise.resolve(),

    // Master Teams Database (Managed on the 'teams' screen)
    masterTeams: [],
    newTeamNameInput: '',
    newTeamGroupInput: 'A',
    newTeamCodeInput: '',
    newMemberInputs: {},
    editingTeamId: null,
    editingTeamName: '',
    editingTeamGroup: 'A',
    editingTeamCode: '',
    editingMemberId: null,
    editingMemberName: '',
    editingMemberGender: 'male',

    // Setup Court Filter ('ALL' | 'Lapangan 1' | 'Lapangan 2')
    setupCourtFilter: 'ALL',
    bracketCourtFilter: 'ALL',

    // Tournament Bracket State (Group Stage + Knockout Semifinal & Final)
    bracket: {
      isCreated: false,
      formatVersion: 'group_stage_v2',
      editMode: false,
      title: 'Turnamen Badminton Ganda Campuran',
      size: 8,
      participantCount: 8,
      groupMatches: [], // 12 Group Stage matches (Grup A & Grup B across Lapangan 1 & Lapangan 2)
      rounds: [], // Knockout rounds: Semifinal (15 pts) & Final (21 pts)
      thirdPlaceMatch: null, // Perebutan Juara 3
      activeBracketMatchId: null
    },

    // Setup Form Configuration
    config: {
      preset: 'quick11', // 'bwf21' | 'community15' | 'quick11' | 'custom'
      targetPoints: 11,
      deuceEnabled: true,
      deuceAllowance: 3,
      maxCap: 14,
      bestOf: 3, // 2-3 set (Best of 3)
      firstServerTeam: 'A',
      teamAOnLeft: true,
      teamA: {
        teamId: 'team-a1',
        name: 'Tim A1 Alpha',
        male: 'Pak Turi',
        female: 'Iwud',
        initialRight: 'male'
      },
      teamB: {
        teamId: 'team-a2',
        name: 'Tim A2 Bravo',
        male: 'Ilham',
        female: 'Nabila',
        initialRight: 'male'
      }
    },

    // Active Match State
    match: {
      isActive: false,
      isFinished: false,
      winnerTeam: null, // 'A' or 'B'
      currentSet: 1,
      setsWon: { A: 0, B: 0 },
      scores: { A: 0, B: 0 },
      setScoresHistory: [],
      servingTeam: 'A',
      teamAOnLeft: true,
      positions: {
        A: { rightBox: 'male', leftBox: 'female' },
        B: { rightBox: 'male', leftBox: 'female' }
      },
      lastSwappedTeam: null,
      lastActionType: 'START',
      pointLogs: [],
      intervalReachedInCurrentSet: false,
      rubberSwitchReached: false,
      bracketMatchId: null,
      startedAt: null,
      elapsedSeconds: 0
    },

    // Undo Stack
    undoStack: [],

    // Modals
    modals: {
      interval: {
        open: false,
        title: '',
        message: '',
        needSideSwitch: false,
        timerSeconds: 60,
        timerId: null
      },
      setEnd: {
        open: false,
        setNumber: 1,
        winnerTeam: 'A',
        scoreA: 0,
        scoreB: 0,
        nextSetTeamAMale: '',
        nextSetTeamAFemale: '',
        nextSetTeamBMale: '',
        nextSetTeamBFemale: '',
        nextSetTeamAFirstRight: 'male',
        nextSetTeamBFirstRight: 'male'
      },
      matchEnd: {
        open: false,
        bracketUpdatedLabel: ''
      },
      passwordPrompt: {
        open: false,
        actionTitle: '',
        category: 'wasit',
        input: '',
        showPassword: false,
        error: ''
      }
    },
    _pendingProtectedCallback: null,

    // Saved Match History
    matchHistory: [],

    // Lifecycle Init
    async init() {
      this.loadAdminSession();
      this.loadMasterTeams();
      this.loadBracket();
      this.loadHistory();
      this.loadActiveMatch();
      this.syncMaxCap();
      this.startMatchStopwatch();

      // Connect to Centralized Server API (api.php) FIRST before any auto-selection saves
      await this.initialServerSync();
      if (!this.match || !this.match.isActive) {
        this.ensureDistinctTeams();
      }
      this.startServerPolling();
    },

    // ==========================================
    // STOPWATCH DURASI PERTANDINGAN (OPSI 4)
    // ==========================================
    startMatchStopwatch() {
      if (this.matchStopwatchTimerId) {
        clearInterval(this.matchStopwatchTimerId);
      }
      this.matchStopwatchTimerId = setInterval(() => {
        if (this.match && this.match.isActive && !this.match.isFinished) {
          if (this.match.startedAt) {
            this.match.elapsedSeconds = Math.max(
              0,
              Math.floor((Date.now() - this.match.startedAt) / 1000)
            );
          } else {
            this.match.elapsedSeconds = (this.match.elapsedSeconds || 0) + 1;
          }
        }
      }, 1000);
    },

    formatDuration(totalSeconds) {
      const sec = Math.max(0, parseInt(totalSeconds, 10) || 0);
      const hrs = Math.floor(sec / 3600);
      const mins = Math.floor((sec % 3600) / 60);
      const remSec = sec % 60;
      const pad = (n) => String(n).padStart(2, '0');
      if (hrs > 0) {
        return `${pad(hrs)}:${pad(mins)}:${pad(remSec)}`;
      }
      return `${pad(mins)}:${pad(remSec)}`;
    },

    get matchElapsedFormatted() {
      return this.formatDuration(this.match.elapsedSeconds || 0);
    },

    isDefaultTeamsData(teamsList) {
      if (!Array.isArray(teamsList) || teamsList.length === 0) return true;
      return JSON.stringify(teamsList) === JSON.stringify(DEFAULT_MASTER_TEAMS);
    },

    // ==========================================
    // CENTRALIZED SERVER SYNC ENGINE (api.php)
    // ==========================================
    async initialServerSync() {
      try {
        const res = await fetch('./api.php?since=0', { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        if (!json || !json.ok || !json.data) throw new Error('Invalid API response');

        const serverData = json.data;
        const serverHasValidGroupBracket = Boolean(
          serverData.bracket &&
            serverData.bracket.isCreated &&
            serverData.bracket.formatVersion === 'group_stage_v2' &&
            Array.isArray(serverData.bracket.groupMatches) &&
            serverData.bracket.groupMatches.length > 0
        );

        // If server does not yet have the v2 Group Stage + Knockout bracket, initialize & push it!
        if (!serverHasValidGroupBracket) {
          if (!this.bracket || this.bracket.formatVersion !== 'group_stage_v2' || !this.bracket.isCreated) {
            this.buildGroupStageBracket(false);
          }
          await this.pushToServer({
            masterTeams: this.masterTeams,
            bracket: this.bracket
          });
        } else {
          this.applyServerState(serverData, json.updatedAt);
        }

        this.syncState.status = 'synced';
      } catch (e) {
        this.syncState.status = 'offline';
      }
    },

    startServerPolling() {
      if (this.syncState.pollTimerId) {
        clearInterval(this.syncState.pollTimerId);
      }
      this.syncState.pollTimerId = setInterval(() => {
        this.pullFromServer();
      }, 3000);
    },

    async pullFromServer() {
      // Never pull/overwrite while a push is in flight, while editing team/member, or within 2.5s of a local action
      if (
        this.syncState.isPushing ||
        this.syncState.pendingPushes > 0 ||
        this.editingTeamId !== null ||
        this.editingMemberId !== null ||
        Date.now() - (this.syncState.lastLocalMutationAt || 0) < 2500
      ) {
        return;
      }
      try {
        const since = this.syncState.lastServerUpdatedAt || 0;
        const res = await fetch(`./api.php?since=${since}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        if (json && json.ok) {
          this.syncState.status = 'synced';
          if (
            json.changed &&
            json.data &&
            !this.syncState.isPushing &&
            this.syncState.pendingPushes === 0 &&
            Date.now() - (this.syncState.lastLocalMutationAt || 0) >= 2500
          ) {
            this.applyServerState(json.data, json.updatedAt);
          }
        }
      } catch (e) {
        this.syncState.status = 'offline';
      }
    },

    applyServerState(serverData, updatedAt) {
      this.syncState.lastServerUpdatedAt = updatedAt || Date.now();

      if (Array.isArray(serverData.masterTeams) && serverData.masterTeams.length > 0) {
        this.masterTeams = serverData.masterTeams;
        this.initMemberInputs();
        localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(this.masterTeams));
      }

      if (serverData.bracket && typeof serverData.bracket === 'object') {
        // Preserve local editMode if admin is currently editing
        const currentEditMode = this.bracket.editMode;
        this.bracket = {
          ...this.bracket,
          ...serverData.bracket,
          editMode: currentEditMode
        };
        localStorage.setItem(STORAGE_KEY_BRACKET, JSON.stringify(this.bracket));
      }

      if (Array.isArray(serverData.matchHistory)) {
        this.matchHistory = serverData.matchHistory;
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(this.matchHistory));
      }

      if (serverData.activeMatch && serverData.activeMatch.match) {
        this.config = { ...this.config, ...serverData.activeMatch.config };
        this.match = { ...this.match, ...serverData.activeMatch.match };
        localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(serverData.activeMatch));
      } else if (serverData.activeMatch === null && this.match.isActive && !this.modals.matchEnd.open) {
        this.match.isActive = false;
        localStorage.removeItem(STORAGE_KEY_ACTIVE);
      }

      if (!this.match.isActive) {
        this.ensureDistinctTeams();
      }
      this.syncMaxCap();
    },

    async pushToServer(partialPayload) {
      this.syncState.lastLocalMutationAt = Date.now();
      this.syncState.pendingPushes = (this.syncState.pendingPushes || 0) + 1;
      this.syncState.isPushing = true;
      this.syncState.status = 'syncing';

      // Snapshot payload immediately so subsequent mutations don't race
      const bodyStr = JSON.stringify(partialPayload);

      const runTask = async () => {
        try {
          const res = await fetch('./api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: bodyStr
          });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const json = await res.json();
          if (json && json.ok) {
            this.syncState.lastServerUpdatedAt = Math.max(
              this.syncState.lastServerUpdatedAt || 0,
              json.updatedAt || Date.now()
            );
            this.syncState.status = 'synced';
          }
        } catch (e) {
          this.syncState.status = 'offline';
        } finally {
          this.syncState.pendingPushes = Math.max(0, (this.syncState.pendingPushes || 1) - 1);
          this.syncState.isPushing = this.syncState.pendingPushes > 0;
          this.syncState.lastLocalMutationAt = Date.now();
        }
      };

      this._pushQueue = (this._pushQueue || Promise.resolve()).then(runTask, runTask);
      return this._pushQueue;
    },

    // Ensure Team A and Team B are never the same team
    ensureDistinctTeams() {
      // If there is an active unplayed bracket match selected (or available), auto-select the first available bracket match!
      if (this.bracket && this.bracket.isCreated && this.bracket.activeBracketMatchId !== 'MANUAL') {
        const available = this.availableBracketMatches;
        if (available.length > 0) {
          const currentSelected = available.find(
            (m) => m.id === this.bracket.activeBracketMatchId
          );
          if (!currentSelected) {
            this.selectBracketMatchInSetup(available[0].id, false);
            return;
          } else {
            // Ensure config.teamA and config.teamB stay synced with the selected bracket match
            if (this.config.teamA.teamId !== currentSelected.teamA.id) {
              this.onSelectTeamInSetup('A', currentSelected.teamA.id);
            }
            if (this.config.teamB.teamId !== currentSelected.teamB.id) {
              this.onSelectTeamInSetup('B', currentSelected.teamB.id);
            }
            return;
          }
        } else {
          this.bracket.activeBracketMatchId = null;
        }
      }

      if (this.masterTeams.length >= 2) {
        const existsA = this.masterTeams.some((t) => t.id === this.config.teamA.teamId);
        if (!existsA) {
          this.onSelectTeamInSetup('A', this.masterTeams[0].id);
        }
        const existsB = this.masterTeams.some((t) => t.id === this.config.teamB.teamId);
        if (!existsB || this.config.teamB.teamId === this.config.teamA.teamId) {
          const otherTeam = this.masterTeams.find((t) => t.id !== this.config.teamA.teamId);
          if (otherTeam) {
            this.onSelectTeamInSetup('B', otherTeam.id);
          }
        }
      }
    },

    // List of all playable, unfinished matches from Group Stage + Knockout Bracket
    get availableBracketMatches() {
      if (!this.bracket || !this.bracket.isCreated) {
        return [];
      }

      const list = [];
      const courtFilter = this.setupCourtFilter || 'ALL';

      // 1. Unfinished Group Stage Matches (Babak Penyisihan Grup A & B - 11 Poin)
      if (Array.isArray(this.bracket.groupMatches)) {
        for (const gm of this.bracket.groupMatches) {
          const hasBothTeams = gm.teamA && gm.teamB && !gm.teamA.isBye && !gm.teamB.isBye;
          const isUnfinished = !gm.winnerId && gm.status !== 'FINISHED';
          const matchesCourt = courtFilter === 'ALL' || gm.court === courtFilter;
          if (hasBothTeams && isUnfinished && matchesCourt) {
            list.push({
              id: gm.id,
              stage: 'GROUP',
              group: gm.group,
              court: gm.court || 'Lapangan 1',
              time: gm.time || '',
              targetPoints: gm.targetPoints || 11,
              bestOf: gm.bestOf || 3,
              roundName: `Grup ${gm.group} • ${gm.court} (${gm.time})`,
              label: gm.label,
              teamA: gm.teamA,
              teamB: gm.teamB,
              previewText: `[${gm.court} • ${gm.time}] Grup ${gm.group}: ${gm.teamA.name} vs ${gm.teamB.name}`
            });
          }
        }
      }

      // 2. Unfinished Knockout Matches (Semifinal 15 Poin & Final 21 Poin)
      if (Array.isArray(this.bracket.rounds)) {
        for (const round of this.bracket.rounds) {
          for (const m of round.matches || []) {
            const hasBothTeams =
              m.teamA && m.teamB && !m.teamA.isBye && !m.teamB.isBye;
            const isUnfinished = !m.winnerId && m.status !== 'FINISHED' && m.status !== 'BYE';
            const mCourt = m.court || 'Lapangan 1';
            const matchesCourt = courtFilter === 'ALL' || mCourt === courtFilter;
            if (hasBothTeams && isUnfinished && matchesCourt) {
              list.push({
                id: m.id,
                stage: m.stage || (round.isFinal ? 'FINAL' : 'SEMIFINAL'),
                court: mCourt,
                time: m.time || '',
                targetPoints: m.targetPoints || (round.isFinal ? 21 : 15),
                bestOf: m.bestOf || 3,
                roundName: `${round.name}${m.time ? ' • ' + m.time : ''}`,
                label: m.label,
                teamA: m.teamA,
                teamB: m.teamB,
                previewText: `${m.label} (${round.name}) — ${m.teamA.name} vs ${m.teamB.name}`
              });
            }
          }
        }
      }

      // 3. Also include 3rd Place Playoff if both Semifinal losers are ready and match is unfinished
      const tp = this.bracket.thirdPlaceMatch;
      if (tp && tp.teamA && tp.teamB && !tp.teamA.isBye && !tp.teamB.isBye && !tp.winnerId) {
        const tpCourt = tp.court || 'Lapangan 1';
        if (courtFilter === 'ALL' || tpCourt.includes(courtFilter)) {
          list.push({
            id: tp.id,
            stage: 'THIRD_PLACE',
            court: tpCourt,
            time: tp.time || '18.00-18.30',
            targetPoints: tp.targetPoints || 15,
            bestOf: tp.bestOf || 3,
            roundName: 'PEREBUTAN JUARA 3',
            label: tp.label,
            teamA: tp.teamA,
            teamB: tp.teamB,
            previewText: `${tp.label} — ${tp.teamA.name} vs ${tp.teamB.name}`
          });
        }
      }

      return list;
    },

    get selectedBracketMatchObj() {
      if (!this.bracket || !this.bracket.activeBracketMatchId || this.bracket.activeBracketMatchId === 'MANUAL') {
        return null;
      }
      const inAvailable = this.availableBracketMatches.find(
        (m) => m.id === this.bracket.activeBracketMatchId
      );
      if (inAvailable) return inAvailable;
      return this.findBracketMatchById(this.bracket.activeBracketMatchId);
    },

    // Apply stage-specific scoring rules (Group = 11 pts, Semifinal = 15 pts, Final = 21 pts, all Best of 3)
    applyMatchStageRules(matchObj) {
      if (!matchObj) return;
      const target = parseInt(matchObj.targetPoints, 10) || (
        matchObj.stage === 'FINAL' ? 21 : (matchObj.stage === 'GROUP' ? 11 : 15)
      );
      this.config.bestOf = parseInt(matchObj.bestOf, 10) || 3;
      if (target === 11) {
        this.applyPreset('quick11');
      } else if (target === 15) {
        this.applyPreset('community15');
      } else if (target === 21) {
        this.applyPreset('bwf21');
      } else {
        this.config.targetPoints = target;
        this.config.preset = 'custom';
        this.syncMaxCap();
      }
      this.config.bestOf = parseInt(matchObj.bestOf, 10) || 3;
    },

    // When Umpire selects a Match from the Setup Match Picker
    selectBracketMatchInSetup(matchId, shouldSave = true) {
      if (!matchId || matchId === 'MANUAL') {
        this.bracket.activeBracketMatchId = 'MANUAL';
        if (shouldSave) this.saveBracket();
        return;
      }

      const matchObj = this.findBracketMatchById(matchId);
      if (!matchObj || !matchObj.teamA || !matchObj.teamB) return;

      this.bracket.activeBracketMatchId = matchObj.id;
      this.onSelectTeamInSetup('A', matchObj.teamA.id);
      this.onSelectTeamInSetup('B', matchObj.teamB.id);
      this.applyMatchStageRules(matchObj);
      if (shouldSave) this.saveBracket();
    },

    get isSameTeamSelected() {
      if (this.config.teamA.teamId && this.config.teamB.teamId) {
        return this.config.teamA.teamId === this.config.teamB.teamId;
      }
      const nameA = (this.config.teamA.name || '').trim().toLowerCase();
      const nameB = (this.config.teamB.name || '').trim().toLowerCase();
      return nameA !== '' && nameA === nameB;
    },

    // ==========================================
    // MASTER TEAMS & MEMBERS DATABASE ('teams' page)
    // ==========================================
    loadMasterTeams() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_TEAMS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.masterTeams = parsed;
            this.initMemberInputs();
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to load master teams:', e);
      }
      // Fallback in memory ONLY — never push default teams to server on initial load!
      this.masterTeams = JSON.parse(JSON.stringify(DEFAULT_MASTER_TEAMS));
      this.initMemberInputs();
    },

    saveMasterTeams() {
      try {
        localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(this.masterTeams));
        this.pushToServer({ masterTeams: this.masterTeams });
      } catch (e) {
        console.warn('Failed to save master teams:', e);
      }
    },

    initMemberInputs() {
      for (const t of this.masterTeams) {
        if (!this.newMemberInputs[t.id]) {
          this.newMemberInputs[t.id] = { name: '', gender: 'male' };
        }
      }
    },

    createMasterTeam(bypassAuth = false) {
      const name = (this.newTeamNameInput || '').trim();
      if (!name) return;
      if (!bypassAuth) {
        this.requestProtectedAction(
          `Tambah Tim Baru (${name})`,
          () => {
            this.createMasterTeam(true);
          },
          'wasit'
        );
        return;
      }
      const group = this.newTeamGroupInput === 'B' ? 'B' : 'A';
      const groupCount = this.masterTeams.filter((t) => (t.group || 'A') === group).length;
      const autoCode = (this.newTeamCodeInput || '').trim().toUpperCase() || `${group}${groupCount + 1}`;
      const newId = 'team-' + Date.now();
      this.masterTeams.push({
        id: newId,
        code: autoCode,
        group,
        name,
        members: []
      });
      this.newMemberInputs[newId] = { name: '', gender: 'male' };
      this.newTeamNameInput = '';
      this.newTeamCodeInput = '';
      this.saveMasterTeams();
    },

    // ==========================================
    // MULTI-LEVEL PASSWORD & SPECTATOR MODE
    // 1. 'wasit'  -> solatlahdulu (Tambah tim, tambah anggota, mulai pertandingan, mode wasit)
    // 2. 'edit'   -> ngajilahdulu (Edit nama tim, edit anggota, edit bracket)
    // 3. 'delete' -> takbirlahdulu (Hapus tim, hapus anggota, reset bracket, hapus riwayat)
    // ==========================================
    loadAdminSession() {
      try {
        this.isAdminUnlocked = localStorage.getItem(STORAGE_KEY_ADMIN) === 'true';
      } catch (e) {
        this.isAdminUnlocked = false;
      }
    },

    toggleAdminSession() {
      if (this.isAdminUnlocked) {
        this.isAdminUnlocked = false;
        try {
          localStorage.removeItem(STORAGE_KEY_ADMIN);
        } catch (e) {}
        if (this.bracket && this.bracket.editMode) {
          this.bracket.editMode = false;
        }
        return;
      }
      this.requestProtectedAction(
        'Aktifkan Mode Wasit (Kontrol Pertandingan)',
        () => {
          this.isAdminUnlocked = true;
          try {
            localStorage.setItem(STORAGE_KEY_ADMIN, 'true');
          } catch (e) {}
        },
        'wasit'
      );
    },

    requireAdminOrPrompt(actionTitle, callback) {
      if (this.isAdminUnlocked) {
        if (typeof callback === 'function') callback();
        return;
      }
      this.requestProtectedAction(actionTitle, callback, 'wasit');
    },

    requestProtectedAction(actionTitle, callback, category = 'wasit') {
      this._pendingProtectedCallback = callback;
      this.modals.passwordPrompt = {
        open: true,
        actionTitle: actionTitle || 'Verifikasi Akses',
        category: category || 'wasit',
        input: '',
        showPassword: false,
        error: ''
      };
      setTimeout(() => {
        const el = document.getElementById('admin-password-input');
        if (el) el.focus();
      }, 60);
    },

    closePasswordPrompt() {
      this.modals.passwordPrompt.open = false;
      this.modals.passwordPrompt.input = '';
      this.modals.passwordPrompt.error = '';
      this._pendingProtectedCallback = null;
    },

    confirmPasswordPrompt() {
      const entered = (this.modals.passwordPrompt.input || '').trim();
      const category = this.modals.passwordPrompt.category || 'wasit';
      const expectedPassword = ACTION_PASSWORDS[category] || ACTION_PASSWORDS.wasit;

      if (entered !== expectedPassword) {
        this.modals.passwordPrompt.error = 'Password salah! Akses ditolak.';
        return;
      }

      // Only 'wasit' password unlocks Umpire Mode for live scoring on this device
      if (category === 'wasit') {
        this.isAdminUnlocked = true;
        try {
          localStorage.setItem(STORAGE_KEY_ADMIN, 'true');
        } catch (e) {}
      }

      const fn = this._pendingProtectedCallback;
      this.closePasswordPrompt();
      if (typeof fn === 'function') {
        fn();
      }
    },

    toggleBracketEditMode() {
      if (this.bracket.editMode) {
        this.bracket.editMode = false;
        this.saveBracket();
        return;
      }
      this.requestProtectedAction(
        'Edit Bracket (Atur Manual Tim & Urutan)',
        () => {
          this.bracket.editMode = true;
          this.saveBracket();
        },
        'edit'
      );
    },

    startEditMasterTeam(team) {
      if (!team) return;
      this.requestProtectedAction(
        `Edit Nama Tim (${team.name})`,
        () => {
          this.editingTeamId = team.id;
          this.editingTeamName = team.name;
          this.editingTeamGroup = team.group || 'A';
          this.editingTeamCode = team.code || '';
        },
        'edit'
      );
    },

    cancelEditMasterTeam() {
      this.editingTeamId = null;
      this.editingTeamName = '';
      this.editingTeamGroup = 'A';
      this.editingTeamCode = '';
    },

    saveEditMasterTeam(teamId) {
      const newName = (this.editingTeamName || '').trim();
      if (!newName) return;

      const team = this.masterTeams.find((t) => t.id === teamId);
      if (!team) return;

      team.name = newName;
      if (this.editingTeamGroup === 'A' || this.editingTeamGroup === 'B') {
        team.group = this.editingTeamGroup;
      }
      if ((this.editingTeamCode || '').trim()) {
        team.code = this.editingTeamCode.trim().toUpperCase();
      }
      this.editingTeamId = null;
      this.editingTeamName = '';

      // Also sync name in Setup config if this team is selected
      if (this.config.teamA.teamId === teamId) {
        this.config.teamA.name = newName;
      }
      if (this.config.teamB.teamId === teamId) {
        this.config.teamB.name = newName;
      }

      // Also sync name across all Group Matches & Knockout Bracket matches
      if (this.bracket && this.bracket.isCreated) {
        for (const gm of this.bracket.groupMatches || []) {
          if (gm.teamA && gm.teamA.id === teamId) {
            gm.teamA.name = newName;
            gm.teamA.code = team.code;
          }
          if (gm.teamB && gm.teamB.id === teamId) {
            gm.teamB.name = newName;
            gm.teamB.code = team.code;
          }
        }
        for (const r of this.bracket.rounds || []) {
          for (const m of r.matches || []) {
            if (m.teamA && m.teamA.id === teamId) m.teamA.name = newName;
            if (m.teamB && m.teamB.id === teamId) m.teamB.name = newName;
          }
        }
        if (this.bracket.thirdPlaceMatch) {
          const tp = this.bracket.thirdPlaceMatch;
          if (tp.teamA && tp.teamA.id === teamId) tp.teamA.name = newName;
          if (tp.teamB && tp.teamB.id === teamId) tp.teamB.name = newName;
        }
        this.saveBracket(false);
        this.saveMasterTeams();
        this.pushToServer({
          masterTeams: this.masterTeams,
          bracket: this.bracket
        });
        return;
      }

      this.saveMasterTeams();
    },

    startEditMember(member) {
      if (!member) return;
      this.requestProtectedAction(
        `Edit Anggota (${member.name})`,
        () => {
          this.editingMemberId = member.id;
          this.editingMemberName = member.name;
          this.editingMemberGender = member.gender || 'male';
        },
        'edit'
      );
    },

    cancelEditMember() {
      this.editingMemberId = null;
      this.editingMemberName = '';
      this.editingMemberGender = 'male';
    },

    saveEditMember(teamId, memberId) {
      const newName = (this.editingMemberName || '').trim();
      if (!newName) return;

      const team = this.masterTeams.find((t) => t.id === teamId);
      if (!team) return;

      const member = team.members.find((m) => m.id === memberId);
      if (!member) return;

      const oldName = member.name;
      member.name = newName;
      member.gender = this.editingMemberGender || 'male';

      this.editingMemberId = null;
      this.editingMemberName = '';

      // Update Setup player name if currently selected
      if (this.config.teamA.teamId === teamId) {
        if (this.config.teamA.male === oldName) this.config.teamA.male = newName;
        if (this.config.teamA.female === oldName) this.config.teamA.female = newName;
      }
      if (this.config.teamB.teamId === teamId) {
        if (this.config.teamB.male === oldName) this.config.teamB.male = newName;
        if (this.config.teamB.female === oldName) this.config.teamB.female = newName;
      }

      this.saveMasterTeams();
    },

    deleteMasterTeam(teamId) {
      const team = this.masterTeams.find((t) => t.id === teamId);
      const label = team ? `Hapus Tim (${team.name})` : 'Hapus Tim';
      this.requestProtectedAction(
        label,
        () => {
          this.masterTeams = this.masterTeams.filter((t) => t.id !== teamId);
          this.saveMasterTeams();
          this.ensureDistinctTeams();
        },
        'delete'
      );
    },

    addMemberToMasterTeam(teamId, bypassAuth = false) {
      if (!this.newMemberInputs[teamId]) {
        this.newMemberInputs[teamId] = { name: '', gender: 'male' };
      }
      const input = this.newMemberInputs[teamId];
      const name = (input.name || '').trim();
      if (!name) return;

      const team = this.masterTeams.find((t) => t.id === teamId);
      if (!team) return;

      if (!bypassAuth) {
        this.requestProtectedAction(
          `Tambah Anggota (${name} ke ${team.name})`,
          () => {
            this.addMemberToMasterTeam(teamId, true);
          },
          'wasit'
        );
        return;
      }

      const exists = team.members.some((m) => m.name.toLowerCase() === name.toLowerCase());
      if (!exists) {
        team.members.push({
          id: 'm-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          name,
          gender: input.gender || 'male'
        });
      }

      input.name = '';
      this.saveMasterTeams();
    },

    removeMemberFromMasterTeam(teamId, memberId) {
      const team = this.masterTeams.find((t) => t.id === teamId);
      if (!team) return;
      const member = team.members.find((m) => m.id === memberId);
      const label = member
        ? `Hapus Anggota (${member.name} dari ${team.name})`
        : 'Hapus Anggota Tim';
      this.requestProtectedAction(
        label,
        () => {
          const targetTeam = this.masterTeams.find((t) => t.id === teamId);
          if (!targetTeam) return;
          targetTeam.members = targetTeam.members.filter((m) => m.id !== memberId);
          this.saveMasterTeams();
        },
        'delete'
      );
    },

    getTeamMembersList(sideKey) {
      const sideCfg = sideKey === 'A' ? this.config.teamA : this.config.teamB;
      const found = this.masterTeams.find(
        (t) => t.id === sideCfg.teamId || t.name.toLowerCase() === (sideCfg.name || '').toLowerCase()
      );
      return found ? found.members : [];
    },

    onSelectTeamInSetup(sideKey, selectedTeamId) {
      const sideCfg = sideKey === 'A' ? this.config.teamA : this.config.teamB;
      const otherKey = sideKey === 'A' ? 'B' : 'A';
      const otherCfg = sideKey === 'A' ? this.config.teamB : this.config.teamA;

      sideCfg.teamId = selectedTeamId;
      const found = this.masterTeams.find((t) => t.id === selectedTeamId);
      if (found) {
        sideCfg.name = found.name;
        const males = found.members.filter((m) => m.gender === 'male');
        const females = found.members.filter((m) => m.gender === 'female');
        sideCfg.male = males.length > 0 ? males[0].name : '';
        sideCfg.female = females.length > 0 ? females[0].name : '';
      }

      if (selectedTeamId && otherCfg.teamId === selectedTeamId) {
        const alternative = this.masterTeams.find((t) => t.id !== selectedTeamId);
        if (alternative) {
          this.onSelectTeamInSetup(otherKey, alternative.id);
        } else {
          otherCfg.teamId = '';
          otherCfg.name = '';
          otherCfg.male = '';
          otherCfg.female = '';
        }
      }
    },

    selectMemberForSetup(sideKey, member) {
      const sideCfg = sideKey === 'A' ? this.config.teamA : this.config.teamB;
      if (member.gender === 'male') {
        sideCfg.male = member.name;
      } else {
        sideCfg.female = member.name;
      }
    },

    selectMemberForNextSet(sideKey, member) {
      if (sideKey === 'A') {
        if (member.gender === 'male') {
          this.modals.setEnd.nextSetTeamAMale = member.name;
        } else {
          this.modals.setEnd.nextSetTeamAFemale = member.name;
        }
      } else {
        if (member.gender === 'male') {
          this.modals.setEnd.nextSetTeamBMale = member.name;
        } else {
          this.modals.setEnd.nextSetTeamBFemale = member.name;
        }
      }
    },

    // ==========================================
    // GROUP STAGE + KNOCKOUT TOURNAMENT ENGINE
    // - Grup A (A1..A4) & Grup B (B1..B4) Round-Robin (2-3 set, @11 poin win)
    // - Menang = 2 poin, Kalah = 0 poin, Tie-breaker: Selisih Angka Kemenangan
    // - Semifinal 1 & 2 (Juara Grup vs Runner Up Grup, 2-3 set, @15 poin win)
    // - Final (Juara SF1 vs Juara SF2, 2-3 set, @21 poin win) & Perebutan Juara 3
    // ==========================================
    loadBracket() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_BRACKET);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            parsed &&
            typeof parsed === 'object' &&
            parsed.formatVersion === 'group_stage_v2' &&
            Array.isArray(parsed.groupMatches) &&
            parsed.groupMatches.length > 0
          ) {
            this.bracket = { ...this.bracket, ...parsed };
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to load bracket:', e);
      }
      // Build the default Group Stage + Knockout schedule in memory immediately
      this.buildGroupStageBracket(false);
    },

    saveBracket(shouldPush = true) {
      try {
        if (this.bracket && Array.isArray(this.bracket.groupMatches)) {
          this.bracket.groupMatches = JSON.parse(JSON.stringify(this.bracket.groupMatches));
        }
        if (this.bracket && Array.isArray(this.bracket.rounds)) {
          this.bracket.rounds = JSON.parse(JSON.stringify(this.bracket.rounds));
        }
        if (this.bracket && this.bracket.thirdPlaceMatch) {
          this.bracket.thirdPlaceMatch = JSON.parse(
            JSON.stringify(this.bracket.thirdPlaceMatch)
          );
        }
        if (!this.match || !this.match.isActive) {
          this.ensureDistinctTeams();
        }
        localStorage.setItem(STORAGE_KEY_BRACKET, JSON.stringify(this.bracket));
        if (shouldPush) {
          this.pushToServer({ bracket: this.bracket });
        }
      } catch (e) {
        console.warn('Failed to save bracket:', e);
      }
    },

    // Build the 12-match Group Stage (Grup A & Grup B across Lapangan 1 & Lapangan 2) + Semifinal + Final
    buildGroupStageBracket(shouldPush = true) {
      const groupATeams = this.masterTeams.filter((t) => (t.group || 'A') === 'A');
      const groupBTeams = this.masterTeams.filter((t) => t.group === 'B');

      const toRef = (teamObj, fallbackCode, grp) => {
        if (!teamObj) return null;
        return {
          id: teamObj.id,
          code: teamObj.code || fallbackCode,
          group: teamObj.group || grp,
          name: teamObj.name,
          subtitle: teamObj.subtitle || ''
        };
      };

      const findTeam = (code, groupList, indexFallback) => {
        const byCode = this.masterTeams.find(
          (t) => (t.code || '').toUpperCase() === code.toUpperCase()
        );
        if (byCode) return toRef(byCode, code, code.charAt(0));
        if (groupList[indexFallback]) {
          return toRef(groupList[indexFallback], code, code.charAt(0));
        }
        return null;
      };

      const A1 = findTeam('A1', groupATeams, 0);
      const A2 = findTeam('A2', groupATeams, 1);
      const A3 = findTeam('A3', groupATeams, 2);
      const A4 = findTeam('A4', groupATeams, 3);

      const B1 = findTeam('B1', groupBTeams, 0);
      const B2 = findTeam('B2', groupBTeams, 1);
      const B3 = findTeam('B3', groupBTeams, 2);
      const B4 = findTeam('B4', groupBTeams, 3);

      // Exact schedule from official spreadsheet (Lapangan 1 & Lapangan 2, 15.00 - 17.00)
      const scheduleBlueprint = [
        { id: 'GM-1',  time: '15.00-15.15', court: 'Lapangan 1', group: 'A', label: 'A1 vs A2', teamA: A1, teamB: A2 },
        { id: 'GM-2',  time: '15.00-15.15', court: 'Lapangan 2', group: 'B', label: 'B1 vs B2', teamA: B1, teamB: B2 },
        { id: 'GM-3',  time: '15.15-15.30', court: 'Lapangan 1', group: 'A', label: 'A3 vs A4', teamA: A3, teamB: A4 },
        { id: 'GM-4',  time: '15.15-15.30', court: 'Lapangan 2', group: 'B', label: 'B3 vs B4', teamA: B3, teamB: B4 },
        { id: 'GM-5',  time: '15.30-15.45', court: 'Lapangan 1', group: 'A', label: 'A1 vs A3', teamA: A1, teamB: A3 },
        { id: 'GM-6',  time: '15.30-15.45', court: 'Lapangan 2', group: 'B', label: 'B1 vs B3', teamA: B1, teamB: B3 },
        { id: 'GM-7',  time: '15.45-16.00', court: 'Lapangan 1', group: 'A', label: 'A2 vs A4', teamA: A2, teamB: A4 },
        { id: 'GM-8',  time: '15.45-16.00', court: 'Lapangan 2', group: 'B', label: 'B2 vs B4', teamA: B2, teamB: B4 },
        { id: 'GM-9',  time: '16.00-16.15', court: 'Lapangan 1', group: 'A', label: 'A1 vs A4', teamA: A1, teamB: A4 },
        { id: 'GM-10', time: '16.15-16.30', court: 'Lapangan 1', group: 'A', label: 'A2 vs A3', teamA: A2, teamB: A3 },
        { id: 'GM-11', time: '16.30-16.45', court: 'Lapangan 1', group: 'B', label: 'B1 vs B4', teamA: B1, teamB: B4 },
        { id: 'GM-12', time: '16.45-17.00', court: 'Lapangan 1', group: 'B', label: 'B2 vs B3', teamA: B2, teamB: B3 }
      ];

      const groupMatches = scheduleBlueprint
        .filter((item) => item.teamA && item.teamB)
        .map((item, idx) => ({
          id: item.id,
          order: idx + 1,
          stage: 'GROUP',
          group: item.group,
          court: item.court,
          time: item.time,
          label: item.label,
          roundName: `Penyisihan Grup ${item.group} • ${item.court}`,
          targetPoints: 11,
          bestOf: 3,
          teamA: item.teamA,
          teamB: item.teamB,
          scoreA: null,
          scoreB: null,
          pointsA: 0,
          pointsB: 0,
          setDetails: [],
          durationText: '',
          playersSummary: '',
          winnerId: null,
          status: 'PENDING'
        }));

      const rounds = [
        {
          roundIndex: 0,
          name: 'SEMIFINAL (2-3 Set • @15 Poin Win)',
          isSemiFinal: true,
          isFinal: false,
          matches: [
            {
              id: 'SF-1',
              stage: 'SEMIFINAL',
              roundIndex: 0,
              matchIndex: 0,
              label: 'Semifinal 1',
              court: 'Lapangan 1',
              time: '17.00-17.30',
              slotALabel: 'Pemenang Grup A',
              slotBLabel: 'Runner Up Grup B',
              targetPoints: 15,
              bestOf: 3,
              teamA: null,
              teamB: null,
              scoreA: null,
              scoreB: null,
              pointsA: 0,
              pointsB: 0,
              setDetails: [],
              durationText: '',
              playersSummary: '',
              winnerId: null,
              status: 'PENDING'
            },
            {
              id: 'SF-2',
              stage: 'SEMIFINAL',
              roundIndex: 0,
              matchIndex: 1,
              label: 'Semifinal 2',
              court: 'Lapangan 1',
              time: '17.30-18.00',
              slotALabel: 'Pemenang Grup B',
              slotBLabel: 'Runner Up Grup A',
              targetPoints: 15,
              bestOf: 3,
              teamA: null,
              teamB: null,
              scoreA: null,
              scoreB: null,
              pointsA: 0,
              pointsB: 0,
              setDetails: [],
              durationText: '',
              playersSummary: '',
              winnerId: null,
              status: 'PENDING'
            }
          ]
        },
        {
          roundIndex: 1,
          name: 'FINAL (2-3 Set • @21 Poin Win)',
          isSemiFinal: false,
          isFinal: true,
          matches: [
            {
              id: 'FINAL-1',
              stage: 'FINAL',
              roundIndex: 1,
              matchIndex: 0,
              label: 'Grand Final (Juara 1 & 2)',
              court: 'Lapangan 1',
              time: '18.00-18.30',
              slotALabel: 'Juara SF 1',
              slotBLabel: 'Juara SF 2',
              targetPoints: 21,
              bestOf: 3,
              teamA: null,
              teamB: null,
              scoreA: null,
              scoreB: null,
              pointsA: 0,
              pointsB: 0,
              setDetails: [],
              durationText: '',
              playersSummary: '',
              winnerId: null,
              status: 'PENDING'
            }
          ]
        }
      ];

      const thirdPlaceMatch = {
        id: 'THIRD-PLACE',
        stage: 'THIRD_PLACE',
        roundIndex: 1,
        matchIndex: 99,
        label: 'Perebutan Juara 3',
        court: 'Lapangan 1 / 2',
        time: '18.00-18.30',
        slotALabel: 'Kalah SF 1',
        slotBLabel: 'Kalah SF 2',
        targetPoints: 15,
        bestOf: 3,
        teamA: null,
        teamB: null,
        scoreA: null,
        scoreB: null,
        pointsA: 0,
        pointsB: 0,
        setDetails: [],
        durationText: '',
        playersSummary: '',
        winnerId: null,
        status: 'PENDING'
      };

      this.bracket = {
        isCreated: true,
        formatVersion: 'group_stage_v2',
        editMode: false,
        title: 'Turnamen Badminton Ganda Campuran (Fase Grup & Gugur)',
        size: 8,
        participantCount: this.masterTeams.length,
        groupMatches,
        rounds,
        thirdPlaceMatch,
        activeBracketMatchId: groupMatches.length > 0 ? groupMatches[0].id : null
      };

      if (shouldPush) {
        this.saveBracket(true);
      } else {
        localStorage.setItem(STORAGE_KEY_BRACKET, JSON.stringify(this.bracket));
      }
    },

    // Reset or Regenerate Group Stage + Knockout Schedule (Protected by 'delete' password 'takbirlahdulu')
    generateBracket(shuffleTeams = false, bypassPassword = false) {
      if (this.masterTeams.length < 2) {
        alert('Minimal harus ada 2 tim terdaftar di menu Daftar Tim!');
        return;
      }

      if (!bypassPassword) {
        const isResetExisting = Boolean(this.bracket && this.bracket.isCreated);
        this.requestProtectedAction(
          isResetExisting
            ? 'Reset Ulang Jadwal Penyisihan Grup & Bracket ke Awal'
            : 'Buat Jadwal Penyisihan Grup & Bracket',
          () => {
            this.generateBracket(shuffleTeams, true);
          },
          isResetExisting ? 'delete' : 'wasit'
        );
        return;
      }

      this.buildGroupStageBracket(true);
    },

    // Parse total rally points scored by Team A and Team B from setDetails (e.g. ["11-8", "9-11", "11-7"])
    extractMatchRallyPoints(m) {
      if (Array.isArray(m.setDetails) && m.setDetails.length > 0) {
        let pA = 0;
        let pB = 0;
        for (const sd of m.setDetails) {
          const parts = String(sd).split('-');
          if (parts.length === 2) {
            pA += parseInt(parts[0], 10) || 0;
            pB += parseInt(parts[1], 10) || 0;
          }
        }
        if (pA > 0 || pB > 0) {
          return { pointsA: pA, pointsB: pB };
        }
      }
      if ((m.pointsA || 0) > 0 || (m.pointsB || 0) > 0) {
        return { pointsA: m.pointsA || 0, pointsB: m.pointsB || 0 };
      }
      // Fallback if marked won manually without set scores
      if (m.winnerId && m.teamA && m.teamB) {
        const target = m.targetPoints || 11;
        const winPts = target * 2;
        const losePts = Math.max(0, (target - 4) * 2);
        return m.winnerId === m.teamA.id
          ? { pointsA: winPts, pointsB: losePts }
          : { pointsA: losePts, pointsB: winPts };
      }
      return { pointsA: 0, pointsB: 0 };
    },

    // Compute Real-Time Group Standings (Grup A or Grup B)
    // Rules: Win = 2 pts, Loss = 0 pts. Tie-breaker: 1) Standings Points, 2) Point Diff (Selisih Angka Kemenangan), 3) Points Scored, 4) Set Diff
    getGroupStandings(groupKey) {
      const map = {};

      // Seed all registered teams in this group
      const groupTeams = this.masterTeams.filter((t) => (t.group || 'A') === groupKey);
      for (const t of groupTeams) {
        map[t.id] = {
          id: t.id,
          code: t.code || groupKey,
          name: t.name,
          subtitle: t.subtitle || '',
          group: groupKey,
          played: 0,
          wins: 0,
          losses: 0,
          standingsPoints: 0, // Menang = 2 poin, Kalah = 0 poin
          setsWon: 0,
          setsLost: 0,
          setDiff: 0,
          pointsScored: 0,
          pointsConceded: 0,
          pointDiff: 0 // Selisih angka kemenangan
        };
      }

      // Accumulate results from finished group matches
      const matches = (this.bracket?.groupMatches || []).filter((m) => m.group === groupKey);
      for (const m of matches) {
        if (!m.teamA || !m.teamB) continue;
        if (!map[m.teamA.id]) {
          map[m.teamA.id] = {
            id: m.teamA.id,
            code: m.teamA.code || groupKey,
            name: m.teamA.name,
            subtitle: '',
            group: groupKey,
            played: 0,
            wins: 0,
            losses: 0,
            standingsPoints: 0,
            setsWon: 0,
            setsLost: 0,
            setDiff: 0,
            pointsScored: 0,
            pointsConceded: 0,
            pointDiff: 0
          };
        }
        if (!map[m.teamB.id]) {
          map[m.teamB.id] = {
            id: m.teamB.id,
            code: m.teamB.code || groupKey,
            name: m.teamB.name,
            subtitle: '',
            group: groupKey,
            played: 0,
            wins: 0,
            losses: 0,
            standingsPoints: 0,
            setsWon: 0,
            setsLost: 0,
            setDiff: 0,
            pointsScored: 0,
            pointsConceded: 0,
            pointDiff: 0
          };
        }

        if (m.winnerId && m.status === 'FINISHED') {
          const rowA = map[m.teamA.id];
          const rowB = map[m.teamB.id];

          rowA.played += 1;
          rowB.played += 1;

          const sA = m.scoreA !== null ? parseInt(m.scoreA, 10) || 0 : (m.winnerId === m.teamA.id ? 2 : 0);
          const sB = m.scoreB !== null ? parseInt(m.scoreB, 10) || 0 : (m.winnerId === m.teamB.id ? 2 : 0);

          rowA.setsWon += sA;
          rowA.setsLost += sB;
          rowB.setsWon += sB;
          rowB.setsLost += sA;

          const { pointsA, pointsB } = this.extractMatchRallyPoints(m);
          rowA.pointsScored += pointsA;
          rowA.pointsConceded += pointsB;
          rowB.pointsScored += pointsB;
          rowB.pointsConceded += pointsA;

          if (m.winnerId === m.teamA.id) {
            rowA.wins += 1;
            rowA.standingsPoints += 2; // Menang = 2 poin
            rowB.losses += 1;
          } else if (m.winnerId === m.teamB.id) {
            rowB.wins += 1;
            rowB.standingsPoints += 2; // Menang = 2 poin
            rowA.losses += 1;
          }
        }
      }

      const rows = Object.values(map).map((r) => ({
        ...r,
        setDiff: r.setsWon - r.setsLost,
        pointDiff: r.pointsScored - r.pointsConceded
      }));

      // Sort by: 1) Poin Klasemen (Menang=2), 2) Selisih Angka Kemenangan (pointDiff), 3) Total Angka Masuk (pointsScored), 4) Selisih Set (setDiff)
      rows.sort((a, b) => {
        if (b.standingsPoints !== a.standingsPoints) return b.standingsPoints - a.standingsPoints;
        if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
        if (b.pointsScored !== a.pointsScored) return b.pointsScored - a.pointsScored;
        if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
        return String(a.code).localeCompare(String(b.code));
      });

      return rows;
    },

    get groupAStandings() {
      return this.getGroupStandings('A');
    },

    get groupBStandings() {
      return this.getGroupStandings('B');
    },

    isGroupAllFinished(groupKey) {
      const matches = (this.bracket?.groupMatches || []).filter((m) => m.group === groupKey);
      return matches.length > 0 && matches.every((m) => Boolean(m.winnerId && m.status === 'FINISHED'));
    },

    get filteredGroupMatches() {
      const all = this.bracket?.groupMatches || [];
      if (!this.bracketCourtFilter || this.bracketCourtFilter === 'ALL') {
        return all;
      }
      return all.filter((m) => m.court === this.bracketCourtFilter);
    },

    // Automatically or manually populate Semifinal 1 & Semifinal 2 from Group A & Group B Standings
    // SF1: Juara Grup A vs Runner Up Grup B
    // SF2: Juara Grup B vs Runner Up Grup A
    syncGroupQualifiersToSemifinals(forceAdvance = false) {
      if (!this.bracket || !Array.isArray(this.bracket.rounds) || !this.bracket.rounds[0]) return;
      const sfRound = this.bracket.rounds[0];
      const sf1 = sfRound.matches[0];
      const sf2 = sfRound.matches[1];
      if (!sf1 || !sf2) return;

      const standingsA = this.groupAStandings;
      const standingsB = this.groupBStandings;
      const groupADone = this.isGroupAllFinished('A');
      const groupBDone = this.isGroupAllFinished('B');

      if ((groupADone || forceAdvance) && standingsA.length >= 2) {
        const winnerA = standingsA[0];
        const runnerUpA = standingsA[1];
        if (!sf1.winnerId) {
          sf1.teamA = {
            id: winnerA.id,
            code: winnerA.code,
            name: winnerA.name,
            qualifyLabel: 'Juara Grup A'
          };
        }
        if (!sf2.winnerId) {
          sf2.teamB = {
            id: runnerUpA.id,
            code: runnerUpA.code,
            name: runnerUpA.name,
            qualifyLabel: 'Runner-Up Grup A'
          };
        }
      }

      if ((groupBDone || forceAdvance) && standingsB.length >= 2) {
        const winnerB = standingsB[0];
        const runnerUpB = standingsB[1];
        if (!sf2.winnerId) {
          sf2.teamA = {
            id: winnerB.id,
            code: winnerB.code,
            name: winnerB.name,
            qualifyLabel: 'Juara Grup B'
          };
        }
        if (!sf1.winnerId) {
          sf1.teamB = {
            id: runnerUpB.id,
            code: runnerUpB.code,
            name: runnerUpB.name,
            qualifyLabel: 'Runner-Up Grup B'
          };
        }
      }
    },

    forceAdvanceGroupToSemifinals() {
      this.requestProtectedAction(
        'Majukan Juara & Runner-Up Klasemen Saat Ini ke Semifinal',
        () => {
          this.syncGroupQualifiersToSemifinals(true);
          this.saveBracket(true);
        },
        'edit'
      );
    },

    // Admin Feature: Change team in a Group Match slot
    changeGroupMatchSlotTeam(matchId, slotKey, newTeamId) {
      const gm = (this.bracket?.groupMatches || []).find((m) => m.id === matchId);
      if (!gm) return;
      const foundMaster = this.masterTeams.find((t) => t.id === newTeamId);
      if (!foundMaster) return;

      const teamRef = {
        id: foundMaster.id,
        code: foundMaster.code || gm.group,
        group: foundMaster.group || gm.group,
        name: foundMaster.name
      };

      if (slotKey === 'A') {
        gm.teamA = teamRef;
      } else {
        gm.teamB = teamRef;
      }
      gm.label = `${gm.teamA?.code || 'Tim'} vs ${gm.teamB?.code || 'Tim'}`;
      gm.winnerId = null;
      gm.scoreA = null;
      gm.scoreB = null;
      gm.pointsA = 0;
      gm.pointsB = 0;
      gm.setDetails = [];
      gm.status = 'PENDING';
      this.saveBracket();
    },

    // Admin Feature: Edit custom set scores string (e.g. "11-8, 11-7") for any match so Selisih Angka is accurate
    updateMatchSetDetailsManual(matchObj, rawString) {
      if (!matchObj) return;
      const parts = String(rawString || '')
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter((s) => /^\d+-\d+$/.test(s));

      matchObj.setDetails = parts;
      if (parts.length > 0 && matchObj.teamA && matchObj.teamB) {
        let setsA = 0;
        let setsB = 0;
        let ptsA = 0;
        let ptsB = 0;
        for (const p of parts) {
          const [a, b] = p.split('-').map((n) => parseInt(n, 10) || 0);
          ptsA += a;
          ptsB += b;
          if (a > b) setsA += 1;
          else if (b > a) setsB += 1;
        }
        matchObj.scoreA = setsA;
        matchObj.scoreB = setsB;
        matchObj.pointsA = ptsA;
        matchObj.pointsB = ptsB;
        if (setsA !== setsB) {
          const winId = setsA > setsB ? matchObj.teamA.id : matchObj.teamB.id;
          this.advanceBracketMatchWinner(
            matchObj,
            winId,
            setsA,
            setsB,
            true,
            { setDetails: parts, pointsA: ptsA, pointsB: ptsB }
          );
          return;
        }
      }
      this.saveBracket();
    },

    // Admin Feature 1: Change team in any slot of a Knockout match
    changeBracketSlotTeam(roundIndex, matchIndex, slotKey, newTeamId) {
      if (!this.bracket.isCreated || !this.bracket.rounds[roundIndex]) return;
      const round = this.bracket.rounds[roundIndex];
      const targetMatch = round.matches[matchIndex];
      if (!targetMatch) return;

      let newTeamObj = null;
      if (newTeamId === 'BYE') {
        newTeamObj = { id: 'BYE', name: 'BYE (Lolos Langsung)', isBye: true };
      } else if (newTeamId === '') {
        newTeamObj = null;
      } else {
        const foundMaster = this.masterTeams.find((t) => t.id === newTeamId);
        if (foundMaster) {
          newTeamObj = {
            id: foundMaster.id,
            code: foundMaster.code || '',
            name: foundMaster.name
          };
        }
      }

      if (slotKey === 'A') {
        targetMatch.teamA = newTeamObj;
      } else {
        targetMatch.teamB = newTeamObj;
      }

      targetMatch.winnerId = null;
      targetMatch.scoreA = null;
      targetMatch.scoreB = null;
      targetMatch.setDetails = [];
      targetMatch.status = 'PENDING';
      this.saveBracket();
    },

    // Swap Team A and Team B inside the same match
    swapTeamsInsideBracketMatch(roundIndex, matchIndex) {
      if (!this.bracket.isCreated || !this.bracket.rounds[roundIndex]) return;
      const m = this.bracket.rounds[roundIndex].matches[matchIndex];
      if (!m) return;
      const temp = m.teamA;
      m.teamA = m.teamB;
      m.teamB = temp;
      const tempScore = m.scoreA;
      m.scoreA = m.scoreB;
      m.scoreB = tempScore;
      this.saveBracket();
    },

    // Set winner of a Group Stage or Knockout match and propagate qualifiers/winners
    advanceBracketMatchWinner(
      matchObj,
      winningTeamId,
      scoreA = null,
      scoreB = null,
      shouldSave = true,
      extraDetails = null
    ) {
      if (!matchObj || !matchObj.teamA || !matchObj.teamB) return;

      // If called manually from the UI (where shouldSave === true and extraDetails === null),
      // always require the Edit Bracket password ('ngajilahdulu')!
      if (shouldSave && extraDetails === null) {
        const winName =
          matchObj.teamA.id === winningTeamId ? matchObj.teamA.name : matchObj.teamB.name;
        this.requestProtectedAction(
          `Edit Pemenang ${matchObj.label} (${winName})`,
          () => {
            const isAWin = matchObj.teamA.id === winningTeamId;
            const defaultScoreA = scoreA !== null ? scoreA : (isAWin ? 2 : 0);
            const defaultScoreB = scoreB !== null ? scoreB : (isAWin ? 0 : 2);
            const tPts = matchObj.targetPoints || (matchObj.stage === 'GROUP' ? 11 : 15);
            const defaultSetStr = isAWin
              ? [`${tPts}-${Math.max(0, tPts - 4)}`, `${tPts}-${Math.max(0, tPts - 3)}`]
              : [`${Math.max(0, tPts - 4)}-${tPts}`, `${Math.max(0, tPts - 3)}-${tPts}`];

            this.advanceBracketMatchWinner(
              matchObj,
              winningTeamId,
              defaultScoreA,
              defaultScoreB,
              shouldSave,
              {
                manualByAdmin: true,
                setDetails:
                  Array.isArray(matchObj.setDetails) && matchObj.setDetails.length > 0
                    ? matchObj.setDetails
                    : defaultSetStr
              }
            );
          },
          'edit'
        );
        return;
      }

      const winnerTeam =
        matchObj.teamA.id === winningTeamId ? matchObj.teamA : matchObj.teamB;
      const loserTeam =
        matchObj.teamA.id === winningTeamId ? matchObj.teamB : matchObj.teamA;

      matchObj.winnerId = winningTeamId;
      if (scoreA !== null) matchObj.scoreA = scoreA;
      if (scoreB !== null) matchObj.scoreB = scoreB;
      if (extraDetails) {
        if (Array.isArray(extraDetails.setDetails)) {
          matchObj.setDetails = extraDetails.setDetails;
        }
        if (typeof extraDetails.pointsA === 'number') {
          matchObj.pointsA = extraDetails.pointsA;
        }
        if (typeof extraDetails.pointsB === 'number') {
          matchObj.pointsB = extraDetails.pointsB;
        }
        if (extraDetails.durationText) {
          matchObj.durationText = extraDetails.durationText;
        }
        if (extraDetails.playersSummary) {
          matchObj.playersSummary = extraDetails.playersSummary;
        }
      }

      const extracted = this.extractMatchRallyPoints(matchObj);
      matchObj.pointsA = extracted.pointsA;
      matchObj.pointsB = extracted.pointsB;

      if (matchObj.status !== 'BYE') {
        matchObj.status = 'FINISHED';
      }

      // CASE A: Group Stage Match -> Re-evaluate Group Standings & Auto-Fill Semifinal if Group is Complete!
      if (matchObj.stage === 'GROUP' || String(matchObj.id).startsWith('GM-')) {
        this.syncGroupQualifiersToSemifinals(false);
        if (shouldSave) this.saveBracket();
        return;
      }

      // CASE B: 3rd Place Match
      if (matchObj.id === 'THIRD-PLACE') {
        if (shouldSave) this.saveBracket();
        return;
      }

      // CASE C: Semifinal or Final Match
      const totalRounds = this.bracket.rounds.length;
      const rIdx = matchObj.roundIndex;
      const mIdx = matchObj.matchIndex;

      // Propagate Semifinal Winner to Final
      if (rIdx + 1 < totalRounds) {
        const nextRound = this.bracket.rounds[rIdx + 1];
        const nextMatchIndex = Math.floor(mIdx / 2);
        const isSlotA = mIdx % 2 === 0;
        const nextMatch = nextRound.matches[nextMatchIndex];

        if (nextMatch) {
          if (isSlotA) {
            nextMatch.teamA = {
              id: winnerTeam.id,
              code: winnerTeam.code || '',
              name: winnerTeam.name
            };
          } else {
            nextMatch.teamB = {
              id: winnerTeam.id,
              code: winnerTeam.code || '',
              name: winnerTeam.name
            };
          }
          nextMatch.winnerId = null;
          nextMatch.scoreA = null;
          nextMatch.scoreB = null;
          nextMatch.setDetails = [];
          nextMatch.durationText = '';
          nextMatch.status = 'PENDING';
        }
      }

      // Propagate Semifinal Loser to 3rd Place Playoff
      const isSemiFinalRound = totalRounds >= 2 && rIdx === totalRounds - 2;
      if (isSemiFinalRound && this.bracket.thirdPlaceMatch && loserTeam) {
        const isFirstSemi = mIdx === 0;
        const cleanLoser = {
          id: loserTeam.id,
          code: loserTeam.code || '',
          name: loserTeam.name
        };

        if (isFirstSemi) {
          this.bracket.thirdPlaceMatch.teamA = cleanLoser;
        } else {
          this.bracket.thirdPlaceMatch.teamB = cleanLoser;
        }
      }

      if (shouldSave) {
        this.saveBracket();
      }
    },

    // Launch a Group or Knockout Match into Setup/Court so Umpire can pick players and score it
    playBracketMatch(matchObj, bypassAuth = false) {
      if (!matchObj || !matchObj.teamA || !matchObj.teamB) return;
      if (matchObj.teamA.isBye || matchObj.teamB.isBye) return;

      if (!bypassAuth) {
        this.requestProtectedAction(
          `Mainkan ${matchObj.label} (${matchObj.teamA.name} vs ${matchObj.teamB.name})`,
          () => {
            this.playBracketMatch(matchObj, true);
          },
          'wasit'
        );
        return;
      }

      this.bracket.activeBracketMatchId = matchObj.id;
      this.onSelectTeamInSetup('A', matchObj.teamA.id);
      this.onSelectTeamInSetup('B', matchObj.teamB.id);
      this.applyMatchStageRules(matchObj);
      this.saveBracket();

      // Navigate to Setup so Umpire can confirm/pick which male & female players play Set 1
      this.screen = 'setup';
    },

    findBracketMatchById(matchId) {
      if (!matchId || !this.bracket.isCreated) return null;
      if (Array.isArray(this.bracket.groupMatches)) {
        const gm = this.bracket.groupMatches.find((m) => m.id === matchId);
        if (gm) return gm;
      }
      if (matchId === 'THIRD-PLACE') return this.bracket.thirdPlaceMatch;
      for (const r of this.bracket.rounds || []) {
        for (const m of r.matches || []) {
          if (m.id === matchId) return m;
        }
      }
      return null;
    },

    // Smart auto-detection: finds the Group Stage or Knockout match corresponding to the current match teams
    resolveBracketMatchForCurrentTeams() {
      if (!this.bracket || !this.bracket.isCreated) return null;

      // 1. Check explicit bracketMatchId on active match
      if (this.match && this.match.bracketMatchId && this.match.bracketMatchId !== 'MANUAL') {
        const byId = this.findBracketMatchById(this.match.bracketMatchId);
        if (byId && byId.teamA && byId.teamB) return byId;
      }

      // 2. Check activeBracketMatchId on bracket state
      if (this.bracket.activeBracketMatchId && this.bracket.activeBracketMatchId !== 'MANUAL') {
        const byActiveId = this.findBracketMatchById(this.bracket.activeBracketMatchId);
        if (byActiveId && byActiveId.teamA && byActiveId.teamB && !byActiveId.winnerId) {
          return byActiveId;
        }
      }

      // 3. Auto-match by Team IDs or Team Names against all playable unfinished Group & Knockout matches
      const idA = this.config.teamA.teamId || '';
      const idB = this.config.teamB.teamId || '';
      const nameA = (this.config.teamA.name || '').trim().toLowerCase();
      const nameB = (this.config.teamB.name || '').trim().toLowerCase();

      const allMatches = [];
      for (const gm of this.bracket.groupMatches || []) {
        allMatches.push(gm);
      }
      for (const r of this.bracket.rounds || []) {
        for (const m of r.matches || []) {
          allMatches.push(m);
        }
      }
      if (this.bracket.thirdPlaceMatch) {
        allMatches.push(this.bracket.thirdPlaceMatch);
      }

      for (const pass of ['unfinished', 'any']) {
        for (const m of allMatches) {
          if (!m || !m.teamA || !m.teamB || m.teamA.isBye || m.teamB.isBye) continue;
          if (pass === 'unfinished' && (m.winnerId || m.status === 'FINISHED')) continue;

          const mIdA = m.teamA.id || '';
          const mIdB = m.teamB.id || '';
          const mNameA = (m.teamA.name || '').trim().toLowerCase();
          const mNameB = (m.teamB.name || '').trim().toLowerCase();

          const idMatch =
            idA &&
            idB &&
            ((mIdA === idA && mIdB === idB) || (mIdA === idB && mIdB === idA));
          const nameMatch =
            nameA &&
            nameB &&
            ((mNameA === nameA && mNameB === nameB) ||
              (mNameA === nameB && mNameB === nameA));

          if (idMatch || nameMatch) {
            return m;
          }
        }
      }

      return null;
    },

    // Computed Tournament Podium (Juara 1, Juara 2, Juara 3)
    get tournamentPodium() {
      if (!this.bracket.isCreated || !Array.isArray(this.bracket.rounds) || this.bracket.rounds.length === 0) {
        return { first: null, second: null, third: null };
      }

      const finalRound = this.bracket.rounds[this.bracket.rounds.length - 1];
      const finalMatch = finalRound.matches[0];

      let first = null;
      let second = null;
      let third = null;

      if (finalMatch && finalMatch.winnerId && finalMatch.teamA && finalMatch.teamB) {
        first =
          finalMatch.teamA.id === finalMatch.winnerId
            ? finalMatch.teamA
            : finalMatch.teamB;
        second =
          finalMatch.teamA.id === finalMatch.winnerId
            ? finalMatch.teamB
            : finalMatch.teamA;
      }

      const tp = this.bracket.thirdPlaceMatch;
      if (tp && tp.winnerId && tp.teamA && tp.teamB) {
        third = tp.teamA.id === tp.winnerId ? tp.teamA : tp.teamB;
      }

      return { first, second, third };
    },

    // ==========================================
    // SETUP & PRESET LOGIC
    // ==========================================
    applyPreset(presetName) {
      this.config.preset = presetName;
      if (presetName === 'bwf21') {
        this.config.targetPoints = 21;
        this.config.deuceEnabled = true;
        this.config.deuceAllowance = 9;
        this.config.maxCap = 30;
        this.config.bestOf = 3;
      } else if (presetName === 'community15') {
        this.config.targetPoints = 15;
        this.config.deuceEnabled = true;
        this.config.deuceAllowance = 3;
        this.config.maxCap = 18;
        this.config.bestOf = 3;
      } else if (presetName === 'quick11') {
        this.config.targetPoints = 11;
        this.config.deuceEnabled = true;
        this.config.deuceAllowance = 3;
        this.config.maxCap = 14;
        this.config.bestOf = 3; // Babak Penyisihan: 2-3 set @set: 11 poin win!
      }
    },

    onTargetPointInput() {
      let target = parseInt(this.config.targetPoints, 10);
      if (isNaN(target) || target < 3) target = 3;
      if (target > 99) target = 99;
      this.config.targetPoints = target;
      if (this.config.preset !== 'bwf21') {
        this.config.deuceAllowance = 3;
      }
      this.syncMaxCap();
    },

    onDeuceAllowanceInput() {
      let allow = parseInt(this.config.deuceAllowance, 10);
      if (isNaN(allow) || allow < 1) allow = 1;
      if (allow > 30) allow = 30;
      this.config.deuceAllowance = allow;
      this.config.preset = 'custom';
      this.syncMaxCap();
    },

    syncMaxCap() {
      const target = parseInt(this.config.targetPoints, 10) || 15;
      const allow = parseInt(this.config.deuceAllowance, 10) || 3;
      this.config.maxCap = this.config.deuceEnabled ? target + allow : target;
    },

    get intervalScoreTrigger() {
      const target = parseInt(this.config.targetPoints, 10) || 15;
      return Math.floor(target / 2) + 1;
    },

    get deuceTriggerScore() {
      const target = parseInt(this.config.targetPoints, 10) || 15;
      return target - 1;
    },

    // ==========================================
    // PLAYER & POSITION HELPERS
    // ==========================================
    getPlayerObj(teamKey, roleKey) {
      const teamCfg = teamKey === 'A' ? this.config.teamA : this.config.teamB;
      if (roleKey === 'male') {
        return {
          role: 'male',
          name: teamCfg.male?.trim() || (teamKey === 'A' ? 'Pria A' : 'Pria B'),
          genderIcon: '♂',
          genderLabel: 'Pria',
          badgeClass: 'bg-sky-100 text-sky-700 border-sky-300'
        };
      }
      return {
        role: 'female',
        name: teamCfg.female?.trim() || (teamKey === 'A' ? 'Wanita A' : 'Wanita B'),
        genderIcon: '♀',
        genderLabel: 'Wanita',
        badgeClass: 'bg-pink-100 text-pink-700 border-pink-300'
      };
    },

    getTeamName(teamKey) {
      return teamKey === 'A'
        ? this.config.teamA.name?.trim() || 'Tim A'
        : this.config.teamB.name?.trim() || 'Tim B';
    },

    get activeServeBoxType() {
      const servingScore = this.match.scores[this.match.servingTeam] || 0;
      return servingScore % 2 === 0 ? 'rightBox' : 'leftBox';
    },

    get currentServerPlayer() {
      const team = this.match.servingTeam;
      const box = this.activeServeBoxType;
      const role = this.match.positions[team][box];
      return {
        team,
        box,
        ...this.getPlayerObj(team, role)
      };
    },

    get currentReceiverPlayer() {
      const recvTeam = this.match.servingTeam === 'A' ? 'B' : 'A';
      const box = this.activeServeBoxType;
      const role = this.match.positions[recvTeam][box];
      return {
        team: recvTeam,
        box,
        ...this.getPlayerObj(recvTeam, role)
      };
    },

    // ==========================================
    // 2D COURT VISUAL COORDINATE MAPPING
    // ==========================================
    get leftSideTeamKey() {
      return this.match.teamAOnLeft ? 'A' : 'B';
    },

    get rightSideTeamKey() {
      return this.match.teamAOnLeft ? 'B' : 'A';
    },

    getCourtQuadrantInfo(quadrant) {
      const leftTeam = this.leftSideTeamKey;
      const rightTeam = this.rightSideTeamKey;

      let teamKey = leftTeam;
      let boxType = 'leftBox';

      if (quadrant === 'top-left') {
        teamKey = leftTeam;
        boxType = 'leftBox';
      } else if (quadrant === 'bottom-left') {
        teamKey = leftTeam;
        boxType = 'rightBox';
      } else if (quadrant === 'top-right') {
        teamKey = rightTeam;
        boxType = 'rightBox';
      } else if (quadrant === 'bottom-right') {
        teamKey = rightTeam;
        boxType = 'leftBox';
      }

      const role = this.match.positions[teamKey][boxType];
      const player = this.getPlayerObj(teamKey, role);
      const isServer =
        !this.match.isFinished &&
        this.match.servingTeam === teamKey &&
        this.activeServeBoxType === boxType;
      const isReceiver =
        !this.match.isFinished &&
        this.match.servingTeam !== teamKey &&
        this.activeServeBoxType === boxType;

      return {
        quadrant,
        teamKey,
        teamName: this.getTeamName(teamKey),
        boxType,
        boxLabel: boxType === 'rightBox' ? 'KOTAK KANAN (GENAP)' : 'KOTAK KIRI (GANJIL)',
        shortBoxLabel: boxType === 'rightBox' ? 'Kanan (Genap)' : 'Kiri (Ganjil)',
        player,
        isServer,
        isReceiver
      };
    },

    get serviceArrowCoords() {
      const quadrants = ['top-left', 'bottom-left', 'top-right', 'bottom-right'];
      const coordsMap = {
        'top-left': { x: 25, y: 26 },
        'bottom-left': { x: 25, y: 74 },
        'top-right': { x: 75, y: 26 },
        'bottom-right': { x: 75, y: 74 }
      };

      let srvQ = 'bottom-left';
      let rcvQ = 'top-right';

      for (const q of quadrants) {
        const info = this.getCourtQuadrantInfo(q);
        if (info.isServer) srvQ = q;
        if (info.isReceiver) rcvQ = q;
      }

      return {
        x1: coordsMap[srvQ].x,
        y1: coordsMap[srvQ].y,
        x2: coordsMap[rcvQ].x,
        y2: coordsMap[rcvQ].y
      };
    },

    // ==========================================
    // MATCH START & SCORING ENGINE
    // ==========================================
    startNewMatch(bypassAuth = false) {
      if (this.isSameTeamSelected) {
        alert('Tim A dan Tim B tidak boleh menggunakan tim yang sama! Silakan pilih tim lawan yang berbeda.');
        return;
      }
      if (!bypassAuth) {
        this.requestProtectedAction(
          `Mulai Pertandingan (${this.getTeamName('A')} vs ${this.getTeamName('B')})`,
          () => {
            this.startNewMatch(true);
          },
          'wasit'
        );
        return;
      }

      this.syncMaxCap();
      this.undoStack = [];

      const initRightA = this.config.teamA.initialRight || 'male';
      const initLeftA = initRightA === 'male' ? 'female' : 'male';
      const initRightB = this.config.teamB.initialRight || 'male';
      const initLeftB = initRightB === 'male' ? 'female' : 'male';

      // Auto-resolve bracketMatchId if not in MANUAL mode
      let resolvedBracketMatchId = null;
      if (this.bracket && this.bracket.isCreated && this.bracket.activeBracketMatchId !== 'MANUAL') {
        if (this.bracket.activeBracketMatchId) {
          resolvedBracketMatchId = this.bracket.activeBracketMatchId;
        } else {
          const detected = this.resolveBracketMatchForCurrentTeams();
          if (detected) {
            resolvedBracketMatchId = detected.id;
            this.bracket.activeBracketMatchId = detected.id;
          }
        }
      }

      this.modals.matchEnd.bracketUpdatedLabel = '';

      this.match = {
        isActive: true,
        isFinished: false,
        winnerTeam: null,
        currentSet: 1,
        setsWon: { A: 0, B: 0 },
        scores: { A: 0, B: 0 },
        setScoresHistory: [],
        servingTeam: this.config.firstServerTeam,
        teamAOnLeft: this.config.teamAOnLeft,
        positions: {
          A: { rightBox: initRightA, leftBox: initLeftA },
          B: { rightBox: initRightB, leftBox: initLeftB }
        },
        lastSwappedTeam: null,
        lastActionType: 'START',
        pointLogs: [],
        intervalReachedInCurrentSet: false,
        rubberSwitchReached: false,
        bracketMatchId: resolvedBracketMatchId,
        startedAt: Date.now(),
        elapsedSeconds: 0
      };

      const srv = this.currentServerPlayer;
      const rcv = this.currentReceiverPlayer;

      this.screen = 'match';
      this.saveActiveMatch();
      this.speakUmpire(`Love all. Play! ${srv.name} serves to ${rcv.name}.`);
    },

    pushUndoSnapshot() {
      const snapshot = JSON.parse(
        JSON.stringify({
          match: this.match,
          config: this.config,
          bracket: this.bracket
        })
      );
      this.undoStack.push(snapshot);
      if (this.undoStack.length > 60) {
        this.undoStack.shift();
      }
    },

    undoLastAction(bypassAuth = false) {
      if (this.undoStack.length === 0) return;
      if (!this.isAdminUnlocked && !bypassAuth) {
        this.requestProtectedAction('Undo Poin / Aksi Terakhir', () => {
          this.undoLastAction(true);
        });
        return;
      }
      const last = this.undoStack.pop();
      this.match = last.match;
      this.config = last.config;
      if (last.bracket) {
        this.bracket = last.bracket;
        this.saveBracket(false);
      }
      this.modals.interval.open = false;
      this.modals.setEnd.open = false;
      this.modals.matchEnd.open = false;
      this.modals.matchEnd.bracketUpdatedLabel = '';
      this.clearIntervalTimer();
      this.saveActiveMatch();
      this.pushToServer({
        bracket: this.bracket,
        activeMatch: { config: this.config, match: this.match }
      });
    },

    addPoint(scoringTeam, bypassAuth = false) {
      if (this.match.isFinished || this.modals.setEnd.open) return;
      if (!this.isAdminUnlocked && !bypassAuth) {
        this.requestProtectedAction(`Tambah Poin (+1 ${this.getTeamName(scoringTeam)})`, () => {
          this.addPoint(scoringTeam, true);
        });
        return;
      }

      this.pushUndoSnapshot();

      const previousServingTeam = this.match.servingTeam;
      const scoringTeamName = this.getTeamName(scoringTeam);

      this.match.scores[scoringTeam] += 1;

      if (scoringTeam === previousServingTeam) {
        const currentRight = this.match.positions[scoringTeam].rightBox;
        const currentLeft = this.match.positions[scoringTeam].leftBox;
        this.match.positions[scoringTeam].rightBox = currentLeft;
        this.match.positions[scoringTeam].leftBox = currentRight;

        this.match.lastActionType = 'HOLD_SERVE';
        this.triggerSwapAnimation(scoringTeam);
      } else {
        this.match.servingTeam = scoringTeam;
        this.match.lastActionType = 'SERVICE_OVER';
        this.match.lastSwappedTeam = null;
      }

      const srvNow = this.currentServerPlayer;
      const rcvNow = this.currentReceiverPlayer;
      this.match.pointLogs.unshift({
        id: Date.now() + Math.random(),
        set: this.match.currentSet,
        scoreA: this.match.scores.A,
        scoreB: this.match.scores.B,
        scoringTeam,
        actionType: this.match.lastActionType,
        summary: `${scoringTeamName} +1 (${this.match.scores.A}-${this.match.scores.B}) • ${
          this.match.lastActionType === 'HOLD_SERVE' ? 'Tukar Kotak' : 'Pindah Servis (Posisi Tetap)'
        }`,
        nextServe: `${srvNow.name} → ${rcvNow.name}`
      });

      if (this.checkIfSetWon(scoringTeam)) {
        this.handleSetWon(scoringTeam);
        if (!this.match.isFinished) {
          this.saveActiveMatch();
        }
        return;
      }

      this.checkIntervalAndRubberSwitch();
      this.announceRallyResult(previousServingTeam !== scoringTeam);
      this.saveActiveMatch();
    },

    triggerSwapAnimation(teamKey) {
      this.match.lastSwappedTeam = null;
      setTimeout(() => {
        this.match.lastSwappedTeam = teamKey;
      }, 20);
    },

    // ==========================================
    // WINNING, DEUCE & INTERVAL LOGIC
    // ==========================================
    get matchStatusBadge() {
      if (this.match.isFinished) {
        return { text: 'PERTANDINGAN SELESAI', color: 'bg-emerald-600 text-white' };
      }

      const sA = this.match.scores.A;
      const sB = this.match.scores.B;
      const target = this.config.targetPoints;
      const maxCap = this.config.maxCap;

      if (this.config.deuceEnabled && sA === maxCap - 1 && sB === maxCap - 1) {
        return {
          text: `⚡ GOLDEN POINT (${maxCap} MENANG MUTLAK)`,
          color: 'bg-rose-600 text-white animate-pulse'
        };
      }

      const teamAGamePt = this.isNextPointWinning('A');
      const teamBGamePt = this.isNextPointWinning('B');

      if (teamAGamePt || teamBGamePt) {
        const leadingTeam = teamAGamePt ? 'A' : 'B';
        const setsNeeded = Math.ceil(this.config.bestOf / 2);
        const isMatchPt = this.match.setsWon[leadingTeam] + 1 >= setsNeeded;
        return {
          text: `${isMatchPt ? '🏆 MATCH POINT' : '🔥 GAME POINT'} - ${this.getTeamName(leadingTeam)}`,
          color: 'bg-amber-500 text-slate-950 font-extrabold'
        };
      }

      if (this.config.deuceEnabled && sA >= target - 1 && sB >= target - 1 && sA === sB) {
        return {
          text: `⚖️ DEUCE / SETTING (Selisih 2 atau Maks ${maxCap})`,
          color: 'bg-purple-600 text-white'
        };
      }

      return null;
    },

    isNextPointWinning(teamKey) {
      const otherKey = teamKey === 'A' ? 'B' : 'A';
      const nextScore = this.match.scores[teamKey] + 1;
      const otherScore = this.match.scores[otherKey];
      return this.evaluateWinScore(nextScore, otherScore);
    },

    checkIfSetWon(teamKey) {
      const otherKey = teamKey === 'A' ? 'B' : 'A';
      return this.evaluateWinScore(this.match.scores[teamKey], this.match.scores[otherKey]);
    },

    evaluateWinScore(teamScore, opponentScore) {
      const target = parseInt(this.config.targetPoints, 10) || 15;
      const maxCap = parseInt(this.config.maxCap, 10) || target + 3;

      if (!this.config.deuceEnabled) {
        return teamScore >= target;
      }

      if (teamScore >= maxCap) {
        return true;
      }

      if (teamScore >= target && teamScore - opponentScore >= 2) {
        return true;
      }

      return false;
    },

    checkIntervalAndRubberSwitch() {
      const trigger = this.intervalScoreTrigger;
      const sA = this.match.scores.A;
      const sB = this.match.scores.B;
      const isFinalDecidingSet =
        this.config.bestOf === 3 && this.match.currentSet === 3;

      if (
        !this.match.intervalReachedInCurrentSet &&
        (sA === trigger || sB === trigger) &&
        Math.max(sA, sB) === trigger
      ) {
        this.match.intervalReachedInCurrentSet = true;
        const leader = sA === trigger ? this.getTeamName('A') : this.getTeamName('B');

        if (isFinalDecidingSet && !this.match.rubberSwitchReached) {
          this.match.rubberSwitchReached = true;
          this.match.teamAOnLeft = !this.match.teamAOnLeft;
          this.openIntervalModal(
            `Interval & Pindah Lapangan (Poin ${trigger})`,
            `${leader} mencapai poin ${trigger} di Set Penentu (Set 3). Sesuai aturan BWF, kedua pasangan WAJIB BERTUKAR SISI LAPANGAN (posisi kanan/kiri pemain di dalam tim tetap sama) dan istirahat 60 detik.`,
            true
          );
        } else {
          this.openIntervalModal(
            `Interval Paruh Set (Poin ${trigger})`,
            `${leader} telah mencapai poin ${trigger}. Waktu istirahat (Interval) selama 60 detik sebelum melanjutkan permainan.`,
            false
          );
        }
      }
    },

    openIntervalModal(title, message, needSideSwitch) {
      this.clearIntervalTimer();
      this.modals.interval = {
        open: true,
        title,
        message,
        needSideSwitch,
        timerSeconds: 60,
        timerId: null
      };
      this.modals.interval.timerId = setInterval(() => {
        if (this.modals.interval.timerSeconds > 0) {
          this.modals.interval.timerSeconds -= 1;
        } else {
          this.clearIntervalTimer();
        }
      }, 1000);
    },

    closeIntervalModal() {
      this.clearIntervalTimer();
      this.modals.interval.open = false;
    },

    clearIntervalTimer() {
      if (this.modals.interval.timerId) {
        clearInterval(this.modals.interval.timerId);
        this.modals.interval.timerId = null;
      }
    },

    handleSetWon(winnerTeam) {
      this.match.setsWon[winnerTeam] += 1;

      const pairA = `${this.getPlayerObj('A', 'male').name} & ${this.getPlayerObj('A', 'female').name}`;
      const pairB = `${this.getPlayerObj('B', 'male').name} & ${this.getPlayerObj('B', 'female').name}`;

      this.match.setScoresHistory.push({
        set: this.match.currentSet,
        A: this.match.scores.A,
        B: this.match.scores.B,
        winner: winnerTeam,
        playersA: pairA,
        playersB: pairB
      });

      const setsRequired = Math.ceil(this.config.bestOf / 2);
      if (this.match.setsWon[winnerTeam] >= setsRequired) {
        this.match.isFinished = true;
        this.match.winnerTeam = winnerTeam;
        this.modals.matchEnd.bracketUpdatedLabel = '';

        // Auto-detect & update the Tournament Bracket (works even if bracketMatchId was null when match started!)
        const bMatch = this.resolveBracketMatchForCurrentTeams();
        if (bMatch && bMatch.teamA && bMatch.teamB) {
          const winCfg = winnerTeam === 'A' ? this.config.teamA : this.config.teamB;
          const winId = winCfg.teamId || '';
          const winName = (winCfg.name || '').trim().toLowerCase();
          const bNameA = (bMatch.teamA.name || '').trim().toLowerCase();
          const bNameB = (bMatch.teamB.name || '').trim().toLowerCase();

          // Determine if bMatch.teamA corresponds to config.teamA (normal order) or config.teamB (swapped order)
          const isNormalOrder =
            (winId && bMatch.teamA.id === this.config.teamA.teamId) ||
            bNameA === (this.config.teamA.name || '').trim().toLowerCase();

          const bScoreA = isNormalOrder ? this.match.setsWon.A : this.match.setsWon.B;
          const bScoreB = isNormalOrder ? this.match.setsWon.B : this.match.setsWon.A;

          let winningTeamId = null;
          if (winId && bMatch.teamA.id === winId) {
            winningTeamId = bMatch.teamA.id;
          } else if (winId && bMatch.teamB.id === winId) {
            winningTeamId = bMatch.teamB.id;
          } else if (winName && bNameA === winName) {
            winningTeamId = bMatch.teamA.id;
          } else if (winName && bNameB === winName) {
            winningTeamId = bMatch.teamB.id;
          } else {
            winningTeamId = winnerTeam === 'A' ? bMatch.teamA.id : bMatch.teamB.id;
          }

          // Build per-set score details in bMatch.teamA vs bMatch.teamB order (Opsi 5)
          const setDetailsList = (this.match.setScoresHistory || []).map((s) => {
            const ptsA = isNormalOrder ? s.A : s.B;
            const ptsB = isNormalOrder ? s.B : s.A;
            return `${ptsA}-${ptsB}`;
          });

          const lastSetObj =
            this.match.setScoresHistory[this.match.setScoresHistory.length - 1];
          const playersSummary = lastSetObj
            ? isNormalOrder
              ? `${lastSetObj.playersA} vs ${lastSetObj.playersB}`
              : `${lastSetObj.playersB} vs ${lastSetObj.playersA}`
            : '';

          this.advanceBracketMatchWinner(
            bMatch,
            winningTeamId,
            bScoreA,
            bScoreB,
            false,
            {
              setDetails: setDetailsList,
              durationText: this.matchElapsedFormatted,
              playersSummary
            }
          );

          this.modals.matchEnd.bracketUpdatedLabel =
            bMatch.stage === 'GROUP'
              ? `Klasemen Grup ${bMatch.group} (${bMatch.label}): ${this.getTeamName(winnerTeam)} +2 Poin Klasemen!`
              : `${bMatch.label}: ${this.getTeamName(winnerTeam)} menang & melaju di Bracket!`;
          this.bracket.activeBracketMatchId = null;
          this.saveBracket(false);
        }

        this.modals.matchEnd.open = true;
        this.recordMatchToHistory(false);

        // Save activeMatch locally and push all updated state atomically in ONE request to api.php
        const activePayload = { config: this.config, match: this.match };
        localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(activePayload));
        this.pushToServer({
          bracket: this.bracket,
          matchHistory: this.matchHistory,
          activeMatch: activePayload
        });

        this.speakUmpire(`Game, Set, and Match won by ${this.getTeamName(winnerTeam)}!`);
      } else {
        this.modals.setEnd = {
          open: true,
          setNumber: this.match.currentSet,
          winnerTeam,
          scoreA: this.match.scores.A,
          scoreB: this.match.scores.B,
          nextSetTeamAMale: this.config.teamA.male || '',
          nextSetTeamAFemale: this.config.teamA.female || '',
          nextSetTeamBMale: this.config.teamB.male || '',
          nextSetTeamBFemale: this.config.teamB.female || '',
          nextSetTeamAFirstRight: this.match.positions.A.rightBox,
          nextSetTeamBFirstRight: this.match.positions.B.rightBox
        };
        this.speakUmpire(`Game won by ${this.getTeamName(winnerTeam)}. Change ends for the next game.`);
      }
    },

    startNextSet() {
      const winnerLastSet = this.modals.setEnd.winnerTeam;

      if (this.modals.setEnd.nextSetTeamAMale?.trim()) {
        this.config.teamA.male = this.modals.setEnd.nextSetTeamAMale.trim();
      }
      if (this.modals.setEnd.nextSetTeamAFemale?.trim()) {
        this.config.teamA.female = this.modals.setEnd.nextSetTeamAFemale.trim();
      }
      if (this.modals.setEnd.nextSetTeamBMale?.trim()) {
        this.config.teamB.male = this.modals.setEnd.nextSetTeamBMale.trim();
      }
      if (this.modals.setEnd.nextSetTeamBFemale?.trim()) {
        this.config.teamB.female = this.modals.setEnd.nextSetTeamBFemale.trim();
      }

      const rightA = this.modals.setEnd.nextSetTeamAFirstRight || 'male';
      const rightB = this.modals.setEnd.nextSetTeamBFirstRight || 'male';

      this.match.currentSet += 1;
      this.match.scores = { A: 0, B: 0 };
      this.match.servingTeam = winnerLastSet;
      this.match.teamAOnLeft = !this.match.teamAOnLeft;

      this.match.positions.A = {
        rightBox: rightA,
        leftBox: rightA === 'male' ? 'female' : 'male'
      };
      this.match.positions.B = {
        rightBox: rightB,
        leftBox: rightB === 'male' ? 'female' : 'male'
      };

      this.match.intervalReachedInCurrentSet = false;
      this.match.rubberSwitchReached = false;
      this.match.lastActionType = 'START';

      this.modals.setEnd.open = false;
      this.saveActiveMatch();
      this.speakUmpire(`Game ${this.match.currentSet}. Love all. Play!`);
    },

    // ==========================================
    // UMPIRE MANUAL OVERRIDES (CORRECTIONS)
    // ==========================================
    swapTeamPlayersManual(teamKey) {
      this.requireAdminOrPrompt('Tukar Posisi Pemain Manual', () => {
        this.pushUndoSnapshot();
        const right = this.match.positions[teamKey].rightBox;
        const left = this.match.positions[teamKey].leftBox;
        this.match.positions[teamKey].rightBox = left;
        this.match.positions[teamKey].leftBox = right;
        this.match.lastActionType = 'MANUAL_FIX';
        this.triggerSwapAnimation(teamKey);
        this.saveActiveMatch();
      });
    },

    switchCourtSidesManual() {
      this.requireAdminOrPrompt('Tukar Sisi Lapangan Kiri/Kanan', () => {
        this.pushUndoSnapshot();
        this.match.teamAOnLeft = !this.match.teamAOnLeft;
        this.match.lastActionType = 'SWITCH_SIDES';
        this.saveActiveMatch();
      });
    },

    toggleServingTeamManual() {
      this.requireAdminOrPrompt('Pindah Servis Manual', () => {
        this.pushUndoSnapshot();
        this.match.servingTeam = this.match.servingTeam === 'A' ? 'B' : 'A';
        this.saveActiveMatch();
      });
    },

    // ==========================================
    // SPEECH SYNTHESIS (UMPIRE VOICE)
    // ==========================================
    announceRallyResult(isServiceOver) {
      if (!this.voiceEnabled || !('speechSynthesis' in window)) return;
      const srvTeam = this.match.servingTeam;
      const rcvTeam = srvTeam === 'A' ? 'B' : 'A';
      const srvScore = this.match.scores[srvTeam];
      const rcvScore = this.match.scores[rcvTeam];

      let parts = [];
      if (isServiceOver) {
        parts.push('Service over.');
      }
      parts.push(`${srvScore}, ${rcvScore}.`);
      this.speakUmpire(parts.join(' '));
    },

    speakUmpire(text) {
      if (!this.voiceEnabled || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'en-US';
        utter.rate = 1.0;
        window.speechSynthesis.speak(utter);
      } catch (e) {
        // Ignore TTS errors
      }
    },

    // ==========================================
    // LOCAL STORAGE PERSISTENCE
    // ==========================================
    saveActiveMatch() {
      try {
        const payload = {
          config: this.config,
          match: this.match
        };
        localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(payload));
        this.pushToServer({ activeMatch: payload });
      } catch (e) {
        console.warn('Failed to save match state:', e);
      }
    },

    loadActiveMatch() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_ACTIVE);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.match && parsed.match.isActive) {
          this.config = { ...this.config, ...parsed.config };
          this.match = { ...this.match, ...parsed.match };
          if (!this.match.isFinished) {
            this.screen = 'match';
          }
        }
      } catch (e) {
        console.warn('Failed to load saved match:', e);
      }
    },

    resetToSetup() {
      this.clearIntervalTimer();
      this.modals.interval.open = false;
      this.modals.setEnd.open = false;
      this.modals.matchEnd.open = false;
      this.modals.matchEnd.bracketUpdatedLabel = '';
      this.match.isActive = false;
      localStorage.removeItem(STORAGE_KEY_ACTIVE);

      // Automatically pre-select the next unfinished match from the Bracket!
      if (this.bracket && this.bracket.isCreated) {
        const nextAvailable = this.availableBracketMatches;
        if (nextAvailable.length > 0) {
          this.selectBracketMatchInSetup(nextAvailable[0].id, false);
        } else {
          this.bracket.activeBracketMatchId = null;
        }
        localStorage.setItem(STORAGE_KEY_BRACKET, JSON.stringify(this.bracket));
      }

      this.pushToServer({
        activeMatch: null,
        bracket: this.bracket
      });

      this.screen = 'setup';
    },

    finishAndGoToBracket() {
      this.clearIntervalTimer();
      this.modals.interval.open = false;
      this.modals.setEnd.open = false;
      this.modals.matchEnd.open = false;
      this.modals.matchEnd.bracketUpdatedLabel = '';
      this.match.isActive = false;
      localStorage.removeItem(STORAGE_KEY_ACTIVE);

      if (this.bracket && this.bracket.isCreated) {
        const nextAvailable = this.availableBracketMatches;
        if (nextAvailable.length > 0) {
          this.selectBracketMatchInSetup(nextAvailable[0].id, false);
        } else {
          this.bracket.activeBracketMatchId = null;
        }
        localStorage.setItem(STORAGE_KEY_BRACKET, JSON.stringify(this.bracket));
      }

      this.pushToServer({
        activeMatch: null,
        bracket: this.bracket
      });

      this.screen = 'bracket';
    },

    recordMatchToHistory(shouldPush = true) {
      try {
        const entry = {
          id: Date.now(),
          date: new Date().toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          durationSeconds: this.match.elapsedSeconds || 0,
          durationText: this.matchElapsedFormatted,
          targetPoints: this.config.targetPoints,
          maxCap: this.config.maxCap,
          teamAName: this.getTeamName('A'),
          teamBName: this.getTeamName('B'),
          setsWon: { ...this.match.setsWon },
          setScores: [...this.match.setScoresHistory],
          winnerTeam: this.match.winnerTeam
        };
        this.matchHistory.unshift(entry);
        if (this.matchHistory.length > 30) {
          this.matchHistory.pop();
        }
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(this.matchHistory));
        if (shouldPush) {
          this.pushToServer({ matchHistory: this.matchHistory });
        }
      } catch (e) {
        console.warn('Failed to save history:', e);
      }
    },

    // ==========================================
    // TOURNAMENT STATISTICS SUMMARY (OPSI 5)
    // ==========================================
    get tournamentStatsSummary() {
      const history = Array.isArray(this.matchHistory) ? this.matchHistory : [];
      let totalMatches = history.length;
      let totalSets = 0;
      let totalPoints = 0;
      let totalDurationSec = 0;
      let countWithDuration = 0;

      const teamMap = {};
      const ensureTeam = (name) => {
        const clean = (name || 'Tim').trim();
        if (!teamMap[clean]) {
          teamMap[clean] = {
            name: clean,
            matchesPlayed: 0,
            matchesWon: 0,
            setsWon: 0,
            setsLost: 0,
            pointsScored: 0,
            pointsConceded: 0
          };
        }
        return teamMap[clean];
      };

      for (const item of history) {
        const tA = ensureTeam(item.teamAName);
        const tB = ensureTeam(item.teamBName);

        tA.matchesPlayed += 1;
        tB.matchesPlayed += 1;
        if (item.winnerTeam === 'A') tA.matchesWon += 1;
        if (item.winnerTeam === 'B') tB.matchesWon += 1;

        tA.setsWon += item.setsWon?.A || 0;
        tA.setsLost += item.setsWon?.B || 0;
        tB.setsWon += item.setsWon?.B || 0;
        tB.setsLost += item.setsWon?.A || 0;

        if (item.durationSeconds && item.durationSeconds > 0) {
          totalDurationSec += item.durationSeconds;
          countWithDuration += 1;
        }

        for (const s of item.setScores || []) {
          totalSets += 1;
          const pA = parseInt(s.A, 10) || 0;
          const pB = parseInt(s.B, 10) || 0;
          totalPoints += pA + pB;
          tA.pointsScored += pA;
          tA.pointsConceded += pB;
          tB.pointsScored += pB;
          tB.pointsConceded += pA;
        }
      }

      const leaderboard = Object.values(teamMap).sort((a, b) => {
        if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
        const setDiffA = a.setsWon - a.setsLost;
        const setDiffB = b.setsWon - b.setsLost;
        if (setDiffB !== setDiffA) return setDiffB - setDiffA;
        return b.pointsScored - a.pointsScored;
      });

      const avgDurationSec =
        countWithDuration > 0 ? Math.round(totalDurationSec / countWithDuration) : 0;

      return {
        totalMatches,
        totalSets,
        totalPoints,
        avgDurationText: avgDurationSec > 0 ? this.formatDuration(avgDurationSec) : '--:--',
        leaderboard
      };
    },

    // ==========================================
    // BACKUP & RESTORE DATA TURNAMEN (.JSON) (OPSI 6)
    // ==========================================
    exportTournamentBackup() {
      try {
        const backupData = {
          appName: 'GF ScoBad',
          version: '1.0',
          exportedAt: new Date().toISOString(),
          masterTeams: this.masterTeams,
          bracket: this.bracket,
          matchHistory: this.matchHistory,
          config: this.config
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `GF-ScoBad-Backup-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        alert('Gagal membuat file backup: ' + e.message);
      }
    },

    triggerImportBackup() {
      this.requestProtectedAction(
        'Restore / Import Data Backup (.json)',
        () => {
          const fileInput = document.getElementById('backup-json-file-input');
          if (fileInput) {
            fileInput.value = '';
            fileInput.click();
          }
        },
        'edit'
      );
    },

    importTournamentBackupFile(event) {
      const file = event?.target?.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!parsed || typeof parsed !== 'object') {
            throw new Error('Format file JSON tidak valid');
          }

          if (Array.isArray(parsed.masterTeams) && parsed.masterTeams.length > 0) {
            this.masterTeams = parsed.masterTeams;
            this.initMemberInputs();
            localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(this.masterTeams));
          }

          if (parsed.bracket && typeof parsed.bracket === 'object') {
            this.bracket = { ...this.bracket, ...parsed.bracket, editMode: false };
            localStorage.setItem(STORAGE_KEY_BRACKET, JSON.stringify(this.bracket));
          }

          if (Array.isArray(parsed.matchHistory)) {
            this.matchHistory = parsed.matchHistory;
            localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(this.matchHistory));
          }

          this.ensureDistinctTeams();

          await this.pushToServer({
            masterTeams: this.masterTeams,
            bracket: this.bracket,
            matchHistory: this.matchHistory
          });

          alert('✅ Data Turnamen berhasil di-restore dan disinkronkan ke Server!');
        } catch (err) {
          alert('❌ Gagal membaca file backup: ' + err.message);
        }
      };
      reader.readAsText(file);
    },

    forcePushLocalToServer() {
      this.requestProtectedAction(
        'Upload Paksa Data Browser Ini ke Server',
        async () => {
          await this.pushToServer({
            masterTeams: this.masterTeams,
            bracket: this.bracket,
            matchHistory: this.matchHistory,
            activeMatch: this.match.isActive
              ? { config: this.config, match: this.match }
              : null
          });
          alert('✅ Seluruh data di browser ini telah berhasil di-upload ke Server Terpusat!');
        },
        'edit'
      );
    },

    loadHistory() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
        if (raw) {
          this.matchHistory = JSON.parse(raw);
        }
      } catch (e) {
        this.matchHistory = [];
      }
    },

    clearHistory() {
      this.requestProtectedAction(
        'Hapus Semua Riwayat Pertandingan',
        () => {
          this.matchHistory = [];
          localStorage.removeItem(STORAGE_KEY_HISTORY);
          this.pushToServer({ matchHistory: [] });
        },
        'delete'
      );
    }
  };
}
