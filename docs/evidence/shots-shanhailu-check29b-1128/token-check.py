#!/usr/bin/env python3
"""check29b token check: for each changed line pair in `git diff BASE HEAD -- js css index.html tests`,
strip string literals (', ", ` ; template ${...} expressions kept as code) and comments (//, /* */),
then compare the remaining non-string tokens. Also flags changed strings that sit on a `name:`/`id:` key,
digit changes, and any migrate/SCHEMA mention on changed lines.
usage: python3 token-check.py BASE HEAD"""
import re, subprocess, sys
base, head = sys.argv[1], sys.argv[2]
diff = subprocess.run(['git','diff','-U0',base,head,'--','js','css','index.html','tests'],capture_output=True,text=True,check=True).stdout

def strip(line):
    out=[]; strs=[]; i=0; n=len(line)
    while i<n:
        c=line[i]
        if line.startswith('//',i): strs.append(('C',line[i:])); break
        if line.startswith('/*',i):
            j=line.find('*/',i+2); j = n if j<0 else j+2
            strs.append(('C',line[i:j])); out.append(' '); i=j; continue
        if c in '\'"':
            j=i+1; buf=''
            while j<n and line[j]!=c:
                if line[j]=='\\': buf+=line[j:j+2]; j+=2; continue
                buf+=line[j]; j+=1
            strs.append(('S',buf)); out.append(' STR '); i=j+1; continue
        if c=='`':
            j=i+1; buf=''
            out.append(' TPL[')
            while j<n and line[j]!='`':
                if line[j]=='\\': buf+=line[j:j+2]; j+=2; continue
                if line.startswith('${',j):
                    d=1; k=j+2
                    while k<n and d: d += {'{':1,'}':-1}.get(line[k],0); k+=1
                    out.append(' ${ '+strip(line[j+2:k-1])[0]+' } '); j=k; continue
                buf+=line[j]; j+=1
            strs.append(('S',buf)); out.append(' ]TPL '); i=j+1; continue
        out.append(c); i+=1
    toks=re.findall(r'[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|\S',''.join(out))
    return ' '.join(toks), strs

def keyed(line):  # string values on name:/id: keys
    return re.findall(r'\b(name|id)\s*:\s*([\'"`])(.*?)\2', line)

def filemeta(rev, path):
    try: src=subprocess.run(['git','show',f'{rev}:{path}'],capture_output=True,text=True,check=True).stdout.splitlines()
    except subprocess.CalledProcessError: return {},{}
    inblk={}; sect={}; state=False; cur=None
    for i,l in enumerate(src,1):
        inblk[i]=state  # line begins inside a /* */ block
        m=re.match(r'\s*const ([A-Z_]+)\s*=',l)
        if m: cur=m[1]
        sect[i]=cur
        # crude scan of block-comment state, ignoring strings
        t=re.sub(r"'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"",'',l)
        j=0
        while True:
            if state:
                k=t.find('*/',j)
                if k<0: break
                state=False; j=k+2
            else:
                k1=t.find('/*',j); k2=t.find('//',j)
                if k1<0 or (0<=k2<k1): break
                state=True; j=k1+2
    return inblk,sect
META={}
def meta(rev,path):
    if (rev,path) not in META: META[(rev,path)]=filemeta(rev,path)
    return META[(rev,path)]
fail=0; pairs=0; f=None; rem=[]; add=[]
def flush():
    global fail,pairs,rem,add
    if len(rem)!=len(add):
        print(f'FAIL {f}: unequal hunk -{len(rem)} +{len(add)}'); fail+=1
    for (ln_o,o),(ln_n,a) in zip(rem,add):
        pairs+=1
        ob,os_=meta(base,f); nb,ns=meta(head,f)
        if ob.get(ln_o) and nb.get(ln_n) and '*/' not in o and '*/' not in a:
            to,ta='<block-comment>','<block-comment>'; kind='block-comment line'
        else:
            to,_=strip(o); ta,_=strip(a); kind='code/inline'
        bad=[]
        if to!=ta: bad.append('non-string tokens differ')
        if keyed(o)!=keyed(a):
            sec=ns.get(ln_n)
            ids=[k for k in zip(keyed(o),keyed(a)) if k[0][0]=='id' and k[0]!=k[1]]
            if sec=='NPCS' or ids or len(keyed(o))!=len(keyed(a)): bad.append(f'name:/id: value changed in {sec}')
            else: print(f'NOTE {f} -{ln_o}/+{ln_n}: name: string changed in const {sec} (not NPCS): {keyed(o)} -> {keyed(a)}')
        if re.findall(r'\d+',to)!=re.findall(r'\d+',ta): bad.append('number changed')
        print(f'ok  {f} -{ln_o}/+{ln_n} [{kind}]' if not bad else '', end='\n' if not bad else '')
        if re.search(r'migrate|SCHEMA',o+a): bad.append('migrate/SCHEMA line touched')
        if bad:
            fail+=1; print(f'FAIL {f} -{ln_o}/+{ln_n}: {"; ".join(bad)}\n  - {o}\n  + {a}\n  tok- {to}\n  tok+ {ta}')
    rem=[];add=[]
for l in diff.splitlines():
    if l.startswith('diff --git'): flush(); f=l.split(' b/')[-1]
    elif l.startswith('@@'):
        flush(); m=re.match(r'@@ -(\d+)(?:,\d+)? \+(\d+)',l); lo,ln=int(m[1]),int(m[2])
    elif l.startswith('---') or l.startswith('+++'): pass
    elif l.startswith('-'): rem.append((lo,l[1:])); lo+=1
    elif l.startswith('+'): add.append((ln,l[1:])); ln+=1
flush()
print(f'pairs checked: {pairs}; failures: {fail}')
sys.exit(1 if fail else 0)
