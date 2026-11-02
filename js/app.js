/**
 * Badminton Mixed Doubles Score & Position Guide Engine
 * Supports:
 * - BWF Official Rules + Custom Target Point & Deuce Cap (+3 default)
 * - Dedicated Master Teams & Squad Roster Database ('teams' screen)
 * - Quick Team & Player Selection in Setup & Between Sets
 */

const STORAGE_KEY_ACTIVE = 'skor_badminton_active_v2';
const STORAGE_KEY_HISTORY = 'skor_badminton_history_v2';
const STORAGE_KEY_TEAMS = 'skor_badminton_master_teams_v1';

const DEFAULT_MASTER_TEAMS = [
  {
    id: 'team-1',
    name: 'Tim Garuda',
    members: [
      { id: 'm-1', name: 'Alvian', gender: 'male' },
      { id: 'm-2', name: 'Ilmi', gender: 'female' },
      { id: 'm-3', name: 'Budi', gender: 'male' },
      { id: 'm-4', name: 'Siti', gender: 'female' },
      { id: 'm-5', name: 'Rizky', gender: 'male' }
    ]
  },
  {
    id: 'team-2',
    name: 'Tim Rajawali',
    members: [
      { id: 'm-6', name: 'Pak Turi', gender: 'male' },
      { id: 'm-7', name: 'Iwud', gender: 'female' },
      { id: 'm-8', name: 'Andi', gender: 'male' },
      { id: 'm-9', name: 'Rina', gender: 'female' },
      { id: 'm-10', name: 'Dimas', gender: 'male' }
    ]
  },
  {
    id: 'team-3',
    name: 'PB Cendrawasih',
    members: [
      { id: 'm-11', name: 'Kevin', gender: 'male' },
      { id: 'm-12', name: 'Liliyana', gender: 'female' },
      { id: 'm-13', name: 'Fajar', gender: 'male' },
      { id: 'm-14', name: 'Apriyani', gender: 'female' }
    ]
  }
];

