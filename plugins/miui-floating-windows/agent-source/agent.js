import Java from 'frida-java-bridge';
import { limitForWindow, parseLimit, supportsFirmware } from './limit.js';

const strategyName = 'com.android.server.wm.MiuiFreeFormStackDisplayStrategy';
const stackName = 'com.android.server.wm.MiuiFreeFormActivityStack';
let hook;

function strategyClass() {
  for (const loader of Java.enumerateClassLoadersSync()) {
    try {
      return Java.ClassFactory.get(loader).use(strategyName);
    } catch (error) {
      if (!String(error).includes('ClassNotFoundException')) throw error;
    }
  }
  throw new Error('The HyperOS window strategy is unavailable.');
}

rpc.exports = {
  init(_stage, parameters) {
    const limit = parseLimit(parameters?.limit);
    if (Process.findModuleByName('libandroid_servers.so') === null) {
      throw new Error('This module is for system_server.');
    }
    if (hook) throw new Error('The limit override is already active.');

    Java.performNow(() => {
      const build = Java.use('android.os.Build');
      const version = Java.use('android.os.Build$VERSION');
      if (!supportsFirmware(build.DEVICE.value, version.INCREMENTAL.value, version.SDK_INT.value)) {
        throw new Error('This module is for amethyst OS3.0.303.0.WOPINXM.');
      }

      const strategy = strategyClass();
      const maximum = strategy.getMaxMiuiFreeFormStackCount.overload('java.lang.String', stackName);
      const isEmbedded = strategy.isInEmbeddedWindowingMode.overload(stackName);
      const isSplit = strategy.isSplitScreenMode.overload();
      if (maximum.returnType.className !== 'int'
          || isEmbedded.returnType.className !== 'boolean'
          || isSplit.returnType.className !== 'boolean') {
        throw new Error('The window strategy has unexpected method signatures.');
      }

      maximum.implementation = function (packageName, stack) {
        const stock = maximum.call(this, packageName, stack);
        return limitForWindow(stock, limit, () => (
          stack !== null && !isEmbedded.call(this, stack) && !isSplit.call(this)
        ));
      };
      hook = maximum;
      console.log(`Normal floating-window cap set to ${limit} for this session.`);
    });
  },
  dispose() {
    if (!hook) return;
    hook.implementation = null;
    hook = undefined;
  },
};
