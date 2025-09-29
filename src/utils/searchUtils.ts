// Utility functions for text search without accents

export function removeAccents(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function highlightText(text: string, searchTerm: string): string {
  if (!searchTerm.trim()) return text;
  
  const normalizedSearch = removeAccents(searchTerm);
  const words = normalizedSearch.split(/\s+/).filter(word => word.length > 0);
  
  let highlightedText = text;
  
  words.forEach(word => {
    const regex = new RegExp(
      `(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'gi'
    );
    
    // Find matches in the normalized text but highlight in the original
    const normalizedText = removeAccents(text);
    const matches = [...normalizedText.matchAll(new RegExp(word, 'gi'))];
    
    // Sort matches by position (descending) to avoid index shifting
    matches.reverse().forEach(match => {
      if (match.index !== undefined) {
        const start = match.index;
        const end = start + match[0].length;
        const originalMatch = text.substring(start, end);
        
        highlightedText = 
          highlightedText.substring(0, start) +
          `<mark class="bg-yellow-200 dark:bg-yellow-600 px-1 rounded">${originalMatch}</mark>` +
          highlightedText.substring(end);
      }
    });
  });
  
  return highlightedText;
}

export function searchInText(text: string, searchTerm: string): boolean {
  if (!searchTerm.trim()) return false;
  
  const normalizedText = removeAccents(text);
  const normalizedSearch = removeAccents(searchTerm);
  
  // Split search term into words
  const searchWords = normalizedSearch.split(/\s+/).filter(word => word.length > 0);
  
  // Check if all words are found in the text
  return searchWords.every(word => normalizedText.includes(word));
}