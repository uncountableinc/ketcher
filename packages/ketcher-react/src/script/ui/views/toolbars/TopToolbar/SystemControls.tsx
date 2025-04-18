/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/

import styled from '@emotion/styled';
import { shortcutStr } from 'ketcher-core';
import { TopToolbarIconButton } from './TopToolbarIconButton';
import { useAppContext } from 'src/hooks';
import { useCallback } from 'react';

interface SystemControlsProps {
  disabledButtons: string[];
  hiddenButtons: string[];
  className?: string;
  onSettingsOpen: () => void;
  onAboutOpen: () => void;
  onHistoryClick: () => void;
  onFullscreen: (ketcherId: string) => void;
  onHelp: () => void;
}

const getIfFullScreen = () => {
  return !!(
    document.fullscreenElement ||
    document.mozFullScreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement
  );
};

const ControlsPanel = styled('div')`
  display: flex;
  align-items: center;
  flex-grow: 0;
  justify-content: flex-end;
`;

export const SystemControls = ({
  disabledButtons,
  hiddenButtons,
  onSettingsOpen,
  // onHistoryClick,
  onFullscreen,
  onHelp,
  onAboutOpen,
  className,
}: SystemControlsProps) => {
  const { ketcherId } = useAppContext();
  const onFullscreenCallback = useCallback(() => {
    onFullscreen(ketcherId);
  }, [ketcherId]);
  return (
    <ControlsPanel className={className}>
      {/* Uncomment upon History log implementation */}
      {/* <IconButton
        title="History"
        onClick={onHistoryClick}
        iconName="history"
        disabled={disabledButtons.includes('history')}
        isHidden={hiddenButtons.includes('history')}
      /> */}
      <TopToolbarIconButton
        title="Settings"
        onClick={onSettingsOpen}
        iconName="settings"
        disabled={disabledButtons.includes('settings')}
        isHidden={hiddenButtons.includes('settings')}
        testId="settings-button"
      />
      <TopToolbarIconButton
        title={`Help (${shortcutStr(['?', '&', 'Shift+/'])})`}
        onClick={onHelp}
        iconName="help"
        disabled={disabledButtons.includes('help')}
        isHidden={hiddenButtons.includes('help')}
        testId="help-button"
      />
      {/* @TODO Temporary About button, when design is ready, reimplement */}
      <TopToolbarIconButton
        title="About"
        onClick={onAboutOpen}
        iconName="about"
        disabled={disabledButtons.includes('about')}
        isHidden={hiddenButtons.includes('about')}
        testId="about-button"
      />
      <TopToolbarIconButton
        title="Fullscreen mode"
        onClick={onFullscreenCallback}
        iconName={getIfFullScreen() ? 'fullscreen-exit' : 'fullscreen-enter'}
        disabled={disabledButtons.includes('fullscreen')}
        isHidden={hiddenButtons.includes('fullscreen')}
        testId="fullscreen-mode-button"
      />
    </ControlsPanel>
  );
};
