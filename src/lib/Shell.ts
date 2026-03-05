import { VFSCommands } from "../vfs/commands";
import { gitService } from "../vfs/git";

export class Shell {
  vfs: VFSCommands;
  env: Record<string, string>;
  isReady: boolean = false;

  constructor() {
    this.vfs = new VFSCommands();
    this.env = {
      USER: "user",
      HOME: "/home/user",
    };
  }

  async init() {
    await this.vfs.init();
    this.isReady = true;
  }

  async execute(commandLine: string): Promise<string> {
    if (!this.isReady) await this.init();
    
    // Split by pipe |
    // Note: This is a simple split and doesn't handle | inside quotes
    const segments = commandLine.split('|');
    let lastOutput = "";

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i].trim();
      if (!segment) continue;
      
      // For the last segment, we might have redirection
      let cmdLine = segment;
      let redirectTarget: string | null = null;
      let append = false;

      // Only parse redirection for the last segment of the pipe
      if (i === segments.length - 1) {
        const appendMatch = cmdLine.match(/(.*)>>\s*(\S+)$/);
        if (appendMatch) {
          cmdLine = appendMatch[1].trim();
          redirectTarget = appendMatch[2];
          append = true;
        } else {
          const writeMatch = cmdLine.match(/(.*)>\s*(\S+)$/);
          if (writeMatch) {
            cmdLine = writeMatch[1].trim();
            redirectTarget = writeMatch[2];
          }
        }
      }

      const args = cmdLine.split(/\s+/);
      if (args.length === 0 || args[0] === "") continue;

      const cmd = args[0];
      let output = "";