function badmintonApp() {
  return {
    // Navigation view: 'setup' | 'teams' | 'match' | 'rules' | 'history'
    screen: 'setup',

    // Sound / Umpire TTS
    voiceEnabled: true,

    // Master Teams Database (Managed on the 'teams' screen)
    masterTeams: [],
    newTeamNameInput: '',
    newMemberInputs: {}, // { [teamId]: { name: '', gender: 'male' } }

    // Setup Form Configuration
    config: {
      preset: 'community15', // 'bwf21' | 'community15' | 'quick11' | 'custom'
      targetPoints: 15,
      deuceEnabled: true,
      deuceAllowance: 3, // Max cap = targetPoints + deuceAllowance (e.g., 15 + 3 = 18)
      maxCap: 18,
      bestOf: 3, // 1 or 3 sets
      firstServerTeam: 'A', // 'A' or 'B'
      teamAOnLeft: true, // Physical court side at start of Set 1
      teamA: {
        teamId: 'team-1',
        name: 'Tim Garuda',
        male: 'Alvian',
        female: 'Ilmi',
        initialRight: 'male' // Who stands in the RIGHT box (Even score 0) at start of set
      },
      teamB: {
        teamId: 'team-2',
        name: 'Tim Rajawali',
        male: 'Pak Turi',
        female: 'Iwud',
        initialRight: 'male' // Who stands in the RIGHT box (Even score 0) at start of set
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
      servingTeam: 'A', // 'A' or 'B'
      teamAOnLeft: true,

      // Current court positions for each team:
      // rightBox = Even Box (Kotak Kanan dari perspektif tim menghadap net)
      // leftBox  = Odd Box  (Kotak Kiri dari perspektif tim menghadap net)
      positions: {
        A: { rightBox: 'male', leftBox: 'female' },
        B: { rightBox: 'male', leftBox: 'female' }
      },

      lastSwappedTeam: null,
      lastActionType: 'START',
      pointLogs: [],
      intervalReachedInCurrentSet: false,
      rubberSwitchReached: false
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
        open: false
      }
    },

    // Saved Match History
    matchHistory: [],

    // Lifecycle Init
    init() {
      this.loadMasterTeams();
      this.loadHistory();
      this.loadActiveMatch();
      this.ensureDistinctTeams();
      this.syncMaxCap();
    },

    // Ensure Team A and Team B are never the same team
    ensureDistinctTeams() {
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
      this.masterTeams = JSON.parse(JSON.stringify(DEFAULT_MASTER_TEAMS));
      this.saveMasterTeams();
      this.initMemberInputs();
    },

    saveMasterTeams() {
      try {
        localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(this.masterTeams));
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

    deleteMasterTeam(teamId) {
      this.masterTeams = this.masterTeams.filter((t) => t.id !== teamId);
      this.saveMasterTeams();
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

    // Get members of a selected team for Setup / Set Rotation
    getTeamMembersList(sideKey) {
      const sideCfg = sideKey === 'A' ? this.config.teamA : this.config.teamB;
      const found = this.masterTeams.find(
        (t) => t.id === sideCfg.teamId || t.name.toLowerCase() === (sideCfg.name || '').toLowerCase()
      );
      return found ? found.members : [];
    },

    getTeamMaleMembers(sideKey) {
      return this.getTeamMembersList(sideKey).filter((m) => m.gender === 'male');
    },

    getTeamFemaleMembers(sideKey) {
      return this.getTeamMembersList(sideKey).filter((m) => m.gender === 'female');
    },

    // When user picks a team from dropdown in Setup
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

      // Prevent Team A and Team B from having the same teamId
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

    // Quick-pick member in Setup
    selectMemberForSetup(sideKey, member) {
      const sideCfg = sideKey === 'A' ? this.config.teamA : this.config.teamB;
      if (member.gender === 'male') {
        sideCfg.male = member.name;
      } else {
        sideCfg.female = member.name;
      }
    },

    // Quick-pick member in Set-End Modal
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
    // SETUP & PRESET LOGIC
    // ==========================================
    applyPreset(presetName) {
      this.config.preset = presetName;
      if (presetName === 'bwf21') {
        this.config.targetPoints = 21;
        this.config.deuceEnabled = true;
        this.config.deuceAllowance = 9; // 21 + 9 = 30
        this.config.maxCap = 30;
        this.config.bestOf = 3;
      } else if (presetName === 'community15') {
        this.config.targetPoints = 15;
        this.config.deuceEnabled = true;
        this.config.deuceAllowance = 3; // 15 + 3 = 18
        this.config.maxCap = 18;
        this.config.bestOf = 3;
      } else if (presetName === 'quick11') {
        this.config.targetPoints = 11;
        this.config.deuceEnabled = true;
        this.config.deuceAllowance = 3; // 11 + 3 = 14
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
        boxType = 'leftBox'; // Kotak Kiri (Ganjil)
      } else if (quadrant === 'bottom-left') {
        teamKey = leftTeam;
        boxType = 'rightBox'; // Kotak Kanan (Genap)
      } else if (quadrant === 'top-right') {
        teamKey = rightTeam;
        boxType = 'rightBox'; // Kotak Kanan (Genap)
      } else if (quadrant === 'bottom-right') {
        teamKey = rightTeam;
        boxType = 'leftBox'; // Kotak Kiri (Ganjil)
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
        rubberSwitchReached: false
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
          config: this.config
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
      this.modals.interval.open = false;
      this.modals.setEnd.open = false;
      this.modals.matchEnd.open = false;
      this.clearIntervalTimer();
      this.saveActiveMatch();
    },

    // CORE RALLY POINT HANDLER
    addPoint(scoringTeam) {
      if (this.match.isFinished || this.modals.setEnd.open) return;

      this.pushUndoSnapshot();

      const previousServingTeam = this.match.servingTeam;
      const scoringTeamName = this.getTeamName(scoringTeam);

      // 1. Add 1 point to rally winner
      this.match.scores[scoringTeam] += 1;

      // 2. Check BWF Position Rotation Rule:
      // - Did the SERVING team win the point? -> Continuous Service! Swap their Right & Left boxes.
      // - Did the RECEIVING team win the point? -> Service Over! NO ONE swaps boxes.
      if (scoringTeam === previousServingTeam) {
        const currentRight = this.match.positions[scoringTeam].rightBox;
        const currentLeft = this.match.positions[scoringTeam].leftBox;
        this.match.positions[scoringTeam].rightBox = currentLeft;
        this.match.positions[scoringTeam].leftBox = currentRight;

        this.match.lastActionType = 'HOLD_SERVE';
        this.triggerSwapAnimation(scoringTeam);
      } else {
        // SERVICE OVER (Pindah Servis) - NO POSITION SWAP!
        this.match.servingTeam = scoringTeam;
        this.match.lastActionType = 'SERVICE_OVER';
        this.match.lastSwappedTeam = null;
      }

      // 3. Record rally log
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

      // 4. Check Set Win Condition
      if (this.checkIfSetWon(scoringTeam)) {
        this.handleSetWon(scoringTeam);
        this.saveActiveMatch();
        return;
      }

      // 5. Check Mid-Game Interval & Rubber Set Court Switch
      this.checkIntervalAndRubberSwitch();

      // 6. Announce score via Umpire TTS
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
        this.modals.matchEnd.open = true;
        this.recordMatchToHistory();
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
        // Ignore TTS errors on unsupported devices
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
      this.match.isActive = false;
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
      this.screen = 'setup';
    },

    recordMatchToHistory() {
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
    }
  };
}
