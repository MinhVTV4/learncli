import { VFSCommands } from "../vfs/commands";
import { gitService } from "../vfs/git";
import { parsePipeline } from "./commandParser";
import { NPMService } from "../services/npm";
import { network } from "./Network";
import { DockerEngine } from "./Docker";
import { processManager } from "./ProcessManager";

export class Shell {
  vfs: VFSCommands;
  env: Record<string, string>;
  isReady: boolean = false;
  private npmService: NPMService;
  private docker: DockerEngine;

  constructor() {
    this.vfs = new VFSCommands();
    this.npmService = new NPMService(this.vfs);
    this.docker = new DockerEngine();
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
    
    // Check for background execution (&)
    const isBackground = commandLine.trim().endsWith('&');
    const cleanCommandLine = isBackground ? commandLine.replace(/&$/, '').trim() : commandLine;

    const pipeline = parsePipeline(cleanCommandLine);
    let lastOutput = "";

    // If background, spawn process and return immediately
    if (isBackground) {
      const cmdName = pipeline[0]?.args[0] || "unknown";
      const proc = processManager.spawn(this.env.USER, cmdName, true);
      return `[1] ${proc.pid}`;
    }

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
            output = args.slice(1).join(" ");
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
             if (!args[1]) {
               output = "usage: sudo command...";
             } else {
               const subCmd = args.slice(1).join(" ");
               output = await this.execute(subCmd);
             }
             break;
          case "npm":
            output = await this.npmService.handle(args.slice(1));
            break;
          case "node":
            if (args.length === 1) {
              output = "Welcome to Node.js v14.17.0.\nType \".help\" for more information.";
            } else if (args[1] === '-v' || args[1] === '--version') {
              output = "v14.17.0";
            } else {
              const file = args[1];
              try {
                const content = await this.vfs.cat(file);
                if (content.includes('console.log')) {
                  const match = content.match(/console\.log\(['"](.*)['"]\)/);
                  if (match) {
                    output = match[1];
                  } else {
                    output = `[Node.js] Executed ${file}`;
                  }
                } else {
                  output = `[Node.js] Executed ${file}`;
                }
              } catch (e) {
                throw new Error(`Cannot find module '${file}'`);
              }
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
          case "curl":
            let method = "GET";
            let data = undefined;
            let headers: Record<string, string> = {};
            let url = "";
            let showHeadersOnly = false;

            for (let j = 1; j < args.length; j++) {
              const arg = args[j];
              if (arg === "-X" || arg === "--request") {
                method = args[++j];
              } else if (arg === "-d" || arg === "--data") {
                data = args[++j];
                method = "POST";
              } else if (arg === "-H" || arg === "--header") {
                const headerLine = args[++j];
                const [key, value] = headerLine.split(":").map(s => s.trim());
                if (key && value) headers[key] = value;
              } else if (arg === "-I" || arg === "--head") {
                showHeadersOnly = true;
                method = "HEAD";
              } else if (!arg.startsWith("-")) {
                url = arg;
              }
            }

            if (!url) throw new Error("curl: try 'curl --help' for more information");

            try {
              const response = await network.fetch(url, { method, headers, body: data });
              
              if (showHeadersOnly) {
                let headerOutput = `HTTP/1.1 ${response.status} ${response.statusText}\n`;
                for (const [k, v] of Object.entries(response.headers)) {
                  headerOutput += `${k}: ${v}\n`;
                }
                output = headerOutput;
              } else {
                if (typeof response.body === 'object') {
                  output = JSON.stringify(response.body, null, 2);
                } else {
                  output = String(response.body);
                }
              }
            } catch (e: any) {
              throw new Error(`curl: (6) Could not resolve host: ${url}`);
            }
            break;
          case "docker":
            if (!args[1]) {
              output = `
Usage:  docker [OPTIONS] COMMAND

A self-sufficient runtime for containers

Management Commands:
  container   Manage containers
  image       Manage images

Commands:
  run         Run a command in a new container
  ps          List containers
  images      List images
  stop        Stop one or more running containers
  rm          Remove one or more containers
  rmi         Remove one or more images
  pull        Pull an image or a repository from a registry
`;
            } else {
              const subCmd = args[1];
              if (subCmd === 'run') {
                // Parse flags: -d (detached), --name
                let detached = false;
                let name = undefined;
                let imageIndex = 2;
                
                // Simple flag parsing
                for (let k = 2; k < args.length; k++) {
                  if (args[k] === '-d') {
                    detached = true;
                    imageIndex = k + 1;
                  } else if (args[k] === '--name') {
                    name = args[k+1];
                    imageIndex = k + 2;
                  } else if (!args[k].startsWith('-')) {
                    imageIndex = k;
                    break;
                  }
                }

                const image = args[imageIndex];
                if (!image) throw new Error("docker run requires at least 1 argument.");
                
                const runArgs = args.slice(imageIndex + 1);
                output = await this.docker.run(image, runArgs, { detached, name });
              } else if (subCmd === 'ps') {
                const all = args.includes('-a');
                output = this.docker.listContainers(all);
              } else if (subCmd === 'images') {
                output = this.docker.listImages();
              } else if (subCmd === 'stop') {
                if (!args[2]) throw new Error("docker stop requires at least 1 argument.");
                output = this.docker.stop(args[2]);
              } else if (subCmd === 'rm') {
                if (!args[2]) throw new Error("docker rm requires at least 1 argument.");
                output = this.docker.rm(args[2]);
              } else if (subCmd === 'rmi') {
                if (!args[2]) throw new Error("docker rmi requires at least 1 argument.");
                output = this.docker.rmi(args[2]);
              } else if (subCmd === 'pull') {
                if (!args[2]) throw new Error("docker pull requires at least 1 argument.");
                output = await this.docker.pull(args[2]);
              } else {
                output = `docker: '${subCmd}' is not a docker command. See 'docker --help'.`;
              }
            }
            break;
          case "ps":
            const processes = processManager.list();
            const psHeader = "PID   USER     %CPU %MEM TIME  COMMAND";
            const psRows = processes.map(p => {
              return `${p.pid.toString().padEnd(5)} ${p.user.padEnd(8)} ${p.cpu.toFixed(1).padEnd(4)} ${p.mem.toFixed(1).padEnd(4)} ${p.time.padEnd(5)} ${p.command}`;
            });
            output = [psHeader, ...psRows].join('\n');
            break;
          case "kill":
            if (!args[1]) throw new Error("kill: usage: kill <pid>");
            const pid = parseInt(args[1]);
            if (isNaN(pid)) throw new Error(`kill: illegal pid: ${args[1]}`);
            const success = processManager.kill(pid);
            if (!success) throw new Error(`kill: (${pid}) - No such process`);
            break;
          case "top":
            // Top is handled by the UI component when it sees this command
            // But we need to return something or handle it here?
            // We'll return a special string that TerminalComponent detects
            output = "__TOP_MODE__"; 
            break;
          case "help":
            output = "Available commands: ls, cd, pwd, mkdir, touch, rm, cp, mv, cat, echo, grep, find, chmod, whoami, sudo, git, clear, help, curl, nano, npm, node, docker, ps, kill, top\nRedirection: > (write), >> (append)\nPipes: | (chain commands)\nBackground: & (run in background)";
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
    return `\x1b[1;32m➜\x1b[0m \x1b[1;34m${displayCwd}\x1b[0m $ `;
  }
}
