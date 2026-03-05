export type FileNode = { type: "file"; content: string };
export type DirNode = {
  type: "dir";
  children: Record<string, FileNode | DirNode>;
};

export class FileSystem {
  root: DirNode;
  cwd: string;

  constructor() {
    this.root = {
      type: "dir",
      children: {
        home: {
          type: "dir",
          children: {
            user: {
              type: "dir",
              children: {
                "readme.txt": {
                  type: "file",
                  content: "Welcome to the CLI Learning App!",
                },
              },
            },
          },
        },
      },
    };
    this.cwd = "/home/user";
  }

  resolvePath(path: string): string {
    if (path.startsWith("/")) return this.normalize(path);
    return this.normalize(`${this.cwd}/${path}`);
  }

  normalize(path: string): string {
    const parts = path.split("/").filter((p) => p !== "");
    const resolved: string[] = [];
    for (const part of parts) {
      if (part === ".") continue;
      if (part === "..") {
        resolved.pop();
      } else {
        resolved.push(part);
      }
    }
    return "/" + resolved.join("/");
  }

  getNode(path: string): FileNode | DirNode | null {
    const resolved = this.resolvePath(path);
    if (resolved === "/") return this.root;
    const parts = resolved.split("/").filter((p) => p !== "");
    let current: FileNode | DirNode = this.root;
    for (const part of parts) {
      if (current.type !== "dir") return null;
      if (!current.children[part]) return null;
      current = current.children[part];
    }
    return current;
  }

  ls(path: string = "."): string[] {
    const node = this.getNode(path);
    if (!node) throw new Error("No such file or directory");
    if (node.type === "file") return [path.split("/").pop()!];
    return Object.keys(node.children).sort();
  }

  cd(path: string): void {
    const node = this.getNode(path);
    if (!node) throw new Error("No such file or directory");
    if (node.type !== "dir") throw new Error("Not a directory");
    this.cwd = this.resolvePath(path);
  }

  mkdir(path: string): void {
    const resolved = this.resolvePath(path);
    const parentPath = resolved.split("/").slice(0, -1).join("/") || "/";
    const name = resolved.split("/").pop()!;
    const parent = this.getNode(parentPath);
    if (!parent || parent.type !== "dir")
      throw new Error("No such file or directory");
    if (parent.children[name]) throw new Error("File exists");
    parent.children[name] = { type: "dir", children: {} };
  }

  touch(path: string): void {
    const resolved = this.resolvePath(path);
    const parentPath = resolved.split("/").slice(0, -1).join("/") || "/";
    const name = resolved.split("/").pop()!;
    const parent = this.getNode(parentPath);
    if (!parent || parent.type !== "dir")
      throw new Error("No such file or directory");
    if (!parent.children[name]) {
      parent.children[name] = { type: "file", content: "" };
    }
  }

  rm(path: string): void {
    const resolved = this.resolvePath(path);
    if (resolved === "/") throw new Error("Cannot remove root");
    const parentPath = resolved.split("/").slice(0, -1).join("/") || "/";
    const name = resolved.split("/").pop()!;
    const parent = this.getNode(parentPath);
    if (!parent || parent.type !== "dir")
      throw new Error("No such file or directory");
    if (!parent.children[name]) throw new Error("No such file or directory");
    delete parent.children[name];
  }

  cat(path: string): string {
    const node = this.getNode(path);
    if (!node) throw new Error("No such file or directory");
    if (node.type !== "file") throw new Error("Is a directory");
    return node.content;
  }
}
