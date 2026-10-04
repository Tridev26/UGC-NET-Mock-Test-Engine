/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthGateway } from './components/AuthGateway';
import { supabase } from './utils/supabaseClient'; 
import { 
  loadQuestionBanks,
  saveQuestionBanks, 
  loadTestAttempts, 
  saveTestAttempt, 
  deleteTestAttempt, 
  clearAllTestAttempts, 
  loadActiveTestSession, 
  saveActiveTestSession, 
  clearActiveTestSession, 
  loadMarkingScheme, 
  saveMarkingScheme,
  resetToDefaultBanks,
  loadUserProfile,
  saveUserProfile
} from './utils/storage';
import { 
  QuestionBank, 
  TestAttempt, 
  ActiveTestSession, 
  MarkingSchemeConfig, 
  Question,
  UserProfile,
  TestPaperMode,
  PAPER_MODE_DETAILS,
  User
} from './types';
import { generatePaperModeQuestions, evaluateTest } from './utils/testEngine';

import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { StartTestSetup } from './components/StartTestSetup';
import { ExamInterface } from './components/ExamInterface';
import { ResultView } from './components/ResultView';
import { ProfileView, ProfileSubTab } from './components/ProfileView';

export default function App() {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // --- App State ---
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [profileSubTab, setProfileSubTab] = useState<ProfileSubTab>('overview');
  
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>(() => loadQuestionBanks()); 
  const [testAttempts, setTestAttempts] = useState<TestAttempt[]>(() => loadTestAttempts());
  const [activeSession, setActiveSession] = useState<ActiveTestSession | null>(() => loadActiveTestSession());
  const [markingScheme, setMarkingScheme] = useState<MarkingSchemeConfig>(() => loadMarkingScheme());
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadUserProfile());

  const [selectedAttemptForReview, setSelectedAttemptForReview] = useState<TestAttempt | null>(null);
  const [targetBankIdForSetup, setTargetBankIdForSetup] = useState<string | undefined>(undefined);
  const [targetPaperModeForSetup, setTargetPaperModeForSetup] = useState<TestPaperMode>('paper1');

  // --- Effects ---
  useEffect(() => {
    const fetchLiveDatabase = async () => {
      try {
        const { data, error } = await supabase
          .from('question_banks')
          .select('*, questions(*)') 
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          const defaultList = loadQuestionBanks();
          const merged = [...data];
          defaultList.forEach(db => {
            if (!merged.some(mb => mb.id === db.id || mb.name === db.name)) {
              merged.push(db);
            }
          });
          setQuestionBanks(merged);
        }
      } catch (err) {
        console.warn('Could not connect to Supabase, continuing with local banks:', err);
      }
    };

    fetchLiveDatabase();
  }, []);

  useEffect(() => {
    if (activeSession) {
      if (activeSession.remaining_seconds <= 0) {
        finalizeExam(activeSession);
      }
    }
  }, []);

  // --- Functions ---
  const handleStartTest = (
    paperMode: TestPaperMode = 'paper1',
    paper1BankId?: string,
    paper2BankId?: string
  ) => {
    const p1Bank = paper1BankId
      ? questionBanks.find(b => b.id === paper1BankId)
      : questionBanks.find(b => b.paper_type !== 'paper2' && !b.name.toLowerCase().includes('paper ii'));

    const p2Bank = paper2BankId
      ? questionBanks.find(b => b.id === paper2BankId)
      : questionBanks.find(b => b.paper_type === 'paper2' || b.name.toLowerCase().includes('paper ii') || b.questions.length >= 100);

    const modeDetails = PAPER_MODE_DETAILS[paperMode] || PAPER_MODE_DETAILS.paper1;
    const durationSeconds = modeDetails.durationMinutes * 60;

    try {
      const generatedQuestions = generatePaperModeQuestions(paperMode, p1Bank, p2Bank);

      let bankDisplayName = '';
      if (paperMode === 'paper1') {
        bankDisplayName = p1Bank?.name || 'UGC-NET Paper I Standard';
      } else if (paperMode === 'paper2') {
        bankDisplayName = p2Bank?.name || 'UGC-NET Paper II Subject';
      } else {
        bankDisplayName = `${p1Bank?.name || 'Paper I'} + ${p2Bank?.name || 'Paper II'}`;
      }

      const newSession: ActiveTestSession = {
        id: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        paper_mode: paperMode,
        question_bank_id: p1Bank?.id || p2Bank?.id || 'bank-default',
        question_bank_name: bankDisplayName,
        paper2_bank_id: p2Bank?.id,
        paper2_bank_name: p2Bank?.name,
        started_at: Date.now(),
        duration_seconds: durationSeconds,
        remaining_seconds: durationSeconds,
        current_index: 0,
        attempt_questions: generatedQuestions,
        marks_per_correct: markingScheme.marks_per_correct,
        negative_marks_per_incorrect: markingScheme.negative_marks_per_incorrect,
        last_tick_timestamp: Date.now(),
        active_section_tab: 0,
      };

      saveActiveTestSession(newSession);
      setActiveSession(newSession);
      setCurrentTab('exam');
    } catch (err: any) {
      alert(`Failed to start test: ${err.message}`);
    }
  };

  const handleUpdateSession = (updated: ActiveTestSession) => {
    setActiveSession(updated);
    saveActiveTestSession(updated);
  };

  const finalizeExam = (sessionToFinalize: ActiveTestSession) => {
    const totalTimeUsed = Math.max(1, sessionToFinalize.duration_seconds - sessionToFinalize.remaining_seconds);
    const completedAttempt = evaluateTest(
      sessionToFinalize.attempt_questions,
      sessionToFinalize.question_bank_id,
      sessionToFinalize.question_bank_name,
      new Date(sessionToFinalize.started_at).toISOString(),
      totalTimeUsed,
      {
        marks_per_correct: sessionToFinalize.marks_per_correct,
        negative_marks_per_incorrect: sessionToFinalize.negative_marks_per_incorrect,
        test_duration_minutes: Math.round(sessionToFinalize.duration_seconds / 60),
        questions_per_test: sessionToFinalize.attempt_questions.length,
      },
      sessionToFinalize.paper_mode || 'paper1',
      sessionToFinalize.paper2_bank_id,
      sessionToFinalize.paper2_bank_name
    );

    saveTestAttempt(completedAttempt);
    setTestAttempts(prev => [completedAttempt, ...prev.filter(a => a.id !== completedAttempt.id)]);
    clearActiveTestSession();
    setActiveSession(null);
    setSelectedAttemptForReview(completedAttempt);
    setCurrentTab('result');
  };

  const handleDiscardActiveTest = () => {
    if (confirm('Are you sure you want to discard your current mock test in progress? Unsaved answers will be lost.')) {
      clearActiveTestSession();
      setActiveSession(null);
      if (currentTab === 'exam') {
        setCurrentTab('dashboard');
      }
    }
  };

  const handleAddQuestionBank = (newBank: QuestionBank) => {
    const updated = [newBank, ...questionBanks];
    setQuestionBanks(updated);
    saveQuestionBanks(updated);
  };

  const handleDeleteQuestionBank = (bankId: string) => {
    if (confirm('Delete this question bank? This will not affect completed test attempts.')) {
      const updated = questionBanks.filter(b => b.id !== bankId);
      setQuestionBanks(updated);
      saveQuestionBanks(updated);
    }
  };

  const handleAddQuestionToBank = (bankId: string, question: Question) => {
    const updated = questionBanks.map(b => {
      if (b.id === bankId) {
        const questions = [...b.questions, question];
        return {
          ...b,
          question_count: questions.length,
          questions,
        };
      }
      return b;
    });
    setQuestionBanks(updated);
    saveQuestionBanks(updated);
  };

  const handleRestoreDefaultBank = () => {
    const defaultList = resetToDefaultBanks();
    setQuestionBanks(defaultList);
    alert('Default UGC-NET Paper I & Paper II standard question banks successfully reloaded!');
  };

  const handleUpdateMarkingScheme = (newConfig: MarkingSchemeConfig) => {
    setMarkingScheme(newConfig);
    saveMarkingScheme(newConfig);
  };

  const handleViewAttemptResults = (attempt: TestAttempt) => {
    setSelectedAttemptForReview(attempt);
    setCurrentTab('result');
  };

  const handleDeleteAttempt = (attemptId: string) => {
    if (confirm('Delete this historical test attempt?')) {
      deleteTestAttempt(attemptId);
      setTestAttempts(prev => prev.filter(a => a.id !== attemptId));
    }
  };

  const handleClearAllAttempts = () => {
    clearAllTestAttempts();
    setTestAttempts([]);
  };

  const handleUpdateProfile = (updated: UserProfile) => {
    setUserProfile(updated);
    saveUserProfile(updated);
  };

  const handleSelectTab = (tab: string, subTab?: string) => {
    if (tab === 'start-test') {
      setTargetBankIdForSetup(undefined);
      setTargetPaperModeForSetup('paper1');
      setCurrentTab('start-test');
    } else if (['question-banks', 'history', 'analytics', 'admin'].includes(tab)) {
      setProfileSubTab(tab as ProfileSubTab);
      setCurrentTab('profile');
    } else if (tab === 'profile') {
      if (subTab) {
        setProfileSubTab(subTab as ProfileSubTab);
      }
      setCurrentTab('profile');
    } else {
      setCurrentTab(tab);
    }
  };

  const isProfileTabActive = currentTab === 'profile' || ['question-banks', 'history', 'analytics', 'admin'].includes(currentTab);

  // --- Authentication Interceptor ---
  const handleAuthentication = (user: User, migrationNotice?: string) => {
    setCurrentUser(user);
    if (migrationNotice) {
      setAuthNotice(migrationNotice);
      setTimeout(() => setAuthNotice(null), 6000); 
    }
  };

  if (!currentUser) {
    return <AuthGateway onAuthenticated={handleAuthentication} />;
  }

  // --- Main App Render ---
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col selection:bg-blue-200">
      
      {authNotice && (
        <div className="bg-emerald-500 text-white px-4 py-2 text-center text-sm font-medium shadow-sm animate-fade-in">
          {authNotice}
        </div>
      )}

      {currentTab !== 'exam' && (
        <Header
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          activeSession={activeSession}
          onResumeActiveTest={() => setCurrentTab('exam')}
          onDiscardActiveTest={handleDiscardActiveTest}
          candidateName={userProfile.name}
          activeProfileSubTab={profileSubTab}
        />
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentTab === 'dashboard' && (
          <Dashboard
            questionBanks={questionBanks}
            testAttempts={testAttempts}
            onStartTest={(bankId, mode) => {
              setTargetBankIdForSetup(bankId);
              setTargetPaperModeForSetup(mode || 'paper1');
              setCurrentTab('start-test');
            }}
            onNavigateTab={handleSelectTab}
            onViewAttemptResults={handleViewAttemptResults}
            onDeleteBank={handleDeleteQuestionBank}
          />
        )}

        {currentTab === 'start-test' && (
          <StartTestSetup
            questionBanks={questionBanks}
            initialBankId={targetBankIdForSetup}
            initialPaperMode={targetPaperModeForSetup}
            markingScheme={markingScheme}
            onBeginTest={handleStartTest}
            onCancel={() => setCurrentTab('dashboard')}
            onUploadRedirect={() => handleSelectTab('question-banks')}
          />
        )}

        {currentTab === 'exam' && activeSession && (
          <ExamInterface
            session={activeSession}
            onUpdateSession={handleUpdateSession}
            onSubmitTest={finalizeExam}
          />
        )}

        {currentTab === 'result' && selectedAttemptForReview && (
          <ResultView
            attempt={selectedAttemptForReview}
            allAttempts={testAttempts}
            onRetakeTest={(bankId) => {
              setTargetBankIdForSetup(bankId);
              setTargetPaperModeForSetup(selectedAttemptForReview.paper_mode || 'paper1');
              setCurrentTab('start-test');
            }}
            onBackToDashboard={() => setCurrentTab('dashboard')}
          />
        )}

        {isProfileTabActive && (
          <ProfileView
            profile={userProfile}
            onUpdateProfile={handleUpdateProfile}
            attempts={testAttempts}
            questionBanks={questionBanks}
            markingScheme={markingScheme}
            activeSubTab={profileSubTab}
            onChangeSubTab={(newSubTab) => setProfileSubTab(newSubTab)}
            onStartTest={(bankId) => {
              setTargetBankIdForSetup(bankId);
              setTargetPaperModeForSetup('paper1');
              setCurrentTab('start-test');
            }}
            onAddQuestionBank={handleAddQuestionBank}
            onDeleteQuestionBank={handleDeleteQuestionBank}
            onViewAttempt={handleViewAttemptResults}
            onDeleteAttempt={handleDeleteAttempt}
            onClearAllAttempts={handleClearAllAttempts}
            onUpdateMarkingScheme={handleUpdateMarkingScheme}
            onAddQuestionToBank={handleAddQuestionToBank}
            onRestoreDefaultBank={handleRestoreDefaultBank}
            selectedAttemptForReview={selectedAttemptForReview}
          />
        )}
      </main>
    </div>
  );
}