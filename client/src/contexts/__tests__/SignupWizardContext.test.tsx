import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { SignupWizardProvider, useSignupWizard } from '../SignupWizardContext';

function setup() {
  const wrapper: React.FC<{children: React.ReactNode}> = ({ children }) => (
    <SignupWizardProvider>{children}</SignupWizardProvider>
  );
  return renderHook(() => useSignupWizard(), { wrapper });
}

describe('SignupWizardContext setStage validation', () => {
  it('allows advancing to a valid next stage', () => {
    const { result } = setup();
    act(() => result.current.setStage('profile'));
    expect(result.current.currentStage).toBe('profile');
  });

  it('prevents regressing to a previous stage', () => {
    const { result } = setup();
    act(() => result.current.setStage('profile'));
    act(() => result.current.setStage('payment'));
    expect(result.current.currentStage).toBe('profile');
  });

  it('ignores invalid stage values', () => {
    const { result } = setup();
    act(() => result.current.setStage('ready'));
    // @ts-ignore
    act(() => result.current.setStage('bogus'));
    expect(result.current.currentStage).toBe('ready');
  });
});
