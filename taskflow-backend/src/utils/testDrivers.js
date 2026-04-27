/**
 * testDrivers.js — Auto-generates LeetCode-style test-case driver code
 * for every Adaptive Learning question (arrays, strings, DP, graphs, etc.).
 *
 * For each question + language it returns { prepend, append } strings that
 * are wrapped around the student's code before sending to Judge0.
 */

const fs = require('fs');
const path = require('path');
const { getCustomDriver } = require('./customDrivers');

/* ═══════════════════════════════════════════════════════════════
   1. Load every question JSON into a flat lookup map
   ═══════════════════════════════════════════════════════════════ */
const QUESTIONS_DIR = path.join(__dirname, '..', 'data', 'questions');
const questionMap = {};
try {
    for (const f of fs.readdirSync(QUESTIONS_DIR).filter(f => f.endsWith('.json'))) {
        for (const q of JSON.parse(fs.readFileSync(path.join(QUESTIONS_DIR, f), 'utf8'))) {
            questionMap[q.id] = q;
        }
    }
    console.log(`[testDrivers] loaded ${Object.keys(questionMap).length} questions`);
} catch (e) {
    console.warn('[testDrivers] could not load questions:', e.message);
}

/* ═══════════════════════════════════════════════════════════════
   2. Questions too complex to auto-drive (class-based DS, cycles…)
   ═══════════════════════════════════════════════════════════════ */
const SKIP_IDS = new Set([
    'implement-stack-using-queues',
    'min-stack',
    'implement-queue-using-stacks',
    'clone-graph',
    'copy-list-with-random-pointer',
    'serialize-and-deserialize-binary-tree',
    'flatten-multilevel-doubly-linked-list',
    'linked-list-cycle-ii',
    'delete-node-in-a-linked-list',
    'lowest-common-ancestor-of-a-binary-tree',
]);

/* ═══════════════════════════════════════════════════════════════
   3. Helper code snippets (injected as PREPEND before user code)
   ═══════════════════════════════════════════════════════════════ */

// ── JavaScript ──
const JS_LIST = [
    'class ListNode{constructor(v,n){this.val=v===undefined?0:v;this.next=n===undefined?null:n}}',
    'function _a2l(a){if(!a||!a.length)return null;let d=new ListNode(0),c=d;for(const v of a){c.next=new ListNode(v);c=c.next}return d.next}',
    'function _l2a(h){let a=[];while(h){a.push(h.val);h=h.next}return a}',
].join('\n');

const JS_TREE = [
    'class TreeNode{constructor(v,l,r){this.val=v===undefined?0:v;this.left=l===undefined?null:l;this.right=r===undefined?null:r}}',
    'function _a2t(a){if(!a||!a.length||a[0]===null)return null;let r=new TreeNode(a[0]),q=[r],i=1;while(q.length&&i<a.length){let n=q.shift();if(i<a.length&&a[i]!==null&&a[i]!==undefined){n.left=new TreeNode(a[i]);q.push(n.left)}i++;if(i<a.length&&a[i]!==null&&a[i]!==undefined){n.right=new TreeNode(a[i]);q.push(n.right)}i++}return r}',
    'function _t2a(r){if(!r)return[];let res=[],q=[r];while(q.length){let n=q.shift();if(n){res.push(n.val);q.push(n.left);q.push(n.right)}else res.push(null)}while(res.length&&res[res.length-1]===null)res.pop();return res}',
].join('\n');

const JS_FMT = 'function _fmt(r){if(r===undefined)return"undefined";if(r===null)return"null";if(typeof r==="object"&&r!==null){if(typeof _t2a==="function"&&"val"in r&&"left"in r)return JSON.stringify(_t2a(r));if(typeof _l2a==="function"&&"val"in r&&"next"in r)return JSON.stringify(_l2a(r))}return JSON.stringify(r)}';

// ── Python ──
const PY_LIST = `class ListNode:
    def __init__(self,val=0,next=None):
        self.val=val;self.next=next
def _a2l(a):
    if not a:return None
    d=ListNode(0);c=d
    for v in a:
        c.next=ListNode(v);c=c.next
    return d.next
def _l2a(h):
    a=[]
    while h:
        a.append(h.val);h=h.next
    return a`;

