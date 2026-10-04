import { QuestionBank, TestAttempt, ActiveTestSession, MarkingSchemeConfig, UserProfile, AuthUser } from '../types';
import { DEFAULT_QUESTION_BANK } from '../data/sampleQuestionBank';
import { DEFAULT_PAPER2_QUESTION_BANK } from '../data/samplePaper2QuestionBank';

const STORAGE_KEYS = {
  BANKS: 'ugc_net_question_banks_v1',
  ATTEMPTS: 'ugc_net_test_attempts_v1',
  ACTIVE_SESSION: 'ugc_net_active_session_v1',
  MARKING_SCHEME: 'ugc_net_marking_scheme_v1',
  USER_PROFILE: 'ugc_net_user_profile_v1',
  AUTH_USER: 'ugc_net_auth_user_v1',
};

export const DEFAULT_AUTH_USER: AuthUser = {
  id: 'usr-google-88231',
  name: 'Guest Candidate',
  email: 'guest@gmail.com',
  isLoggedIn: true,
  loginTimestamp: 1774540800000,
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Guest Candidate',
  email: 'guest@gmail.com',
  rollNumber: 'NET-2026-08429',
  targetExam: 'UGC-NET Paper I & II (Assistant Professor / JRF)',
  category: 'General',
  targetScore: 220,
  preparationStartDate: '2026-01-01',
};

export const DEFAULT_MARKING_SCHEME: MarkingSchemeConfig = {
  marks_per_correct: 2,
  negative_marks_per_incorrect: 0,
  test_duration_minutes: 60,
  questions_per_test: 50,
};

// Question Banks
export function loadQuestionBanks(): QuestionBank[] {
  try {
    const defaultBanks = [DEFAULT_QUESTION_BANK, DEFAULT_PAPER2_QUESTION_BANK];
    const raw = localStorage.getItem(STORAGE_KEYS.BANKS);
    if (!raw) {
      saveQuestionBanks(defaultBanks);
      return defaultBanks;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveQuestionBanks(defaultBanks);
      return defaultBanks;
    }

    // Ensure DEFAULT_PAPER2_QUESTION_BANK is present if not already added
    let hasUpdated = false;
    if (!parsed.some((b: QuestionBank) => b.id === DEFAULT_PAPER2_QUESTION_BANK.id || b.name.includes('Paper II'))) {
      parsed.push(DEFAULT_PAPER2_QUESTION_BANK);
      hasUpdated = true;
    }
    if (hasUpdated) {
      saveQuestionBanks(parsed);
    }
    return parsed;
  } catch (e) {
    console.error('Failed to load question banks from localStorage', e);
    return [DEFAULT_QUESTION_BANK, DEFAULT_PAPER2_QUESTION_BANK];
  }
}

export function saveQuestionBanks(banks: QuestionBank[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BANKS, JSON.stringify(banks));
  } catch (e) {
    console.error('Failed to save question banks', e);
  }
}

export function resetToDefaultBanks(): QuestionBank[] {
  const defaultList = [DEFAULT_QUESTION_BANK, DEFAULT_PAPER2_QUESTION_BANK];
  saveQuestionBanks(defaultList);
  return defaultList;
}

// Test Attempts History
export function loadTestAttempts(): TestAttempt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load test attempts', e);
    return [];
  }
}

export function saveTestAttempt(attempt: TestAttempt): void {
  try {
    const current = loadTestAttempts();
    const updated = [attempt, ...current.filter(a => a.id !== attempt.id)];
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save test attempt', e);
  }
}

export function deleteTestAttempt(id: string): void {
  try {
    const current = loadTestAttempts();
    const updated = current.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete test attempt', e);
  }
}

export function clearAllTestAttempts(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ATTEMPTS);
  } catch (e) {
    console.error('Failed to clear test attempts', e);
  }
}

