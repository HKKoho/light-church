
import React, { useMemo } from 'react';

interface WordCloudProps {
  words: string[];
  className?: string;
}

const WordCloud: React.FC<WordCloudProps> = ({ words, className = "" }) => {
  const processedWords = useMemo(() => {
    // Basic tokenizer and frequency count
    // In a real app, this would be more complex for Chinese
    // Here we split by spaces, punctuation, or common delimiters
    const freqMap: Record<string, number> = {};
    
    words.forEach(input => {
      // Split by common Chinese/English punctuation and spaces
      const tokens = input.split(/[，。？！\s、；]/).filter(t => t.length > 1);
      tokens.forEach(token => {
        freqMap[token] = (freqMap[token] || 0) + 1;
      });
    });

    const entries = Object.entries(freqMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20); // Top 20 words

    if (entries.length === 0) return [];

    const max = entries[0][1];
    const min = entries[entries.length - 1][1];
    const range = max - min || 1;

    return entries.map(([text, count]) => ({
      text,
      size: 0.8 + ((count - min) / range) * 1.5, // Rem scale
      opacity: 0.5 + ((count - min) / range) * 0.5,
      color: [
        'text-amber-600', 'text-slate-700', 'text-blue-600', 
        'text-amber-800', 'text-slate-500', 'text-emerald-600'
      ][Math.floor(Math.random() * 6)]
    }));
  }, [words]);

  if (processedWords.length === 0) {
    return <div className="text-slate-400 italic py-8">正在收集同學的回應中...</div>;
  }

  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 p-6 bg-white/50 rounded-3xl border border-slate-100 ${className}`}>
      {processedWords.map((word, i) => (
        <span 
          key={i} 
          className={`${word.color} font-bold transition-all hover:scale-110 cursor-default`}
          style={{ 
            fontSize: `${word.size}rem`,
            opacity: word.opacity
          }}
        >
          {word.text}
        </span>
      ))}
    </div>
  );
};

export default WordCloud;
