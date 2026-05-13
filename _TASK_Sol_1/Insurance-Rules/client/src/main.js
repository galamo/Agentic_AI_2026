const list = document.getElementById('clauses');
const tpl = document.getElementById('clauseTpl');
const preview = document.getElementById('preview');
const actionSel = document.getElementById('action');
const ragBox = document.getElementById('ragResult');

let previewTimer = null;
let lastSentRule = '';
let lastResponseText = '';

function formatValue(op, raw) {
  const s = (raw || '').trim();
  if (!s) return '…';
  if (op === 'in_range') return '[' + s + ']';
  if (op === 'in_array' || op === 'in' || op === 'not_in') {
    if (s.startsWith('[')) return s;
    return '[' + s + ']';
  }
  if (op === 'in_list') return s.replace(/\s+/g, '_');
  return s;
}

function clauseToString(li, isFirst) {
  const comb = li.querySelector('[data-combinator]').value;
  const attr = li.querySelector('[data-attr]').value;
  const op = li.querySelector('[data-op]').value;
  const val = formatValue(op, li.querySelector('[data-val]').value);
  const part = attr + ' ' + op + ' ' + val;
  return isFirst ? part : comb + ' ' + part;
}

function buildRuleString() {
  const items = list.querySelectorAll('.clause');
  if (!items.length) return '';
  const parts = [];
  items.forEach((li, i) => parts.push(clauseToString(li, i === 0)));
  return 'if ' + parts.join(' ') + ' then ' + actionSel.value;
}

function setStatus(message, ok = false, loading = false) {
  const ragBox = document.getElementById('ragResult');
  ragBox.classList.remove('ok', 'show', 'warning');
  ragBox.innerHTML = (loading ? '<span class="loading"></span>' : '') + message;
  ragBox.classList.add('show');
  if (ok) ragBox.classList.add('ok');
  if (!ok && !loading) ragBox.classList.add('warning');
}

async function sendPreview(rule) {
  if (!rule || rule === lastSentRule) return;
  lastSentRule = rule;
  setStatus('Sending rule to backend for validation...', false, true);

  try {
    const response = await fetch('/insurance-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rule })
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.message || response.statusText || 'Request failed');
    }

    const data = await response.json();
    const result = data.result;
    if (result && typeof result === 'object') {
      let statusText;
      if (result.isExisting) {
        statusText = `⚠️ Rule exists: ${result.reason} (IDs: ${result.matchedRuleIds.join(', ')})`;
        setStatus(statusText, false);
      } else {
        const ruleText = typeof result.rule === 'object' ? result.rule.text : result.rule;
        statusText = `✅ New rule created: ${ruleText}. ${result.reason}`;
        setStatus(statusText, true);
      }
      lastResponseText = result.reason;
    } else {
      lastResponseText = result || 'no response result';
      setStatus(`Backend response: ${lastResponseText}`, true);
    }
  } catch (err) {
    setStatus(`❌ Backend error: ${err.message}`, false);
  }
}

function refreshPreview() {
  const s = buildRuleString();
  if (!s || s.includes('…')) {
    preview.textContent = 'Complete all clause values…';
    preview.classList.add('empty');
    if (previewTimer) clearTimeout(previewTimer);
    setStatus('Waiting for a complete rule before sending.', false);
    return;
  }
  preview.textContent = s;
  preview.classList.remove('empty');

  if (previewTimer) clearTimeout(previewTimer);
}

async function submitRule() {
  const s = buildRuleString();
  if (!s || s.includes('…')) {
    setStatus('Complete all clause values before updating the database.', false);
    return;
  }
  await sendPreview(s);
}

function addClause() {
  const node = tpl.content.cloneNode(true);
  const li = node.querySelector('.clause');
  const isFirst = list.children.length === 0;
  const combLabel = li.querySelector('[data-combinator]').closest('label');
  combLabel.style.visibility = isFirst ? 'hidden' : 'visible';
  if (isFirst) li.querySelector('[data-combinator]').value = 'and';

  li.querySelector('[data-remove]').addEventListener('click', () => {
    li.remove();
    renumberClauses();
    refreshPreview();
  });

  li.querySelector('[data-duplicate]').addEventListener('click', () => {
    const clonedNode = li.cloneNode(true);
    const clonedLi = clonedNode;
    clonedLi.querySelector('[data-remove]').addEventListener('click', () => {
      clonedLi.remove();
      renumberClauses();
      refreshPreview();
    });
    clonedLi.querySelector('[data-duplicate]').addEventListener('click', () => {
      const newCloned = clonedLi.cloneNode(true);
      const newLi = newCloned;
      newLi.querySelector('[data-remove]').addEventListener('click', () => {
        newLi.remove();
        renumberClauses();
        refreshPreview();
      });
      newLi.querySelector('[data-duplicate]').addEventListener('click', duplicateHandler);
      ['[data-combinator]', '[data-attr]', '[data-op]', '[data-val]'].forEach((sel) => {
        const element = newLi.querySelector(sel);
        element.addEventListener('input', refreshPreview);
        element.addEventListener('change', refreshPreview);
      });
      li.parentNode.insertBefore(newLi, li.nextSibling);
      renumberClauses();
      refreshPreview();
    });
    ['[data-combinator]', '[data-attr]', '[data-op]', '[data-val]'].forEach((sel) => {
      const element = clonedLi.querySelector(sel);
      element.addEventListener('input', refreshPreview);
      element.addEventListener('change', refreshPreview);
    });
    li.parentNode.insertBefore(clonedLi, li.nextSibling);
    renumberClauses();
    refreshPreview();
  });

  ['[data-combinator]', '[data-attr]', '[data-op]', '[data-val]'].forEach((sel) => {
    const element = li.querySelector(sel);
    element.addEventListener('input', refreshPreview);
    element.addEventListener('change', refreshPreview);
  });

  list.appendChild(li);
  renumberClauses();
  refreshPreview();
}

function renumberClauses() {
  list.querySelectorAll('.clause').forEach((li, i) => {
    const lab = li.querySelector('[data-combinator]').closest('label');
    lab.style.visibility = i === 0 ? 'hidden' : 'visible';
  });
}

function init() {
  document.getElementById('addClause').addEventListener('click', addClause);
  actionSel.addEventListener('change', refreshPreview);

  document.getElementById('copyRule').addEventListener('click', submitRule);

  document.getElementById('mockRag').addEventListener('click', () => {
    const s = buildRuleString().toLowerCase();
    ragBox.classList.remove('ok', 'show');
    if (!s || s.includes('…')) {
      ragBox.textContent = 'Complete the rule first.';
      ragBox.classList.add('show');
      return;
    }
    const hasIsrael = s.includes('israel');
    const surcharge = s.includes('increase_premium');
    const singleCountry =
      s.includes('driver_country') &&
      s.includes(' is ') &&
      !s.includes('[israel, spain]');

    if (hasIsrael && surcharge && singleCountry) {
      ragBox.classList.add('show');
      ragBox.innerHTML =
        '<strong>Possible overlap (demo)</strong><br/>' +
        'Corpus may already contain: <code>if driver_country in [israel, spain] then increase_premium</code> (id r009). ' +
        'Your rule is subsumed if the action matches.';
      return;
    }

    ragBox.classList.add('show', 'ok');
    ragBox.textContent =
      'Demo: no hardcoded match. In the real lab, run pgvector retrieval + LangGraph validation.';
  });

  addClause();
}

init();
