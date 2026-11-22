(()=>{
  const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const body=document.body;
  const progress=document.createElement("div");progress.className="motion-progress";progress.setAttribute("aria-hidden","true");body.append(progress);
  const header=document.querySelector(".site-header");
  const revealTargets=document.querySelectorAll(".hero-inner,.page-hero .container,.intro-grid,.section-heading,.service-grid,.service-list,.showcase-grid,.contact-grid,.content-narrow,.closing-cta .cta-inner,.footer-top");
  revealTargets.forEach((el,i)=>{el.dataset.motion=el.matches(".service-grid,.showcase-grid")?"stagger":"reveal";});
  if(!reduce&&"IntersectionObserver"in window){
    body.classList.add("motion-ready");
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add("is-visible");observer.unobserve(entry.target);}
    }),{threshold:.12,rootMargin:"0px 0px -45px 0px"});
    revealTargets.forEach(el=>observer.observe(el));
  }
  let ticking=false;
  const update=()=>{
    const max=document.documentElement.scrollHeight-window.innerHeight;
    progress.style.transform="scaleX("+ (max>0?window.scrollY/max:0)+")";
    if(header)header.classList.toggle("is-scrolled",window.scrollY>18);
    ticking=false;
  };
  window.addEventListener("scroll",()=>{if(!ticking){requestAnimationFrame(update);ticking=true;}},{passive:true});update();
  if(reduce)return;
  let pointerFrame=0;
  window.addEventListener("pointermove",event=>{
    if(event.pointerType!=="mouse"||pointerFrame)return;
    pointerFrame=requestAnimationFrame(()=>{
      body.style.setProperty("--motion-x",event.clientX+"px");
      body.style.setProperty("--motion-y",event.clientY+"px");
      pointerFrame=0;
    });
  },{passive:true});
  const hero=document.querySelector(".hero");
  // Subtle pointer depth on desktop; cards remain fully usable on touch screens.
  if(window.matchMedia("(hover:hover) and (pointer:fine)").matches){
    document.querySelectorAll(".service-card,.showcase-card,.contact-card").forEach(card=>{
      let frame=0;
      card.addEventListener("pointermove",event=>{
        if(frame)return;
        frame=requestAnimationFrame(()=>{
          const r=card.getBoundingClientRect();
          const x=(event.clientX-r.left)/r.width-.5;
          const y=(event.clientY-r.top)/r.height-.5;
          card.style.transform="perspective(900px) rotateX("+(-y*3.2)+"deg) rotateY("+(x*3.2)+"deg) translateY(-5px)";
          frame=0;
        });
      },{passive:true});
      card.addEventListener("pointerleave",()=>{
        card.style.transform="";
      },{passive:true});
    });
  }
  if(hero&&window.matchMedia("(hover:hover) and (pointer:fine)").matches){
    let heroFrame=0;
    hero.addEventListener("pointermove",event=>{
      if(heroFrame)return;
      heroFrame=requestAnimationFrame(()=>{
        const r=hero.getBoundingClientRect(),x=(event.clientX-r.left)/r.width-.5,y=(event.clientY-r.top)/r.height-.5;
        hero.style.setProperty("--hero-shift-x",(x*12)+"px");
        hero.style.setProperty("--hero-shift-y",(y*12)+"px");
        heroFrame=0;
      });
    },{passive:true});
  }
  const canvas=document.createElement("canvas");canvas.className="motion-canvas";canvas.setAttribute("aria-hidden","true");body.prepend(canvas);
  const ctx=canvas.getContext("2d",{alpha:true});if(!ctx)return;
  let w=0,h=0,particles=[],raf=0,dpr=1;
  const resize=()=>{
    dpr=Math.min(window.devicePixelRatio||1,1.5);w=window.innerWidth;h=window.innerHeight;
    canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    const count=Math.min(46,Math.max(18,Math.round(w*h/26000)));
    particles=Array.from({length:count},()=>({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.18,vy:(Math.random()-.5)*.18,r:Math.random()*1.5+.5}));
  };
  const draw=()=>{
    ctx.clearRect(0,0,w,h);
    for(let i=0;i<particles.length;i++){
      const p=particles[i];p.x+=p.vx;p.y+=p.vy;
      if(p.x<0||p.x>w)p.vx*=-1;if(p.y<0||p.y>h)p.vy*=-1;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle="rgba(230,62,88,.5)";ctx.fill();
      for(let j=i+1;j<particles.length;j++){
        const q=particles[j],dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy);
        if(d<115){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle="rgba(200,16,46,"+(0.11*(1-d/115))+")";ctx.lineWidth=.7;ctx.stroke();}
      }
    }
    if(!document.hidden)raf=requestAnimationFrame(draw);
  };
  resize();draw();window.addEventListener("resize",()=>{cancelAnimationFrame(raf);resize();draw();},{passive:true});
  document.addEventListener("visibilitychange",()=>{if(document.hidden)cancelAnimationFrame(raf);else if(!reduce)draw();});
})();