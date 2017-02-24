import { fork, ChildProcess } from 'child_process';
import { join } from 'path';

import { MessageToWorker, WorkerProcess } from './interfaces';

export function runWorker(pathToAppScripts: string, debug: boolean, appEntryPoint: string, appNgModulePath: string, srcDir: string, distDir: string, tsConfig: string, ionicAngularDir: string, sassConfigPath: string, copyConfigPath: string) {
  return new Promise((resolve, reject) => {

    const msgToWorker: MessageToWorker = {
      pathToAppScripts: pathToAppScripts,
      appEntryPoint: appEntryPoint,
      appNgModulePath: appNgModulePath,
      debug: debug,
      srcDir: srcDir,
      distDir: distDir,
      tsConfig: tsConfig,
      ionicAngularDir: ionicAngularDir,
      sassConfigPath: sassConfigPath,
      copyConfigPath: copyConfigPath
    };

    const worker = <ChildProcess>createWorker(msgToWorker);
    console.log(`Starting to build test ${appEntryPoint}`);

    worker.on('error', (err: any) => {
      console.error(`worker error, entrypoint: ${appEntryPoint}, pid: ${worker.pid}, error: ${err}`);
      // reject(err);
      resolve();
    });

    worker.on('exit', (code: number) => {
      console.log(`Finished building test ${appEntryPoint}`);
      if (code === 0) {
        resolve(code);
      } else {
        //reject(new Error(`${appEntryPoint} exited with non-zero status code`));
        console.log(`${appEntryPoint} exited with non-zero status code`);
        resolve();
      }
    });
  });
}


export function createWorker(msg: MessageToWorker): any {
  for (var i = workers.length - 1; i >= 0; i--) {
    if (workers[i].appEntryPoint === msg.appEntryPoint) {
      try {
        workers[i].worker.kill('SIGKILL');
      } catch (e) {
        console.log(`createWorker, kill('SIGKILL'): ${e}`);
      } finally {
        delete workers[i].worker;
        workers.splice(i, 1);
      }
    }
  }

  try {
      let scriptArgs = [
      'build',
      '--aot',
      '--optimizejs',
      '--appEntryPoint', msg.appEntryPoint,
      '--appNgModulePath', msg.appNgModulePath,
      '--srcDir', msg.srcDir,
      '--wwwDir', msg.distDir,
      '--tsconfig', msg.tsConfig,
      '--readConfigJson', 'false',
      '--experimentalParseDeepLinks', 'true',
      '--experimentalManualTreeshaking', 'true',
      '--experimentalPurgeDecorators', 'true',
      '--ionicAngularDir', msg.ionicAngularDir,
      '--sass', msg.sassConfigPath,
      '--copy', msg.copyConfigPath,
      '--enableLint', 'false',
      // '--disableLogging', 'true'
    ];

    if (msg.debug) {
      scriptArgs.push('--debug');
    }

    const workerModule = join(process.cwd(), 'node_modules', '@ionic', 'app-scripts', 'bin', 'ionic-app-scripts.js');
    const worker = fork(workerModule, scriptArgs, {
      env: {
        FORCE_COLOR: true,
        npm_config_argv: process.env.npm_config_argv
      }
    });

    workers.push({
      appEntryPoint: msg.appEntryPoint,
      worker: worker
    });

    return worker;

  } catch (e) {
    throw new Error(`unable to create worker-process: ${e.msg}`);
  }
}


export const workers: WorkerProcess[] = [];
