import { StrictMode, useEffect, useState } from 'react';
import { ButtonsConfig, Editor, InfoModal } from 'ketcher-react';
import { Ketcher, StructServiceProvider } from 'ketcher-core';

import 'ketcher-react/dist/index.css';

import { getStructServiceProvider } from './utils';
import { safePostMessage } from './utils/safePostMessage';

const getHiddenButtonsConfig = (): ButtonsConfig => {
  const searchParams = new URLSearchParams(window.location.search);
  const hiddenButtons = searchParams.get('hiddenControls');

  if (!hiddenButtons) return {};

  return hiddenButtons.split(',').reduce((acc, button) => {
    if (button) acc[button] = { hidden: true };

    return acc;
  }, {} as { [val: string]: { hidden: boolean } });
};

const EXTERNAL_ZOOM_SCALE = 1.0;

const App = () => {
  const hiddenButtonsConfig = getHiddenButtonsConfig();
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [structServiceProvider, setStructServiceProvider] =
    useState<StructServiceProvider | null>(null);
  useEffect(() => {
    getStructServiceProvider().then(setStructServiceProvider);
  }, []);

  if (!structServiceProvider) {
    return <div>Loading...</div>;
  }

  return (
    <StrictMode>
      <div
        style={{ transform: `scale(${EXTERNAL_ZOOM_SCALE})`, height: '100%' }}
      >
        <Editor
          errorHandler={(message: string) => {
            setHasError(true);
            setErrorMessage(message.toString());
          }}
          buttons={hiddenButtonsConfig}
          staticResourcesUrl={process.env.PUBLIC_URL}
          structServiceProvider={structServiceProvider}
          onInit={(ketcher: Ketcher) => {
            ketcher.editor.setOptions(
              JSON.stringify({
                externalZoomScale: EXTERNAL_ZOOM_SCALE,
              }),
            );
            window.ketcher = ketcher;
            safePostMessage({
              eventType: 'init',
            });
            window.scrollTo(0, 0);
          }}
        />
        {hasError && (
          <InfoModal
            message={errorMessage}
            close={() => {
              setHasError(false);

              // Focus on editor after modal is closed
              const cliparea: HTMLElement | null =
                document.querySelector('.cliparea');
              cliparea?.focus();
            }}
          />
        )}
      </div>
    </StrictMode>
  );
};

export default App;
