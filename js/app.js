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
const STORAGE_KEY_TEAMS = 'skor_badminton_master_teams_v1';
const STORAGE_KEY_BRACKET = 'skor_badminton_bracket_v1';

const DEFAULT_MASTER_TEAMS = [
  {
    id: 'team-1',
    name: 'Tim 1 Alpha',
    members: [
      { id: 'm-1', name: 'Noval', gender: 'male' },
      { id: 'm-2', name: 'Pak Turi', gender: 'male' },
      { id: 'm-3', name: 'Muiz', gender: 'male' },
      { id: 'm-4', name: 'Iwud', gender: 'female' }
    ]
  },
  {
    id: 'team-2',
    name: 'Tim 2 Bravo',
    members: [
      { id: 'm-5', name: 'Alvian', gender: 'male' },
      { id: 'm-6', name: 'Ilmi', gender: 'female' },
      { id: 'm-7', name: 'Budi', gender: 'male' },
      { id: 'm-8', name: 'Siti', gender: 'female' }
    ]
  },
  {
    id: 'team-3',
    name: 'Tim 3 Charlie',
    members: [
      { id: 'm-9', name: 'Andi', gender: 'male' },
      { id: 'm-10', name: 'Rina', gender: 'female' },
      { id: 'm-11', name: 'Dimas', gender: 'male' },
      { id: 'm-12', name: 'Ayu', gender: 'female' }
    ]
  },
  {
    id: 'team-4',
    name: 'Tim 4 Delta',
    members: [
      { id: 'm-13', name: 'Kevin', gender: 'male' },
      { id: 'm-14', name: 'Liliyana', gender: 'female' },
      { id: 'm-15', name: 'Fajar', gender: 'male' },
      { id: 'm-16', name: 'Apriyani', gender: 'female' }
    ]
  }
];

