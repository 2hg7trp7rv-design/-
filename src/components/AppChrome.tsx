import { useEffect } from 'react';
import App from '../App';
import ServiceWorkerUpdateToast from './ServiceWorkerUpdateToast';
import StorageRecoveryNotice from './StorageRecoveryNotice';
import { useGameStore } from '../store/gameStore';
import { GAME_IMAGE_ASSET_LIST } from '../lib/gameImageAssets';

export default function AppChrome() {
  const language = useGameStore((state) => state.language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const preloadedImages = GAME_IMAGE_ASSET_LIST.map((src) => {
      const image = new Image();
      image.src = src;
      return image;
    });

    return () => {
      preloadedImages.forEach((image) => {
        image.src = '';
      });
    };
  }, []);

  return (
    <>
      <App />
      <StorageRecoveryNotice />
      <ServiceWorkerUpdateToast />
    </>
  );
}