// Active Test Session (Test Safety / Crash Recovery)
export function loadActiveTestSession(): ActiveTestSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
    if (!raw) return null;
    const session: ActiveTestSession = JSON.parse(raw);
    // Adjust remaining seconds based on real wall-clock elapsed time
    const now = Date.now();
    const elapsedSinceLastTick = Math.max(0, Math.floor((now - (session.last_tick_timestamp || now)) / 1000));
    const adjustedRemaining = Math.max(0, session.remaining_seconds - elapsedSinceLastTick);
    return {
      ...session,
      remaining_seconds: adjustedRemaining,
      last_tick_timestamp: now,
    };
  } catch (e) {
    console.error('Failed to load active test session', e);
    return null;
  }
}

export function saveActiveTestSession(session: ActiveTestSession): void {
  try {
    const sessionWithTimestamp: ActiveTestSession = {
      ...session,
      last_tick_timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(sessionWithTimestamp));
  } catch (e) {
    console.error('Failed to save active test session', e);
  }
}

export function clearActiveTestSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  } catch (e) {
    console.error('Failed to clear active test session', e);
  }
}

// Marking Scheme Configuration
export function loadMarkingScheme(): MarkingSchemeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MARKING_SCHEME);
    if (!raw) return DEFAULT_MARKING_SCHEME;
    return { ...DEFAULT_MARKING_SCHEME, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_MARKING_SCHEME;
  }
}

export function saveMarkingScheme(config: MarkingSchemeConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MARKING_SCHEME, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save marking scheme', e);
  }
}

// User Profile
export function loadUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (!raw) return DEFAULT_USER_PROFILE;
    return { ...DEFAULT_USER_PROFILE, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_USER_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save user profile', e);
  }
}

// Authentication with Google
export function loadAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    if (!raw) return DEFAULT_AUTH_USER;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (e) {
    return DEFAULT_AUTH_USER;
  }
}
// --- Authentication & User Storage Functions ---

const USERS_KEY = 'mock_test_users';
const CURRENT_USER_KEY = 'mock_test_current_user';

export const loadAllUsers = (): any[] => {
  try {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveUser = (user: any): void => {
  const users = loadAllUsers();
  const existingIndex = users.findIndex(u => u.id === user.id);
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const findUserByUsername = (username: string): any | undefined => {
  const users = loadAllUsers();
  return users.find(u => u.username.toLowerCase() === username.toLowerCase());
};

export const setCurrentUser = (user: any | null): void => {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};

export const migrateGuestDataToUser = (userId: string, username: string) => {
  try {
    const banksData = localStorage.getItem('mock_test_question_banks');
    const attemptsData = localStorage.getItem('mock_test_attempts');
    
    const banks = banksData ? JSON.parse(banksData) : [];
    const attempts = attemptsData ? JSON.parse(attemptsData) : [];
    
    // Tag existing guest data with the new user's ID
    let banksUpdated = 0;
    let attemptsUpdated = 0;

    const updatedBanks = banks.map((bank: any) => {
      if (!bank.user_id) {
        banksUpdated++;
        return { ...bank, user_id: userId };
      }
      return bank;
    });

    const updatedAttempts = attempts.map((attempt: any) => {
      if (!attempt.user_id) {
        attemptsUpdated++;
        return { ...attempt, user_id: userId };
      }
      return attempt;
    });

    if (banksUpdated > 0) localStorage.setItem('mock_test_question_banks', JSON.stringify(updatedBanks));
    if (attemptsUpdated > 0) localStorage.setItem('mock_test_attempts', JSON.stringify(updatedAttempts));

    return {
      banksMigrated: banksUpdated,
      attemptsMigrated: attemptsUpdated
    };
  } catch {
    return { banksMigrated: 0, attemptsMigrated: 0 };
  }
};
export function saveAuthUser(user: AuthUser | null): void {
  try {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    } else {
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    }
  } catch (e) {
    console.error('Failed to save auth user', e);
  }
}