function badmintonApp() {
  return {
    // Navigation view: 'setup' | 'teams' | 'bracket' | 'match' | 'rules' | 'history'
    screen: 'setup',

    // Sound / Umpire TTS
    voiceEnabled: true,

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
    newMemberInputs: {},
    editingTeamId: null,
    editingTeamName: '',
    editingMemberId: null,
    editingMemberName: '',
    editingMemberGender: 'male',

    // Tournament Bracket State
    bracket: {
      isCreated: false,
      editMode: false, // Allows admin to manually change who vs who & reorder bracket matches
      title: 'Turnamen Badminton Ganda Campuran',
      size: 4, // 4, 8, 16, 32
      participantCount: 0,
      rounds: [], // Array of rounds: [{ roundIndex, name, isSemiFinal, isFinal, matches: [...] }]
      thirdPlaceMatch: null, // Special match for Semifinal losers (Perebutan Juara 3)
      activeBracketMatchId: null // Tracks if current live match belongs to a bracket match
    },

    // Setup Form Configuration
    config: {
      preset: 'community15', // 'bwf21' | 'community15' | 'quick11' | 'custom'
      targetPoints: 15,
      deuceEnabled: true,
      deuceAllowance: 3, // Max cap = targetPoints + deuceAllowance (e.g., 15 + 3 = 18)
      maxCap: 18,
      bestOf: 3, // 1 or 3 sets
      firstServerTeam: 'A', // 'A' or 'B'
      teamAOnLeft: true,
      teamA: {
        teamId: 'team-1',
        name: 'Tim 1 Alpha',
        male: 'Pak Turi',
        female: 'Iwud',
        initialRight: 'male'
      },
      teamB: {
        teamId: 'team-2',
        name: 'Tim 2 Bravo',
        male: 'Alvian',
        female: 'Ilmi',
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
      bracketMatchId: null
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
      }
    },

    // Saved Match History
    matchHistory: [],

    // Lifecycle Init
    async init() {
      this.loadMasterTeams();
      this.loadBracket();
      this.loadHistory();
      this.loadActiveMatch();
      this.syncMaxCap();

      // Connect to Centralized Server API (api.php) FIRST before any auto-selection saves
      await this.initialServerSync();
      if (!this.match || !this.match.isActive) {
        this.ensureDistinctTeams();
      }
      this.startServerPolling();
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
        const serverHasCustomTeams = !this.isDefaultTeamsData(serverData.masterTeams);
        const serverHasBracket = Boolean(
          serverData.bracket && serverData.bracket.isCreated
        );
        const localHasCustomTeams = !this.isDefaultTeamsData(this.masterTeams);
        const localHasBracket = Boolean(this.bracket && this.bracket.isCreated);

        // If server is still fresh/default (or was accidentally reset to default)
        // while this Admin device has real custom teams or bracket in localStorage, restore local data to server!
        if (
          (!serverHasCustomTeams && localHasCustomTeams) ||
          (!serverHasBracket && localHasBracket)
        ) {
          const payloadToRestore = {};
          if (!serverHasCustomTeams && localHasCustomTeams) {
            payloadToRestore.masterTeams = this.masterTeams;
          } else if (serverHasCustomTeams) {
            this.masterTeams = serverData.masterTeams;
            this.initMemberInputs();
            localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(this.masterTeams));
          }

          if (!serverHasBracket && localHasBracket) {
            payloadToRestore.bracket = this.bracket;
          } else if (serverHasBracket) {
            this.bracket = { ...this.bracket, ...serverData.bracket };
            localStorage.setItem(STORAGE_KEY_BRACKET, JSON.stringify(this.bracket));
          }

          await this.pushToServer(payloadToRestore);
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

    // List of all playable, unfinished matches from the Tournament Bracket
    get availableBracketMatches() {
      if (!this.bracket || !this.bracket.isCreated || !Array.isArray(this.bracket.rounds)) {
        return [];
      }

      const list = [];
      for (const round of this.bracket.rounds) {
        for (const m of round.matches) {
          const hasBothTeams =
            m.teamA && m.teamB && !m.teamA.isBye && !m.teamB.isBye;
          const isUnfinished = !m.winnerId && m.status !== 'FINISHED' && m.status !== 'BYE';
          if (hasBothTeams && isUnfinished) {
            list.push({
              id: m.id,
              roundName: round.name,
              label: m.label,
              teamA: m.teamA,
              teamB: m.teamB,
              previewText: `${m.label} (${round.name}) — ${m.teamA.name} vs ${m.teamB.name}`
            });
          }
        }
      }

      // Also include 3rd Place Playoff if both Semifinal losers are ready and match is unfinished
      const tp = this.bracket.thirdPlaceMatch;
      if (tp && tp.teamA && tp.teamB && !tp.teamA.isBye && !tp.teamB.isBye && !tp.winnerId) {
        list.push({
          id: tp.id,
          roundName: 'PEREBUTAN JUARA 3',
          label: tp.label,
          teamA: tp.teamA,
          teamB: tp.teamB,
          previewText: `${tp.label} — ${tp.teamA.name} vs ${tp.teamB.name}`
        });
      }

      return list;
    },

    get selectedBracketMatchObj() {
      if (!this.bracket || !this.bracket.activeBracketMatchId || this.bracket.activeBracketMatchId === 'MANUAL') {
        return null;
      }
      return this.availableBracketMatches.find((m) => m.id === this.bracket.activeBracketMatchId) || null;
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

    createMasterTeam() {
      const name = (this.newTeamNameInput || '').trim();
      if (!name) return;
      const newId = 'team-' + Date.now();
      this.masterTeams.push({
        id: newId,
        name,
        members: []
      });
      this.newMemberInputs[newId] = { name: '', gender: 'male' };
      this.newTeamNameInput = '';
      this.saveMasterTeams();
    },

    startEditMasterTeam(team) {
      if (!team) return;
      this.editingTeamId = team.id;
      this.editingTeamName = team.name;
    },

    cancelEditMasterTeam() {
      this.editingTeamId = null;
      this.editingTeamName = '';
    },

    saveEditMasterTeam(teamId) {
      const newName = (this.editingTeamName || '').trim();
      if (!newName) return;

      const team = this.masterTeams.find((t) => t.id === teamId);
      if (!team) return;

      team.name = newName;
      this.editingTeamId = null;
      this.editingTeamName = '';

      // Also sync name in Setup config if this team is selected
      if (this.config.teamA.teamId === teamId) {
        this.config.teamA.name = newName;
      }
      if (this.config.teamB.teamId === teamId) {
        this.config.teamB.name = newName;
      }

      // Also sync name across all Bracket matches if Bracket already exists
      if (this.bracket && this.bracket.isCreated) {
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
      this.editingMemberId = member.id;
      this.editingMemberName = member.name;
      this.editingMemberGender = member.gender || 'male';
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
      this.masterTeams = this.masterTeams.filter((t) => t.id !== teamId);
      this.saveMasterTeams();
      this.ensureDistinctTeams();
    },

    addMemberToMasterTeam(teamId) {
      if (!this.newMemberInputs[teamId]) {
        this.newMemberInputs[teamId] = { name: '', gender: 'male' };
      }
      const input = this.newMemberInputs[teamId];
      const name = (input.name || '').trim();
      if (!name) return;

      const team = this.masterTeams.find((t) => t.id === teamId);
      if (!team) return;

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
      team.members = team.members.filter((m) => m.id !== memberId);
      this.saveMasterTeams();
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
    // TOURNAMENT BRACKET ENGINE (KNOCKOUT + 3RD PLACE)
    // ==========================================
    loadBracket() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_BRACKET);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            this.bracket = { ...this.bracket, ...parsed };
          }
        }
      } catch (e) {
        console.warn('Failed to load bracket:', e);
      }
    },

    saveBracket(shouldPush = true) {
      try {
        // Force fresh array reference so Alpine.js always re-renders deep bracket updates immediately
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

    // Generate Knockout Bracket based on registered masterTeams
    generateBracket(shuffleTeams = true) {
      if (this.masterTeams.length < 2) {
        alert('Minimal harus ada 2 tim terdaftar di menu Daftar Tim untuk membuat Bracket!');
        return;
      }

      // Copy registered teams
      let teamsPool = this.masterTeams.map((t) => ({
        id: t.id,
        name: t.name
      }));

      if (shuffleTeams) {
        for (let i = teamsPool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [teamsPool[i], teamsPool[j]] = [teamsPool[j], teamsPool[i]];
        }
      }

      const n = teamsPool.length;
      // Next power of 2 (minimum 2, e.g., 4, 8, 16, 32)
      let size = 2;
      while (size < n) {
        size *= 2;
      }

      const totalRounds = Math.log2(size);
      const rounds = [];

      // Helper for round names
      const getRoundTitle = (rIdx, totalR) => {
        const remainingTeams = Math.pow(2, totalR - rIdx);
        if (remainingTeams === 2) return 'FINAL (Perebutan Juara 1 & 2)';
        if (remainingTeams === 4) return 'SEMIFINAL (4 Besar)';
        if (remainingTeams === 8) return 'PEREMPAT FINAL (8 Besar)';
        if (remainingTeams === 16) return 'BABAK 16 BESAR';
        return `BABAK ${remainingTeams} BESAR`;
      };

      // Pair teams in Round 0 (distribute BYEs evenly so BYEs don't play each other)
      const numMatchesR0 = size / 2;
      const numByes = size - n;
      const r0Matches = [];

      let teamCursor = 0;
      for (let m = 0; m < numMatchesR0; m++) {
        const teamA = teamsPool[teamCursor++] || null;
        let teamB = null;
        // Put BYEs on the last `numByes` matches so those teams advance automatically
        if (m < numMatchesR0 - numByes) {
          teamB = teamsPool[teamCursor++] || null;
        } else {
          teamB = { id: 'BYE', name: 'BYE (Lolos Langsung)', isBye: true };
        }

        r0Matches.push({
          id: `R0-M${m}`,
          roundIndex: 0,
          matchIndex: m,
          label: `Match #${m + 1}`,
          teamA,
          teamB,
          scoreA: null,
          scoreB: null,
          winnerId: null,
          status: 'PENDING' // 'PENDING' | 'BYE' | 'FINISHED'
        });
      }

      rounds.push({
        roundIndex: 0,
        name: getRoundTitle(0, totalRounds),
        isSemiFinal: totalRounds - 0 === 2,
        isFinal: totalRounds - 0 === 1,
        matches: r0Matches
      });

      // Build subsequent rounds
      for (let r = 1; r < totalRounds; r++) {
        const matchCount = Math.pow(2, totalRounds - r - 1);
        const rMatches = [];
        for (let m = 0; m < matchCount; m++) {
          rMatches.push({
            id: `R${r}-M${m}`,
            roundIndex: r,
            matchIndex: m,
            label:
              r === totalRounds - 1
                ? 'Grand Final'
                : r === totalRounds - 2
                ? `Semifinal ${m + 1}`
                : `Match`,
            teamA: null,
            teamB: null,
            scoreA: null,
            scoreB: null,
            winnerId: null,
            status: 'PENDING'
          });
        }
        rounds.push({
          roundIndex: r,
          name: getRoundTitle(r, totalRounds),
          isSemiFinal: r === totalRounds - 2,
          isFinal: r === totalRounds - 1,
          matches: rMatches
        });
      }

      // Create 3rd Place Playoff Match (Perebutan Juara 3) if tournament has Semifinals (size >= 4)
      let thirdPlaceMatch = null;
      if (size >= 4) {
        thirdPlaceMatch = {
          id: 'THIRD-PLACE',
          roundIndex: totalRounds - 1,
          matchIndex: 99,
          label: 'Perebutan Juara 3',
          teamA: null, // Loser of Semifinal 1
          teamB: null, // Loser of Semifinal 2
          scoreA: null,
          scoreB: null,
          winnerId: null,
          status: 'PENDING'
        };
      }

      this.bracket = {
        isCreated: true,
        editMode: false,
        title: this.bracket.title || 'Turnamen Badminton Ganda Campuran',
        size,
        participantCount: n,
        rounds,
        thirdPlaceMatch,
        activeBracketMatchId: null
      };

      this.reprocessFirstRoundByes();
      this.saveBracket();
    },

    // Re-evaluate BYEs in Round 0 and reset/update Round 1 slots accordingly
    reprocessFirstRoundByes() {
      if (!this.bracket.isCreated || !this.bracket.rounds.length) return;
      const r0 = this.bracket.rounds[0];
      for (const match of r0.matches) {
        const hasByeA = match.teamA && match.teamA.isBye;
        const hasByeB = match.teamB && match.teamB.isBye;
        if (hasByeB && match.teamA && !hasByeA) {
          match.status = 'BYE';
          match.scoreA = null;
          match.scoreB = null;
          this.advanceBracketMatchWinner(match, match.teamA.id, null, null, false);
        } else if (hasByeA && match.teamB && !hasByeB) {
          match.status = 'BYE';
          match.scoreA = null;
          match.scoreB = null;
          this.advanceBracketMatchWinner(match, match.teamB.id, null, null, false);
        } else {
          if (match.status === 'BYE') {
            match.status = 'PENDING';
            match.winnerId = null;
          }
        }
      }
    },

    // Admin Feature 1: Change team in any slot of a match (with automatic swap if the selected team is already in another match in the same round)
    changeBracketSlotTeam(roundIndex, matchIndex, slotKey, newTeamId) {
      if (!this.bracket.isCreated || !this.bracket.rounds[roundIndex]) return;
      const round = this.bracket.rounds[roundIndex];
      const targetMatch = round.matches[matchIndex];
      if (!targetMatch) return;

      const currentSlotTeam = slotKey === 'A' ? targetMatch.teamA : targetMatch.teamB;

      // Build new team object
      let newTeamObj = null;
      if (newTeamId === 'BYE') {
        newTeamObj = { id: 'BYE', name: 'BYE (Lolos Langsung)', isBye: true };
      } else if (newTeamId === '') {
        newTeamObj = null;
      } else {
        const foundMaster = this.masterTeams.find((t) => t.id === newTeamId);
        if (foundMaster) {
          newTeamObj = { id: foundMaster.id, name: foundMaster.name };
        }
      }

      // If selecting a real team, check if that team already exists somewhere in this same round -> Auto-Swap!
      if (newTeamObj && !newTeamObj.isBye) {
        for (let mIdx = 0; mIdx < round.matches.length; mIdx++) {
          const m = round.matches[mIdx];
          if (m.teamA && m.teamA.id === newTeamObj.id) {
            m.teamA = currentSlotTeam ? { ...currentSlotTeam } : null;
            m.winnerId = null;
            m.scoreA = null;
            m.scoreB = null;
            m.status = 'PENDING';
            break;
          }
          if (m.teamB && m.teamB.id === newTeamObj.id) {
            m.teamB = currentSlotTeam ? { ...currentSlotTeam } : null;
            m.winnerId = null;
            m.scoreA = null;
            m.scoreB = null;
            m.status = 'PENDING';
            break;
          }
        }
      }

      // Assign to target slot
      if (slotKey === 'A') {
        targetMatch.teamA = newTeamObj;
      } else {
        targetMatch.teamB = newTeamObj;
      }

      // Reset target match result
      targetMatch.winnerId = null;
      targetMatch.scoreA = null;
      targetMatch.scoreB = null;
      targetMatch.status = 'PENDING';

      if (roundIndex === 0) {
        this.reprocessFirstRoundByes();
      }
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

    // Admin Feature 2: Move / Swap entire Match order (e.g. Swap Match #1 with Match #2 or any other Match in the round)
    moveBracketMatchOrder(roundIndex, fromMatchIndex, toMatchIndex) {
      if (!this.bracket.isCreated || !this.bracket.rounds[roundIndex]) return;
      const round = this.bracket.rounds[roundIndex];
      if (
        toMatchIndex < 0 ||
        toMatchIndex >= round.matches.length ||
        fromMatchIndex === toMatchIndex
      ) {
        return;
      }

      const matchFrom = round.matches[fromMatchIndex];
      const matchTo = round.matches[toMatchIndex];

      // Swap teams and state between the two bracket positions
      const tempData = {
        teamA: matchFrom.teamA,
        teamB: matchFrom.teamB,
        scoreA: matchFrom.scoreA,
        scoreB: matchFrom.scoreB,
        winnerId: matchFrom.winnerId,
        status: matchFrom.status
      };

      matchFrom.teamA = matchTo.teamA;
      matchFrom.teamB = matchTo.teamB;
      matchFrom.scoreA = matchTo.scoreA;
      matchFrom.scoreB = matchTo.scoreB;
      matchFrom.winnerId = matchTo.winnerId;
      matchFrom.status = matchTo.status;

      matchTo.teamA = tempData.teamA;
      matchTo.teamB = tempData.teamB;
      matchTo.scoreA = tempData.scoreA;
      matchTo.scoreB = tempData.scoreB;
      matchTo.winnerId = tempData.winnerId;
      matchTo.status = tempData.status;

      // Re-propagate winners or BYEs if needed
      if (roundIndex === 0) {
        this.reprocessFirstRoundByes();
      }
      if (matchFrom.winnerId) {
        this.advanceBracketMatchWinner(matchFrom, matchFrom.winnerId, matchFrom.scoreA, matchFrom.scoreB, false);
      }
      if (matchTo.winnerId) {
        this.advanceBracketMatchWinner(matchTo, matchTo.winnerId, matchTo.scoreA, matchTo.scoreB, false);
      }

      this.saveBracket();
    },

    // Set winner of a bracket match and propagate winner (and Semifinal loser to 3rd Place match)
    advanceBracketMatchWinner(matchObj, winningTeamId, scoreA = null, scoreB = null, shouldSave = true) {
      if (!matchObj || !matchObj.teamA || !matchObj.teamB) return;

      const winnerTeam =
        matchObj.teamA.id === winningTeamId ? matchObj.teamA : matchObj.teamB;
      const loserTeam =
        matchObj.teamA.id === winningTeamId ? matchObj.teamB : matchObj.teamA;

      matchObj.winnerId = winningTeamId;
      if (scoreA !== null) matchObj.scoreA = scoreA;
      if (scoreB !== null) matchObj.scoreB = scoreB;
      if (matchObj.status !== 'BYE') {
        matchObj.status = 'FINISHED';
      }

      // Check if this is the 3rd Place Match
      if (matchObj.id === 'THIRD-PLACE') {
        if (shouldSave) this.saveBracket();
        return;
      }

      const totalRounds = this.bracket.rounds.length;
      const rIdx = matchObj.roundIndex;
      const mIdx = matchObj.matchIndex;

      // Propagate Winner to Next Round
      if (rIdx + 1 < totalRounds) {
        const nextRound = this.bracket.rounds[rIdx + 1];
        const nextMatchIndex = Math.floor(mIdx / 2);
        const isSlotA = mIdx % 2 === 0;
        const nextMatch = nextRound.matches[nextMatchIndex];

        if (nextMatch) {
          if (isSlotA) {
            nextMatch.teamA = { id: winnerTeam.id, name: winnerTeam.name };
          } else {
            nextMatch.teamB = { id: winnerTeam.id, name: winnerTeam.name };
          }
          // Reset next match winner if participants changed
          nextMatch.winnerId = null;
          nextMatch.scoreA = null;
          nextMatch.scoreB = null;
          nextMatch.status = 'PENDING';
        }
      }

      // BWF / Tournament Rule requested by user:
      // - Teams losing BEFORE Semifinals (4 Besar) are immediately eliminated.
      // - Teams losing IN Semifinals (4 Besar) go to the 3rd Place Playoff (Perebutan Juara 3)!
      const isSemiFinalRound = totalRounds >= 2 && rIdx === totalRounds - 2;
      if (isSemiFinalRound && this.bracket.thirdPlaceMatch) {
        const isFirstSemi = mIdx === 0;
        const cleanLoser =
          loserTeam && !loserTeam.isBye
            ? { id: loserTeam.id, name: loserTeam.name }
            : { id: 'BYE', name: 'BYE', isBye: true };

        if (isFirstSemi) {
          this.bracket.thirdPlaceMatch.teamA = cleanLoser;
        } else {
          this.bracket.thirdPlaceMatch.teamB = cleanLoser;
        }

        // If one of the semifinal losers is a BYE, auto-award 3rd place to the real team
        const tp = this.bracket.thirdPlaceMatch;
        if (tp.teamA && tp.teamB) {
          if (tp.teamA.isBye && !tp.teamB.isBye) {
            tp.winnerId = tp.teamB.id;
            tp.status = 'BYE';
          } else if (tp.teamB.isBye && !tp.teamA.isBye) {
            tp.winnerId = tp.teamA.id;
            tp.status = 'BYE';
          }
        }
      }

      if (shouldSave) {
        this.saveBracket();
      }
    },

    // Launch a Bracket Match into Setup/Court so Umpire can pick players and score it
    playBracketMatch(matchObj) {
      if (!matchObj || !matchObj.teamA || !matchObj.teamB) return;
      if (matchObj.teamA.isBye || matchObj.teamB.isBye) return;

      this.bracket.activeBracketMatchId = matchObj.id;
      this.saveBracket();

      // Load Team A & Team B into Setup Config
      this.onSelectTeamInSetup('A', matchObj.teamA.id);
      this.onSelectTeamInSetup('B', matchObj.teamB.id);

      // Navigate to Setup so Umpire can confirm/pick which male & female players play Set 1
      this.screen = 'setup';
    },

    findBracketMatchById(matchId) {
      if (!matchId || !this.bracket.isCreated) return null;
      if (matchId === 'THIRD-PLACE') return this.bracket.thirdPlaceMatch;
      for (const r of this.bracket.rounds) {
        for (const m of r.matches) {
          if (m.id === matchId) return m;
        }
      }
      return null;
    },

    // Smart auto-detection: finds the bracket match corresponding to the current match teams
    // Works even if the match was started before activeBracketMatchId was linked!
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

      // 3. Auto-match by Team IDs or Team Names against all playable unfinished bracket matches
      const idA = this.config.teamA.teamId || '';
      const idB = this.config.teamB.teamId || '';
      const nameA = (this.config.teamA.name || '').trim().toLowerCase();
      const nameB = (this.config.teamB.name || '').trim().toLowerCase();

      const allMatches = [];
      for (const r of this.bracket.rounds || []) {
        for (const m of r.matches || []) {
          allMatches.push(m);
        }
      }
      if (this.bracket.thirdPlaceMatch) {
        allMatches.push(this.bracket.thirdPlaceMatch);
      }

      // Prefer unfinished matches first, then any match with these two teams
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
      if (!this.bracket.isCreated || this.bracket.rounds.length === 0) {
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
        this.config.bestOf = 1;
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
    startNewMatch() {
      if (this.isSameTeamSelected) {
        alert('Tim A dan Tim B tidak boleh menggunakan tim yang sama! Silakan pilih tim lawan yang berbeda.');
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
        bracketMatchId: resolvedBracketMatchId
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

    undoLastAction() {
      if (this.undoStack.length === 0) return;
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

    addPoint(scoringTeam) {
      if (this.match.isFinished || this.modals.setEnd.open) return;

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

          this.advanceBracketMatchWinner(
            bMatch,
            winningTeamId,
            bScoreA,
            bScoreB,
            false
          );

          this.modals.matchEnd.bracketUpdatedLabel = `${bMatch.label}: ${this.getTeamName(winnerTeam)} menang & melaju di Bracket!`;
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
      this.pushUndoSnapshot();
      const right = this.match.positions[teamKey].rightBox;
      const left = this.match.positions[teamKey].leftBox;
      this.match.positions[teamKey].rightBox = left;
      this.match.positions[teamKey].leftBox = right;
      this.match.lastActionType = 'MANUAL_FIX';
      this.triggerSwapAnimation(teamKey);
      this.saveActiveMatch();
    },

    switchCourtSidesManual() {
      this.pushUndoSnapshot();
      this.match.teamAOnLeft = !this.match.teamAOnLeft;
      this.match.lastActionType = 'SWITCH_SIDES';
      this.saveActiveMatch();
    },

    toggleServingTeamManual() {
      this.pushUndoSnapshot();
      this.match.servingTeam = this.match.servingTeam === 'A' ? 'B' : 'A';
      this.saveActiveMatch();
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
      this.matchHistory = [];
      localStorage.removeItem(STORAGE_KEY_HISTORY);
      this.pushToServer({ matchHistory: [] });
    }
  };
}
