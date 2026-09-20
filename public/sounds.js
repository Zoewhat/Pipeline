'use strict';

window.PipelineSound = (() => {
  const files = {
    click: '/sounds/click.wav',
    coin: '/sounds/coin.wav',
    card: '/sounds/card.wav',
    confirm: '/sounds/confirm.wav'
  };
  const cache = Object.fromEntries(Object.entries(files).map(([name, src]) => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = name === 'confirm' ? 0.34 : 0.24;
    return [name, audio];
  }));

  function play(name = 'click') {
    const base = cache[name] || cache.click;
    if (!base) return;
    const audio = base.cloneNode();
    audio.volume = base.volume;
    audio.play().catch(() => {});
  }

  return { play };
})();
