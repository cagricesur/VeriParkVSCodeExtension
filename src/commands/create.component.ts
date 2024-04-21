import cp from "child_process";
import fs from "fs";
import path from "path";
import { InputBoxValidationSeverity, Uri, window, workspace } from "vscode";
import { IVRPCommand, IVeriParkConfig } from "../models";
import { ResolveSeq } from "../utils";

const getVeriParkConfig = (): IVeriParkConfig | undefined => {
  if (workspace.workspaceFolders && workspace.workspaceFolders.length == 1) {
    const root = workspace.workspaceFolders[0];
    if (root.name == "Web") {
      const json = fs.readFileSync(
        path.join(root.uri.fsPath, "veripark.json"),
        {
          flag: "rs",
          encoding: "utf8",
        }
      );
      const config = JSON.parse(json) as IVeriParkConfig;
      if (config && config.cli) {
        config.webRoot = root.uri.fsPath;
        config.cli.path = path.join(root.uri.fsPath, config.cli.path);
      }
      return config;
    }
  }
  return undefined;
};
const getComponentName = (): Promise<string | undefined> => {
  return new Promise<string | undefined>(async (resolve, reject) => {
    let name = await window.showInputBox({
      title: "Component Name",
      validateInput: (value) => {
        if (value && value.length > 0) {
          const reg = new RegExp("^[a-zA-Z.]+$");
          if (reg.test(value)) {
            return undefined;
          }
        }
        return {
          message: "Enter a valid component name ^[a-zA-Z.]+$",
          severity: InputBoxValidationSeverity.Error,
        };
      },
    });
    if (name) {
      resolve(name);
    } else {
      reject();
    }
  });
};
const getComponentModule = (): Promise<string | undefined> => {
  return new Promise<string | undefined>(async (resolve, reject) => {
    const config = getVeriParkConfig();
    if (config) {
      const module = await window.showQuickPick(
        config.modules.sort((a, b) => {
          return a.length - b.length;
        }),
        {
          canPickMany: false,
          title: "Select Module",
        }
      );
      if (module) {
        resolve(module);
      } else {
        reject();
      }
    } else {
      reject();
    }
  });
};
const getTransactions = (): Promise<string[] | undefined> => {
  return new Promise<string[] | undefined>(async (resolve, reject) => {
    const config = getVeriParkConfig();
    if (config) {
      const transactions = await window.showQuickPick(
        config.transactions.sort((a, b) => {
          return a.length - b.length;
        }),
        {
          canPickMany: true,
          title: "Select Transaction Call(s)",
        }
      );
      if (transactions) {
        resolve(transactions);
      } else {
        reject();
      }
    } else {
      reject();
    }
  });
};
const getComponent = (): Promise<IAngularComponent | undefined> => {
  return new Promise<IAngularComponent | undefined>(async (resolve) => {
    const response = await ResolveSeq(
      getComponentName,
      getComponentModule,
      getTransactions
    );
    const component: IAngularComponent = {
      name: response[0] || "",
      module: response[1] || "",
      transactions: response[2] || [],
    };
    if (component.name && component.module) {
      resolve(component);
    } else {
      resolve(undefined);
    }
  });
};

class Messager {
  constructor() {}
  info = (message: string) => {
    window.showInformationMessage(message);
  };
  error = (message: string) => {
    window.showErrorMessage(message);
  };
  warning = (message: string) => {
    window.showWarningMessage(message);
  };
}

interface IAngularComponent {
  name: string;
  module: string;
  transactions: string[];
}
const CreateComponent: IVRPCommand = {
  identifier: "veripark-vscode-extesion-v1.create.component",
  callback: async () => {
    const config = getVeriParkConfig();
    if (config) {
      const component = await getComponent();
      if (component) {
        const messager = new Messager();
        messager.info(
          `Creating new component ${component.name} for module [${component.module}]`
        );

        const parameters = [
          "create-component",
          `-n${component.name}`,
          `-m${component.module}`,
          `-r${config.webRoot}`,
        ];
        if (component.transactions.length > 0) {
          parameters.push(`-t${component.transactions.join(",")}`);
        }

        const process = cp.spawn("VeriChannel.CLI", parameters, {
          cwd: config.cli.path,
        });
        process.stdout.on("data", (data) => {
          console.log(`${data}`);
        });
        process.stderr.on("data", (data) => {
          console.error(`${data}`);
          messager.error("An error occured.");
        });
        process.on("close", (code) => {
          if (code === 0) {
            messager.info("Component created successfully.");

            const name = component.name.toLowerCase();
            const uri = Uri.file(
              path.join(
                config.webRoot,
                `Features\\${component.module}\\Modules\\components\\${name}\\${name}.component.ts`
              )
            );
            workspace.openTextDocument(uri).then(
              (doc) => {
                window.showTextDocument(doc);
              },
              (reason) => {
                console.error(`${reason}`);
              }
            );
          } else {
            messager.error(
              `An error occured !!! Process exited with code ${code}`
            );
          }
        });
      }
    }
  },
};
export default CreateComponent;
