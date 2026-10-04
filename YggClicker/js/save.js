(function (root) {
  'use strict';
  const commonJS = typeof module !== 'undefined' && module.exports;
  const D = commonJS ? require('./data.js') : root.YggData;
  const E = commonJS ? require('./engine.js') : root.YggEngine;
  // Neither repository name nor pathname participates in the save key.
  const KEY = 'yggclicker.save', BACKUP_KEY = 'yggclicker.backup', VERSION = 11;
  const retiredSessionHP = { practice:10, patrol:40, heavy:150 };
  const RETIRED = ['hollow', 'jamie'];
  const MAX_BYTES = 1024 * 1024;
  const migrations = {
    1(document) {
      const oldState = record(document.state, '旧セーブ');
      const oldMaxHP = { practice: 80, patrol: 400, heavy: 2000 };
      const session = typeof oldState.sessionId==='string' && Object.hasOwn(retiredSessionHP,oldState.sessionId)?{id:oldState.sessionId,hp:retiredSessionHP[oldState.sessionId]}:null;
      if (!session) throw new Error('このバージョンでは読み込めないセッションです。');
      const previousHP = number(oldState.hp, '旧セーブの残りHP', Number.MIN_VALUE, oldMaxHP[session.id]);
      // Preserve owned characters, upgrades and currency; only convert the
      // active target's remaining HP proportion to the smaller HP scale.
      return { ...document, schemaVersion: 2, state: { ...oldState, hp: Math.max(1, Math.ceil(previousHP / oldMaxHP[session.id] * session.hp)) } };
    },
    2(document) {
      const oldState = record(document.state, '旧セーブ');
      const levels = { ...record(oldState.levels, '旧セーブのキャラクター') };
      const timers = { ...record(oldState.timers, '旧セーブの攻撃間隔') };
      for (const [values, label] of [[levels, 'レベル'], [timers, '攻撃間隔']]) {
        if (Object.hasOwn(values, 'hikari')) {
          if (Object.hasOwn(values, 'meta')) throw new Error(`旧キャラクターと鋼音メタの${label}が重複しています。`);
          values.meta = values.hikari;
          delete values.hikari;
        }
      }
      return { ...document, schemaVersion: 3, state: { ...oldState, levels, timers } };
    },
    3(document) {
      const oldState = record(document.state, '旧セーブ');
      return { ...document, schemaVersion: 4, state: { ...oldState,
        speedLevels: Object.fromEntries(D.characters.map(c => [c.id, 0])) } };
    },
    4(document) {
      const oldState = record(document.state, '旧セーブ');
      const speedLevels = record(oldState.speedLevels, '旧速度レベル');
      const timers = record(oldState.timers, '旧攻撃待ち時間');
      const levels = record(oldState.levels, '旧威力レベル');
      const oldIntervals = { meta: 1.8, hollow: 2.4, jamie: 3.5 };
      for (const values of [speedLevels, timers]) {
        if (Object.keys(values).some(id => !D.characters.some(c => c.id === id) && !RETIRED.includes(id))) throw new Error('未対応のキャラクターが含まれています。');
      }
      const actionLevels = {}, actionPoints = {};
      for (const c of D.characters) {
        actionLevels[c.id] = number(speedLevels[c.id] ?? 0, '旧速度レベル', 0, Number.MAX_SAFE_INTEGER, true);
        const interval = (oldIntervals[c.id] ?? D.balance.actionThreshold / c.action) / (1 + actionLevels[c.id] * .1);
        const timer = Math.min(interval, number(timers[c.id] ?? interval, '旧攻撃待ち時間', 0, interval * (1 + 1e-12)));
        actionPoints[c.id] = levels[c.id] ? (1 - timer / interval) * D.balance.actionThreshold : 0;
      }
      const { speedLevels: removedSpeed, timers: removedTimers, ...retained } = oldState;
      return { ...document, schemaVersion: 5, state: { ...retained, actionLevels, actionPoints, actionClock: 0 } };
    },
    5(document) {
      const oldState = record(document.state, '旧セーブ');
      return { ...document, schemaVersion: 6, state: { ...oldState, selectedCharacterId: null } };
    },
    6(document) {
      const oldState = record(document.state, '旧セーブ'), state = { ...oldState };
      for (const field of ['levels', 'actionLevels', 'actionPoints']) {
        state[field] = { ...record(oldState[field], field) };
        for (const id of RETIRED) delete state[field][id];
      }
      if (RETIRED.includes(state.selectedCharacterId)) state.selectedCharacterId = null;
      state.purchasedPerks = Object.fromEntries(D.characters.map(c => [c.id, []]));
      return { ...document, schemaVersion:7, state };
    },
    7(document) {
      // Progress is unchanged. The version gate keeps older clients from
      // treating newly purchased Meta perks as corrupt and restoring a backup.
      return { ...document, schemaVersion:8 };
    },
    8(document) {
      return { ...document, schemaVersion:9, state:{...document.state, upgrades:{...document.state.upgrades, overkill:0}} };
    },
    9(document) {
      const state=record(document.state,'旧セーブ');
      if(typeof state.sessionId==='string' && Object.hasOwn(retiredSessionHP,state.sessionId)) {
        number(state.hp,'旧セーブの残りHP',Number.MIN_VALUE,retiredSessionHP[state.sessionId]);
        const target=D.sessions.find(s=>s.id==='mohicans');
        return {...document,schemaVersion:10,state:{...state,sessionId:target.id,hp:target.hp}};
      }
      return {...document,schemaVersion:10};
    },
    10(document) {
      // New IDs default to unowned during validation. The version gate also
      // prevents old clients from treating the third character as corrupt.
      return {...document,schemaVersion:11};
    }
  };
  function record(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}の形式が正しくありません。`);
    return value;
  }
  function number(value, label, min = 0, max = 1e100, integer = false) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isSafeInteger(value))) {
      throw new Error(`${label}の値が正しくありません。`);
    }
    return value;
  }
  function validateState(input) {
    const raw = record(input, 'セーブ');
    const result = E.createState();
    for (const key of ['factors', 'earned', 'totalDamage']) result[key] = number(raw[key], key);
    for (const key of ['kills', 'clicks']) {
      result[key] = number(raw[key], key);
      if (!Number.isInteger(result[key])) throw new Error(`${key}の値が正しくありません。`);
    }
    result.savedAt = number(raw.savedAt, '保存日時', 0, 8640000000000000, true);
    const session = D.sessions.find(s => s.id === raw.sessionId);
    if (!session) throw new Error('このバージョンでは読み込めないセッションです。');
    result.sessionId = session.id;
    result.hp = number(raw.hp, '残りHP', Number.MIN_VALUE, session.hp);
    if (typeof raw.paused !== 'boolean') throw new Error('一時停止状態が正しくありません。');
    result.paused = raw.paused;
    result.boostSeconds = number(raw.boostSeconds, 'ブースト時間', 0, 30);
    result.actionClock = number(raw.actionClock, '行動点の加算周期', 0, 1);
    if (result.actionClock >= 1) throw new Error('行動点の加算周期が正しくありません。');
    for (const field of ['levels', 'actionLevels', 'actionPoints', 'upgrades', 'purchasedPerks']) record(raw[field], field);
    for (const field of ['levels', 'actionLevels', 'actionPoints', 'purchasedPerks']) {
      if (Object.keys(raw[field]).some(id => !D.characters.some(c => c.id === id))) throw new Error('未対応のキャラクターが含まれています。ゲームを更新してください。');
    }
    if (Object.keys(raw.upgrades).some(id => !D.upgrades.some(u => u.id === id))) throw new Error('未対応の強化が含まれています。');
    for (const c of D.characters) {
      // Missing new character IDs default to unowned, allowing content additions.
      result.levels[c.id] = number(raw.levels[c.id] ?? 0, c.name, 0, E.MAX_LEVEL, true);
      result.actionLevels[c.id] = number(raw.actionLevels[c.id] ?? 0, '行動力の強化レベル', 0, Number.MAX_SAFE_INTEGER, true);
      result.actionPoints[c.id] = number(raw.actionPoints[c.id] ?? 0, '行動点', 0, D.balance.actionThreshold);
      if (!result.levels[c.id] && (result.actionLevels[c.id] || result.actionPoints[c.id])) throw new Error('未雇用キャラクターの行動力・行動点が正しくありません。');
      const purchased = raw.purchasedPerks[c.id] ?? [];
      if (!Array.isArray(purchased) || new Set(purchased).size !== purchased.length || purchased.some(id => {
        const perk = (c.perks || []).find(p => p.id === id);
        return !perk || result.levels[c.id] < perk.level;
      })) throw new Error('購入済みパークの値が正しくありません。');
      result.purchasedPerks[c.id] = [...purchased];
    }
    if (raw.selectedCharacterId !== null && !D.characters.some(c => c.id === raw.selectedCharacterId && result.levels[c.id] > 0)) throw new Error('手動攻撃の担当キャラクターが正しくありません。');
    result.selectedCharacterId = raw.selectedCharacterId;
    for (const u of D.upgrades) result.upgrades[u.id] = number(raw.upgrades[u.id] ?? 0, u.name, 0, u.max ?? Number.MAX_SAFE_INTEGER, true);
    return result;
  }
  function encode(state, now = Date.now()) {
    return JSON.stringify({ gameId: D.gameId, schemaVersion: VERSION, gameVersion: D.version, exportedAt: new Date(now).toISOString(), state: validateState(state) }, null, 2);
  }
  function decode(text) {
    if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_BYTES) throw new Error('セーブファイルは1MB以下にしてください。');
    let document;
    try { document = JSON.parse(text); } catch { throw new Error('JSON形式のセーブファイルを選んでください。'); }
    record(document, 'ファイル');
    if (document.gameId !== D.gameId) throw new Error('YggClickerのセーブデータではありません。');
    number(document.schemaVersion, '形式バージョン', 1, Number.MAX_SAFE_INTEGER, true);
    if (document.schemaVersion > VERSION) {
      const error = new Error('新しい形式のセーブです。ゲームを更新してから読み込んでください。');
      error.code = 'NEWER_VERSION';
      throw error;
    }
    while (document.schemaVersion < VERSION) {
      const migration = migrations[document.schemaVersion];
      if (!migration) throw new Error('この旧形式にはまだ対応していません。');
      const oldVersion = document.schemaVersion;
      document = migration(document);
      if (document.schemaVersion <= oldVersion) throw new Error('セーブ形式の更新に失敗しました。');
    }
    return validateState(document.state);
  }
  function load(storage) {
    try {
      const primary = storage.getItem(KEY);
      if (primary !== null) {
        try { return { state: decode(primary), warning: '' }; }
        catch (error) {
          if (error.code === 'NEWER_VERSION') return { state: null, blocked: true, warning: error.message };
          const backup = storage.getItem(BACKUP_KEY);
          if (backup !== null) {
            try { return { state: decode(backup), warning: '最新のセーブを読めなかったため、前回のバックアップを復元しました。' }; } catch { /* Keep the original data untouched. */ }
          }
          return { state: null, blocked: true, warning: `${error.message} 元のデータは保持しています。セーブ管理から有効なファイルを読み込んでください。` };
        }
      }
      return { state: null, warning: '' };
    } catch { return { state: null, unavailable: true, warning: 'ブラウザへの保存を利用できません。セーブの書き出しで進行を保存してください。' }; }
  }
  function persist(storage, state, { keepBackup = false } = {}) {
    try {
      const text = encode(state);
      const previous = storage.getItem(KEY);
      if (previous && !keepBackup) {
        try { decode(previous); storage.setItem(BACKUP_KEY, previous); } catch (error) {
          // Invalid current data must never replace a healthy backup.
          if (error.name === 'QuotaExceededError') throw error;
        }
      }
      storage.setItem(KEY, text);
      return { ok: true };
    } catch (error) { return { ok: false, error: `自動保存できませんでした。セーブを書き出してください。${error.name === 'QuotaExceededError' ? ' 保存容量が不足しています。' : ''}` }; }
  }
  const api = { KEY, BACKUP_KEY, VERSION, MAX_BYTES, encode, decode, validateState, load, persist };
  if (commonJS) module.exports = api;
  else root.YggSave = api;
})(typeof window !== 'undefined' ? window : globalThis);
