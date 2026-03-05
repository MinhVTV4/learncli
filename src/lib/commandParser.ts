
/**
 * Splits a string by a separator, respecting quotes.
 * Example: 'echo "a | b" | cat' split by '|' -> ['echo "a | b" ', ' cat']
 */
export function splitBy(text: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuote: '"' | "'" | null = null;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
      }
      current += char;
    } else {
      if (char === '"' || char === "'") {
        inQuote = char;
        current += char;
      } else if (char === separator) {
        result.push(current);
        current = '';
        continue; // Skip the separator
      } else {
        current += char;
      }
    }
  }
  
  result.push(current);
  return result;
}

/**
 * Tokenizes a command string into arguments, stripping outer quotes.
 * Example: 'echo "hello world"' -> ['echo', 'hello world']
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuote: '"' | "'" | null = null;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
        // Don't add the quote char to current
      } else {
        current += char;
      }
    } else {
      if (char === '"' || char === "'") {
        inQuote = char;
      } else if (/\s/.test(char)) {
        if (current.length > 0) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
  }
  
  if (current.length > 0) {
    tokens.push(current);
  }
  
  return tokens;
}

/**
 * Parses a full command line into a pipeline of commands.
 */
export interface CommandSegment {
  args: string[];
  redirectTarget?: string;
  append?: boolean;
}

export function parsePipeline(commandLine: string): CommandSegment[] {
  // 1. Split by pipe |
  const pipeSegments = splitBy(commandLine, '|');
  
  return pipeSegments.map(segment => {
    const trimmed = segment.trim();
    if (!trimmed) return { args: [] };

    // 2. Check for redirection > or >>
    // We need to find the last > or >> that is NOT in quotes
    // This is tricky with the simple splitBy. 
    // Let's use a regex approach on the unquoted string or just manual scan backwards?
    // Manual scan is safer.
    
    let redirectTarget: string | undefined;
    let append = false;
    let commandText = trimmed;

    // Scan for redirection operators outside quotes
    let inQuote: '"' | "'" | null = null;
    let redirectIdx = -1;
    let redirectType = ''; // '>' or '>>'

    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];
      if (inQuote) {
        if (char === inQuote) inQuote = null;
      } else {
        if (char === '"' || char === "'") inQuote = char;
        else if (char === '>') {
          // Check if next is >
          if (trimmed[i+1] === '>') {
            redirectIdx = i;
            redirectType = '>>';
            i++; // Skip next
          } else {
            redirectIdx = i;
            redirectType = '>';
          }
        }
      }
    }

    if (redirectIdx !== -1) {
      commandText = trimmed.substring(0, redirectIdx).trim();
      const targetPart = trimmed.substring(redirectIdx + redirectType.length).trim();
      // Tokenize targetPart to get the filename (first token)
      const targetTokens = tokenize(targetPart);
      if (targetTokens.length > 0) {
        redirectTarget = targetTokens[0];
        append = redirectType === '>>';
      }
    }

    return {
      args: tokenize(commandText),
      redirectTarget,
      append
    };
  });
}
