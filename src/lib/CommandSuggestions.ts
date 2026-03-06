
export const COMMAND_SUGGESTIONS: Record<string, string[]> = {
  // File System
  ls: ["-l", "-a", "-la", "-R"],
  cd: ["..", "~", "/"],
  mkdir: ["-p"],
  rm: ["-r", "-f", "-rf"],
  cp: ["-r"],
  mv: [],
  touch: [],
  cat: [],
  echo: [],
  grep: ["-r", "-i", "-v"],
  find: [". -name"],
  chmod: ["+x", "777", "755", "644"],
  
  // System
  sudo: [],
  whoami: [],
  clear: [],
  history: [],
  help: [],
  
  // Git
  git: [
    "init",
    "clone",
    "status",
    "add .",
    "commit -m",
    "push",
    "pull",
    "branch",
    "checkout",
    "merge",
    "log",
    "diff",
    "remote add origin"
  ],

  // Network
  curl: [
    "-X GET",
    "-X POST",
    "-d '{}'",
    "-H 'Content-Type: application/json'",
    "-I",
    "https://api.hintshell.com/users",
    "https://google.com"
  ],

  // Docker
  docker: [
    "run",
    "run -d",
    "run -it",
    "ps",
    "ps -a",
    "images",
    "stop",
    "rm",
    "rmi",
    "pull",
    "build -t"
  ],

  // Node/NPM
  npm: ["install", "init", "start", "test", "run"],
  node: ["-v", "--version"],

  // Process Management
  ps: ["aux"],
  kill: ["-9"],
  top: [],

  // Editors
  nano: [],
  vim: [] // Just in case we add vim later
};

export function getCommandSuggestions(input: string): string[] {
  const parts = input.trim().split(/\s+/);
  const cmd = parts[0];
  const lastPart = parts[parts.length - 1];

  // If typing the command itself (no spaces yet)
  if (parts.length === 1) {
    return Object.keys(COMMAND_SUGGESTIONS).filter(c => c.startsWith(cmd) && c !== cmd);
  }

  // If typing arguments for a known command
  if (COMMAND_SUGGESTIONS[cmd]) {
    // Filter suggestions based on what the user is currently typing
    // But exclude what they've already typed if it's a complete flag?
    // Simplified: just return all relevant flags/subcommands that match prefix
    // If last part is empty (space at end), show all
    const prefix = input.endsWith(" ") ? "" : lastPart;
    
    return COMMAND_SUGGESTIONS[cmd]
      .filter(s => s.startsWith(prefix))
      .map(s => {
        // If we have a prefix, we want to complete it. 
        // But the UI might just append. 
        // Let's return the full suggestion string relative to the current word.
        return s;
      });
  }

  return [];
}
