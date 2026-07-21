import { sizeClassMeta } from './sizeClasses';

const FILES = {
  rocky: 'rocky.jpg',
  super_earth: 'super-earth.jpg',
  neptune_like: 'neptune.jpg',
  gas_giant: 'gas-giant.jpg',
};

export function planetImage(sizeClass) {
  const file = FILES[sizeClass];
  if (!file) return null;
  return {
    src: `${import.meta.env.BASE_URL}planet-types/${file}`,
    caption: `Artist's concept representative of a ${sizeClassMeta(sizeClass).label} planet (NASA, ESA, CSA / STScI).`,
  };
}
