import re, sys, subprocess, os, glob, collections, shutil
PN=['node','/workspaces/PNut-TS/dist/pnut-ts.js']
def lst_bytes(path):
    b=bytearray()
    for line in open(path):
        m=re.match(r'^([0-9A-F]{5})- ((?:[0-9A-F]{2} ?)+)', line)
        if m: b+=bytes(int(x,16) for x in m.group(2).split())
    return b
def rl(b,o): return int.from_bytes(b[o:o+4],'little')
def meta(b, base):
    n=0
    while rl(b, base+n*8) & 0x80000000 == 0: n+=1
    m=0; meths=[]
    while rl(b, base+n*8+m*4) & 0x80000000: meths.append(base + (rl(b, base+n*8+m*4) & 0xFFFFF)); m+=1
    size=rl(b, base+n*8+m*4)
    return n, meths, size
def walk(b, base, vbase, path, out):
    n=meta(b, base)[0]
    for i in range(n):
        co=rl(b, base+i*8); vo=rl(b, base+i*8+4)
        cb=base+co; vb=vbase+vo; p=path+(i,)
        out.append((p, cb, vb))
        walk(b, cb, vb, p, out)
def map_details(path):
    txt=open(path).read()
    sec=txt.split('=== OBJECT DETAILS ===')[1].split('=== ADDRESS INDEX ===')[0]
    rows=[]
    for blk in re.split(r'(?m)^--- ', sec)[1:]:
        name=blk.split(' ---')[0]
        loc=re.search(r'Location: \$([0-9A-F]+)', blk); vb=re.search(r'VAR Base: \$([0-9A-F]+)', blk)
        rows.append((name, int(loc.group(1),16), int(vb.group(1),16)))
    return txt, rows
def run(top, workdir, extra):
    r=subprocess.run(PN+extra+['-m','-l',top], cwd=workdir, capture_output=True, text=True)
    if r.returncode: return None, r.stdout+r.stderr
    base=top[:-6]
    return (lst_bytes(os.path.join(workdir,base+'.lst')), os.path.join(workdir,base+'.map')), ''
results=collections.OrderedDict()
for mode, extra in [('plain',[]), ('cached',['--cache','--cache-dir','.oc'])]:
    wd=os.path.join(sys.argv[1], mode); shutil.rmtree(wd, ignore_errors=True); shutil.copytree(sys.argv[2], wd)
    for top in sorted(glob.glob(os.path.join(wd,'S*.spin2'))):
        top=os.path.basename(top)
        if mode=='cached':  # warm the cache first, then measure the warm build
            run(top, wd, extra)
        got, err = run(top, wd, extra)
        key=(top[:-6], mode)
        if got is None: results[key]=('COMPILE-ERROR', err.strip().splitlines()[-1:]); continue
        b, mp = got
        truth=[]; walk(b, 0, (len(b)+3)&~3, (), truth)
        txt, rows = map_details(mp)
        top_vb=rows[0][2]; img_vb=(len(b)+3)&~3
        mapped=collections.Counter((c,v) for _,c,v in rows[1:])
        want=collections.Counter((c,v) for _,c,v in truth)
        missing=list((want-mapped).elements()); extra_=list((mapped-want).elements())
        regions=set([(0, meta(b,0)[2])]); methods=set(meta(b,0)[1])
        for _,c,_v in truth:
            _,ms,sz=meta(b,c); regions.add((c,sz)); methods.update(ms)
        ml=txt.split('=== MEMORY LAYOUT ===')[1].split('CODE/DATA TOTAL')[0]
        map_regions=set((int(a,16), int(sz)) for a,sz in re.findall(r'\$([0-9A-F]{5})\s+\$[0-9A-F]{5}\s+(\d+)\s', ml))
        ai=txt.split('=== ADDRESS INDEX ===')[1].split('=== SYMBOL INDEX ===')[0]
        map_methods=set(int(a,16) for a in re.findall(r'\$([0-9A-F]{5})\s+METHOD', ai))
        region_diff=(sorted(regions-map_regions), sorted(map_regions-regions))
        method_diff=(sorted(methods-map_methods), sorted(map_methods-methods))
        placeholders=re.findall(r'\bObject_\d+\b', txt)
        objects=re.search(r'Objects:\s+(\d+)', txt).group(1)
        results[key]=dict(elements=len(truth), instances=len(rows)-1, missing=missing, extra=extra_,
                          topvb_ok=(top_vb==img_vb), placeholders=sorted(set(placeholders)), objects=objects,
                          region_diff=region_diff, method_diff=method_diff, badrows=[(n,hex(c),hex(v)) for n,c,v in rows[1:] if collections.Counter({(c,v):1}) - want])
print(f"{'shape':28} {'mode':6} elem inst  ok?  details")
for (shape,mode),r in results.items():
    if isinstance(r,tuple): print(f"{shape:28} {mode:6} {r[0]} {r[1]}"); continue
    ok = not r['region_diff'][0] and not r['region_diff'][1] and not r['method_diff'][0] and not r['method_diff'][1] and not r['missing'] and not r['extra'] and r['topvb_ok'] and not r['placeholders'] and r['elements']==r['instances']
    d=[]
    if r['elements']!=r['instances']: d.append(f"instances {r['instances']} != header elements {r['elements']}")
    if r['badrows']: d.append("wrong rows: "+", ".join(f"{n}@{c}/var{v}" for n,c,v in r['badrows'][:4]))
    if r['missing']: d.append("unlisted: "+", ".join(f"{hex(c)}/var{hex(v)}" for c,v in r['missing'][:4]))
    if not r['topvb_ok']: d.append("top VAR base wrong")
    if r['region_diff'][0] or r['region_diff'][1]: d.append(f"LAYOUT regions missing {[(hex(a),z) for a,z in r['region_diff'][0]][:3]} extra {[(hex(a),z) for a,z in r['region_diff'][1]][:3]}")
    if r['method_diff'][0] or r['method_diff'][1]: d.append(f"ADDR-INDEX methods missing {[hex(a) for a in r['method_diff'][0]][:3]} extra {[hex(a) for a in r['method_diff'][1]][:3]}")
    if r['placeholders']: d.append("placeholders "+",".join(r['placeholders']))
    print(f"{shape:28} {mode:6} {r['elements']:4} {r['instances']:4}  {'PASS' if ok else 'FAIL'}  {'; '.join(d)}")
