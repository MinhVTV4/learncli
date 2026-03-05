export async function getAISuggestions(
  input: string,
  history: string[],
): Promise<string[]> {
  if (!input.trim()) return [];
  
  // Simulate a slight delay for realism
  await new Promise(resolve => setTimeout(resolve, 150));

  const lowerInput = input.toLowerCase();
  
  if (lowerInput.startsWith('ls')) {
    return ['ls -la', 'ls -lh', 'ls src'];
  }
  if (lowerInput.startsWith('cd')) {
    return ['cd ..', 'cd /', 'cd workspace'];
  }
  if (lowerInput.startsWith('mk')) {
    return ['mkdir workspace', 'mkdir project', 'mkdir test'];
  }
  if (lowerInput.startsWith('rm')) {
    return ['rm -rf', 'rm notes.txt', 'rm -r workspace'];
  }
  if (lowerInput.startsWith('to')) {
    return ['touch notes.txt', 'touch index.js', 'touch README.md'];
  }
  if (lowerInput.startsWith('ca')) {
    return ['cat readme.txt', 'cat notes.txt'];
  }
  if (lowerInput.startsWith('ec')) {
    return ['echo "Hello World"', 'echo $USER'];
  }
  if (lowerInput.startsWith('gi')) {
    return ['git status', 'git add .', 'git commit -m "init"'];
  }
  if (lowerInput.startsWith('np')) {
    return ['npm install', 'npm run dev', 'npm start'];
  }

  // Default fallback suggestions based on common commands
  return ['ls -la', 'pwd', 'clear'];
}
