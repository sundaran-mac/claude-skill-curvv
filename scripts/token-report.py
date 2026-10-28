"""Token use for one day (local time), from the Claude Code session logs.

Usage: python3 -I token-report.py [YYYY-MM-DD] [project-dir-name]
Run it from the repo folder, or pass the folder name under ~/.claude/projects/.
Counts each API call once. "Context re-read" is cache read + cache write + fresh input:
the tokens the model had to take in. Output includes thinking.
"""
import collections, datetime, glob, json, os, re, sys

TZ = datetime.datetime.now().astimezone().tzinfo
day = sys.argv[1] if len(sys.argv) > 1 else datetime.datetime.now(TZ).strftime('%Y-%m-%d')
# Claude Code names a project's log folder after its path, with every other character as '-'.
proj = sys.argv[2] if len(sys.argv) > 2 else re.sub(r'[^A-Za-z0-9]', '-', os.getcwd())
root = os.path.expanduser(f'~/.claude/projects/{proj}')
start = datetime.datetime.fromisoformat(day).replace(tzinfo=TZ).timestamp() - 86400

def agent_type(path):
    meta = path.replace('.jsonl', '.meta.json')
    try:
        return json.load(open(meta)).get('agentType', '?')
    except (OSError, ValueError):
        return '?'

rows = {}
seen = set()
for f in glob.glob(root + '/**/*.jsonl', recursive=True):
    if os.path.getmtime(f) < start:
        continue
    kind = 'agent:' + agent_type(f) if '/subagents/' in f else 'lead'
    c = collections.Counter()
    for line in open(f, errors='ignore'):
        try:
            d = json.loads(line)
        except ValueError:
            continue
        m = d.get('message') or {}
        u = m.get('usage')
        if d.get('type') != 'assistant' or not u or not d.get('timestamp'):
            continue
        t = datetime.datetime.fromisoformat(d['timestamp'].replace('Z', '+00:00')).astimezone(TZ)
        if t.strftime('%Y-%m-%d') != day:
            continue
        key = (m.get('id'), d.get('requestId'))
        if key in seen:
            continue
        seen.add(key)
        ctx = u.get('input_tokens', 0) + u.get('cache_creation_input_tokens', 0) + u.get('cache_read_input_tokens', 0)
        c['calls'] += 1
        c['ctx'] += ctx
        c['write'] += u.get('cache_creation_input_tokens', 0)
        c['out'] += u.get('output_tokens', 0)
        c['peak'] = max(c['peak'], ctx)
        c['model:' + m.get('model', '?')] += 1
    if c['calls']:
        rows[f] = (kind, c)

if not rows:
    sys.exit(f'No calls found for {day} in {root}.')

total = collections.Counter()
by_kind = collections.defaultdict(collections.Counter)
models = collections.Counter()
for kind, c in rows.values():
    total.update({k: v for k, v in c.items() if k != 'peak'})
    g = by_kind[kind]
    g.update({k: v for k, v in c.items() if not k.startswith('model:') and k != 'peak'})
    g['n'] += 1
    g['peak'] = max(g['peak'], c['peak'])
    models.update({k[6:]: v for k, v in c.items() if k.startswith('model:')})

M = lambda x: f'{x / 1e6:,.1f}M'
print(f'Token report for {day} (local time)')
print(f'  API calls:        {total["calls"]:,}')
print(f'  Context re-read:  {M(total["ctx"])}  (cache write {M(total["write"])})')
print(f'  Output:           {M(total["out"])}')
print(f'  Avg context/call: {total["ctx"] / total["calls"] / 1e3:,.0f}K')
print('  Calls by model:   ' + ', '.join(f'{k} {v:,}' for k, v in models.most_common()))
print()
print(f'  {"who":28} {"count":>5} {"calls":>6} {"re-read":>9} {"share":>6} {"avg ctx":>8} {"peak":>7}')
for kind, g in sorted(by_kind.items(), key=lambda kv: -kv[1]['ctx']):
    print(f'  {kind:28} {g["n"]:>5} {g["calls"]:>6} {M(g["ctx"]):>9} {g["ctx"] / total["ctx"]:>6.0%} '
          f'{g["ctx"] / g["calls"] / 1e3:>7,.0f}K {g["peak"] / 1e3:>6,.0f}K')
print()
print('  Top 8 transcripts:')
for f, (kind, c) in sorted(rows.items(), key=lambda kv: -kv[1][1]['ctx'])[:8]:
    print(f'    {os.path.basename(f)[:28]:28} {kind:22} {c["calls"]:>4} calls {M(c["ctx"]):>8} peak {c["peak"] / 1e3:,.0f}K')
