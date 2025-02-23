import { Asset } from 'expo-asset';

export const preloadImages = async () => {
  const images = [
    require('../assets/onboarding/slide1.png'),
    require('../assets/onboarding/slide2.png'),
    require('../assets/onboarding/slide3.png'),
  ];

  const cacheImages = images.map(image => {
    return Asset.fromModule(image).downloadAsync();
  });

  return Promise.all(cacheImages);
}; 