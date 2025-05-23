import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

import Header from './components/Header';
import OffCanvas from './components/OffCanvas';
import ProgressBar from './components/ProgressBar';
import SearchBizBar from './components/SearchBizBar';
import EditPostForm from './components/EditPostForm';
import { IBusiness } from '../../../common/business.interface';
import { AlertToast } from '../utils/AlertToast';
import { SuccessToast } from '../utils/SuccessToast';

const user = JSON.parse(localStorage.getItem('user') || '{}');

const Body = () => {
  const [stage, setStage] = useState<'find' | 'edit'>('find');
  const [selectedBiz, setSelectedBiz] = useState<IBusiness | null>(null);

  return (
    <main className="create-post">
      <ProgressBar currentStage={stage === 'find' ? 0 : 1} />

      {stage === 'find' ? (
        <SearchBizBar
          selectedBiz={selectedBiz}
          setSelectedBiz={setSelectedBiz}
          onContinue={() => setStage('edit')}
        />
      ) : (
        <EditPostForm
          selectedBiz={selectedBiz}
          onBack={() => setStage('find')}
        />
      )}
    </main>
  );
};

function CreatePostPage() {
  return (
    <>
      <Header />
      <Body />
      <OffCanvas userId={user._id} />
      <AlertToast />
      <SuccessToast />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<CreatePostPage />);
