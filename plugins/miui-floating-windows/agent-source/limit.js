export const FIRMWARE = {
  device: 'amethyst',
  incremental: 'OS3.0.303.0.WOPINXM',
  sdk: 36,
};

export function parseLimit(limit) {
  if (!Number.isInteger(limit) || limit < 3 || limit > 256) {
    throw new RangeError('Choose an integer from 3 to 256.');
  }
  return limit;
}

export function supportsFirmware(device, incremental, sdk) {
  return device === FIRMWARE.device && incremental === FIRMWARE.incremental && sdk === FIRMWARE.sdk;
}

export function limitForWindow(stock, limit, isOrdinaryWindow) {
  if (stock !== 2) return stock;
  try {
    return isOrdinaryWindow() ? limit : stock;
  } catch {
    return stock;
  }
}
