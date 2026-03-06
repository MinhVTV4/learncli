import { VFSCommands } from "../vfs/commands";

export class NodeRuntime {
  private vfs: VFSCommands;

  constructor(vfs: VFSCommands) {
    this.vfs = vfs;
  }

  async evaluate(code: string, env: Record<string, string> = {}): Promise<string> {
    let output = "";
    const log = (...args: any[]) => {
      output += args.map(a => {
        if (typeof a === 'object') return JSON.stringify(a, null, 2);
        return String(a);
      }).join(" ") + "\n";
    };

    // Mock process
    const processMock = {
      env: env,
      cwd: () => "/home/user", // TODO: Map cwdId to path if possible
      exit: (code: number) => { throw new Error(`Process exited with code ${code}`); },
      argv: ["node", "script.js"],
      stdout: {
        write: (str: string) => { output += str; }
      }
    };

    // Mock require
    const requireMock = (moduleName: string) => {
      if (moduleName === "fs") {
        return {
          readFileSync: (path: string, encoding?: string) => {
            throw new Error("fs.readFileSync is not supported. Use fs.promises.");
          },
          promises: {
            readFile: async (path: string, encoding?: string) => {
               try {
                 return await this.vfs.cat(path);
               } catch (e) {
                 throw new Error(`ENOENT: no such file or directory, open '${path}'`);
               }
            },
            writeFile: async (path: string, content: string) => {
               await this.vfs.writeFile(path, content);
            },
            appendFile: async (path: string, content: string) => {
               await this.vfs.appendFile(path, content);
            },
            readdir: async (path: string) => {
               return await this.vfs.ls(path);
            }
          }
        };
      }
      if (moduleName === "path") {
        return {
          join: (...args: string[]) => args.join("/").replace(/\/+/g, "/"),
          resolve: (...args: string[]) => args.join("/").replace(/\/+/g, "/"),
          dirname: (p: string) => p.split("/").slice(0, -1).join("/") || "."
        };
      }
      if (moduleName === "os") {
        return {
          platform: () => "linux",
          arch: () => "x64",
          cpus: () => [{ model: "HintShell Virtual CPU", speed: 2400 }]
        };
      }
      throw new Error(`Module '${moduleName}' not found`);
    };

    // Sandbox execution
    try {
      // We wrap code in an async function to allow await at top level
      const wrappedCode = `
        return (async () => {
          try {
            ${code}
          } catch (e) {
            console.error(e);
          }
        })();
      `;
      
      const func = new Function(
        "console", 
        "process", 
        "require", 
        "module", 
        "exports",
        wrappedCode
      );

      const module = { exports: {} };
      const exports = module.exports;

      await func(
        { log, error: log, warn: log, info: log }, // console mock
        processMock,
        requireMock,
        module,
        exports
      );

    } catch (e: any) {
      output += `\nRuntime Error: ${e.message}`;
    }

    return output;
  }
}