      try {
        switch (cmd) {
          case "ls":
            // Handle flags like -l
            const lsFlags = args.filter(a => a.startsWith('-'));
            const lsPath = args.find(a => !a.startsWith('-') && a !== 'ls') || '.';
            const items = await this.vfs.ls(lsPath, lsFlags);
            output = items.join("\n");
            break;
          case "cd":
            await this.vfs.cd(args[1] || this.env.HOME);
            break;
          case "pwd":
            output = await this.vfs.pwd();
            break;
          case "mkdir":
            if (!args[1]) throw new Error("missing operand");
            await this.vfs.mkdir(args[1]);
            break;
          case "touch":
            if (!args[1]) throw new Error("missing operand");
            await this.vfs.touch(args[1]);
            break;
          case "rm":
            if (!args[1]) throw new Error("missing operand");
            await this.vfs.rm(args[1]);
            break;
          case "cp":
            if (!args[1] || !args[2]) throw new Error("missing file operand");
            await this.vfs.cp(args[1], args[2]);
            break;
          case "mv":
            if (!args[1] || !args[2]) throw new Error("missing file operand");
            await this.vfs.mv(args[1], args[2]);
            break;
          case "cat":
            if (!args[1]) throw new Error("missing operand");
            output = await this.vfs.cat(args[1]);
            break;
          case "echo":
            let echoStr = args.slice(1).join(" ");
            if ((echoStr.startsWith('"') && echoStr.endsWith('"')) || (echoStr.startsWith("'") && echoStr.endsWith("'"))) {
              echoStr = echoStr.slice(1, -1);
            }
            output = echoStr;
            break;
          case "grep":
            if (!args[1]) throw new Error("missing pattern");
            const pattern = args[1];
            const file = args[2];
            output = await this.vfs.grep(pattern, file, lastOutput);
            break;
          case "find":
            let startPath = args[1] || '.';
            let namePattern = undefined;
            if (args[1] === '-name' && args[2]) {
               startPath = '.';
               namePattern = args[2];
            } else if (args[2] === '-name' && args[3]) {
               namePattern = args[3];
            }
            const results = await this.vfs.find(startPath, namePattern);
            output = results.join('\n');
            break;
          case "chmod":
            if (!args[1] || !args[2]) throw new Error("missing operand");
            await this.vfs.chmod(args[1], args[2]);
            break;
          case "whoami":
            output = this.env.USER;
            break;
          case "sudo":
             // Fake sudo
             if (!args[1]) {
               output = "usage: sudo command...";
             } else {
               const subCmd = args.slice(1).join(" ");
               output = await this.execute(subCmd);
             }
             break;
          case "git":
            if (!args[1]) {
              output = "usage: git <command> [<args>]";
            } else {
              const subCmd = args[1];
              const cwd = this.vfs.cwdId;
              if (subCmd === 'init') {
                output = await gitService.init(cwd);
              } else if (subCmd === 'status') {
                output = await gitService.status(cwd);
              } else if (subCmd === 'add') {
                if (!args[2]) throw new Error("nothing specified, nothing added");
                output = await gitService.add(cwd, args[2]);
              } else if (subCmd === 'commit') {
                const msgIndex = args.indexOf('-m');
                if (msgIndex === -1 || !args[msgIndex + 1]) throw new Error("commit message required (-m)");
                let msg = args.slice(msgIndex + 1).join(" ");
                if ((msg.startsWith('"') && msg.endsWith('"')) || (msg.startsWith("'") && msg.endsWith("'"))) {
                  msg = msg.slice(1, -1);
                }
                output = await gitService.commit(cwd, msg);
              } else if (subCmd === 'log') {
                output = await gitService.log(cwd);
              } else if (subCmd === 'branch') {
                 if (args[2]) {
                   output = await gitService.createBranch(cwd, args[2]);
                 } else {
                   output = await gitService.listBranches(cwd);
                 }
              } else if (subCmd === 'checkout') {
                 if (!args[2]) throw new Error("missing argument: must specify branch to checkout");
                 output = await gitService.checkout(cwd, args[2]);
              } else if (subCmd === 'merge') {
                 if (!args[2]) throw new Error("missing argument: must specify branch to merge");
                 output = await gitService.merge(cwd, args[2]);
              } else if (subCmd === 'remote') {
                 output = await gitService.remote(cwd, args[2], args[3], args[4]);
              } else if (subCmd === 'push') {
                 const remote = args[2] || 'origin';
                 const branch = args[3] || 'main';
                 output = await gitService.push(cwd, remote, branch);
              } else if (subCmd === 'clone') {
                 if (!args[2]) throw new Error("missing argument: must specify url to clone");
                 output = await gitService.clone(cwd, args[2]);
              } else {
                output = `git: '${subCmd}' is not a git command. See 'git --help'.`;
              }
            }
            break;
          case "help":
            output = "Available commands: ls, cd, pwd, mkdir, touch, rm, cp, mv, cat, echo, grep, find, chmod, whoami, sudo, git, clear, help\nRedirection: > (write), >> (append)\nPipes: | (chain commands)";
            break;
          default:
            throw new Error(`command not found: ${cmd}`);
        }

        // If this is the last segment and has redirection, write to file
        if (i === segments.length - 1 && redirectTarget) {
          if (append) {
            await this.vfs.appendFile(redirectTarget, output + "\n");
          } else {
            await this.vfs.writeFile(redirectTarget, output + "\n");
          }
          lastOutput = "";
        } else {
          lastOutput = output;
        }

      } catch (e: any) {
        // Smart Error Explainer
        let suggestion = "";
        if (e.message.includes("No such file or directory")) {
           if (cmd === 'cd') suggestion = "\n💡 Tip: Use 'ls' to see available directories.";
           if (cmd === 'cat') suggestion = "\n💡 Tip: Check if the file name is correct.";
        } else if (e.message.includes("Is a directory")) {
           if (cmd === 'cat') suggestion = "\n💡 Tip: 'cat' is for files. Use 'ls' to view directory contents.";
        } else if (e.message.includes("Not a directory")) {
           if (cmd === 'cd') suggestion = "\n💡 Tip: You can only 'cd' into directories, not files.";
        }
        
        return `${cmd}: ${e.message}${suggestion}`;
      }
    }

    return lastOutput;
  }

  async getPrompt(): Promise<string> {
    if (!this.isReady) await this.init();
    const cwd = await this.vfs.pwd();
    const displayCwd = cwd.replace(this.env.HOME, "~");
    return `\x1b[1;32m${this.env.USER}@learn-cli\x1b[0m:\x1b[1;34m${displayCwd}\x1b[0m$ `;
  }
}
