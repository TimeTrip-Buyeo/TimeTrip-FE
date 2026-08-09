import { createContext, useContext, useState, type PropsWithChildren } from 'react';

type IntroContextValue = {
  hasSeenIntro: boolean;
  finishIntro: () => void;
};

const IntroContext = createContext<IntroContextValue | null>(null);

export function IntroProvider({ children }: PropsWithChildren) {
  const [hasSeenIntro, setHasSeenIntro] = useState(false);

  return (
    <IntroContext.Provider value={{ hasSeenIntro, finishIntro: () => setHasSeenIntro(true) }}>
      {children}
    </IntroContext.Provider>
  );
}

export function useIntro() {
  const value = useContext(IntroContext);
  if (!value) {
    throw new Error('useIntro must be used within an IntroProvider');
  }
  return value;
}