const PY_TREE = `class TreeNode:
    def __init__(self,val=0,left=None,right=None):
        self.val=val;self.left=left;self.right=right
def _a2t(a):
    if not a or a[0] is None:return None
    r=TreeNode(a[0]);q=[r];i=1
    while q and i<len(a):
        n=q.pop(0)
        if i<len(a) and a[i] is not None:
            n.left=TreeNode(a[i]);q.append(n.left)
        i+=1
        if i<len(a) and a[i] is not None:
            n.right=TreeNode(a[i]);q.append(n.right)
        i+=1
    return r
def _t2a(r):
    if not r:return[]
    res=[];q=[r]
    while q:
        n=q.pop(0)
        if n:
            res.append(n.val);q.append(n.left);q.append(n.right)
        else:
            res.append(None)
    while res and res[-1] is None:res.pop()
    return res`;

const PY_FMT = `def _fmt(v):
    if v is None:return "null"
    try:
        if hasattr(v,"left") and hasattr(v,"right"):return _json.dumps(_t2a(v),separators=(',',':'))
    except:pass
    try:
        if hasattr(v,"val") and hasattr(v,"next"):return _json.dumps(_l2a(v),separators=(',',':'))
    except:pass
    if isinstance(v,bool):return str(v).lower()
    if isinstance(v,str):return _json.dumps(v)
    if isinstance(v,list):return _json.dumps(v,separators=(',',':'))
    return str(v)`;

/* ═══════════════════════════════════════════════════════════════
   4. Param-name sets (for detecting linked-list / tree params)
   ═══════════════════════════════════════════════════════════════ */
const LIST_PARAMS = new Set([
    'head','list1','list2','l1','l2','head1','head2','node','lists',
]);
const TREE_PARAMS = new Set(['root','p','q']);

/* ═══════════════════════════════════════════════════════════════
   5. Utility — extract function name (LAST match to skip comments)
   ═══════════════════════════════════════════════════════════════ */
function extractFnName(code, lang) {
    if (!code) return null;
    let re;
    if (lang === 'python') re = /def\s+(\w+)\s*\(/g;
    else if (lang === 'java') re = /(?:public|private|protected)?\s*(?:static\s+)?[\w<>[\]]+\s+(\w+)\s*\(/g;
    else re = /function\s+(\w+)\s*\(/g;
    
    let m, last = null;
    while ((m = re.exec(code)) !== null) {
        if (lang === 'java' && ['main', 'Solution', 'if', 'for', 'while', 'catch', 'switch'].includes(m[1])) continue;
        last = m[1];
    }
    return last;
}

function extractParams(code, lang) {
    if (!code) return [];
    let re;
    if (lang === 'python') re = /def\s+\w+\s*\(([^)]*)\)/g;
    else if (lang === 'java') re = /(?:public|private|protected)?\s*(?:static\s+)?[\w<>[\]]+\s+\w+\s*\(([^)]*)\)/g;
    else re = /function\s+\w+\s*\(([^)]*)\)/g;
    
    let m, last = null;
    while ((m = re.exec(code)) !== null) {
        // basic heuristic to avoid grabbing main's arguments over the actual solution method
        if (lang === 'java' && m[0].includes('main(')) continue;
        last = m[1];
    }
    if (!last) return [];
    
    if (lang === 'java') {
        const parts = last.split(',');
        return parts.map(p => {
            const tokens = p.trim().split(/\s+/);
            return tokens[tokens.length - 1]; // parameter name is the last token
        }).filter(p => p);
    }
    
    return last.split(',')
        .map(p => p.trim().split(':')[0].split('=')[0].trim())
        .filter(p => p && p !== 'self');
}

/* ═══════════════════════════════════════════════════════════════
   6. Bracket-/quote-aware input-string parser
      "image = [[1,1,1]], sr = 1, color = 2"
      →  [{key:'image', value:'[[1,1,1]]'}, {key:'sr',value:'1'}, …]
   ═══════════════════════════════════════════════════════════════ */
function parseInput(s) {
    if (!s) return [];
    const parts = [];
    let depth = 0, inQ = false, qC = '', cur = '';
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (inQ) { cur += ch; if (ch === qC && s[i - 1] !== '\\') inQ = false; continue; }
        if (ch === '"' || ch === "'") { inQ = true; qC = ch; cur += ch; continue; }
        if (ch === '[') { depth++; cur += ch; continue; }
        if (ch === ']') { depth--; cur += ch; continue; }
        if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; continue; }
        cur += ch;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts.map(p => {
        const eq = p.indexOf('=');
        if (eq === -1) return { key: '', val: p.trim() };
        const k = p.substring(0, eq).trim();
        return /^\w+$/.test(k)
            ? { key: k, val: p.substring(eq + 1).trim() }
            : { key: '', val: p.trim() };
    });
}

