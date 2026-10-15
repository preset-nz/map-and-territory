# Compares scan orders for a chunk's run-length `cells` (object-model doc, "Chunk voxels") on
# seeded synthetic chunks: regions, rivers, scatter. Prints mean string length per order, as a
# share of row order. Measured 2026-10-16: Hilbert 61-76% on regions, ~93% on rivers, equal on
# scatter; row order kept. Run: python3 scripts/voxel-scan-order.py
import random, math
N=16
def rle(seq):
    out=[];prev=None;n=0
    for v in seq:
        if v==prev: n+=1
        else:
            if prev is not None: out.append(f"{prev}*{n}" if n>1 else f"{prev}")
            prev,n=v,1
    out.append(f"{prev}*{n}" if n>1 else f"{prev}")
    return " ".join(out)
def canon(grid,order):
    pal={};seq=[]
    for (q,r) in order:
        v=grid[r][q]
        if v is None: seq.append(0)
        else:
            if v not in pal: pal[v]=len(pal)+1
            seq.append(pal[v])
    return rle(seq)
row=[(q,r) for r in range(N) for q in range(N)]
col=[(q,r) for q in range(N) for r in range(N)]
# third hex axis: s=-q-r constant lines => walk diagonals q+r=k
diag=[(q,k-q) for k in range(2*N-1) for q in range(N) if 0<=k-q<N]
snake=[(q if r%2==0 else N-1-q,r) for r in range(N) for q in range(N)]
def spiral():
    o=[];t,b,l,rt=0,N-1,0,N-1
    while t<=b and l<=rt:
        for q in range(l,rt+1): o.append((q,t))
        for r in range(t+1,b+1): o.append((rt,r))
        if t<b:
            for q in range(rt-1,l-1,-1): o.append((q,b))
        if l<rt:
            for r in range(b-1,t,-1): o.append((l,r))
        t+=1;b-=1;l+=1;rt-=1
    return o
def d2xy(n,d):
    x=y=0;s=1;t=d
    while s<n:
        rx=1&(t//2);ry=1&(t^rx)
        if ry==0:
            if rx==1: x=s-1-x;y=s-1-y
            x,y=y,x
        x+=s*rx;y+=s*ry;t//=4;s*=2
    return x,y
hilbert=[d2xy(N,d) for d in range(N*N)]
orders=dict(row=row,column=col,diagonal=diag,snake=snake,spiral=spiral(),hilbert=hilbert)
for o in orders.values(): assert sorted(o)==sorted(row)
DIRS=[(1,0),(1,-1),(0,-1),(-1,0),(-1,1),(0,1)]
def blobs(rng,k):  # smooth regions: nearest of k seeds (hex distance), some empty
    seeds=[(rng.uniform(0,N),rng.uniform(0,N),rng.choice(['grass','forest','hills',None])) for _ in range(k)]
    def hd(a,b,c,d): dq,dr=a-c,b-d; return (abs(dq)+abs(dr)+abs(dq+dr))/2
    return [[min(seeds,key=lambda s:hd(q,r,s[0],s[1]))[2] for q in range(N)] for r in range(N)]
def rivers(rng,base):
    g=[[base]*N for _ in range(N)]
    for _ in range(2):
        q,r=rng.randrange(N),rng.randrange(N);d=rng.randrange(6)
        for _ in range(30):
            if 0<=q<N and 0<=r<N: g[r][q]='water'
            if rng.random()<0.3: d=(d+rng.choice([-1,1]))%6
            q+=DIRS[d][0];r+=DIRS[d][1]
    return g
def scatter(rng):
    return [[rng.choice(['tree','rock','ruin']) if rng.random()<0.06 else None for q in range(N)] for r in range(N)]
cases={'solid regions':lambda r:blobs(r,4),'busy regions':lambda r:blobs(r,12),
 'rivers on empty':lambda r:rivers(r,None),'rivers on grass':lambda r:rivers(r,'grass'),'scattered':scatter}
print(f"{'':16}"+"".join(f"{k:>10}" for k in orders))
for name,gen in cases.items():
    rng=random.Random(42); tot={k:0 for k in orders}
    for _ in range(300):
        g=gen(rng)
        for k,o in orders.items(): tot[k]+=len(canon(g,o))
    base=tot['row']
    print(f"{name:16}"+"".join(f"{tot[k]/base:>10.0%}" for k in orders))
