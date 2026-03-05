import { VFS } from '../vfs/VFS';

interface PackageJson {
  name: string;
  version: string;
  description: string;
  main: string;
  scripts: Record<string, string>;
  keywords: string[];
  author: string;
  license: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export class NPMService {
  private vfs: VFS;

  constructor(vfs: VFS) {
    this.vfs = vfs;
  }

  async handle(args: string[]): Promise<string> {
    if (args.length === 0) {
      return `
Usage: npm <command>

where <command> is one of:
    init, install, run, test, start
      `;
    }

    const cmd = args[0];
    const params = args.slice(1);

    switch (cmd) {
      case '-v':
      case '--version':
        return '10.2.4';
      case 'init':
        return this.init(params);
      case 'install':
      case 'i':
        return this.install(params);
      case 'run':
        return this.runScript(params);
      case 'test':
        return this.runScript(['test', ...params]);
      case 'start':
        return this.runScript(['start', ...params]);
      default:
        return `Unknown command: npm ${cmd}`;
    }
  }

  private async init(params: string[]): Promise<string> {
    const isYes = params.includes('-y') || params.includes('--yes');
    
    // For simplicity in this simulation, we'll treat 'npm init' without -y as 'npm init -y' 
    // or prompt that we only support -y for now to avoid complex interactive shell state.
    // But let's just default to creating it to be helpful.
    
    const cwd = await this.vfs.pwd();
    const folderName = cwd === '/' ? 'root-project' : cwd.split('/').pop() || 'project';
    
    const defaultPackageJson: PackageJson = {
      name: folderName,
      version: "1.0.0",
      description: "",
      main: "index.js",
      scripts: {
        "test": "echo \"Error: no test specified\" && exit 1"
      },
      keywords: [],
      author: "",
      license: "ISC"
    };

    if (await this.vfs.exists('package.json')) {
      return "package.json already exists.";
    }

    await this.vfs.write('package.json', JSON.stringify(defaultPackageJson, null, 2));
    
    return `Wrote to ${cwd}/package.json:\n\n${JSON.stringify(defaultPackageJson, null, 2)}`;
  }

  private async install(params: string[]): Promise<string> {
    if (params.length === 0) {
      // npm install (no args) -> install all dependencies
      // For simulation, we just check if package.json exists
      if (!await this.vfs.exists('package.json')) {
        return "npm ERR! code ENOENT\nnpm ERR! enoent ENOENT: no such file or directory, open 'package.json'";
      }
      return "audited 1 packages in 0.5s\n\nfound 0 vulnerabilities";
    }

    const isDev = params.includes('-D') || params.includes('--save-dev');
    const packages = params.filter(p => !p.startsWith('-'));

    if (!await this.vfs.exists('package.json')) {
      return "npm ERR! code ENOENT\nnpm ERR! enoent ENOENT: no such file or directory, open 'package.json'\nnpm ERR! \nnpm ERR! If you need to create a project, run:\nnpm ERR!     npm init";
    }

    const content = await this.vfs.read('package.json');
    let pkgJson: PackageJson;
    try {
      pkgJson = JSON.parse(content);
    } catch (e) {
      return "npm ERR! Error parsing package.json";
    }

    const added: string[] = [];

    for (const pkg of packages) {
      // Simulate installing
      const version = "^1.0.0"; // Mock version
      
      if (isDev) {
        pkgJson.devDependencies = pkgJson.devDependencies || {};
        pkgJson.devDependencies[pkg] = version;
      } else {
        pkgJson.dependencies = pkgJson.dependencies || {};
        pkgJson.dependencies[pkg] = version;
      }

      // Create node_modules entry
      if (!await this.vfs.exists('node_modules')) {
        await this.vfs.mkdir('node_modules');
      }
      if (!await this.vfs.exists(`node_modules/${pkg}`)) {
        await this.vfs.mkdir(`node_modules/${pkg}`);
      }
      
      added.push(`${pkg}@1.0.0`);
    }

    await this.vfs.write('package.json', JSON.stringify(pkgJson, null, 2));

    return `
added ${packages.length} packages, and audited ${packages.length + 1} packages in 1s

found 0 vulnerabilities
`;
  }

  private async runScript(params: string[]): Promise<string> {
    if (params.length === 0) {
      return "npm ERR! Missing script: npm run <script>";
    }
    
    const scriptName = params[0];
    
    if (!await this.vfs.exists('package.json')) {
      return "npm ERR! code ENOENT\nnpm ERR! enoent ENOENT: no such file or directory, open 'package.json'";
    }

    const content = await this.vfs.read('package.json');
    let pkgJson: PackageJson;
    try {
      pkgJson = JSON.parse(content);
    } catch (e) {
      return "npm ERR! Error parsing package.json";
    }

    const script = pkgJson.scripts?.[scriptName];
    if (!script) {
      return `npm ERR! Missing script: "${scriptName}"`;
    }

    return `> ${pkgJson.name}@${pkgJson.version} ${scriptName}\n> ${script}\n\n[Executing: ${script}]`;
  }
}
