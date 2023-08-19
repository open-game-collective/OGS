export const getPlatformInfo = () => {
  var _ua = window.navigator.userAgent;

  const isIDevice = /iphone|ipod|ipad/i.test(navigator.platform);
  const isSamsung = /Samsung/i.test(_ua);
  let isFireFox = /Firefox/i.test(_ua);
  let isOpera = /opr/i.test(_ua);
  const isEdge = /edg/i.test(_ua);

  // Opera & FireFox only Trigger on Android
  isFireFox = /android/i.test(_ua);

  if (isOpera) {
    isOpera = /android/i.test(_ua);
  }

  const isChromium = 'onbeforeinstallprompt' in window;
  const isInPWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches;
  const isMobileSafari =
    isIDevice && _ua.indexOf('Safari') > -1 && _ua.indexOf('CriOS') < 0;
  const isiPad = isMobileSafari && _ua.indexOf('iPad') > -1;
  const isiPhone = isMobileSafari && _ua.indexOf('iPad') === -1;
  const isPWACompatible =
    isChromium ||
    isMobileSafari ||
    isSamsung ||
    isFireFox ||
    isOpera ||
    isIDevice;

  // const iosVersion = getIOSVersion(_ua);

  const hasPushManager =
    'serviceWorker' in navigator && 'PushManager' in window;

  const hasPush = hasPushManager && ((isMobileSafari && isInPWA) || isChromium);

  return {
    isChromium,
    isMobileSafari,
    isiPad,
    isiPhone,
    isEdge,
    isPWACompatible,
    isSamsung,
    isFireFox,
    isOpera,
    isIDevice,
    isInPWA,
    hasPush,
  };
};

// function getIOSVersion(userAgent: string): string | null {
//   const match = /OS (\d+(?:_\d+)*) like Mac OS X/i.exec(userAgent);
//   return match ? match[1].replace(/_/g, '.') : null;
// }
