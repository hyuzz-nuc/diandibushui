const parse = (md) => {
  if (!md) return '';
  const lines = md.split('\n');
  let html = '';

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Headers
    if (trimmed.startsWith('# ')) {
      html += `<h1 class="md-h1">${parseInline(trimmed.substring(2))}</h1>`;
    } else if (trimmed.startsWith('## ')) {
      html += `<h2 class="md-h2">${parseInline(trimmed.substring(3))}</h2>`;
    } else if (trimmed.startsWith('### ')) {
      html += `<h3 class="md-h3">${parseInline(trimmed.substring(4))}</h3>`;
    } 
    // Lists
    else if (trimmed.match(/^(\d+\.|-)\s/)) {
      const isOrdered = /^\d+\./.test(trimmed);
      const bullet = isOrdered ? trimmed.match(/^(\d+\.)/)[0] : '•';
      const content = trimmed.replace(/^(\d+\.|-)\s/, '');
      // Use flex layout simulation with inline-blocks or just spans
      html += `<div class="md-li-box"><span class="md-li-bullet">${bullet}</span><span class="md-li-content">${parseInline(content)}</span></div>`;
    }
    // Paragraphs
    else {
      html += `<p class="md-p">${parseInline(trimmed)}</p>`;
    }
  });
  
  return html;

};


const parseInline = (text) => {
  if (!text) return '';
  text = text.replace(/\*\*(.*?)\*\*/g, '<span class="md-strong">$1</span>');
  text = text.replace(/`([^`]+)`/g, '<span class="md-code">$1</span>');
  return text;
};

module.exports = {
  parse
};
