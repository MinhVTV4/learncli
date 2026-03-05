import { VFSCommands } from "../vfs/commands";
import { gitService } from "../vfs/git";
import { parsePipeline } from "./commandParser";

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
    
    const pipeline = parsePipeline(commandLine);
    let lastOutput = "";

    for (let i = 0; i < pipeline.length; i++) {
      const segment = pipeline[i];
      const { args, redirectTarget, append } = segment;
      
      if (args.length === 0) continue;

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
          case "history":
            // We don't have access to the Terminal's history state here directly.
            // But we can return a special string or throw an error that Terminal handles?
            // Or better, we can't implement history inside Shell easily without passing history in.
            // Let's skip history command in Shell and handle it in Terminal?
            // Or just return "History is managed by the terminal UI".
            output = "History is available by pressing Up/Down arrows.";
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
            // args[0] is 'echo', rest are arguments
            // The tokenizer already stripped quotes, so we just join them with space
            output = args.slice(1).join(" ");
            break;
          case "grep":
            if (!args[1]) throw new Error("missing pattern");
            const pattern = args[1];
            const file = args[2];
            // If file is provided, grep file. If not, grep stdin (lastOutput)
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
               // Reconstruct command line for sub-execution? 
               // Or just execute the rest of args?
               // The execute method expects a string.
               // We can reconstruct it from args.
               // But we lost the original quoting. 
               // Ideally execute should take args array too, but let's just join for now.
               // This is a limitation of fake sudo.
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
                // The tokenizer already handled quotes, so args[msgIndex + 1] is the full message
                const msg = args[msgIndex + 1];
                output = await gitService.commit(cwd, msg);
              } else if (subCmd === 'log') {
                output = await gitService.log(cwd);
              } else if (subCmd === 'diff') {
                output = await gitService.diff(cwd);
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

        // Handle redirection
        if (redirectTarget) {
          if (append) {
            await this.vfs.appendFile(redirectTarget, output + "\n");
          } else {
            await this.vfs.writeFile(redirectTarget, output + "\n");
          }
          // If redirected, we don't pass output to next pipe segment (usually)
          // But in this simple shell, lastOutput is what's returned or passed.
          // If we redirected, stdout is empty.
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