/* ═══════════════════════════════════════════════════════════════
   7. Escape helpers for embedding strings in generated code
   ═══════════════════════════════════════════════════════════════ */
function esc(s) { return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n'); }

/* ═══════════════════════════════════════════════════════════════
   8. MAIN — generate { prepend, append } for a question+language
   ═══════════════════════════════════════════════════════════════ */
function generateTestDriver(questionId, langKey) {
    const q = questionMap[questionId];
    if (!q) return null;
    
    if (SKIP_IDS.has(questionId)) {
        return getCustomDriver(questionId, langKey);
    }
    const examples = q.examples || [];
    if (!examples.length) return null;

    const defCode = langKey === 'python' ? q.defaultCodePY : q.defaultCodeJS;
    if (!defCode) return null;
    const fnName = extractFnName(defCode, langKey);
    if (!fnName) return null;
    const params = extractParams(defCode, langKey);

    // Check ALL defaultCode fields for data structure usage (not just current language)
    const allCode = [q.defaultCodeJS, q.defaultCodePY, q.defaultCodeCPP, q.defaultCodeJAVA, q.defaultCodeC].join(' ');
    const isList = allCode.includes('ListNode');
    // Also detect tree questions by checking example inputs for tree-like params
    const hasTreeParam = examples.some(ex => /\broot\s*=\s*\[/.test(ex.input) || /\bp\s*=\s*\[.*\],\s*q\s*=\s*\[/.test(ex.input));
    const isTree = allCode.includes('TreeNode') || hasTreeParam;
    const isPyClass = langKey === 'python' && defCode.includes('class Solution');

    if (langKey === 'javascript') {
        return buildJS(fnName, params, examples, isList, isTree);
    } else if (langKey === 'python') {
        return buildPY(fnName, params, examples, isList, isTree, isPyClass);
    } else if (langKey === 'java') {
        return buildJAVA(fnName, params, examples, isList, isTree);
    }
    
    // Auto-test drivers not yet implemented for statically-typed languages (C++, C)
    return null;
}

/* ── JavaScript driver builder ──────────────────────────────── */
function buildJS(fn, params, examples, isList, isTree) {
    let prepend = '';
    if (isList) prepend += JS_LIST + '\n';
    if (isTree) prepend += JS_TREE + '\n';

    let app = '\n// --- SYSTEM TEST DRIVER ---\n' + JS_FMT + '\n';

    for (let t = 0; t < examples.length; t++) {
        const ex = examples[t];
        const parts = parseInput(ex.input);
        const defs = [], refs = [];
        let firstLL = null;

        for (let i = 0; i < parts.length; i++) {
            const pn = params[i] || parts[i].key || `a${i}`;
            const v = parts[i].val;

            if (isList && LIST_PARAMS.has(pn)) {
                const vn = `_ll${t}_${i}`;
                defs.push(v.startsWith('[[')
                    ? `const ${vn}=${v}.map(_x=>_a2l(_x));`
                    : `const ${vn}=_a2l(${v});`);
                refs.push(vn);
                if (!firstLL) firstLL = vn;
            } else if (isTree && TREE_PARAMS.has(pn) && v.startsWith('[')) {
                const vn = `_tt${t}_${i}`;
                defs.push(`const ${vn}=_a2t(${v});`);
                refs.push(vn);
            } else {
                refs.push(v);
            }
        }

        app += defs.join('\n') + (defs.length ? '\n' : '');
        app += `const _r${t}=${fn}(${refs.join(',')});\n`;

        const outExpr = (isList && firstLL)
            ? `_fmt(_r${t}!==undefined?_r${t}:${firstLL})`
            : `_fmt(_r${t})`;

        app += `console.log("Test Case ${t + 1}:");\n`;
        app += `console.log("Input: ${esc(ex.input)}");\n`;
        app += `console.log("Output:",${outExpr});\n`;
        app += `console.log("Expected:",${JSON.stringify(ex.output)});\n`;
        app += `console.log("");\n`;
    }
    return { prepend, append: app };
}

/* ── Python driver builder ──────────────────────────────────── */
function buildPY(fn, params, examples, isList, isTree, isClass) {
    let prepend = '';
    if (isList) prepend += PY_LIST + '\n';
    if (isTree) prepend += PY_TREE + '\n';

    let app = '\n# --- SYSTEM TEST DRIVER ---\n';
    app += 'import json as _json\n';
    app += PY_FMT + '\n';
    if (isClass) app += '_sol=Solution()\n';

    for (let t = 0; t < examples.length; t++) {
        const ex = examples[t];
        const parts = parseInput(ex.input);
        const defs = [], refs = [];
        let firstLL = null;

        for (let i = 0; i < parts.length; i++) {
            const pn = params[i] || parts[i].key || `a${i}`;
            let v = parts[i].val;
            // Python literals
            v = v.replace(/\bnull\b/g, 'None');
            v = v.replace(/\btrue\b/g, 'True');
            v = v.replace(/\bfalse\b/g, 'False');

            if (isList && LIST_PARAMS.has(pn)) {
                const vn = `_ll${t}_${i}`;
                defs.push(v.startsWith('[[')
                    ? `${vn}=[_a2l(_x) for _x in ${v}]`
                    : `${vn}=_a2l(${v})`);
                refs.push(vn);
                if (!firstLL) firstLL = vn;
            } else if (isTree && TREE_PARAMS.has(pn) && v.startsWith('[')) {
                const vn = `_tt${t}_${i}`;
                defs.push(`${vn}=_a2t(${v})`);
                refs.push(vn);
            } else {
                refs.push(v);
            }
        }

        const caller = isClass ? `_sol.${fn}` : fn;

        app += defs.join('\n') + (defs.length ? '\n' : '');
        app += `_r${t}=${caller}(${refs.join(',')})\n`;

        const outExpr = (isList && firstLL)
            ? `_fmt(_r${t} if _r${t} is not None else ${firstLL})`
            : `_fmt(_r${t})`;

        app += `print("Test Case ${t + 1}:")\n`;
        app += `print("Input: ${esc(ex.input)}")\n`;
        app += `print("Output:",${outExpr})\n`;
        app += `print("Expected:",${JSON.stringify(ex.output)})\n`;
        app += `print()\n`;
    }
    return { prepend, append: app };
}

/* ── Java driver builder ────────────────────────────────────── */
function buildJAVA(fn, params, examples, isList, isTree) {
    if (isList || isTree) return null; // Fallback for complex structural questions
    
    let app = '\n// --- SYSTEM TEST DRIVER ---\n';
    app += 'public class Main {\n';
    app += '    public static void main(String[] args) {\n';
    app += '        Solution sol = new Solution();\n';
    
    for (let t = 0; t < examples.length; t++) {
        const ex = examples[t];
        const parts = parseInput(ex.input);
        
        let refs = [];
        for (let i = 0; i < parts.length; i++) {
            let v = parts[i].val;
            
            // Transform array syntaxes
            if (v.startsWith('[') && !v.startsWith('[[')) {
                if (v.includes('"')) {
                    v = 'new String[]{' + v.substring(1, v.length-1) + '}';
                } else {
                    v = 'new int[]{' + v.substring(1, v.length-1) + '}';
                }
            } else if (v.startsWith('[[')) {
                v = 'new int[][]{' + v.substring(1, v.length-1).replace(/\[/g, '{').replace(/\]/g, '}') + '}';
            } else if (v === 'null') {
                v = 'null';
            }
            
            refs.push(v);
        }
        
        app += `        System.out.println("Test Case ${t + 1}:");\n`;
        app += `        System.out.println("Input: ${esc(ex.input)}");\n`;
        
        app += `        Object result${t} = sol.${fn}(${refs.join(', ')});\n`;
        app += `        System.out.println("Output: " + formatOutput(result${t}));\n`;
        app += `        System.out.println("Expected: ${esc(JSON.stringify(ex.output))}\\n");\n`;
    }
    app += '    }\n\n';
    
    app += `    private static String formatOutput(Object obj) {
        if (obj == null) return "null";
        if (obj instanceof int[]) return java.util.Arrays.toString((int[])obj);
        if (obj instanceof String[]) return java.util.Arrays.toString((String[])obj);
        if (obj instanceof int[][]) return java.util.Arrays.deepToString((int[][])obj);
        if (obj instanceof String) return "\\"" + obj + "\\"";
        return String.valueOf(obj);
    }
}\n`;
    
    return { prepend: '', append: app };
}

/* ═══════════════════════════════════════════════════════════════
   9. Convenience — wraps user code with driver prepend/append
   ═══════════════════════════════════════════════════════════════ */
function buildFinalCode(userCode, questionId, langKey) {
    if (!questionId) return userCode;
    const driver = generateTestDriver(questionId, langKey);
    if (!driver) return userCode;
    let out = '';
    if (driver.prepend) out += driver.prepend + '\n\n';
    out += userCode;
    if (driver.append) out += '\n\n' + driver.append;
    return out;
}

module.exports = { buildFinalCode, generateTestDriver, questionMap };
