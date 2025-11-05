
import React from 'react';
import { AppTab } from './types';
import Header from './components/Header';
import SceneCreator from './components/SceneCreator';
import ImageStudio from './components/ImageStudio';
import ContentAnalysis from './components/ContentAnalysis';
import AudioSuite from './components/AudioSuite';
import Chatbot from './components/Chatbot';
import History from './components/History';
import { AppProvider, useAppContext } from './context/AppContext';
import ScriptWriter from './components/ScriptWriter';
import VideoEditor from './components/VideoEditor';

// Wrapper component to use the context
const AppContent: React.FC = () => {
  const { appState } = useAppContext();
  const { activeTab } = appState;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <Header />
      <main className="p-4 sm:p-6 lg:p-8">
        <div hidden={activeTab !== AppTab.SCENE_CREATOR}>
          <SceneCreator />
        </div>
        <div hidden={activeTab !== AppTab.IMAGE_STUDIO}>
          <ImageStudio />
        </div>
        <div hidden={activeTab !== AppTab.VIDEO_EDITOR}>
          <VideoEditor />
        </div>
        <div hidden={activeTab !== AppTab.SCRIPT_WRITER}>
          <ScriptWriter />
        </div>
        <div hidden={activeTab !== AppTab.CONTENT_ANALYSIS}>
          <ContentAnalysis />
        </div>
        <div hidden={activeTab !== AppTab.AUDIO_SUITE}>
          <AudioSuite />
        </div>
        <div hidden={activeTab !== AppTab.CHATBOT}>
          <Chatbot />
        </div>
        <div hidden={activeTab !== AppTab.HISTORY}>
          <History />
        </div>
      </main>
    </div>
  );
};


const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;