export interface IVRPCommand {
  identifier: string;
  callback: (...args: any[]) => any;
}
export interface IVeriParkConfig {
  cli: {
    path: string;
    txnConfigsPath: string;
  };
  modules: string[];
  transactions: string[];
  webRoot: string;
}
